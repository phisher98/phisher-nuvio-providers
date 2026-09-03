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

// src/providers/mplayer.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.mxplayer.in";
var WEB_API = "https://api.mxplayer.in/v1/web";
var ENDPOINT_URL = "https://d3sgzbosmwirao.cloudfront.net/";
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
      let userId = "";
      try {
        const homeResp = yield fetch(BASE_URL, { headers: HEADERS, skipSizeCheck: true });
        const cookieHeader = homeResp.headers?.get("set-cookie") || "";
        const userIdMatch = cookieHeader.match(/UserID=([^;]+)/);
        if (userIdMatch)
          userId = userIdMatch[1];
      } catch (e) {
      }
      const endParam = `&device-density=2&userid=${userId}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`;
      const searchResp = yield fetch(`${WEB_API}/search/resultv2?query=${encodeURIComponent(title)}${endParam}`, {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: "{}",
        skipSizeCheck: true
      });
      const searchText = yield searchResp.text();
      let searchRoot;
      try {
        searchRoot = JSON.parse(searchText);
      } catch (e) {
        return [];
      }
      const sections = searchRoot.sections || [];
      let bestMatch = null;
      const isMovie = mediaType === "movie";
      for (const section of sections) {
        for (const item of section.items || []) {
          const itemTitle = item.title || "";
          const itemType = item.type || "";
          if (itemTitle.toLowerCase().includes(title.toLowerCase())) {
            if (isMovie && itemType.includes("movie")) {
              bestMatch = item;
              break;
            } else if (!isMovie && itemType.includes("tvshow")) {
              bestMatch = item;
              break;
            } else if (!bestMatch) {
              bestMatch = item;
            }
          }
        }
        if (bestMatch)
          break;
      }
      if (!bestMatch)
        return [];
      const streams = [];
      const extractStreamUrls = (streamObj) => {
        const urls = [];
        if (!streamObj)
          return urls;
        const hlsObj = streamObj.hls || streamObj.mxplay?.hls;
        const dashObj = streamObj.dash || streamObj.mxplay?.dash;
        const thirdParty = streamObj.thirdParty;
        for (const variant of ["high", "base", "main"]) {
          if (hlsObj?.[variant])
            urls.push(normalizeUrl(hlsObj[variant]));
          if (dashObj?.[variant])
            urls.push(normalizeUrl(dashObj[variant]));
        }
        if (thirdParty?.hlsUrl)
          urls.push(thirdParty.hlsUrl);
        if (thirdParty?.dashUrl)
          urls.push(thirdParty.dashUrl);
        return [...new Set(urls.filter(Boolean))];
      };
      if (isMovie) {
        const movieStream = bestMatch.stream;
        const urls = extractStreamUrls(movieStream);
        for (const url of urls) {
          streams.push({
            url,
            quality: url.includes(".m3u8") ? "1080p" : "Unknown",
            title: `MXPlayer${url.includes(".m3u8") ? " HLS" : " DASH"}`,
            subtitles: []
          });
        }
      } else {
        const shareUrl = bestMatch.shareUrl;
        if (!shareUrl)
          return [];
        const fullShareUrl = `${BASE_URL}${shareUrl}`;
        try {
          const seasonPageResp = yield fetch(fullShareUrl, { headers: HEADERS, skipSizeCheck: true });
          const seasonHtml = yield seasonPageResp.text();
          const $ = cheerio.load(seasonHtml);
          const seasonItems = [];
          $("div.hs__items-container > div").each((i, el) => {
            const tab = parseInt($(el).attr("data-tab") || "0");
            const id = $(el).attr("data-id");
            if (id)
              seasonItems.push({ tab, id });
          });
          const targetSeason = season ? seasonItems.find((s) => s.tab === parseInt(season)) : seasonItems[0];
          if (!targetSeason)
            return [];
          const episodesUrl = `${WEB_API}/detail/tab/tvshowepisodes?type=season&id=${targetSeason.id}&sortOrder=0${endParam}`;
          const epsResp = yield fetch(episodesUrl, { headers: HEADERS, skipSizeCheck: true });
          const epsData = yield epsResp.json();
          const epItems = epsData.items || [];
          let targetEp = null;
          if (episode) {
            targetEp = epItems.find((ep) => ep.sequence === parseInt(episode) || ep.sequence === episode);
          }
          if (!targetEp)
            targetEp = epItems[0];
          if (!targetEp)
            return [];
          const epStream = targetEp.stream;
          const epUrls = extractStreamUrls(epStream);
          for (const url of epUrls) {
            streams.push({
              url,
              quality: url.includes(".m3u8") ? "1080p" : "Unknown",
              title: `MXPlayer${url.includes(".m3u8") ? " HLS" : " DASH"}`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[MPlayer]", e);
      return [];
    }
  });
}
function normalizeUrl(url) {
  if (!url)
    return null;
  if (url.startsWith("http"))
    return url;
  return ENDPOINT_URL + url;
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
