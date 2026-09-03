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
const BASE_URL = "https://fireani.me";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var _a, _b, _c;
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/api/anime/search?q=${encodeURIComponent(title)}`;
      const searchRes = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const results = (searchRes == null ? void 0 : searchRes.data) || [];
      if (!results.length)
        return [];
      const slug = (_a = results[0]) == null ? void 0 : _a.slug;
      if (!slug)
        return [];
      const detailUrl = `${BASE_URL}/api/anime?slug=${slug}`;
      const detailRes = yield (yield fetch(detailUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const animeData = detailRes == null ? void 0 : detailRes.data;
      if (!animeData)
        return [];
      const animeSeasons = animeData.anime_seasons || [];
      const targetSeason = season || 1;
      const targetEp = episode || 1;
      let searchSeason = String(targetSeason);
      if (targetSeason === 0)
        searchSeason = "Filme";
      const epUrl = `${BASE_URL}/api/anime/episode?slug=${slug}&season=${encodeURIComponent(searchSeason)}&episode=${targetEp}`;
      const epRes = yield (yield fetch(epUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const episodeLinks = ((_b = epRes == null ? void 0 : epRes.data) == null ? void 0 : _b.anime_episode_links) || [];
      if (!episodeLinks.length)
        return [];
      const streams = [];
      for (const link of episodeLinks) {
        const href = link.link;
        const lang = ((_c = link.lang) == null ? void 0 : _c.toUpperCase()) || "Unknown";
        if (!href)
          continue;
        try {
          const pageHtml = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
          const $ = cheerio.load(pageHtml);
          const m3u8Match = pageHtml.match(/file:\s*["']([^"']+\.m3u8[^"']*)/i);
          if (m3u8Match) {
            streams.push({
              url: m3u8Match[1],
              quality: "1080p",
              title: `AnimeCloud [${lang}]`,
              subtitles: []
            });
            continue;
          }
          const iframeSrc = $("iframe").attr("src") || $("iframe").attr("data-src");
          if (iframeSrc) {
            const iframeUrl = iframeSrc.startsWith("http") ? iframeSrc : BASE_URL + iframeSrc;
            streams.push({
              url: iframeUrl,
              quality: "1080p",
              title: `AnimeCloud [${lang}]`,
              subtitles: []
            });
          }
        } catch (_) {
          streams.push({
            url: href,
            quality: "Unknown",
            title: `AnimeCloud [${lang}]`,
            subtitles: []
          });
        }
      }
      return streams;
    } catch (e) {
      console.error("[AnimeCloud]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
