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
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const FALLBACK_URL = "https://new2.movies4u.style";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "xla=s4t"
};
let cachedBaseUrl = null;
function getBaseUrl() {
  return __async(this, null, function* () {
    if (cachedBaseUrl)
      return cachedBaseUrl;
    try {
      const resp = yield fetch(DOMAINS_URL, { skipSizeCheck: true });
      const data = yield resp.json();
      cachedBaseUrl = data.movies4u || FALLBACK_URL;
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
      $("article").each((i, el) => {
        const a = $(el).find("h3 a, h2 a").first();
        const href = a.attr("href");
        const name = a.text().replace(/\(\d{4}\)/, "").trim();
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
      if (isMovie) {
        const downloadLinks = [];
        $p("div.downloads-btns-div a[href]").each((i, el) => {
          downloadLinks.push($p(el).attr("href"));
        });
        for (const link of downloadLinks.slice(0, 8)) {
          if (!link)
            continue;
          streams.push({
            url: link,
            quality: extractQuality(link),
            title: `Movies4u (${extractQuality(link)})`,
            subtitles: []
          });
        }
      } else {
        const seasonLinks = [];
        $p("div.download-links-div h4").each((i, el) => {
          const h4Text = $p(el).text();
          const sMatch = h4Text.match(/Season\s*(\d+)/i);
          if (!sMatch)
            return;
          const sNum = parseInt(sMatch[1]);
          if (season && sNum !== parseInt(season))
            return;
          const nextEl = $p(el).next();
          nextEl.find("a[href]").each((j, a) => {
            const href = $p(a).attr("href");
            if (href && !$p(a).text().includes("zip")) {
              seasonLinks.push({ href, season: sNum });
            }
          });
        });
        for (const { href, season: sNum } of seasonLinks.slice(0, 3)) {
          try {
            const seasonResp = yield fetch(href, { headers: HEADERS, skipSizeCheck: true });
            const seasonHtml = yield seasonResp.text();
            const $s = cheerio.load(seasonHtml);
            const epBlocks = $s("h5");
            if (epBlocks.length > 0) {
              $s("h5").each((i, h5) => {
                const epText = $s(h5).text();
                const epMatch = epText.match(/Episodes:\s*(\d+)/);
                if (!epMatch)
                  return;
                const epNum = parseInt(epMatch[1]);
                if (episode && epNum !== parseInt(episode))
                  return;
                const links = [];
                $s(h5).next().find("a[href]").each((j, a) => {
                  links.push($s(a).attr("href"));
                });
                for (const lnk of links) {
                  if (!lnk)
                    continue;
                  streams.push({
                    url: lnk,
                    quality: extractQuality(lnk),
                    title: `Movies4u S${sNum}E${epNum}`,
                    subtitles: []
                  });
                }
              });
            } else {
              if (!episode || episode === "1") {
                streams.push({
                  url: href,
                  quality: extractQuality(href),
                  title: `Movies4u S${sNum}`,
                  subtitles: []
                });
              }
            }
          } catch (e) {
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[Movies4u]", e);
      return [];
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
