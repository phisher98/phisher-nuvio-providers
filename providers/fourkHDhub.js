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

// src/providers/fourkHDhub.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://4khdhub.dad";
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
function resolveHubCloud(url) {
  return __async(this, null, function* () {
    try {
      const html1 = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
      const $1 = cheerio.load(html1);
      let href = $1("#download").attr("href") || "";
      if (!href)
        return null;
      if (!href.startsWith("http")) {
        const base = url.match(/^(https?:\/\/[^/]+)/)?.[1] || "";
        href = base + "/" + href.replace(/^\//, "");
      }
      const html2 = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $2 = cheerio.load(html2);
      const header = $2("div.card-header").text() || "";
      const quality = extractQuality(header);
      const streams = [];
      $2("a.btn").each((i, a) => {
        const link = $2(a).attr("href") || "";
        const label = $2(a).text().toLowerCase().trim();
        if (!link)
          return;
        if (link.match(/\.(mp4|mkv|m3u8)/i)) {
          streams.push({ url: link, quality, title: `4KHDHUB [${label}]` });
        } else if (label.includes("fsl") || label.includes("download") || label.includes("server") || link.startsWith("http")) {
          streams.push({ url: link, quality, title: `4KHDHUB [${label}]` });
        }
      });
      return streams.length ? streams : null;
    } catch (e) {
      return null;
    }
  });
}
function resolveRedirect(rawUrl) {
  return __async(this, null, function* () {
    try {
      if (!rawUrl.includes("id="))
        return rawUrl;
      const resp = yield fetch(rawUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
      return resp.url || rawUrl;
    } catch (e) {
      return rawUrl;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.card-grid a").each((i, a) => {
        const href = $(a).attr("href");
        const t = $("h3", a).text().trim();
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
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const streams = [];
      if (isTV) {
        let found = false;
        $page("div.episodes-list div.season-item").each((i, seasonEl) => {
          if (found)
            return;
          const seasonText = $page("div.episode-number", seasonEl).text();
          const seasonMatch = seasonText.match(/S?([1-9][0-9]*)/);
          if (!seasonMatch || parseInt(seasonMatch[1]) !== season)
            return;
          $page("div.episode-download-item", seasonEl).each((j, epItem) => {
            if (found)
              return;
            const epText = $page("div.episode-file-info span.badge-psa", epItem).text();
            const epMatch = epText.match(/Episode-0*([1-9][0-9]*)/);
            if (!epMatch || parseInt(epMatch[1]) !== episode)
              return;
            found = true;
            $page("a", epItem).each((k, a) => {
              const href = $page(a).attr("href");
              if (href && href.startsWith("http")) {
                streams.push({
                  url: href,
                  quality: extractQuality(epText),
                  title: `4KHDHUB [S${season}E${episode}]`,
                  subtitles: []
                });
              }
            });
          });
        });
      } else {
        const hrefs = [];
        $page("div.download-item a").each((i, a) => {
          const href = $page(a).attr("href");
          if (href && href.startsWith("http"))
            hrefs.push(href);
        });
        for (const href of hrefs.slice(0, 5)) {
          try {
            const resolved = yield resolveRedirect(href);
            if (resolved.toLowerCase().includes("hubcloud")) {
              const hubStreams = yield resolveHubCloud(resolved);
              if (hubStreams) {
                for (const s of hubStreams) {
                  streams.push({ ...s, subtitles: [] });
                }
              }
            } else {
              streams.push({
                url: resolved,
                quality: extractQuality(resolved),
                title: `4KHDHUB`,
                subtitles: []
              });
            }
          } catch (e) {
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[4KHDHUB]", e);
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
