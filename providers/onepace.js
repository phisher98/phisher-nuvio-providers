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
const BASE_URL = "https://onepace.co";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const seriesUrl = `${BASE_URL}/series/one-pace-english-sub/`;
      const doc = cheerio.load(yield (yield fetch(seriesUrl, { headers: HEADERS, skipSizeCheck: true })).text());
      const streams = [];
      let arcHref = null;
      let termId = null;
      const seasonBoxes = doc("div.seasons.aa-crd > div.seasons-bx").toArray();
      let episodeLinks = [];
      if (season && episode) {
        for (const box of seasonBoxes) {
          const $box = doc(box);
          const epItems = $box.find("ul.seasons-lst.anm-a li").toArray();
          for (const ep of epItems) {
            const $ep = doc(ep);
            const spanText = $ep.find("h3.title > span").text().trim();
            const sMatch = spanText.match(/S(\d+)/);
            const eMatch = spanText.match(/E(\d+)/);
            if (sMatch && eMatch) {
              const epSeason = parseInt(sMatch[1]);
              const epEp = parseInt(eMatch[1]);
              if (epSeason === parseInt(season) && epEp === parseInt(episode)) {
                const href = $ep.find("a").attr("href");
                if (href)
                  episodeLinks.push(href);
                break;
              }
            }
          }
          if (episodeLinks.length > 0)
            break;
        }
      }
      if (episodeLinks.length === 0 && seasonBoxes.length > 0) {
        const firstArcEps = doc("ul.seasons-lst.anm-a li").first().find("a").attr("href");
        if (firstArcEps)
          episodeLinks.push(firstArcEps);
      }
      for (const epUrl of episodeLinks) {
        const fullUrl = epUrl.startsWith("http") ? epUrl : BASE_URL + epUrl;
        const epHtml = yield (yield fetch(fullUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const epDoc = cheerio.load(epHtml);
        const bodyClass = epDoc("body").attr("class") || "";
        const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
        if (!termMatch)
          continue;
        const term = termMatch[1];
        for (let i = 0; i <= 7; i++) {
          try {
            const iframeUrl = `${BASE_URL}/?trdekho=${i}&trid=${term}&trtype=2`;
            const iframeHtml = yield (yield fetch(iframeUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const iframeDoc = cheerio.load(iframeHtml);
            const src = iframeDoc("iframe").attr("src");
            if (src && src.startsWith("http")) {
              streams.push({
                url: src,
                quality: "Unknown",
                title: `OnePace [Server ${i + 1}]`,
                subtitles: []
              });
            }
          } catch (_) {
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[OnePace]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
