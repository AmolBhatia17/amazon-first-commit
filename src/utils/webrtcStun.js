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
 * @param {number} serverIndex - Optional rotation index (kept for API compatibility).
 * @returns {{ iceServers: Array<{ urls: string }> }}
 */
export function getRtcConfig(serverIndex) {
  return {
    iceServers: ICE_SERVERS_MULTI,
    iceCandidatePoolSize: 10,
  };
}
