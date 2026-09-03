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
const cheerio = require("cheerio-without-node-native");
const BASE_URL = "https://tokuzilla.net";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
function decryptAES(hexStr, key, iv) {
  return __async(this, null, function* () {
    try {
      const keyBytes = new TextEncoder().encode(key);
      const ivBytes = new TextEncoder().encode(iv);
      const hexToBytes = (hex) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      };
      const encryptedBytes = hexToBytes(hexStr);
      const cryptoKey = yield crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
      );
      const decryptedBuffer = yield crypto.subtle.decrypt(
        { name: "AES-CBC", iv: ivBytes },
        cryptoKey,
        encryptedBytes
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      return null;
    }
  });
}
function extractVidstackStreams(iframeSrc) {
  return __async(this, null, function* () {
    try {
      const hash = iframeSrc.split("#").pop().split("/").pop();
      const baseUrl = new URL(iframeSrc).origin;
      const encoded = yield (yield fetch(`${baseUrl}/api/v1/video?id=${hash}`, {
        headers: HEADERS,
        skipSizeCheck: true
      })).text();
      const key = "kiemtienmua911ca";
      const ivList = ["1234567890oiuytr", "0123456789abcdef"];
      let decryptedText = null;
      for (const iv of ivList) {
        decryptedText = yield decryptAES(encoded.trim(), key, iv);
        if (decryptedText)
          break;
      }
      if (!decryptedText)
        return [];
      const m3u8Match = decryptedText.match(/"source":"(.*?)"/);
      if (!m3u8Match)
        return [];
      const m3u8 = m3u8Match[1].replace(/\\\//g, "/").replace("https", "http");
      const subtitles = [];
      const subtitleSection = decryptedText.match(/"subtitle":\{(.*?)\}/);
      if (subtitleSection) {
        const subMatches = [...subtitleSection[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
        for (const m of subMatches) {
          const lang = m[1];
          const path = m[2].replace(/\\\//g, "/").split("#")[0];
          if (path)
            subtitles.push({ lang, url: path.startsWith("http") ? path : baseUrl + path });
        }
      }
      return [{
        url: m3u8,
        quality: extractQuality(m3u8),
        title: "TokuZilla",
        subtitles
      }];
    } catch (e) {
      console.error("[TokuZilla] Vidstack error:", e);
      return [];
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
      const searchUrl = `${BASE_URL}?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const firstResult = $("div.col-sm-4 h3 a").first();
      if (!firstResult.length)
        return [];
      let href = firstResult.attr("href");
      if (!href)
        return [];
      if (!href.startsWith("http"))
        href = BASE_URL + href;
      if (mediaType === "tv" && season != null && episode != null) {
        const showHtml = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
        const $show = cheerio.load(showHtml);
        let episodeHref = null;
        $show("ul.pagination.post-tape li.page-item a.page-link").each((_, el) => {
          const epHref = $show(el).attr("href") || "";
          const epNum = (epHref.match(/[?&]ep=(\d+)/) || [])[1];
          if (parseInt(epNum) === parseInt(episode)) {
            episodeHref = epHref;
          }
        });
        if (episodeHref) {
          href = episodeHref.startsWith("http") ? episodeHref : BASE_URL + episodeHref;
        }
      }
      const pageHtml = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const iframeSrc = $page("div.player iframe").attr("src");
      if (!iframeSrc)
        return [];
      const streams = yield extractVidstackStreams(iframeSrc);
      return streams;
    } catch (e) {
      console.error("[TokuZilla]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
