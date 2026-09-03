var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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

// src/utils/extractors.js
var require_extractors = __commonJS({
  "src/utils/extractors.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    function unpack(packed) {
      const regex = new RegExp('eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\"(.*?)\\"\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\"(.*?)\\"\\.split\\(\\"\\|\\"\\)', "s");
      let match = packed.match(regex);
      if (!match) {
        const regexSq = new RegExp("eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\'(.*?)\\'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\'(.*?)\\'\\.split\\(\\'\\|\\'\\)", "s");
        match = packed.match(regexSq);
      }
      if (!match)
        return null;
      let p = match[1];
      const a = parseInt(match[2], 10);
      let c = parseInt(match[3], 10);
      const k = match[4].split("|");
      function e(c2) {
        return (c2 < a ? "" : e(Math.floor(c2 / a))) + (c2 % a > 35 ? String.fromCharCode(c2 % a + 29) : (c2 % a).toString(36));
      }
      while (c--) {
        if (k[c]) {
          const pattern = new RegExp("\\b" + e(c) + "\\b", "g");
          p = p.replace(pattern, k[c]);
        }
      }
      return p;
    }
    function extractVidmoly(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const m = html.match(/file:\s*["'](.*?m3u8.*?)["']/);
          if (m)
            return { url: m[1], quality: "Unknown", source: "Vidmoly" };
        } catch (e) {
        }
        return null;
      });
    }
    function extractFilemoon(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const unpacked = unpack(html);
          if (unpacked) {
            const m = unpacked.match(/file:\s*["'](.*?m3u8.*?)["']/);
            if (m)
              return { url: m[1], quality: "Unknown", source: "Filemoon" };
          }
        } catch (e) {
        }
        return null;
      });
    }
    function extractStreamhide(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const unpacked = unpack(html);
          if (unpacked) {
            const m = unpacked.match(/sources:\s*\[\s*{\s*file:\s*["'](.*?m3u8.*?)["']/);
            if (m)
              return { url: m[1], quality: "Unknown", source: "Streamhide" };
          }
        } catch (e) {
        }
        return null;
      });
    }
    function extractVoe(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url);
          const html = yield res.text();
          const m = html.match(/hls':\s*'(.*?)'/);
          if (m)
            return { url: m[1], quality: "Unknown", source: "Voe" };
        } catch (e) {
        }
        return null;
      });
    }
    function extract2(url) {
      return __async(this, null, function* () {
        if (!url)
          return null;
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes("vidmoly")) {
          return yield extractVidmoly(url);
        } else if (lowerUrl.includes("filemoon") || lowerUrl.includes("abyssplayer") || lowerUrl.includes("rubystm")) {
          return yield extractFilemoon(url);
        } else if (lowerUrl.includes("streamhide") || lowerUrl.includes("cloudy.upns") || lowerUrl.includes("gdmirrorbot") || lowerUrl.includes("emturbovid")) {
          return yield extractStreamhide(url);
        } else if (lowerUrl.includes("voe.sx") || lowerUrl.includes("voe.network")) {
          return yield extractVoe(url);
        }
        return null;
      });
    }
    module2.exports = { extract: extract2 };
  }
});

// src/providers/idlix.js
var BASE_URL = "https://z1.idlixku.com";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`,
  "Origin": BASE_URL,
  "Accept": "*/*",
  "Content-Type": "application/json"
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const isTV = mediaType === "tv";
      const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(title)}&page=1&limit=8`;
      const searchData = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const results = searchData && searchData.results || [];
      if (!results.length)
        return [];
      const lcTitle = title.toLowerCase();
      let match = results.find(
        (r) => (r.title || "").toLowerCase().includes(lcTitle) && (isTV ? r.contentType === "tv_series" || r.contentType === "series" : r.contentType === "movie")
      );
      if (!match)
        match = results.find((r) => (r.title || "").toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      if (!match || !match.slug)
        return [];
      const detailUrl = isTV ? `${BASE_URL}/api/series/${match.slug}` : `${BASE_URL}/api/movies/${match.slug}`;
      const detail = yield (yield fetch(detailUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      let contentId = "";
      let contentType = "";
      if (isTV) {
        const firstSeason = detail.firstSeason;
        const allSeasons = detail.seasons || [];
        let targetEpisode = null;
        if (firstSeason && firstSeason.seasonNumber === season) {
          targetEpisode = (firstSeason.episodes || []).find((e) => e.episodeNumber === episode);
        }
        if (!targetEpisode) {
          for (const s of allSeasons) {
            const sNum = s.seasonNumber;
            if (sNum !== season)
              continue;
            const seasonUrl = `${BASE_URL}/api/series/${match.slug}/season/${sNum}`;
            try {
              const seasonData = yield (yield fetch(seasonUrl, { headers: HEADERS, skipSizeCheck: true })).json();
              const seasonObj = seasonData.season || seasonData;
              targetEpisode = (seasonObj.episodes || []).find((e) => e.episodeNumber === episode);
            } catch (e) {
            }
            break;
          }
        }
        if (!targetEpisode || !targetEpisode.id)
          return [];
        contentId = targetEpisode.id;
        contentType = "episode";
      } else {
        contentId = detail.id;
        contentType = "movie";
      }
      if (!contentId)
        return [];
      const playUrl = `${BASE_URL}/api/watch/play-info/${contentType}/${contentId}`;
      const playResp = yield fetch(playUrl, { headers: HEADERS, skipSizeCheck: true });
      const playCookies = playResp.headers.get ? playResp.headers.get("set-cookie") : "";
      const playInfo = yield playResp.json();
      if (!playInfo.gateToken)
        return [];
      const waitMs = Math.max(0, (playInfo.unlockAt || 0) - (playInfo.serverNow || Date.now()));
      const waitSec = Math.ceil(waitMs / 1e3);
      if (waitSec > 0 && waitSec <= 30) {
        yield sleep(waitSec * 1e3);
      }
      const claimResp = yield fetch(`${BASE_URL}/api/watch/session/claim`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ gateToken: playInfo.gateToken }),
        skipSizeCheck: true
      });
      const claimData = yield claimResp.json();
      if (!claimData.claim || !claimData.redeemUrl)
        return [];
      const redeemResp = yield fetch(claimData.redeemUrl, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ claim: claimData.claim }),
        skipSizeCheck: true
      });
      const redeemData = yield redeemResp.json();
      if (!redeemData.url)
        return [];
      const streams = [];
      streams.push({
        url: redeemData.url,
        quality: "1080p",
        title: "Idlix",
        subtitles: (redeemData.subtitles || []).map((sub) => ({
          url: sub.path,
          lang: sub.label || sub.lang
        }))
      });
      return streams;
    } catch (e) {
      console.error("[Idlix]", e);
      return [];
    }
  });
}
var { extract } = require_extractors();
function wrappedGetStreams(...args) {
  return __async(this, null, function* () {
    const streams = yield getStreams(...args);
    const finalStreams = [];
    for (const s of streams) {
      if (!s.url)
        continue;
      const ext = yield extract(s.url);
      if (ext) {
        s.url = ext.url;
        if (ext.quality !== "Unknown")
          s.quality = ext.quality;
        finalStreams.push(s);
      } else if (s.url.includes(".mp4") || s.url.includes(".m3u8") || s.url.includes(".mkv") || s.url.includes(".avi") || s.url.startsWith("magnet:") || s.url.includes("/api/file/") || s.url.includes(".cloudflarestorage.com")) {
        finalStreams.push(s);
      }
    }
    return finalStreams;
  });
}
module.exports = { getStreams: wrappedGetStreams };
