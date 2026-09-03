const cheerio = require("cheerio-without-node-native");
// coflix.js
// Coflix - French language movie & series site (coflix.wales)
// Uses WP-JSON API: /wp-json/apiflix/v1  and suggest.php for search
// Stream links: iFrame → li[onclick] with base64 encoded URLs

const BASE_URL = "https://coflix.wales";
const COFLIX_API = `${BASE_URL}/wp-json/apiflix/v1`;
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search via suggest.php
    const searchUrl = `${BASE_URL}/suggest.php?query=${encodeURIComponent(title)}`;
    const searchResults = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    if (!Array.isArray(searchResults) || !searchResults.length) return [];

    const isTV = mediaType === "tv";

    // 3. Find best match
    const lcTitle = title.toLowerCase();
    let match = searchResults.find(r => (r.title || "").toLowerCase().includes(lcTitle));
    if (!match) match = searchResults[0];
    if (!match || !match.url) return [];

    const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;

    // 4. Load page
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    let streamPageUrl = pageUrl;

    if (isTV) {
      // Find season/episode via API
      const postId = $("section.sc-seasons ul li input[post-id]").first().attr("post-id");
      const dataSeason = $(`section.sc-seasons ul li input[data-season="${season}"]`).attr("post-id")
        || $("section.sc-seasons ul li input").filter((i, el) => $(el).attr("data-season") == season).attr("post-id")
        || postId;

      if (!dataSeason) return [];

      const epResUrl = `${COFLIX_API}/series/${dataSeason}/${season}`;
      const epData = await (await fetch(epResUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const episodes = epData.episodes || [];
      const ep = episodes.find(e => parseInt(e.number) === episode || parseInt(e.season) === season && parseInt(e.number) === episode);
      if (!ep || !ep.links) return [];
      streamPageUrl = ep.links;
    }

    // 5. Get iframe from stream page
    const streamHtml = await (await fetch(streamPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $stream = cheerio.load(streamHtml);
    const iframeSrc = $stream("div.embed iframe").attr("src") || "";
    if (!iframeSrc) return [];

    // 6. Load iframe page and find li[onclick] with base64 URLs
    const iframeHtml = await (await fetch(iframeSrc, { headers: { ...HEADERS, Referer: BASE_URL }, skipSizeCheck: true })).text();
    const $iframe = cheerio.load(iframeHtml);

    const streams = [];
    $iframe("li[onclick]").each((i, li) => {
      const onclick = $iframe(li).attr("onclick") || "";
      const b64Match = onclick.match(/showVideo\('([^']+)'/);
      if (!b64Match) return;
      try {
        const url = atob(b64Match[1]);
        if (url.startsWith("http")) {
          streams.push({
            url,
            quality: extractQuality(url),
            title: `Coflix [${$iframe(li).text().trim() || "Stream"}]`,
            subtitles: []
          });
        }
      } catch (e) {}
    });

    return streams;
  } catch (e) {
    console.error("[Coflix]", e);
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


