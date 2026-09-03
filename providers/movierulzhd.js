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

// src/providers/movierulzhd.js
var cheerio = require("cheerio-without-node-native");
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var FALLBACK_URL = "https://123moviesfree9.cloud";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};
var cachedBaseUrl = null;
function getBaseUrl() {
  return __async(this, null, function* () {
    if (cachedBaseUrl)
      return cachedBaseUrl;
    try {
      const resp = yield fetch(DOMAINS_URL, { skipSizeCheck: true });
      const data = yield resp.json();
      cachedBaseUrl = data.movierulzhd || FALLBACK_URL;
    } catch (e) {
      cachedBaseUrl = FALLBACK_URL;
    }
    return cachedBaseUrl;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const BASE_URL = yield getBaseUrl();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchResp = yield fetch(`${BASE_URL}/search/${encodeURIComponent(title.replace(/ /g, "-"))}`, {
        headers: HEADERS,
        skipSizeCheck: true
      });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.result-item").each((i, el) => {
        const a = $(el).find("div.title > a");
        const href = a.attr("href");
        const name = a.text().replace(/\(\d{4}\)/, "").trim();
        if (href && name)
          results.push({ href, name });
      });
      if (results.length === 0)
        return [];
      const match = results.find(
        (r) => r.name.toLowerCase().includes(title.toLowerCase())
      ) || results[0];
      let contentUrl = match.href;
      if (contentUrl.includes("/episodes/")) {
        const t = contentUrl.split("/episodes/")[1];
        const slug = t.match(/(.+?)-season/)?.[1] || t;
        contentUrl = `${BASE_URL}/tvshows/${slug}`;
      } else if (contentUrl.includes("/seasons/")) {
        const t = contentUrl.split("/seasons/")[1];
        const slug = t.match(/(.+?)-season/)?.[1] || t;
        contentUrl = `${BASE_URL}/tvshows/${slug}`;
      }
      const pageResp = yield fetch(contentUrl, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $p = cheerio.load(pageHtml);
      const directUrl = new URL(pageResp.url || contentUrl).origin;
      const isMovie = mediaType === "movie";
      const streams = [];
      if (!isMovie && mediaType === "tv") {
        const epLinks = [];
        $p("ul.episodios > li").each((i, el) => {
          const href = $p(el).find("a").attr("href");
          const numText = $p(el).find("div.numerando").text().replace(/ /g, "");
          const parts = numText.split("-");
          const sNum = parseInt(parts[0] || "0");
          const eNum = parseInt(parts[1] || "0");
          if (href)
            epLinks.push({ href, season: sNum, episode: eNum });
        });
        if (epLinks.length > 0) {
          let targetEp = epLinks.find(
            (ep) => ep.season === parseInt(season || 1) && ep.episode === parseInt(episode || 1)
          ) || epLinks[0];
          const epResp = yield fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true });
          const epHtml = yield epResp.text();
          const $ep = cheerio.load(epHtml);
          const epDirectUrl = new URL(epResp.url || targetEp.href).origin;
          const epItems = [];
          $ep("ul#playeroptionsul > li").each((i, el) => {
            epItems.push({
              post: $ep(el).attr("data-post"),
              nume: $ep(el).attr("data-nume"),
              type: $ep(el).attr("data-type")
            });
          });
          for (const item of epItems.slice(0, 5)) {
            if (!item.post || !item.nume || (item.nume || "").includes("trailer"))
              continue;
            const embedUrl = yield fetchEmbedUrl(epDirectUrl, item.post, item.nume, item.type);
            if (embedUrl && !embedUrl.includes("youtube")) {
              streams.push({
                url: embedUrl,
                quality: extractQuality(embedUrl),
                title: "Movierulzhd",
                subtitles: []
              });
            }
          }
          return streams;
        }
      }
      const playerItems = [];
      $p("ul#playeroptionsul > li").each((i, el) => {
        playerItems.push({
          post: $p(el).attr("data-post"),
          nume: $p(el).attr("data-nume"),
          type: $p(el).attr("data-type")
        });
      });
      for (const item of playerItems.slice(0, 5)) {
        if (!item.post || !item.nume || (item.nume || "").includes("trailer"))
          continue;
        const embedUrl = yield fetchEmbedUrl(directUrl, item.post, item.nume, item.type);
        if (embedUrl && !embedUrl.includes("youtube")) {
          streams.push({
            url: embedUrl,
            quality: extractQuality(embedUrl),
            title: "Movierulzhd",
            subtitles: []
          });
        }
      }
      return streams;
    } catch (e) {
      console.error("[Movierulzhd]", e);
      return [];
    }
  });
}
function fetchEmbedUrl(baseUrl, post, nume, type) {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: {
          ...HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": baseUrl
        },
        body: `action=doo_player_ajax&post=${post}&nume=${nume}&type=${type}`,
        skipSizeCheck: true
      });
      const data = yield resp.json();
      const embedUrl = data.embed_url || "";
      const srcMatch = embedUrl.match(/SRC="(https?:[^"]+)"/i);
      if (srcMatch)
        return srcMatch[1].trim();
      const urlMatch = embedUrl.match(/"(https?[^"]+)"/);
      if (urlMatch)
        return urlMatch[1].trim();
      return embedUrl.replace(/^"|"$/g, "").trim();
    } catch (e) {
      return null;
    }
  });
}
function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
  if (u.includes("360p"))
    return "360p";
  return "Unknown";
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
