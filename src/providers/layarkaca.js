const cheerio = require("cheerio-without-node-native");
// layarkaca.js
// LayarKaca - Indonesian movie/series provider via lk21.de and series.lk21.de

const BASE_URL = "https://lk21.de";
const SERIES_URL = "https://series.lk21.de";
const SEARCH_URL = "https://gudangvape.com";
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

    // Step 2: Search via the search API endpoint
    const searchResp = await fetch(`${SEARCH_URL}/search.php?s=${encodeURIComponent(title)}`, {
      headers: { "Referer": BASE_URL },
      skipSizeCheck: true
    });
    const searchText = await searchResp.text();

    let items = [];
    try {
      const searchJson = JSON.parse(searchText);
      items = searchJson.data || [];
    } catch(e) {
      return [];
    }

    if (items.length === 0) return [];

    // Find best match
    const isMovie = mediaType === "movie";
    const expectedType = isMovie ? "movie" : "series";
    const match = items.find(i =>
      i.type === expectedType &&
      (i.title || "").toLowerCase().includes(title.toLowerCase())
    ) || items.find(i =>
      (i.title || "").toLowerCase().includes(title.toLowerCase())
    ) || items[0];

    if (!match) return [];

    // Build URL based on type
    const slug = match.slug;
    let contentUrl;
    if (match.type === "series") {
      contentUrl = `${SERIES_URL}/${slug}`;
    } else {
      contentUrl = `${BASE_URL}/${slug}`;
    }

    // Step 3: Load the content page
    const pageResp = await fetch(contentUrl, { headers: HEADERS, skipSizeCheck: true });
    const pageHtml = await pageResp.text();
    const $ = cheerio.load(pageHtml);

    const streams = [];

    if (isMovie || match.type === "movie") {
      // Movie: get player list links
      const playerLinks = [];
      $("ul#player-list > li a").each((i, el) => {
        const href = $(el).attr("href");
        if (href) playerLinks.push(href.startsWith("http") ? href : BASE_URL + href);
      });

      for (const linkUrl of playerLinks.slice(0, 3)) {
        try {
          // Each link goes to an episode/player page with an iframe
          const subPageResp = await fetch(linkUrl, {
            headers: { "Referer": SERIES_URL + "/" },
            skipSizeCheck: true
          });
          const subHtml = await subPageResp.text();
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
        } catch(e) {}
      }
    } else {
      // TV Series: parse season-data JSON script
      const seasonDataScript = $("script#season-data").html();
      if (!seasonDataScript) return [];

      let seasonData;
      try {
        seasonData = JSON.parse(seasonDataScript);
      } catch(e) {
        return [];
      }

      // Find the target episode
      let targetEpUrl = null;
      for (const [seasonKey, epArr] of Object.entries(seasonData)) {
        for (const ep of epArr) {
          const epNo = ep.episode_no;
          const sNo = ep.s;
          if (
            (!season || parseInt(sNo) === parseInt(season)) &&
            (!episode || parseInt(epNo) === parseInt(episode))
          ) {
            // Reconstruct the URL using page base
            const pageBaseUrl = pageResp.url ? new URL(pageResp.url).origin : BASE_URL;
            targetEpUrl = `${pageBaseUrl}/${ep.slug}`;
            break;
          }
        }
        if (targetEpUrl) break;
      }

      if (!targetEpUrl) return [];

      // Load episode page
      try {
        const epResp = await fetch(targetEpUrl, {
          headers: { "Referer": `${SERIES_URL}/` },
          skipSizeCheck: true
        });
        const epHtml = await epResp.text();
        const $ep = cheerio.load(epHtml);

        // Get player list links
        const playerLinks = [];
        $ep("ul#player-list > li a").each((i, el) => {
          const href = $ep(el).attr("href");
          if (href) playerLinks.push(href.startsWith("http") ? href : SERIES_URL + href);
        });

        for (const linkUrl of playerLinks.slice(0, 3)) {
          try {
            const subResp = await fetch(linkUrl, {
              headers: { "Referer": `${SERIES_URL}/` },
              skipSizeCheck: true
            });
            const subHtml = await subResp.text();
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
          } catch(e) {}
        }
      } catch(e) {}
    }

    return streams;
  } catch (e) {
    console.error("[LayarKaca]", e);
    return [];
  }
}


module.exports = { getStreams };
