const cheerio = require("cheerio-without-node-native");
// animekhor.js
// Animekhor (https://animekhor.org) - Anime/Donghua streaming in Chinese
// Episode servers use base64-encoded HTML containing iframe src URLs

const BASE_URL = "https://animekhor.org";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search Animekhor
    const searchUrl = `${BASE_URL}/page/1/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    let itemUrl = null;
    $("div.listupd > article").each((_, el) => {
      if (!itemUrl) {
        const href = $(el).find("div.bsx > a").attr("href");
        if (href) itemUrl = href.startsWith("http") ? href : BASE_URL + href;
      }
    });
    if (!itemUrl) return [];

    // 3. Load anime page to get episodes list
    const animePage = await (await fetch(itemUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $2 = cheerio.load(animePage);

    const typeText = $2(".spe").text() || "";
    const isMovie = typeText.toLowerCase().includes("movie");

    let episodeUrl = null;

    if (isMovie) {
      episodeUrl = $2(".eplister li > a").attr("href") || itemUrl;
    } else {
      // For series, find episode page first
      const epPageUrl = $2(".eplister li > a").attr("href") || "";
      if (!epPageUrl) return [];

      const epPageHtml = await (await fetch(epPageUrl.startsWith("http") ? epPageUrl : BASE_URL + epPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $3 = cheerio.load(epPageHtml);

      const targetEp = episode || 1;

      // Animekhor episode list: div.episodelist > ul > li
      $3("div.episodelist > ul > li").each((_, el) => {
        const href = $3(el).find("a").attr("href");
        const epText = $3(el).find("a span").text();
        // epText format: "Episode N - Title" or similar
        const epNumMatch = epText.match(/(\d+)/);
        const epNum = parseInt(epNumMatch?.[1] || "0");
        if (epNum === targetEp || (!episodeUrl && epNum > 0)) {
          if (!episodeUrl) episodeUrl = href?.startsWith("http") ? href : BASE_URL + (href || "");
        }
      });

      if (!episodeUrl) {
        // Fallback: get first episode
        const firstEpHref = $3("div.episodelist > ul > li a").last().attr("href");
        if (firstEpHref) {
          episodeUrl = firstEpHref.startsWith("http") ? firstEpHref : BASE_URL + firstEpHref;
        }
      }
    }

    if (!episodeUrl) return [];

    // 4. Load episode page and extract servers
    const epHtml = await (await fetch(episodeUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $4 = cheerio.load(epHtml);

    const streams = [];

    // .mobius option values contain base64-encoded HTML with src="URL"
    $4(".mobius option").each((_, option) => {
      const base64Val = $4(option).attr("value") || "";
      if (!base64Val) return;
      try {
        const decoded = atob(base64Val);
        // Extract src URL from decoded HTML
        const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
        let url = srcMatch?.[1];
        if (url) {
          if (url.startsWith("//")) url = "https:" + url;
          if (url.startsWith("http")) {
            streams.push({
              url,
              quality: "Unknown",
              title: "Animekhor",
              subtitles: []
            });
          }
        }
      } catch (_) { /* skip invalid base64 */ }
    });

    return streams;
  } catch (e) {
    console.error("[Animekhor]", e);
    return [];
  }
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

