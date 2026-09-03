const cheerio = require("cheerio-without-node-native");
// megakino.js
// Megakino - German movies/series provider via megakino.team with Gxplayer embeds

const BASE_URL = "https://megakino.team";
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

    // Step 2: Search Megakino via POST form
    const searchResp = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `do=search&subaction=search&story=${encodeURIComponent(title.replace(/ /g, "+"))}`,
      skipSizeCheck: true
    });
    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("a.poster.grid-item").each((i, el) => {
      const href = $(el).attr("href");
      const name = $(el).find("h3").text().trim();
      if (href && name) results.push({ href, name });
    });

    if (results.length === 0) return [];

    // Best match
    const match = results.find(r =>
      r.name.toLowerCase().includes(title.toLowerCase())
    ) || results[0];

    // Step 3: Load content page
    const pageResp = await fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
    const pageHtml = await pageResp.text();
    const $p = cheerio.load(pageHtml);

    const streams = [];
    const iframes = [];

    // For movies: "div.pmovie__player iframe"
    $p("div.pmovie__player iframe").each((i, el) => {
      const src = $p(el).attr("src") || $p(el).attr("data-src");
      if (src) iframes.push(src);
    });

    // For TV series: find episode options from select
    if (iframes.length === 0 && mediaType === "tv") {
      // "select.flex-grow-1.mr-select option" - each has data-season and value
      $p("select.flex-grow-1.mr-select option").each((i, el) => {
        const epSeason = $p(el).attr("data-season");
        const epValue = $p(el).val();
        if (episode && epSeason) {
          // Try to match episode number
          if (parseInt(epSeason) === parseInt(episode)) {
            if (epValue) iframes.push(epValue);
          }
        }
      });

      if (iframes.length === 0) {
        // Just get first option
        const firstOption = $p("select.flex-grow-1.mr-select option").first();
        const val = firstOption.val();
        if (val) iframes.push(val);
      }
    }

    // Step 4: Process each iframe (likely Gxplayer)
    for (const iframeUrl of iframes.slice(0, 5)) {
      if (!iframeUrl || !iframeUrl.startsWith("http")) continue;

      try {
        if (iframeUrl.includes("gxplayer") || iframeUrl.includes("watch.gxplayer")) {
          // Gxplayer: fetch the page and extract "var video = {...};"
          const playerResp = await fetch(iframeUrl, {
            headers: { "Referer": BASE_URL, "User-Agent": HEADERS["User-Agent"] },
            skipSizeCheck: true
          });
          const playerText = await playerResp.text();

          const videoVarMatch = playerText.match(/var video\s*=\s*(\{[^;]+\});/);
          if (videoVarMatch) {
            const videoData = JSON.parse(videoVarMatch[1]);
            if (videoData.uid && videoData.md5 && videoData.id) {
              const gxBase = "https://watch.gxplayer.xyz";
              const m3u8Url = `${gxBase}/m3u8/${videoData.uid}/${videoData.md5}/master.txt?s=1&id=${videoData.id}&cache=${videoData.status}`;
              streams.push({
                url: m3u8Url,
                quality: mapQuality(videoData.quality || ""),
                title: "Megakino (Gxplayer)",
                subtitles: []
              });
            }
          }
        } else {
          // Try to find m3u8 directly from the iframe page
          const playerResp = await fetch(iframeUrl, {
            headers: { "Referer": BASE_URL, "User-Agent": HEADERS["User-Agent"] },
            skipSizeCheck: true
          });
          const playerText = await playerResp.text();
          const m3u8Match = playerText.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
          if (m3u8Match) {
            streams.push({
              url: m3u8Match[1],
              quality: "Unknown",
              title: "Megakino",
              subtitles: []
            });
          }
        }
      } catch(e) {}
    }

    return streams;
  } catch (e) {
    console.error("[Megakino]", e);
    return [];
  }
}

function mapQuality(q) {
  const u = (q || "").toLowerCase();
  if (u.includes("4k") || u.includes("2160")) return "4K";
  if (u.includes("1080")) return "1080p";
  if (u.includes("720")) return "720p";
  if (u.includes("480")) return "480p";
  return "Unknown";
}




const { extract } = require('../utils/extractors.js');
async function wrappedGetStreams(...args) {
    const streams = await getStreams(...args);
    const finalStreams = [];
    for (const s of streams) {
        if (!s.url) continue;
        const ext = await extract(s.url);
        if (ext) {
            s.url = ext.url;
            if (ext.quality !== 'Unknown') s.quality = ext.quality;
            finalStreams.push(s);
        } else if (
            s.url.includes('.mp4') || 
            s.url.includes('.m3u8') || 
            s.url.includes('.mkv') || 
            s.url.includes('.avi') || 
            s.url.startsWith('magnet:') ||
            s.url.includes('/api/file/') ||
            s.url.includes('.cloudflarestorage.com')
        ) {
            finalStreams.push(s);
        }
    }
    return finalStreams;
}
module.exports = { getStreams: wrappedGetStreams };


