const cheerio = require("cheerio-without-node-native");
// onepace.js
// OnePace provider — scrapes https://onepace.co for One Pace anime arcs (sub & dub)
// Searches by arc name, then iterates over up to 8 iframe slots per episode

const BASE_URL = "https://onepace.co";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get TMDB info (title)
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Determine if searching sub or dub series
    const seriesUrl = `${BASE_URL}/series/one-pace-english-sub/`;
    const doc = cheerio.load(await (await fetch(seriesUrl, { headers: HEADERS, skipSizeCheck: true })).text());

    // 3. Find the arc matching the current season
    const streams = [];
    let arcHref = null;
    let termId = null;

    // Each season-bx block represents one arc
    const seasonBoxes = doc("div.seasons.aa-crd > div.seasons-bx").toArray();

    // Try to find episode link by season number
    let episodeLinks = [];
    if (season && episode) {
      for (const box of seasonBoxes) {
        const $box = doc(box);
        // seasons are listed numerically; look for one matching our season
        const epItems = $box.find("ul.seasons-lst.anm-a li").toArray();
        // The season number is in span text like S1-E1
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
              if (href) episodeLinks.push(href);
              break;
            }
          }
        }
        if (episodeLinks.length > 0) break;
      }
    }

    // If no direct match, fall back to first episode of first arc
    if (episodeLinks.length === 0 && seasonBoxes.length > 0) {
      const firstArcEps = doc("ul.seasons-lst.anm-a li").first().find("a").attr("href");
      if (firstArcEps) episodeLinks.push(firstArcEps);
    }

    // 4. For each episode URL, extract term id from body class then iterate iframe slots
    for (const epUrl of episodeLinks) {
      const fullUrl = epUrl.startsWith("http") ? epUrl : BASE_URL + epUrl;
      const epHtml = await (await fetch(fullUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const epDoc = cheerio.load(epHtml);

      // Extract post/term id from body class
      const bodyClass = epDoc("body").attr("class") || "";
      const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
      if (!termMatch) continue;
      const term = termMatch[1];

      // Try up to 8 iframe slots
      for (let i = 0; i <= 7; i++) {
        try {
          const iframeUrl = `${BASE_URL}/?trdekho=${i}&trid=${term}&trtype=2`;
          const iframeHtml = await (await fetch(iframeUrl, { headers: HEADERS, skipSizeCheck: true })).text();
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
        } catch (_) {}
      }
    }

    return streams;
  } catch (e) {
    console.error("[OnePace]", e);
    return [];
  }
}


module.exports = { getStreams };
