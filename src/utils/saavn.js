/* JioSaavn lookup behind Listen Along. */

// Community mirrors, tried in order - one going dark should not kill the feature.
const ENDPOINTS = [
  (q) => `https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}&limit=1`,
  (q) => `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(q)}&limit=1`,
  (q) => `https://saavnapi-nine.vercel.app/result/?query=${encodeURIComponent(q)}&lyrics=true`,
];

const pickLast = (list) => (Array.isArray(list) && list.length ? list[list.length - 1] : null);
const urlOf = (entry) => (entry && (entry.url || entry.link)) || '';

/** Fold the two response shapes these mirrors use into one track object. */
export const normalizeTrack = (data) => {
  const modern = data?.data?.results?.[0] || data?.results?.[0] || null;
  if (modern) {
    const streamUrl = urlOf(pickLast(modern.downloadUrl));
    if (streamUrl) {
      const primary = modern.artists?.primary;
      return {
        streamUrl,
        title: modern.name || modern.title || '',
        artist: Array.isArray(primary)
          ? primary.map((a) => a && a.name).filter(Boolean).join(', ')
          : (modern.primaryArtists || ''),
        artwork: urlOf(pickLast(modern.image)),
        lyrics: '',
        duration: parseInt(modern.duration, 10) || 0,
      };
    }
  }

  const legacy = Array.isArray(data) ? data[0] : data;
  if (legacy && (legacy.media_url || legacy.url)) {
    return {
      streamUrl: legacy.media_url || legacy.url,
      title: legacy.song || legacy.title || '',
      artist: legacy.singers || legacy.music || '',
      artwork: legacy.image || legacy.image_url || '',
      lyrics: legacy.lyrics || '',
      duration: parseInt(legacy.duration, 10) || 0,
    };
  }

  return null;
};

/** Search each mirror in turn and hand back the first playable track, or null. */
export const searchSaavnTrack = async (query) => {
  for (const buildUrl of ENDPOINTS) {
    try {
      const resp = await fetch(buildUrl(query));
      if (!resp.ok) continue;
      const data = await resp.json().catch(() => null);
      const track = normalizeTrack(data);
      if (track && track.streamUrl) return track;
    } catch (_) {
      // Mirror unreachable - fall through to the next one.
    }
  }
  return null;
};
