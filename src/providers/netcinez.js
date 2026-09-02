const cheerio = require("cheerio-without-node-native");
// netcinez.js
// Netcinez - Portuguese (Brazilian) movies/series provider via netcinez.si

const BASE_URL = "https://netcinez.si";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search Netcinez
    const searchResp = await fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
      headers: HEADERS,
      skipSizeCheck: true
    });
    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("#box_movies > div.movie").each((i, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href");
      const name = $(el).find("h2").text().trim();
      if (href && name) results.push({ href, name });
    });

    if (results.length === 0) return [];

    const isMovie = mediaType === "movie";
    const match = results.find(r =>
      r.name.toLowerCase().includes(title.toLowerCase())
    ) || results[0];

    // Step 3: Load content page
    const pageResp = await fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
    const pageHtml = await pageResp.text();
    const $p = cheerio.load(pageHtml);

    const streams = [];
    const isTvUrl = match.href.includes("tvshows");

    if (!isMovie && isTvUrl) {
      // TV Series: find episode in menu
      // "div.post #cssmenu > ul li > ul > li" - each has span.datex (S-E) and span.datix (name)
      let targetEpUrl = null;

      $p("div.post #cssmenu > ul li > ul > li").each((i, el) => {
        const datex = $p(el).find("a > span.datex").text().trim();
        const href = $p(el).find("a").attr("href");

        // datex format: "S-E" e.g. "1-3"
        const parts = datex.split("-");
        const sNum = parseInt(parts[0] || "0");
        const eNum = parseInt(parts[1] || "0");

        if (
          (!season || sNum === parseInt(season)) &&
          (!episode || eNum === parseInt(episode))
        ) {
          if (!targetEpUrl && href) targetEpUrl = href;
        }
      });

      if (!targetEpUrl) {
        // Fallback: get first episode
        const firstLink = $p("div.post #cssmenu > ul li > ul > li a").first().attr("href");
        targetEpUrl = firstLink;
      }

      if (!targetEpUrl) return [];

      // Load episode page
      const epResp = await fetch(targetEpUrl, { headers: HEADERS, skipSizeCheck: true });
      const epHtml = await epResp.text();
      const $ep = cheerio.load(epHtml);

      // Get iframe from player container
      const iframeUrl = $ep("#player-container iframe").attr("src") ||
                        $ep("#player-container iframe").attr("data-src");

      if (!iframeUrl) return [];

      const fullIframeUrl = iframeUrl.startsWith("http") ? iframeUrl : `https:${iframeUrl}`;

      // Load iframe page to get download buttons
      const iframeResp = await fetch(fullIframeUrl, {
        headers: { ...HEADERS, "Referer": BASE_URL },
        skipSizeCheck: true
      });
      const iframeHtml = await iframeResp.text();
      const $ifr = cheerio.load(iframeHtml);

      // "div.btn-container a" - each is a quality option
      const btnLinks = [];
      $ifr("div.btn-container a").each((i, el) => {
        const href = $ifr(el).attr("href");
        const label = $ifr(el).text().trim();
        if (href) btnLinks.push({ href, label });
      });

      for (const btn of btnLinks.slice(0, 5)) {
        try {
          const intermediateResp = await fetch(btn.href, {
            headers: HEADERS,
            skipSizeCheck: true
          });
          const intermediateHtml = await intermediateResp.text();
          const $int = cheerio.load(intermediateHtml);

          // Try "div.container a" or "source"
          const finalA = $int("div.container a").attr("href");
          const finalSrc = $int("source").attr("src");
          const finalUrl = finalA || finalSrc;

          if (finalUrl) {
            const fullFinalUrl = finalUrl.startsWith("http") ? finalUrl : `https:${finalUrl}`;
            streams.push({
              url: fullFinalUrl,
              quality: extractQuality(btn.label + " " + fullFinalUrl),
              title: `Netcinez (${btn.label})`,
              subtitles: []
            });
          }
        } catch(e) {}
      }

      return streams;
    }

    // Movie
    const iframeUrl = $p("#player-container iframe").attr("src") ||
                      $p("#player-container iframe").attr("data-src");

    if (!iframeUrl) return [];

    const fullIframeUrl = iframeUrl.startsWith("http") ? iframeUrl : `https:${iframeUrl}`;

    const iframeResp = await fetch(fullIframeUrl, {
      headers: { ...HEADERS, "Referer": BASE_URL },
      skipSizeCheck: true
    });
    const iframeHtml = await iframeResp.text();
    const $ifr = cheerio.load(iframeHtml);

    const btnLinks = [];
    $ifr("div.btn-container a").each((i, el) => {
      const href = $ifr(el).attr("href");
      const label = $ifr(el).text().trim();
      if (href) btnLinks.push({ href, label });
    });

    for (const btn of btnLinks.slice(0, 5)) {
      try {
        const intermediateResp = await fetch(btn.href, {
          headers: HEADERS,
          skipSizeCheck: true
        });
        const intermediateHtml = await intermediateResp.text();
        const $int = cheerio.load(intermediateHtml);

        const finalA = $int("div.container a").attr("href");
        const finalSrc = $int("source").attr("src");
        const finalUrl = finalA || finalSrc;

        if (finalUrl) {
          const fullFinalUrl = finalUrl.startsWith("http") ? finalUrl : `https:${finalUrl}`;
          streams.push({
            url: fullFinalUrl,
            quality: extractQuality(btn.label + " " + fullFinalUrl),
            title: `Netcinez (${btn.label})`,
            subtitles: []
          });
        }
      } catch(e) {}
    }

    return streams;
  } catch (e) {
    console.error("[Netcinez]", e);
    return [];
  }
}

function extractQuality(text) {
  const u = (text || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p") || u.includes("fullhd")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  if (u.includes("360p")) return "360p";
  return "Unknown";
}


module.exports = { getStreams };
