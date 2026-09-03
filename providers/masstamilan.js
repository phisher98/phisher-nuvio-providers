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
const BASE_URL = "https://masstamilan.dev";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const PROXY = "https://goodproxy.goodproxy.workers.dev/fetch?url=";
const HEADERS = {
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
      const searchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(title)}`;
      const searchResp = yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.a-i").each((i, el) => {
        const a = $(el).find("a").first();
        const href = a.attr("href");
        const name = $(el).find("div h2").text().trim();
        if (href && name) {
          results.push({
            href: href.startsWith("http") ? href : BASE_URL + href,
            name
          });
        }
      });
      if (results.length === 0)
        return [];
      const match = results.find(
        (r) => r.name.toLowerCase().includes(title.toLowerCase())
      ) || results[0];
      const pageResp = yield fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $p = cheerio.load(pageHtml);
      const streams = [];
      $p("#tlist > tbody > tr[itemprop]").each((i, row) => {
        const songName = $p(row).find("td > span > h2 > span[itemprop~=name] > a").text().trim();
        $p(row).find("td > a").each((j, a) => {
          const linkHref = $p(a).attr("href");
          const linkText = $p(a).text().trim();
          if (linkHref) {
            const fullLink = linkHref.startsWith("http") ? linkHref : BASE_URL + linkHref;
            streams.push({
              url: `${PROXY}${encodeURIComponent(fullLink)}`,
              quality: extractQuality(linkText),
              title: `MassTamilan - ${songName || title} (${linkText})`,
              subtitles: []
            });
          }
        });
      });
      $p("h2.ziparea > a.dlink").each((i, el) => {
        const linkHref = $p(el).attr("href");
        const linkText = $p(el).text().trim();
        if (linkHref) {
          const fullLink = linkHref.startsWith("http") ? linkHref : BASE_URL + linkHref;
          streams.push({
            url: `${PROXY}${encodeURIComponent(fullLink)}`,
            quality: "Unknown",
            title: `MassTamilan - Full Zip (${linkText})`,
            subtitles: []
          });
        }
      });
      return streams;
    } catch (e) {
      console.error("[MassTamilan]", e);
      return [];
    }
  });
}
function extractQuality(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("320") || t.includes("hq"))
    return "Unknown";
  if (t.includes("128"))
    return "Unknown";
  return "Unknown";
}
module.exports = { getStreams };
