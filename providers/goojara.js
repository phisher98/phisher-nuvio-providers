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

// src/providers/goojara.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://ww1.goojara.to";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
  "Accept": "*/*",
  "Referer": BASE_URL,
  "Cookie": "aGooz=dg18hh2eittp5e7s53u0e6bloh"
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchBody = new URLSearchParams({
        z: "Mwxxa3Vnaw",
        x: "b3716e05ff",
        q: title
      });
      const searchResp = yield fetch(`${BASE_URL}/xmre.php`, {
        method: "POST",
        headers: {
          ...HEADERS,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: searchBody.toString(),
        skipSizeCheck: true
      });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("li a").each((i, a) => {
        const href = $(a).attr("href");
        const t = $(a).text().trim();
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const matchUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
      const matchPageHtml = yield (yield fetch(matchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $match = cheerio.load(matchPageHtml);
      const showHref = $match("div.snfo h1 a").attr("href") || matchUrl;
      const showUrl = showHref.startsWith("http") ? showHref : `${BASE_URL}${showHref}`;
      const showHtml = yield (yield fetch(showUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);
      let targetUrl = showUrl;
      if (isTV) {
        const seasonLink = $show("#sesh a.ste").attr("href") || "";
        if (!seasonLink)
          return [];
        const totalSeasons = parseInt(seasonLink.split("?s=")[1]) || 1;
        if (season > totalSeasons)
          return [];
        const seasonHref = seasonLink.split("?s=")[0] + `?s=${season}`;
        const seasonUrl = seasonHref.startsWith("http") ? seasonHref : `${BASE_URL}${seasonHref}`;
        const seasonHtml = yield (yield fetch(seasonUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $season = cheerio.load(seasonHtml);
        let epUrl = "";
        $season("div.seho").each((i, el) => {
          if (epUrl)
            return;
          const epText = $season("span.sea", el).text().replace(/^0/, "").trim();
          const epNum = parseInt(epText);
          if (epNum === episode) {
            const href = $season("a", el).attr("href");
            epUrl = href ? href.startsWith("http") ? href : `${BASE_URL}${href}` : "";
          }
        });
        if (!epUrl)
          return [];
        targetUrl = epUrl;
      }
      const playerResp = yield fetch(targetUrl, {
        headers: { ...HEADERS, Referer: "https://www.goojara.to", Cookie: "" },
        skipSizeCheck: true
      });
      const playerHtml = yield playerResp.text();
      const $player = cheerio.load(playerHtml);
      const setCookie = playerResp.headers.get ? playerResp.headers.get("set-cookie") : "";
      const chkMatch = playerHtml.match(/_3chk\(\s*'([^']+)'\s*,\s*'([^']+)'/);
      const cookieStr = setCookie ? `${setCookie.split(";")[0]}${chkMatch ? `; ${chkMatch[1]}=${chkMatch[2]}` : ""}` : "";
      const streams = [];
      const drlLinks = $player("#drl a").toArray();
      for (const a of drlLinks) {
        const href = $player(a).attr("href") || "";
        if (!href)
          continue;
        try {
          const redirectResp = yield fetch(href, {
            headers: {
              ...HEADERS,
              Referer: BASE_URL,
              Cookie: cookieStr
            },
            redirect: "manual",
            skipSizeCheck: true
          });
          const embedUrl = redirectResp.headers.get ? redirectResp.headers.get("location") : "";
          if (embedUrl && embedUrl.startsWith("http")) {
            streams.push({
              url: embedUrl,
              quality: "720p",
              title: `Goojara`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Goojara]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
