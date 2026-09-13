/**
 * Free STUN servers for WebRTC. Multiple servers are used at once so ICE can
 * gather more candidates and connect reliably (e.g. on mobile and across NATs).
 */
export const ESTABLISHMENT_DELAY_THRESHOLD_MS = 2500;

export const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
  { urls: 'stun:stun.ekiga.net' },
  { urls: 'stun:stun.ideasip.com' },
  { urls: 'stun:stun.schlund.de' },
  { urls: 'stun:stun.voip.blackberry.com:3478' },
  { urls: 'stun:stun.voipbuster.com' },
  { urls: 'stun:stun.voxgratia.org' },
  { urls: 'stun:stun.xten.com' },
  { urls: 'stun:stun.callwithus.com' },
  { urls: 'stun:stun.counterpath.com' },
  { urls: 'stun:stun.internet-call.com' },
  { urls: 'stun:stun.nextcloud.com:443' },
];

/** Use multiple STUN servers at once for better connectivity (mobile, NAT, etc.) */
const ICE_SERVERS_MULTI = STUN_SERVERS.slice(0, 6).map((s) => ({ urls: s.urls }));

/**
 * TURN relay servers, fetched from the backend at connect time.
 *
 * STUN alone fails behind symmetric NAT (campus/corporate wifi, some mobile carriers),
 * where both peers gather candidates but no pair is routable - the call connects to the
 * signaling server, matches, and then shows a black video. TURN relays the media instead.
 *
 * The credentials are time-limited (coturn REST API), so they are cached until shortly
 * before they expire rather than stored in the bundle.
 */
let turnCache = { iceServers: [], expiresAt: 0 };

/**
 * Fetch TURN credentials and cache them. Safe to call repeatedly - it re-fetches only
 * once the cached credentials are close to expiry. Never throws: on failure we keep
 * working with STUN only rather than blocking the call.
 *
 * @param {string} baseURL - Origin of the signaling backend.
 * @returns {Promise<void>}
 */
export async function primeTurnCredentials(baseURL) {
  if (turnCache.expiresAt > Date.now()) {
    return;
  }

  try {
    const response = await fetch(`${baseURL}/api/turn`);
    if (!response.ok) {
      throw new Error(`TURN endpoint returned ${response.status}`);
    }

    const data = await response.json();
    const iceServers = Array.isArray(data.iceServers) ? data.iceServers : [];
    // Refresh a minute early so a call never starts with credentials about to lapse.
    const ttlMs = Math.max(((data.ttl || 0) - 60) * 1000, 0);

    turnCache = { iceServers, expiresAt: ttlMs ? Date.now() + ttlMs : 0 };
    console.log(`[webrtcStun] TURN servers available: ${iceServers.length}`);
  } catch (error) {
    console.warn('[webrtcStun] TURN unavailable, falling back to STUN only:', error);
    turnCache = { iceServers: [], expiresAt: 0 };
  }
}

/**
 * @param {number} serverIndex - Optional rotation index (kept for API compatibility).
 * @returns {{ iceServers: Array<Object>, iceCandidatePoolSize: number }}
 */
export function getRtcConfig(serverIndex) {
  return {
    iceServers: [...ICE_SERVERS_MULTI, ...turnCache.iceServers],
    iceCandidatePoolSize: 10,
  };
}
