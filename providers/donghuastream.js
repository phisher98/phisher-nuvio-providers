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

// src/providers/donghuastream.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://donghuastream.org";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
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
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/pagg/1/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.listupd > article").each((i, el) => {
        const href = $("div.bsx > a", el).attr("href");
        const t = $("div.bsx > a", el).attr("title") || "";
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const showUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
      const showHtml = yield (yield fetch(showUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);
      const isMovie = $show(".spe").text().includes("Movie");
      let targetUrl = showUrl;
      if (!isMovie) {
        const epListUrl = $show(".eplister li > a").first().attr("href") || "";
        if (!epListUrl)
          return [];
        const epListHtml = yield (yield fetch(epListUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $epList = cheerio.load(epListHtml);
        const epItems = $epList("div.episodelist > ul > li").toArray();
        let epUrl = "";
        for (const item of epItems) {
          const epNumStr = $epList("a span", item).text().split("-")[0].trim();
          const epNum = parseInt(epNumStr);
          if (epNum === episode) {
            epUrl = $epList("a", item).attr("href") || "";
            break;
          }
        }
        if (!epUrl) {
          if (epItems.length > 0) {
            epUrl = $epList("a", epItems[epItems.length - 1]).attr("href") || "";
          }
        }
        if (!epUrl)
          return [];
        targetUrl = epUrl.startsWith("http") ? epUrl : `${BASE_URL}${epUrl}`;
      } else {
        const movieHref = $show(".eplister li > a").first().attr("href") || "";
        if (movieHref) {
          targetUrl = movieHref.startsWith("http") ? movieHref : `${BASE_URL}${movieHref}`;
        }
      }
      const epHtml = yield (yield fetch(targetUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ep = cheerio.load(epHtml);
      const streams = [];
      const options = $ep("option[data-index]").toArray();
      for (const opt of options) {
        const b64 = $ep(opt).attr("value") || "";
        const label = $ep(opt).text().trim();
        if (!b64)
          continue;
        try {
          const decodedHtml = atob(b64);
          const $decoded = cheerio.load(decodedHtml);
          let iframeSrc = $decoded("iframe").attr("src") || "";
          if (!iframeSrc)
            continue;
          if (iframeSrc.startsWith("//"))
            iframeSrc = "https:" + iframeSrc;
          if (!iframeSrc.startsWith("http"))
            continue;
          if (iframeSrc.includes("vidmoly")) {
            const cleaned = "http:" + iframeSrc.substring(iframeSrc.indexOf('="') + 2).replace('"', "");
            streams.push({
              url: cleaned,
              quality: extractQuality(label),
              title: `Donghuastream [${label}]`,
              subtitles: []
            });
          } else if (iframeSrc.endsWith(".mp4")) {
            streams.push({
              url: iframeSrc,
              quality: extractQuality(label),
              title: `Donghuastream [${label}]`,
              subtitles: []
            });
          } else {
            streams.push({
              url: iframeSrc,
              quality: extractQuality(label),
              title: `Donghuastream [${label}]`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Donghuastream]", e);
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
