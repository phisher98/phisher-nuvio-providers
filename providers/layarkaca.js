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

// src/providers/layarkaca.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://lk21.de";
var SERIES_URL = "https://series.lk21.de";
var SEARCH_URL = "https://gudangvape.com";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchResp = yield fetch(`${SEARCH_URL}/search.php?s=${encodeURIComponent(title)}`, {
        headers: { "Referer": BASE_URL },
        skipSizeCheck: true
      });
      const searchText = yield searchResp.text();
      let items = [];
      try {
        const searchJson = JSON.parse(searchText);
        items = searchJson.data || [];
      } catch (e) {
        return [];
      }
      if (items.length === 0)
        return [];
      const isMovie = mediaType === "movie";
      const expectedType = isMovie ? "movie" : "series";
      const match = items.find(
        (i) => i.type === expectedType && (i.title || "").toLowerCase().includes(title.toLowerCase())
      ) || items.find(
        (i) => (i.title || "").toLowerCase().includes(title.toLowerCase())
      ) || items[0];
      if (!match)
        return [];
      const slug = match.slug;
      let contentUrl;
      if (match.type === "series") {
        contentUrl = `${SERIES_URL}/${slug}`;
      } else {
        contentUrl = `${BASE_URL}/${slug}`;
      }
      const pageResp = yield fetch(contentUrl, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $ = cheerio.load(pageHtml);
      const streams = [];
      if (isMovie || match.type === "movie") {
        const playerLinks = [];
        $("ul#player-list > li a").each((i, el) => {
          const href = $(el).attr("href");
          if (href)
            playerLinks.push(href.startsWith("http") ? href : BASE_URL + href);
        });
        for (const linkUrl of playerLinks.slice(0, 3)) {
          try {
            const subPageResp = yield fetch(linkUrl, {
              headers: { "Referer": SERIES_URL + "/" },
              skipSizeCheck: true
            });
            const subHtml = yield subPageResp.text();
            const $s = cheerio.load(subHtml);
            const iframeSrc = $s("div.embed-container iframe").attr("src");
            if (iframeSrc) {
              const finalUrl = iframeSrc.startsWith("http") ? iframeSrc : "https:" + iframeSrc;
              streams.push({
                url: finalUrl,
                quality: "Unknown",
                title: "LayarKaca",
                subtitles: []
              });
            }
          } catch (e) {
          }
        }
      } else {
        const seasonDataScript = $("script#season-data").html();
        if (!seasonDataScript)
          return [];
        let seasonData;
        try {
          seasonData = JSON.parse(seasonDataScript);
        } catch (e) {
          return [];
        }
        let targetEpUrl = null;
        for (const [seasonKey, epArr] of Object.entries(seasonData)) {
          for (const ep of epArr) {
            const epNo = ep.episode_no;
            const sNo = ep.s;
            if ((!season || parseInt(sNo) === parseInt(season)) && (!episode || parseInt(epNo) === parseInt(episode))) {
              const pageBaseUrl = pageResp.url ? new URL(pageResp.url).origin : BASE_URL;
              targetEpUrl = `${pageBaseUrl}/${ep.slug}`;
              break;
            }
          }
          if (targetEpUrl)
            break;
        }
        if (!targetEpUrl)
          return [];
        try {
          const epResp = yield fetch(targetEpUrl, {
            headers: { "Referer": `${SERIES_URL}/` },
            skipSizeCheck: true
          });
          const epHtml = yield epResp.text();
          const $ep = cheerio.load(epHtml);
          const playerLinks = [];
          $ep("ul#player-list > li a").each((i, el) => {
            const href = $ep(el).attr("href");
            if (href)
              playerLinks.push(href.startsWith("http") ? href : SERIES_URL + href);
          });
          for (const linkUrl of playerLinks.slice(0, 3)) {
            try {
              const subResp = yield fetch(linkUrl, {
                headers: { "Referer": `${SERIES_URL}/` },
                skipSizeCheck: true
              });
              const subHtml = yield subResp.text();
              const $s = cheerio.load(subHtml);
              const iframeSrc = $s("div.embed-container iframe").attr("src");
              if (iframeSrc) {
                const finalUrl = iframeSrc.startsWith("http") ? iframeSrc : "https:" + iframeSrc;
                streams.push({
                  url: finalUrl,
                  quality: "Unknown",
                  title: "LayarKaca",
                  subtitles: []
                });
              }
            } catch (e) {
            }
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[LayarKaca]", e);
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
