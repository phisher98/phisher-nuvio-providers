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
const BASE_URL = "https://www.topstreamfilm.live";
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
function extractUrlsFromBracketList(text) {
  return text.replace(/^\[/, "").replace(/\]$/, "").split(",").map((p) => p.trim()).filter((p) => p.startsWith("http://") || p.startsWith("https://"));
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/?story=${encodeURIComponent(title)}&do=search&subaction=search`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const firstResult = $("article h3").first().closest("article");
      let href = firstResult.find("a").attr("href") || "";
      if (!href)
        return [];
      if (!href.startsWith("http"))
        href = BASE_URL + href;
      const pageHtml = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const isSeries = $page("div.tt_season").text().trim() !== "";
      const streams = [];
      if (isSeries && mediaType === "tv" && season != null && episode != null) {
        $page("div.su-accordion div.cu-ss").each((_, el) => {
          const text = $page(el).text();
          const epMatch = text.match(/Episode\s*(\d+)/i);
          const seasonMatch = text.match(/^(\d+)x/);
          const epNum = epMatch ? parseInt(epMatch[1]) : null;
          const seasonNum = seasonMatch ? parseInt(seasonMatch[1]) : null;
          if (epNum === parseInt(episode) && (seasonNum === null || seasonNum === parseInt(season))) {
            const links = $page(el).find("a").map((_2, a) => $page(a).attr("href")).get().filter(Boolean);
            for (const link of links) {
              streams.push({
                url: link,
                quality: extractQuality(link),
                title: "TopStreamFilm",
                subtitles: []
              });
            }
          }
        });
        if (streams.length === 0) {
          const iframeSrc = $page("div.TPlayer iframe").attr("src") || "";
          if (iframeSrc) {
            const iframeHtml = yield (yield fetch(iframeSrc.startsWith("http") ? iframeSrc : BASE_URL + iframeSrc, { headers: HEADERS, skipSizeCheck: true })).text();
            const $iframe = cheerio.load(iframeHtml);
            $iframe("ul li").each((_, li) => {
              const dataLink = $iframe(li).attr("data-link") || "";
              const finalLink = dataLink.startsWith("//") ? "https:" + dataLink : dataLink;
              if (finalLink) {
                streams.push({
                  url: finalLink,
                  quality: extractQuality(finalLink),
                  title: "TopStreamFilm",
                  subtitles: []
                });
              }
            });
          }
        }
      } else {
        const iframeSrc = $page("div.TPlayer iframe").attr("src") || "";
        if (iframeSrc) {
          try {
            const iframeUrl = iframeSrc.startsWith("http") ? iframeSrc : BASE_URL + iframeSrc;
            const iframeHtml = yield (yield fetch(iframeUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const $iframe = cheerio.load(iframeHtml);
            $iframe("ul li").each((_, li) => {
              const dataLink = $iframe(li).attr("data-link") || "";
              const finalLink = dataLink.startsWith("//") ? "https:" + dataLink : dataLink;
              if (finalLink) {
                streams.push({
                  url: finalLink,
                  quality: extractQuality(finalLink),
                  title: "TopStreamFilm",
                  subtitles: []
                });
              }
            });
          } catch (e) {
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[TopStreamFilm]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
