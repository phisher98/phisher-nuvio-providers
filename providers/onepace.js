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

// src/providers/onepace.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://onepace.co";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const seriesUrl = `${BASE_URL}/series/one-pace-english-sub/`;
      const doc = cheerio.load(yield (yield fetch(seriesUrl, { headers: HEADERS, skipSizeCheck: true })).text());
      const streams = [];
      let arcHref = null;
      let termId = null;
      const seasonBoxes = doc("div.seasons.aa-crd > div.seasons-bx").toArray();
      let episodeLinks = [];
      if (season && episode) {
        for (const box of seasonBoxes) {
          const $box = doc(box);
          const epItems = $box.find("ul.seasons-lst.anm-a li").toArray();
          for (const ep of epItems) {
            const $ep = doc(ep);
            const spanText = $ep.find("h3.title > span").text().trim();
            const sMatch = spanText.match(/S(\d+)/);
            const eMatch = spanText.match(/E(\d+)/);
            if (sMatch && eMatch) {
              const epSeason = parseInt(sMatch[1]);
              const epEp = parseInt(eMatch[1]);
              if (epSeason === parseInt(season) && epEp === parseInt(episode)) {
                const href = $ep.find("a").attr("href");
                if (href)
                  episodeLinks.push(href);
                break;
              }
            }
          }
          if (episodeLinks.length > 0)
            break;
        }
      }
      if (episodeLinks.length === 0 && seasonBoxes.length > 0) {
        const firstArcEps = doc("ul.seasons-lst.anm-a li").first().find("a").attr("href");
        if (firstArcEps)
          episodeLinks.push(firstArcEps);
      }
      for (const epUrl of episodeLinks) {
        const fullUrl = epUrl.startsWith("http") ? epUrl : BASE_URL + epUrl;
        const epHtml = yield (yield fetch(fullUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const epDoc = cheerio.load(epHtml);
        const bodyClass = epDoc("body").attr("class") || "";
        const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
        if (!termMatch)
          continue;
        const term = termMatch[1];
        for (let i = 0; i <= 7; i++) {
          try {
            const iframeUrl = `${BASE_URL}/?trdekho=${i}&trid=${term}&trtype=2`;
            const iframeHtml = yield (yield fetch(iframeUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const iframeDoc = cheerio.load(iframeHtml);
            const src = iframeDoc("iframe").attr("src");
            if (src && src.startsWith("http")) {
              streams.push({
                url: src,
                quality: "Unknown",
                title: `OnePace [Server ${i + 1}]`,
                subtitles: []
              });
            }
          } catch (_) {
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[OnePace]", e);
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
      } else if (s.url.includes(".mp4") || s.url.includes(".m3u8") || s.url.startsWith("magnet:")) {
        finalStreams.push(s);
      }
    }
    return finalStreams;
  });
}
module.exports = { getStreams: wrappedGetStreams };
