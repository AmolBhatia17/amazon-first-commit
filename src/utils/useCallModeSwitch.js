import { useState, useRef } from 'react';

/*
 * Live voice <-> video switching inside an existing call.
 *
 * Control messages ride the WebRTC data channel as { type: 'call-mode', action }.
 * Media changes reuse the same peer connection, so the call never drops:
 *  - video off: stop the camera and swap the outgoing video track for null (no renegotiation)
 *  - video on:  reuse the video sender if one exists, otherwise add a track and let
 *               simple-peer renegotiate (the server relays any signal type)
 *
 * Going to voice is immediate for both sides. Going to video needs the partner's consent;
 * if both sides ask at the same time, the switch just happens.
 */

const REQUEST_TIMEOUT_MS = 30000;
const NOTICE_MS = 3500;

const findVideoTransceiver = (peer) => {
  const pc = peer?._pc;
  if (!pc || typeof pc.getTransceivers !== 'function') return null;
  return pc.getTransceivers().find(
    (t) => t.direction !== 'stopped' && t.receiver?.track?.kind === 'video'
  ) || null;
};

const removeVideoTracks = (stream) => {
  if (!stream) return;
  stream.getVideoTracks().forEach((t) => {
    t.stop();
    stream.removeTrack(t);
  });
};

// Point a <video> at a single track (or clear it). Using a fresh video-only stream makes the
// element pick up tracks that arrive mid-call and keeps it from double-playing audio.
export const showVideoTrack = (el, track) => {
  if (!el) return;
  if (!track) {
    if (el.srcObject) el.srcObject = null;
    return;
  }
  const current = el.srcObject?.getVideoTracks?.()[0];
  if (current === track) return;
  el.srcObject = new MediaStream([track]);
  el.play?.().catch(() => {});
};

export function useCallModeSwitch({ peerRef, localStreamRef, initialMode, onLocalVideoChange }) {
  const [callMode, setCallModeState] = useState(initialMode);
  const [incomingVideoRequest, setIncomingVideoRequest] = useState(false);
  const [awaitingVideoAnswer, setAwaitingVideoAnswer] = useState(false);
  const [switchNotice, setSwitchNotice] = useState('');
  const callModeRef = useRef(initialMode);
  const awaitingRef = useRef(false);
  const requestTimerRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const mediaRestoreRef = useRef(null);

  const setCallMode = (mode) => {
    callModeRef.current = mode;
    setCallModeState(mode);
  };

  const showNotice = (text) => {
    setSwitchNotice(text);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setSwitchNotice(''), NOTICE_MS);
  };

  const setAwaiting = (value) => {
    awaitingRef.current = value;
    setAwaitingVideoAnswer(value);
    if (requestTimerRef.current) {
      clearTimeout(requestTimerRef.current);
      requestTimerRef.current = null;
    }
    if (value) {
      requestTimerRef.current = setTimeout(() => {
        setAwaiting(false);
        showNotice('No answer from stranger.');
      }, REQUEST_TIMEOUT_MS);
    }
  };

  const sendControl = (action) => {
    const peer = peerRef.current;
    if (!peer || typeof peer.send !== 'function') return false;
    try {
      peer.send(JSON.stringify({ type: 'call-mode', action }));
      return true;
    } catch (e) {
      console.error('Call mode send error', e);
      return false;
    }
  };

  const stopLocalVideo = () => {
    removeVideoTracks(localStreamRef.current);
    const transceiver = findVideoTransceiver(peerRef.current);
    if (transceiver?.sender?.track) {
      transceiver.sender.replaceTrack(null).catch((err) => console.error('Video sender clear error', err));
    }
    onLocalVideoChange?.();
  };

  const startLocalVideo = async () => {
    const local = localStreamRef.current;
    const peer = peerRef.current;
    if (!local || !peer) return false;

    let track;
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      track = camStream.getVideoTracks()[0];
    } catch (err) {
      console.error('Camera access failed', err);
      showNotice('Camera blocked. Allow camera access to switch to video.');
      return false;
    }
    // The call ended or moved to a new partner while the permission prompt was open
    if (peerRef.current !== peer) {
      track.stop();
      return false;
    }

    removeVideoTracks(local);
    local.addTrack(track);
    try {
      const transceiver = findVideoTransceiver(peer);
      if (transceiver && transceiver.direction.includes('send')) {
        await transceiver.sender.replaceTrack(track);
      } else {
        peer.addTrack(track, local);
      }
    } catch (err) {
      console.error('Video track start error', err);
      local.removeTrack(track);
      track.stop();
      showNotice('Could not start video.');
      return false;
    }
    onLocalVideoChange?.();
    return true;
  };

  const switchToVoice = () => {
    if (callModeRef.current === 'voice') return;
    sendControl('to-voice');
    stopLocalVideo();
    setCallMode('voice');
  };

  const requestVideo = () => {
    if (callModeRef.current === 'video' || awaitingRef.current) return;
    if (sendControl('request-video')) setAwaiting(true);
  };

  const acceptVideoRequest = async () => {
    setIncomingVideoRequest(false);
    setAwaiting(false);
    const ok = await startLocalVideo();
    if (!ok) {
      sendControl('decline-video');
      return;
    }
    sendControl('accept-video');
    setCallMode('video');
  };

  const declineVideoRequest = () => {
    setIncomingVideoRequest(false);
    sendControl('decline-video');
  };

  // Returns true when the data-channel message was a call-mode message
  const handleCallModeMessage = (msg) => {
    if (!msg || msg.type !== 'call-mode') return false;
    switch (msg.action) {
      case 'request-video':
        if (callModeRef.current === 'video') {
          sendControl('accept-video');
        } else if (awaitingRef.current) {
          acceptVideoRequest();
        } else {
          setIncomingVideoRequest(true);
        }
        break;
      case 'accept-video':
        if (!awaitingRef.current) break;
        setAwaiting(false);
        startLocalVideo().then((ok) => {
          if (ok) setCallMode('video');
          else sendControl('to-voice');
        });
        break;
      case 'decline-video':
        setAwaiting(false);
        showNotice('Stranger wants to stay on voice.');
        break;
      case 'to-voice':
        setIncomingVideoRequest(false);
        setAwaiting(false);
        if (callModeRef.current !== 'voice') {
          stopLocalVideo();
          setCallMode('voice');
          showNotice('Stranger switched to voice only.');
        }
        break;
      default:
        break;
    }
    return true;
  };

  // Back to the page's own mode for the next partner: voice pages drop the camera,
  // video pages get it back if it was switched off.
  const resetCallMode = () => {
    if (requestTimerRef.current) clearTimeout(requestTimerRef.current);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    requestTimerRef.current = null;
    noticeTimerRef.current = null;
    awaitingRef.current = false;
    setAwaitingVideoAnswer(false);
    setIncomingVideoRequest(false);
    setSwitchNotice('');
    setCallMode(initialMode);

    const local = localStreamRef.current;
    if (!local) return;
    const hasVideo = local.getVideoTracks().some((t) => t.readyState === 'live');
    if (initialMode === 'voice' && local.getVideoTracks().length) {
      removeVideoTracks(local);
      onLocalVideoChange?.();
    } else if (initialMode === 'video' && !hasVideo) {
      removeVideoTracks(local);
      mediaRestoreRef.current = navigator.mediaDevices.getUserMedia({ video: true })
        .then((camStream) => {
          if (localStreamRef.current === local) {
            local.addTrack(camStream.getVideoTracks()[0]);
            onLocalVideoChange?.();
          } else {
            camStream.getTracks().forEach((t) => t.stop());
          }
        })
        .catch((err) => console.error('Camera restore failed', err))
        .finally(() => { mediaRestoreRef.current = null; });
    }
  };

  // Lets a new match wait for the camera that resetCallMode is bringing back
  const waitForCallMedia = () => mediaRestoreRef.current || Promise.resolve();

  return {
    callMode,
    incomingVideoRequest,
    awaitingVideoAnswer,
    switchNotice,
    switchToVoice,
    requestVideo,
    acceptVideoRequest,
    declineVideoRequest,
    handleCallModeMessage,
    resetCallMode,
    waitForCallMedia,
  };
}
