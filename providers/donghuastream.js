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
const BASE_URL = "https://donghuastream.org";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
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
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/pagg/1/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.listupd > article").each((i, el) => {
        const href = $("div.bsx > a", el).attr("href");
        const t = $("div.bsx > a", el).attr("title") || "";
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const showUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
      const showHtml = yield (yield fetch(showUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);
      const isMovie = $show(".spe").text().includes("Movie");
      let targetUrl = showUrl;
      if (!isMovie) {
        const epListUrl = $show(".eplister li > a").first().attr("href") || "";
        if (!epListUrl)
          return [];
        const epListHtml = yield (yield fetch(epListUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $epList = cheerio.load(epListHtml);
        const epItems = $epList("div.episodelist > ul > li").toArray();
        let epUrl = "";
        for (const item of epItems) {
          const epNumStr = $epList("a span", item).text().split("-")[0].trim();
          const epNum = parseInt(epNumStr);
          if (epNum === episode) {
            epUrl = $epList("a", item).attr("href") || "";
            break;
          }
        }
        if (!epUrl) {
          if (epItems.length > 0) {
            epUrl = $epList("a", epItems[epItems.length - 1]).attr("href") || "";
          }
        }
        if (!epUrl)
          return [];
        targetUrl = epUrl.startsWith("http") ? epUrl : `${BASE_URL}${epUrl}`;
      } else {
        const movieHref = $show(".eplister li > a").first().attr("href") || "";
        if (movieHref) {
          targetUrl = movieHref.startsWith("http") ? movieHref : `${BASE_URL}${movieHref}`;
        }
      }
      const epHtml = yield (yield fetch(targetUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ep = cheerio.load(epHtml);
      const streams = [];
      const options = $ep("option[data-index]").toArray();
      for (const opt of options) {
        const b64 = $ep(opt).attr("value") || "";
        const label = $ep(opt).text().trim();
        if (!b64)
          continue;
        try {
          const decodedHtml = atob(b64);
          const $decoded = cheerio.load(decodedHtml);
          let iframeSrc = $decoded("iframe").attr("src") || "";
          if (!iframeSrc)
            continue;
          if (iframeSrc.startsWith("//"))
            iframeSrc = "https:" + iframeSrc;
          if (!iframeSrc.startsWith("http"))
            continue;
          if (iframeSrc.includes("vidmoly")) {
            const cleaned = "http:" + iframeSrc.substring(iframeSrc.indexOf('="') + 2).replace('"', "");
            streams.push({
              url: cleaned,
              quality: extractQuality(label),
              title: `Donghuastream [${label}]`,
              subtitles: []
            });
          } else if (iframeSrc.endsWith(".mp4")) {
            streams.push({
              url: iframeSrc,
              quality: extractQuality(label),
              title: `Donghuastream [${label}]`,
              subtitles: []
            });
          } else {
            streams.push({
              url: iframeSrc,
              quality: extractQuality(label),
              title: `Donghuastream [${label}]`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Donghuastream]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
