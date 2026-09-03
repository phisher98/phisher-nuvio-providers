const cheerio = require("cheerio-without-node-native");
// pelisplushd.js
// Pelisplushd provider — Spanish-language movies/series
// Uses IMDB ID from TMDB to build embed URL like: mainUrl/f/{imdb_id} or mainUrl/f/{imdb_id}-{season}x0{episode}
// Then decrypts links via /api/decrypt endpoint

const BASE_URL = "https://pelisplushd.nz";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get IMDB ID from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const mediaInfo = await (await fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    const imdbId = mediaInfo.imdb_id || mediaInfo?.external_ids?.imdb_id;
    if (!imdbId) return [];

    // 2. Build embed URL
    const iframePath = (season && episode)
      ? `${BASE_URL}/f/${imdbId}-${season}x0${episode}`
      : `${BASE_URL}/f/${imdbId}`;

    const pageHtml = await (await fetch(iframePath, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    // 3. Extract dataLink JSON from script
    const scriptContent = $("script:not([src])").toArray()
      .map(el => $(el).html() || "")
      .find(s => s.includes("dataLink"));

    if (!scriptContent) return [];

    const jsonStr = scriptContent.split("dataLink = ")[1]?.split(";")[0];
    if (!jsonStr) return [];

    let dataLink;
    try {
      dataLink = JSON.parse(jsonStr);
    } catch (_) {
      return [];
    }

    const streams = [];

    // 4. For each language entry, decrypt links
    for (const langEntry of dataLink) {
      const language = langEntry.video_language || "Unknown";
      const embeds = langEntry.sortedEmbeds || [];
      const serverLinks = embeds.map(e => `"${e.link}"`).filter(l => l !== '""');

      if (serverLinks.length === 0) continue;

      try {
        const body = JSON.stringify({ links: serverLinks });
        const decryptResp = await (await fetch(`${BASE_URL}/api/decrypt`, {
          method: "POST",
          headers: { ...HEADERS, "Content-Type": "application/json; charset=utf-8" },
          body,
          skipSizeCheck: true
        })).json();

        if (decryptResp?.success && Array.isArray(decryptResp.links)) {
          for (const linkObj of decryptResp.links) {
            const url = linkObj.link;
            if (url && url.startsWith("http")) {
              streams.push({
                url,
                quality: extractQuality(url),
                title: `Pelisplushd [${language}]`,
                subtitles: []
              });
            }
          }
        }
      } catch (_) {}
    }

    return streams;
  } catch (e) {
    console.error("[Pelisplushd]", e);
    return [];
  }
}

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  if (u.includes("360p")) return "360p";
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


