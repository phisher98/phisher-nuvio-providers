var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/providers/torrastream.js
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TORRENTIO_API = "https://torrentio.strem.fun";
var THEPIRATEBAY_API = "https://thepiratebay-plus.strem.fun";
var TORRENTSDB_API = "https://torrentsdb.com";
var TRACKER_LIST_URL = "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json"
};
function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
  return "Unknown";
}
function getTrackers() {
  return __async(this, null, function* () {
    try {
      const text = yield (yield fetch(TRACKER_LIST_URL, { skipSizeCheck: true })).text();
      return text.split("\n").filter((l, i) => i % 2 === 0 && l.trim()).slice(0, 10);
    } catch (e) {
      return [];
    }
  });
}
function buildMagnet(infoHash, trackers, sources) {
  if (!infoHash)
    return "";
  const sourceTrackers = (sources || []).filter((s) => s.startsWith("tracker:")).map((s) => s.replace("tracker:", "")).filter(Boolean);
  const allTrackers = [...sourceTrackers, ...trackers];
  const trStr = allTrackers.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${infoHash}${trStr}`;
}
function invokeTorrentio(imdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = season != null ? `${TORRENTIO_API}/stream/series/${imdbId}:${season}:${episode}.json` : `${TORRENTIO_API}/stream/movie/${imdbId}.json`;
      const res = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).json();
      if (!res || !res.streams)
        return [];
      const trackers = yield getTrackers();
      return res.streams.map((stream) => {
        const qualityMatch = (stream.title || "").match(/(2160p|1080p|720p)/i);
        const quality = qualityMatch ? qualityMatch[1] : "Unknown";
        const seeder = (stream.title || "").match(/👤\s*(\d+)/)?.[1] || "0";
        const magnet = buildMagnet(stream.infoHash, trackers, stream.sources || []);
        const title = `Torrentio | ${quality} | Seeders: ${seeder}`;
        return {
          url: magnet,
          quality: extractQuality(quality),
          title,
          subtitles: []
        };
      }).filter((s) => s.url);
    } catch (e) {
      return [];
    }
  });
}
function invokeThePirateBay(imdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = season != null ? `${THEPIRATEBAY_API}/stream/series/${imdbId}:${season}:${episode}.json` : `${THEPIRATEBAY_API}/stream/movie/${imdbId}.json`;
      const res = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).json();
      if (!res || !res.streams)
        return [];
      const trackers = yield getTrackers();
      return res.streams.map((stream) => {
        const magnet = buildMagnet(stream.infoHash, trackers, []);
        const quality = extractQuality(stream.title || "");
        return {
          url: magnet,
          quality,
          title: `ThePirateBay | ${stream.title || ""}`,
          subtitles: []
        };
      }).filter((s) => s.url);
    } catch (e) {
      return [];
    }
  });
}
function invokeTorrentsDB(imdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = season != null ? `${TORRENTSDB_API}/stream/series/${imdbId}:${season}:${episode}.json` : `${TORRENTSDB_API}/stream/movie/${imdbId}.json`;
      const res = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).json();
      if (!res || !res.streams)
        return [];
      return res.streams.map((stream) => {
        const title = stream.title || "";
        const qualityMatch = title.match(/(2160p|1080p|720p)/i);
        const quality = qualityMatch ? qualityMatch[1] : "Unknown";
        const seeder = title.match(/👤\s*(\d+)/)?.[1] || "0";
        const magnet = buildMagnet(stream.infoHash, [], stream.sources || []);
        return {
          url: magnet,
          quality: extractQuality(quality),
          title: `TorrentsDB | ${quality} | Seeders: ${seeder}`,
          subtitles: []
        };
      }).filter((s) => s.url);
    } catch (e) {
      return [];
    }
  });
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const res = yield (yield fetch(url, { skipSizeCheck: true })).json();
      return res.external_ids?.imdb_id || res.imdb_id || null;
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const imdbId = yield getImdbId(tmdbId, mediaType);
      if (!imdbId)
        return [];
      const isTV = mediaType === "tv";
      const s = isTV ? season : null;
      const e = isTV ? episode : null;
      const [torrentioStreams, tpbStreams, torrentsDbStreams] = yield Promise.all([
        invokeTorrentio(imdbId, s, e),
        invokeThePirateBay(imdbId, s, e),
        invokeTorrentsDB(imdbId, s, e)
      ]);
      const allStreams = [...torrentioStreams, ...tpbStreams, ...torrentsDbStreams];
      return allStreams.slice(0, 15);
    } catch (e) {
      console.error("[TorraStream]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
