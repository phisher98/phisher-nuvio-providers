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

// src/providers/multimovies.js
var cheerio = require("cheerio-without-node-native");
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var FALLBACK_URL = "https://multimovies.autos";
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
      cachedBaseUrl = data.MultiMovies || FALLBACK_URL;
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
      const searchResp = yield fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
        headers: HEADERS,
        skipSizeCheck: true
      });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.result-item").each((i, el) => {
        const a = $(el).find("article > div.details > div.title > a");
        const href = a.attr("href");
        const name = a.text().trim();
        if (href && name)
          results.push({ href, name });
      });
      if (results.length === 0)
        return [];
      const isMovie = mediaType === "movie";
      const match = results.find(
        (r) => r.name.toLowerCase().includes(title.toLowerCase())
      ) || results[0];
      const pageResp = yield fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $p = cheerio.load(pageHtml);
      const streams = [];
      if (!isMovie && mediaType === "tv") {
        const episodes = [];
        $p("#seasons ul.episodios li").each((seasonIdx, sEl) => {
          $p(sEl).find("li").each((epIdx, epEl) => {
            const href = $p(epEl).find("div.episodiotitle > a").attr("href");
            if (href) {
              episodes.push({
                href,
                season: seasonIdx + 1,
                episode: epIdx + 1
              });
            }
          });
        });
        if (episodes.length === 0) {
          let seasonNum = 1;
          $p("#seasons ul.episodios").each((sIdx, sList) => {
            seasonNum = sIdx + 1;
            $p(sList).find("li").each((eIdx, epEl) => {
              const href = $p(epEl).find("div.episodiotitle > a").attr("href");
              if (href) {
                episodes.push({ href, season: seasonNum, episode: eIdx + 1 });
              }
            });
          });
        }
        const targetEp = episodes.find(
          (ep) => ep.season === parseInt(season || 1) && ep.episode === parseInt(episode || 1)
        ) || episodes[0];
        if (!targetEp)
          return [];
        const epResp = yield fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true });
        const epHtml = yield epResp.text();
        const $ep = cheerio.load(epHtml);
        const epItems = [];
        $ep("ul#playeroptionsul li").each((i, el) => {
          epItems.push({
            post: $ep(el).attr("data-post"),
            nume: $ep(el).attr("data-nume"),
            type: $ep(el).attr("data-type")
          });
        });
        for (const item of epItems.slice(0, 5)) {
          if (!item.post || !item.nume || (item.nume || "").includes("trailer"))
            continue;
          const embedUrl = yield fetchEmbedUrl(BASE_URL, item.post, item.nume, item.type, match.href);
          if (embedUrl && !embedUrl.includes("youtube")) {
            const resolvedUrl = yield resolveEmbed(embedUrl, BASE_URL);
            if (resolvedUrl) {
              streams.push({
                url: resolvedUrl,
                quality: extractQuality(resolvedUrl),
                title: "MultiMovies",
                subtitles: []
              });
            }
          }
        }
        return streams;
      }
      const playerItems = [];
      $p("ul#playeroptionsul li").each((i, el) => {
        playerItems.push({
          post: $p(el).attr("data-post"),
          nume: $p(el).attr("data-nume"),
          type: $p(el).attr("data-type")
        });
      });
      for (const item of playerItems.slice(0, 5)) {
        if (!item.post || !item.nume || (item.nume || "").includes("trailer"))
          continue;
        const embedUrl = yield fetchEmbedUrl(BASE_URL, item.post, item.nume, item.type, match.href);
        if (embedUrl && !embedUrl.includes("youtube")) {
          const resolvedUrl = yield resolveEmbed(embedUrl, BASE_URL);
          if (resolvedUrl) {
            streams.push({
              url: resolvedUrl,
              quality: extractQuality(resolvedUrl),
              title: "MultiMovies",
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[MultiMovies]", e);
      return [];
    }
  });
}
function fetchEmbedUrl(baseUrl, post, nume, type, referer) {
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
function resolveEmbed(url, referer) {
  return __async(this, null, function* () {
    if (!url || !url.startsWith("http"))
      return null;
    if (url.includes(".m3u8") || url.includes(".mp4"))
      return url;
    try {
      const resp = yield fetch(url, {
        headers: { ...HEADERS, "Referer": referer },
        skipSizeCheck: true
      });
      const text = yield resp.text();
      if (url.includes("deaddrive.xyz")) {
        const $ = cheerio.load(text);
        const firstServer = $("ul.list-server-items > li").first().attr("data-video");
        return firstServer || null;
      }
      const m3u8 = text.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      if (m3u8)
        return m3u8[1];
      const mp4 = text.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
      if (mp4)
        return mp4[1];
      return url;
    } catch (e) {
      return url;
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
module.exports = { getStreams };
