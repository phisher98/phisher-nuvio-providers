// torrastream.js
// Provider: TorraStream
// Torrent-based streaming using Torrentio Stremio addon + IMDB ID lookup
// Returns magnet links and direct stream URLs from Torrentio/ThePirateBay/TorrentsDB

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const TORRENTIO_API = "https://torrentio.strem.fun";
const THEPIRATEBAY_API = "https://thepiratebay-plus.strem.fun";
const TORRENTSDB_API = "https://torrentsdb.com";
const TRACKER_LIST_URL = "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json"
};

function extractQuality(str) {
  const u = (str || '').toLowerCase();
  if (u.includes('2160p') || u.includes('4k')) return '4K';
  if (u.includes('1080p')) return '1080p';
  if (u.includes('720p')) return '720p';
  if (u.includes('480p')) return '480p';
  return 'Unknown';
}

async function getTrackers() {
  try {
    const text = await (await fetch(TRACKER_LIST_URL, { skipSizeCheck: true })).text();
    return text.split('\n')
      .filter((l, i) => i % 2 === 0 && l.trim())
      .slice(0, 10);
  } catch (e) {
    return [];
  }
}

function buildMagnet(infoHash, trackers, sources) {
  if (!infoHash) return '';
  const sourceTrackers = (sources || [])
    .filter(s => s.startsWith('tracker:'))
    .map(s => s.replace('tracker:', ''))
    .filter(Boolean);

  const allTrackers = [...sourceTrackers, ...trackers];
  const trStr = allTrackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
  return `magnet:?xt=urn:btih:${infoHash}${trStr}`;
}

async function invokeTorrentio(imdbId, season, episode) {
  try {
    const url = season != null
      ? `${TORRENTIO_API}/stream/series/${imdbId}:${season}:${episode}.json`
      : `${TORRENTIO_API}/stream/movie/${imdbId}.json`;

    const res = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).json();
    if (!res || !res.streams) return [];

    const trackers = await getTrackers();
    return res.streams.map(stream => {
      const qualityMatch = (stream.title || '').match(/(2160p|1080p|720p)/i);
      const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
      const seeder = (stream.title || '').match(/👤\s*(\d+)/)?.[1] || '0';
      const magnet = buildMagnet(stream.infoHash, trackers, stream.sources || []);
      const title = `Torrentio | ${quality} | Seeders: ${seeder}`;
      return {
        url: magnet,
        quality: extractQuality(quality),
        title,
        subtitles: []
      };
    }).filter(s => s.url);
  } catch (e) {
    return [];
  }
}

async function invokeThePirateBay(imdbId, season, episode) {
  try {
    const url = season != null
      ? `${THEPIRATEBAY_API}/stream/series/${imdbId}:${season}:${episode}.json`
      : `${THEPIRATEBAY_API}/stream/movie/${imdbId}.json`;

    const res = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).json();
    if (!res || !res.streams) return [];

    const trackers = await getTrackers();
    return res.streams.map(stream => {
      const magnet = buildMagnet(stream.infoHash, trackers, []);
      const quality = extractQuality(stream.title || '');
      return {
        url: magnet,
        quality,
        title: `ThePirateBay | ${stream.title || ''}`,
        subtitles: []
      };
    }).filter(s => s.url);
  } catch (e) {
    return [];
  }
}

async function invokeTorrentsDB(imdbId, season, episode) {
  try {
    const url = season != null
      ? `${TORRENTSDB_API}/stream/series/${imdbId}:${season}:${episode}.json`
      : `${TORRENTSDB_API}/stream/movie/${imdbId}.json`;

    const res = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).json();
    if (!res || !res.streams) return [];

    return res.streams.map(stream => {
      const title = stream.title || '';
      const qualityMatch = title.match(/(2160p|1080p|720p)/i);
      const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
      const seeder = title.match(/👤\s*(\d+)/)?.[1] || '0';
      const magnet = buildMagnet(stream.infoHash, [], stream.sources || []);
      return {
        url: magnet,
        quality: extractQuality(quality),
        title: `TorrentsDB | ${quality} | Seeders: ${seeder}`,
        subtitles: []
      };
    }).filter(s => s.url);
  } catch (e) {
    return [];
  }
}

async function getImdbId(tmdbId, mediaType) {
  try {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const res = await (await fetch(url, { skipSizeCheck: true })).json();
    return res.external_ids?.imdb_id || res.imdb_id || null;
  } catch (e) {
    return null;
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get IMDB ID from TMDB
    const imdbId = await getImdbId(tmdbId, mediaType);
    if (!imdbId) return [];

    const isTV = mediaType === 'tv';
    const s = isTV ? season : null;
    const e = isTV ? episode : null;

    // 2. Query multiple torrent sources in parallel
    const [torrentioStreams, tpbStreams, torrentsDbStreams] = await Promise.all([
      invokeTorrentio(imdbId, s, e),
      invokeThePirateBay(imdbId, s, e),
      invokeTorrentsDB(imdbId, s, e)
    ]);

    // 3. Combine and return (limit to 15)
    const allStreams = [...torrentioStreams, ...tpbStreams, ...torrentsDbStreams];
    return allStreams.slice(0, 15);

  } catch (e) {
    console.error('[TorraStream]', e);
    return [];
  }
}


module.exports = { getStreams };
