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
const BASE_URL = "https://lk21.de";
const SERIES_URL = "https://series.lk21.de";
const SEARCH_URL = "https://gudangvape.com";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
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
      const searchResp = yield fetch(`${SEARCH_URL}/search.php?s=${encodeURIComponent(title)}`, {
        headers: { "Referer": BASE_URL },
        skipSizeCheck: true
      });
      const searchText = yield searchResp.text();
      let items = [];
      try {
        const searchJson = JSON.parse(searchText);
        items = searchJson.data || [];
      } catch (e) {
        return [];
      }
      if (items.length === 0)
        return [];
      const isMovie = mediaType === "movie";
      const expectedType = isMovie ? "movie" : "series";
      const match = items.find(
        (i) => i.type === expectedType && (i.title || "").toLowerCase().includes(title.toLowerCase())
      ) || items.find(
        (i) => (i.title || "").toLowerCase().includes(title.toLowerCase())
      ) || items[0];
      if (!match)
        return [];
      const slug = match.slug;
      let contentUrl;
      if (match.type === "series") {
        contentUrl = `${SERIES_URL}/${slug}`;
      } else {
        contentUrl = `${BASE_URL}/${slug}`;
      }
      const pageResp = yield fetch(contentUrl, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $ = cheerio.load(pageHtml);
      const streams = [];
      if (isMovie || match.type === "movie") {
        const playerLinks = [];
        $("ul#player-list > li a").each((i, el) => {
          const href = $(el).attr("href");
          if (href)
            playerLinks.push(href.startsWith("http") ? href : BASE_URL + href);
        });
        for (const linkUrl of playerLinks.slice(0, 3)) {
          try {
            const subPageResp = yield fetch(linkUrl, {
              headers: { "Referer": SERIES_URL + "/" },
              skipSizeCheck: true
            });
            const subHtml = yield subPageResp.text();
            const $s = cheerio.load(subHtml);
            const iframeSrc = $s("div.embed-container iframe").attr("src");
            if (iframeSrc) {
              const finalUrl = iframeSrc.startsWith("http") ? iframeSrc : "https:" + iframeSrc;
              streams.push({
                url: finalUrl,
                quality: "Unknown",
                title: "LayarKaca",
                subtitles: []
              });
            }
          } catch (e) {
          }
        }
      } else {
        const seasonDataScript = $("script#season-data").html();
        if (!seasonDataScript)
          return [];
        let seasonData;
        try {
          seasonData = JSON.parse(seasonDataScript);
        } catch (e) {
          return [];
        }
        let targetEpUrl = null;
        for (const [seasonKey, epArr] of Object.entries(seasonData)) {
          for (const ep of epArr) {
            const epNo = ep.episode_no;
            const sNo = ep.s;
            if ((!season || parseInt(sNo) === parseInt(season)) && (!episode || parseInt(epNo) === parseInt(episode))) {
              const pageBaseUrl = pageResp.url ? new URL(pageResp.url).origin : BASE_URL;
              targetEpUrl = `${pageBaseUrl}/${ep.slug}`;
              break;
            }
          }
          if (targetEpUrl)
            break;
        }
        if (!targetEpUrl)
          return [];
        try {
          const epResp = yield fetch(targetEpUrl, {
            headers: { "Referer": `${SERIES_URL}/` },
            skipSizeCheck: true
          });
          const epHtml = yield epResp.text();
          const $ep = cheerio.load(epHtml);
          const playerLinks = [];
          $ep("ul#player-list > li a").each((i, el) => {
            const href = $ep(el).attr("href");
            if (href)
              playerLinks.push(href.startsWith("http") ? href : SERIES_URL + href);
          });
          for (const linkUrl of playerLinks.slice(0, 3)) {
            try {
              const subResp = yield fetch(linkUrl, {
                headers: { "Referer": `${SERIES_URL}/` },
                skipSizeCheck: true
              });
              const subHtml = yield subResp.text();
              const $s = cheerio.load(subHtml);
              const iframeSrc = $s("div.embed-container iframe").attr("src");
              if (iframeSrc) {
                const finalUrl = iframeSrc.startsWith("http") ? iframeSrc : "https:" + iframeSrc;
                streams.push({
                  url: finalUrl,
                  quality: "Unknown",
                  title: "LayarKaca",
                  subtitles: []
                });
              }
            } catch (e) {
            }
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[LayarKaca]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
