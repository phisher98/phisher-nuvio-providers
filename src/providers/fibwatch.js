const cheerio = require("cheerio-without-node-native");
// fibwatch.js
// FibWatch - Hindi/Bangla/South Indian multilingual movie & series site (fibwatch.top)
// Search: /search?keyword={query}&page_id=1
// Video IDs from input#video-id → /ajax/resolution_switcher.php?video_id={id}
// Episodes via: /ajax/episodes.php?video_id={id}

const BASE_URL = "https://fibwatch.top";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160") || u.includes("4k")) return "4K";
  if (u.includes("1080")) return "1080p";
  if (u.includes("720")) return "720p";
  if (u.includes("480")) return "480p";
  if (u.includes("360")) return "360p";
  return "Unknown";
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search
    const searchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(title)}&page_id=1`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("div.video-thumb").each((i, el) => {
      const href = $("a", el).attr("href");
      const t = $("p.hptag", el).text().trim() || $("div.video-thumb img", el).attr("alt") || "";
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const isTV = mediaType === "tv";
    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;

    // 3. Load show page
    const showHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $show = cheerio.load(showHtml);

    const videoId = $show("input#video-id").attr("value");
    if (!videoId) return [];

    // 4. Get streams based on type
    const streams = [];

    if (isTV) {
      // Get episodes list
      const epDataUrl = `${BASE_URL}/ajax/episodes.php?video_id=${videoId}`;
      const epData = await (await fetch(epDataUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const episodes = epData.episodes || [];

      if (!episodes.length) return [];

      // Find matching episode by parsing title for SxEx pattern
      let targetEpUrl = "";
      for (const ep of episodes) {
        const epTitle = (ep.title || "").toLowerCase();
        const m = epTitle.match(/s(\d{1,2})e(\d{1,3})/);
        if (m) {
          const epSeason = parseInt(m[1]);
          const epEpisode = parseInt(m[2]);
          if (epSeason === season && epEpisode === episode) {
            targetEpUrl = ep.url ? (ep.url.startsWith("http") ? ep.url : `${BASE_URL}${ep.url}`) : "";
            break;
          }
        }
      }

      if (!targetEpUrl && episodes.length > 0) {
        // Fallback: use first episode
        targetEpUrl = episodes[0].url ? (episodes[0].url.startsWith("http") ? episodes[0].url : `${BASE_URL}${episodes[0].url}`) : "";
      }

      if (!targetEpUrl) return [];

      // Load episode page
      const epHtml = await (await fetch(targetEpUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ep = cheerio.load(epHtml);
      const epVideoId = $ep("input#video-id").attr("value");

      if (epVideoId) {
        const resUrl = `${BASE_URL}/ajax/resolution_switcher.php?video_id=${epVideoId}`;
        const resData = await (await fetch(resUrl, { headers: HEADERS, skipSizeCheck: true })).json();
        const allLinks = [...(resData.current || []), ...(resData.popup || [])];
        for (const item of allLinks) {
          const url = (item.url || "").trim();
          if (!url) continue;
          // Direct media check
          if (url.match(/\.(mp4|mkv|m3u8)/i)) {
            streams.push({
              url,
              quality: extractQuality(item.res || url),
              title: `FibWatch [${item.res || "Stream"}]`,
              subtitles: []
            });
          } else {
            // Try to get download URL
            try {
              const dlHtml = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
              const $dl = cheerio.load(dlHtml);
              const dlUrl = ($dl("a.hidden-button.buttonDownloadnew").attr("href") || "").replace(/.*url=/, "").trim();
              if (dlUrl && dlUrl.startsWith("http")) {
                streams.push({
                  url: dlUrl,
                  quality: extractQuality(item.res || dlUrl),
                  title: `FibWatch [${item.res || "Stream"}]`,
                  subtitles: []
                });
              }
            } catch (e) {}
          }
        }
      }
    } else {
      // Movie: use resolution switcher
      const resUrl = `${BASE_URL}/ajax/resolution_switcher.php?video_id=${videoId}`;
      const resData = await (await fetch(resUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const allLinks = [...(resData.current || []), ...(resData.popup || [])];

      for (const item of allLinks) {
        const url = (item.url || "").trim();
        if (!url) continue;
        if (url.match(/\.(mp4|mkv|m3u8)/i)) {
          streams.push({
            url,
            quality: extractQuality(item.res || url),
            title: `FibWatch [${item.res || "Stream"}]`,
            subtitles: []
          });
        } else {
          try {
            const dlHtml = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
            const $dl = cheerio.load(dlHtml);
            const onclick = $dl("a.hidden-button.buttonDownloadnew").attr("href") || "";
            const dlUrl = onclick.replace(/.*url=/, "").trim();
            if (dlUrl && dlUrl.startsWith("http")) {
              streams.push({
                url: dlUrl,
                quality: extractQuality(item.res || dlUrl),
                title: `FibWatch [${item.res || "Stream"}]`,
                subtitles: []
              });
            }
          } catch (e) {}
        }
      }

      // Fallback: check for download button directly on show page
      if (streams.length === 0) {
        const dlBtn = $show("a.hidden-button.buttonDownloadnew").attr("href") || "";
        const dlUrl = dlBtn.replace(/.*url=/, "").trim();
        if (dlUrl && dlUrl.startsWith("http")) {
          streams.push({
            url: dlUrl,
            quality: "Unknown",
            title: "FibWatch",
            subtitles: []
          });
        }
      }
    }

    return streams;
  } catch (e) {
    console.error("[FibWatch]", e);
    return [];
  }
}


module.exports = { getStreams };
