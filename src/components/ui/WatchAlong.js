import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { FiPlay, FiPause, FiRotateCcw, FiRotateCw, FiSearch } from 'react-icons/fi';

/* ── Watch Along synced video ────────────────────────────────────────── */

const Wrap = styled.div`
  padding: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.paperAlt};
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 58%;
  overflow-y: auto;
`;

const SearchSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UrlInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radii.control};
  background: ${({ theme }) => theme.colors.paper};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 14.5px;
  font-weight: 500;

  &::placeholder { color: ${({ theme }) => theme.colors.muted}; }
  &:focus { outline: 2px solid ${({ theme }) => theme.colors.sun}; outline-offset: 2px; }
`;

const StatusText = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.muted};
`;

const StageFrame = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: ${({ theme }) => theme.radii.panel};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.ink};
  overflow: hidden;

  iframe {
    width: 100%;
    height: 100%;
    display: block;
    border: 0;
  }
`;

/* Followers do not drive playback - the host does. This blocks stray clicks. */
const ClickShield = styled.div`
  position: absolute;
  inset: 0;
  background: transparent;
`;

const EmptyStage = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.paper};
  font-size: 13.5px;
  font-weight: 700;
  text-align: center;
  padding: 16px;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const ControlButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.paper};
  color: ${({ theme }) => theme.colors.ink};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  transition: transform 0.12s ease, background 0.15s ease;

  &:active:not(:disabled) { transform: scale(0.94); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  &.primary {
    width: 52px;
    height: 52px;
    font-size: 21px;
    background: ${({ theme }) => theme.colors.ink};
    color: ${({ theme }) => theme.colors.paper};
  }
`;

const LoadButton = styled.button`
  height: 44px;
  padding: 0 16px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.control};
  border: 1.5px solid ${({ theme }) => theme.colors.ink};
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.paper};
  font-size: 13.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;

  &:active:not(:disabled) { transform: scale(0.96); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

/** Pull the 11-character video id out of any common YouTube URL shape. */
export const parseYouTubeId = (raw) => {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^[\w-]{11}$/.test(value)) return value;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return m[1];
  }
  return '';
};

let apiPromise = null;
/** Load the YouTube IFrame API once per page and hand back window.YT. */
const loadYouTubeApi = () => {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Could not load the YouTube player'));
    document.body.appendChild(script);
  });
  return apiPromise;
};

const DRIFT_TOLERANCE = 1.5; // seconds before we snap a follower back into sync
const HEARTBEAT_MS = 3000;

/**
 * Synced YouTube watching. The player who sent the invite is the host: they
 * pick the video and drive play/pause/seek. Everything is mirrored over the
 * peer data channel as { type: 'watch-control', ... }.
 */
const WatchAlong = ({ isHost, incoming, sendData }) => {
  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('');

  const hostRef = useRef(isHost);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const loadedIdRef = useRef('');
  const suppressRef = useRef(false); // ignore state events we caused ourselves

  hostRef.current = isHost;

  const broadcast = useCallback((patch) => {
    const player = playerRef.current;
    let position = 0;
    try { position = player && readyRef.current ? player.getCurrentTime() : 0; } catch (_) {}
    sendData({
      type: 'watch-control',
      videoId: patch.videoId !== undefined ? patch.videoId : videoId,
      isPlaying: patch.isPlaying !== undefined ? patch.isPlaying : isPlaying,
      position: patch.position !== undefined ? patch.position : position,
      at: Date.now(),
    });
  }, [sendData, videoId, isPlaying]);

  // Kept in a ref so rebuilding the player is driven only by the video id -
  // otherwise every play/pause would reload the video from the start.
  const broadcastRef = useRef(broadcast);
  broadcastRef.current = broadcast;

  // Build the player whenever the video changes.
  useEffect(() => {
    if (!videoId || loadedIdRef.current === videoId) return undefined;
    let cancelled = false;
    loadedIdRef.current = videoId;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;

        if (playerRef.current && playerRef.current.loadVideoById) {
          suppressRef.current = true;
          playerRef.current.loadVideoById(videoId);
          setStatus('');
          return;
        }

        readyRef.current = false;

        playerRef.current = new YT.Player(mountRef.current, {
          videoId,
          playerVars: {
            controls: hostRef.current ? 1 : 0,
            disablekb: hostRef.current ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              readyRef.current = true;
              setStatus('');
            },
            onError: () => setStatus('That video cannot be embedded. Try another link.'),
            onStateChange: (event) => {
              if (!hostRef.current) return;
              if (suppressRef.current) { suppressRef.current = false; return; }
              const YTState = window.YT && window.YT.PlayerState;
              if (!YTState) return;
              if (event.data === YTState.PLAYING) {
                setIsPlaying(true);
                broadcastRef.current({ isPlaying: true });
              } else if (event.data === YTState.PAUSED) {
                setIsPlaying(false);
                broadcastRef.current({ isPlaying: false });
              } else if (event.data === YTState.ENDED) {
                setIsPlaying(false);
                broadcastRef.current({ isPlaying: false });
              }
            },
          },
        });
      })
      .catch(() => setStatus('Could not load the YouTube player.'));

    return () => { cancelled = true; };
  }, [videoId]);

  // Tear the player down when this screen goes away.
  useEffect(() => () => {
    try { playerRef.current && playerRef.current.destroy && playerRef.current.destroy(); } catch (_) {}
    playerRef.current = null;
    readyRef.current = false;
    loadedIdRef.current = '';
  }, []);

  // Host heartbeat keeps the follower from drifting.
  useEffect(() => {
    if (!isHost || !videoId || !isPlaying) return undefined;
    const id = setInterval(() => broadcastRef.current({}), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [isHost, videoId, isPlaying]);

  // Follower: mirror whatever the host sent.
  useEffect(() => {
    if (!incoming || incoming.type !== 'watch-control') return;
    if (isHost) return;

    if (incoming.videoId && incoming.videoId !== videoId) {
      setVideoId(incoming.videoId);
      setStatus('');
    }
    setIsPlaying(!!incoming.isPlaying);

    const player = playerRef.current;
    if (!player || !readyRef.current) return;

    // Add the time the message spent in flight so we land where the host is now.
    const inFlight = incoming.isPlaying ? Math.max(0, (Date.now() - (incoming.at || Date.now())) / 1000) : 0;
    const target = (incoming.position || 0) + inFlight;

    try {
      const current = player.getCurrentTime();
      if (Math.abs(current - target) > DRIFT_TOLERANCE) {
        suppressRef.current = true;
        player.seekTo(target, true);
      }
      if (incoming.isPlaying) player.playVideo();
      else player.pauseVideo();
    } catch (_) {}
  }, [incoming, isHost, videoId]);

  const loadFromInput = () => {
    const id = parseYouTubeId(urlInput);
    if (!id) {
      setStatus('Paste a YouTube link to start watching.');
      return;
    }
    setStatus('Loading…');
    setVideoId(id);
    setIsPlaying(false);
    broadcast({ videoId: id, isPlaying: false, position: 0 });
  };

  const hostPlay = () => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try { player.playVideo(); } catch (_) {}
    setIsPlaying(true);
    broadcast({ isPlaying: true });
  };

  const hostPause = () => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try { player.pauseVideo(); } catch (_) {}
    setIsPlaying(false);
    broadcast({ isPlaying: false });
  };

  const hostSeek = (delta) => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      const next = Math.max(0, player.getCurrentTime() + delta);
      suppressRef.current = true;
      player.seekTo(next, true);
      broadcast({ position: next });
    } catch (_) {}
  };

  return (
    <Wrap>
      {isHost && (
        <SearchSection>
          <UrlInput
            type="text"
            placeholder="Paste a YouTube link…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadFromInput(); }}
          />
          <LoadButton onClick={loadFromInput} disabled={!urlInput.trim()}>
            <FiSearch size={15} /> Watch
          </LoadButton>
        </SearchSection>
      )}
      {!isHost && <StatusText>The stranger is picking what to watch.</StatusText>}
      {status && <StatusText>{status}</StatusText>}

      <StageFrame>
        <div ref={mountRef} />
        {!videoId && (
          <EmptyStage>
            {isHost ? 'Paste a YouTube link above to start watching together.' : 'Waiting for the stranger to pick a video…'}
          </EmptyStage>
        )}
        {!isHost && videoId && <ClickShield />}
      </StageFrame>

      {isHost && videoId && (
        <ControlsRow>
          <ControlButton onClick={() => hostSeek(-10)} title="Back 10 seconds">
            <FiRotateCcw />
          </ControlButton>
          <ControlButton
            className="primary"
            onClick={isPlaying ? hostPause : hostPlay}
            title={isPlaying ? 'Pause for both' : 'Play for both'}
          >
            {isPlaying ? <FiPause /> : <FiPlay />}
          </ControlButton>
          <ControlButton onClick={() => hostSeek(10)} title="Forward 10 seconds">
            <FiRotateCw />
          </ControlButton>
        </ControlsRow>
      )}
    </Wrap>
  );
};

export default WatchAlong;
