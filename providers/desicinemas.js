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
const BASE_URL = "https://desicinemas.to";
const PROXY = "https://desicinemas.phisherdesicinema.workers.dev/";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": BASE_URL,
  "Connection": "keep-alive",
  "Cache-Control": "no-cache"
};
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
      const searchUrl = `${PROXY}?url=${encodeURIComponent(`${BASE_URL}/?s=${encodeURIComponent(title)}`)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $(".MovieList li, .MovieList .TPostMv").each((i, el) => {
        const href = $("a", el).attr("href");
        const t = $("h2", el).text().trim();
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
      const proxyPageUrl = `${PROXY}?url=${encodeURIComponent(pageUrl)}`;
      const pageHtml = yield (yield fetch(proxyPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const streams = [];
      const optionBoxes = $page(".MovieList .OptionBx, .OptionBx").toArray();
      for (const box of optionBoxes) {
        try {
          const linkEl = $page("a", box);
          const link = linkEl.attr("href");
          if (!link)
            continue;
          const embedHtml = yield (yield fetch(link, { headers: HEADERS, skipSizeCheck: true })).text();
          const $embed = cheerio.load(embedHtml);
          const iframeSrc = $embed("iframe").attr("src");
          if (!iframeSrc)
            continue;
          const name = $page("p.AAIco-dns", box).text().trim() || "Desicinemas";
          streams.push({
            url: iframeSrc,
            quality: extractQuality(iframeSrc),
            title: `Desicinemas [${name}]`,
            subtitles: []
          });
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Desicinemas]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
