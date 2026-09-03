const cheerio = require("cheerio-without-node-native");
// pencurimovie.js
// Pencurimovie provider — Indonesian movies/series/anime
// Searches by title, finds the show page, then extracts iframes from div.movieplay

const BASE_URL = "https://ww73.pencurimovie.bond";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search on Pencurimovie
    const searchUrl = `${BASE_URL}?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $s = cheerio.load(searchHtml);

    // Find first result
    let pageUrl = null;
    $s("div.ml-item a").each((_, el) => {
      if (!pageUrl) {
        const href = $s(el).attr("href");
        if (href && href.startsWith("http")) pageUrl = href;
      }
    });

    if (!pageUrl) return [];

    // 3. If TV series and season/episode given, navigate to the right episode
    if (mediaType === "tv" && season && episode) {
      const showHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);

      // Find episode link
      let epUrl = null;
      $show("div.tvseason").each((_, seasonEl) => {
        const $season = $show(seasonEl);
        const seasonText = $season.find("strong").text();
        const sNum = seasonText.match(/Season\s*(\d+)/i)?.[1];
        if (sNum && parseInt(sNum) === parseInt(season)) {
          $season.find("div.les-content a").each((_, epEl) => {
            const epText = $show(epEl).text();
            const eNum = epText.match(/Episode\s*(\d+)/i)?.[1];
            if (eNum && parseInt(eNum) === parseInt(episode)) {
              epUrl = $show(epEl).attr("href");
            }
          });
        }
      });

      if (epUrl) pageUrl = epUrl.startsWith("http") ? epUrl : BASE_URL + epUrl;
    }

    // 4. Fetch the page and extract iframes
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    const streams = [];
    $("div.movieplay iframe").each((i, el) => {
      const src = $(el).attr("data-src") || $(el).attr("src");
      if (src && src.startsWith("http")) {
        streams.push({
          url: src,
          quality: extractQuality(src),
          title: `Pencurimovie [Server ${i + 1}]`,
          subtitles: []
        });
      }
    });

    return streams;
  } catch (e) {
    console.error("[Pencurimovie]", e);
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


