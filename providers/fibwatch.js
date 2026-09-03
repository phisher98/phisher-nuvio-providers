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
    var cheerio2 = require("cheerio-without-node-native");
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

// src/providers/fibwatch.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://fibwatch.top";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160") || u.includes("4k"))
    return "4K";
  if (u.includes("1080"))
    return "1080p";
  if (u.includes("720"))
    return "720p";
  if (u.includes("480"))
    return "480p";
  if (u.includes("360"))
    return "360p";
  return "Unknown";
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(title)}&page_id=1`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.video-thumb").each((i, el) => {
        const href = $("a", el).attr("href");
        const t = $("p.hptag", el).text().trim() || $("div.video-thumb img", el).attr("alt") || "";
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
      const showHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);
      const videoId = $show("input#video-id").attr("value");
      if (!videoId)
        return [];
      const streams = [];
      if (isTV) {
        const epDataUrl = `${BASE_URL}/ajax/episodes.php?video_id=${videoId}`;
        const epData = yield (yield fetch(epDataUrl, { headers: HEADERS, skipSizeCheck: true })).json();
        const episodes = epData.episodes || [];
        if (!episodes.length)
          return [];
        let targetEpUrl = "";
        for (const ep of episodes) {
          const epTitle = (ep.title || "").toLowerCase();
          const m = epTitle.match(/s(\d{1,2})e(\d{1,3})/);
          if (m) {
            const epSeason = parseInt(m[1]);
            const epEpisode = parseInt(m[2]);
            if (epSeason === season && epEpisode === episode) {
              targetEpUrl = ep.url ? ep.url.startsWith("http") ? ep.url : `${BASE_URL}${ep.url}` : "";
              break;
            }
          }
        }
        if (!targetEpUrl && episodes.length > 0) {
          targetEpUrl = episodes[0].url ? episodes[0].url.startsWith("http") ? episodes[0].url : `${BASE_URL}${episodes[0].url}` : "";
        }
        if (!targetEpUrl)
          return [];
        const epHtml = yield (yield fetch(targetEpUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $ep = cheerio.load(epHtml);
        const epVideoId = $ep("input#video-id").attr("value");
        if (epVideoId) {
          const resUrl = `${BASE_URL}/ajax/resolution_switcher.php?video_id=${epVideoId}`;
          const resData = yield (yield fetch(resUrl, { headers: HEADERS, skipSizeCheck: true })).json();
          const allLinks = [...resData.current || [], ...resData.popup || []];
          for (const item of allLinks) {
            const url = (item.url || "").trim();
            if (!url)
              continue;
            if (url.match(/\.(mp4|mkv|m3u8)/i)) {
              streams.push({
                url,
                quality: extractQuality(item.res || url),
                title: `FibWatch [${item.res || "Stream"}]`,
                subtitles: []
              });
            } else {
              try {
                const dlHtml = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
                const $dl = cheerio.load(dlHtml);
                const dlUrl = ($dl("a.hidden-button.buttonDownloadnew").attr("href") || "").replace(/.*url=/, "").trim();
                if (dlUrl && dlUrl.startsWith("http")) {
                  streams.push({
                    url: dlUrl,
                    quality: extractQuality(item.res || dlUrl),
                    title: `FibWatch [${item.res || "Stream"}]`,
                    subtitles: []
                  });
                }
              } catch (e) {
              }
            }
          }
        }
      } else {
        const resUrl = `${BASE_URL}/ajax/resolution_switcher.php?video_id=${videoId}`;
        const resData = yield (yield fetch(resUrl, { headers: HEADERS, skipSizeCheck: true })).json();
        const allLinks = [...resData.current || [], ...resData.popup || []];
        for (const item of allLinks) {
          const url = (item.url || "").trim();
          if (!url)
            continue;
          if (url.match(/\.(mp4|mkv|m3u8)/i)) {
            streams.push({
              url,
              quality: extractQuality(item.res || url),
              title: `FibWatch [${item.res || "Stream"}]`,
              subtitles: []
            });
          } else {
            try {
              const dlHtml = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
              const $dl = cheerio.load(dlHtml);
              const onclick = $dl("a.hidden-button.buttonDownloadnew").attr("href") || "";
              const dlUrl = onclick.replace(/.*url=/, "").trim();
              if (dlUrl && dlUrl.startsWith("http")) {
                streams.push({
                  url: dlUrl,
                  quality: extractQuality(item.res || dlUrl),
                  title: `FibWatch [${item.res || "Stream"}]`,
                  subtitles: []
                });
              }
            } catch (e) {
            }
          }
        }
        if (streams.length === 0) {
          const dlBtn = $show("a.hidden-button.buttonDownloadnew").attr("href") || "";
          const dlUrl = dlBtn.replace(/.*url=/, "").trim();
          if (dlUrl && dlUrl.startsWith("http")) {
            streams.push({
              url: dlUrl,
              quality: "Unknown",
              title: "FibWatch",
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[FibWatch]", e);
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
