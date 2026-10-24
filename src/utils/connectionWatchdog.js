/*
 * Decides when a peer connection is really gone.
 *
 * ICE 'disconnected' is usually transient: a CPU spike (e.g. a webcam starting
 * mid-call), a missed consent check or a short network blip, and the browser
 * recovers on its own within a few seconds. Treating it as fatal dropped calls
 * that would have come back. 'failed' and 'closed' are final.
 */

export const DISCONNECT_GRACE_MS = 6000;

const FINAL_STATES = ['failed', 'closed'];

/**
 * Calls onLost (at most once) when the connection fails, closes, or stays
 * disconnected for longer than graceMs. Returns a function that stops watching.
 */
export function watchPeerConnection(pc, onLost, graceMs = DISCONNECT_GRACE_MS) {
  let graceTimer = null;
  let done = false;

  const clearGrace = () => {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
  };

  const lose = () => {
    if (done) return;
    done = true;
    clearGrace();
    onLost();
  };

  const check = () => {
    if (done) return;
    const ice = pc.iceConnectionState;
    const conn = pc.connectionState;
    if (FINAL_STATES.includes(ice) || FINAL_STATES.includes(conn)) {
      lose();
    } else if (ice === 'disconnected' || conn === 'disconnected') {
      if (!graceTimer) graceTimer = setTimeout(lose, graceMs);
    } else {
      clearGrace();
    }
  };

  pc.addEventListener('iceconnectionstatechange', check);
  pc.addEventListener('connectionstatechange', check);

  return () => {
    done = true;
    clearGrace();
    pc.removeEventListener('iceconnectionstatechange', check);
    pc.removeEventListener('connectionstatechange', check);
  };
}
