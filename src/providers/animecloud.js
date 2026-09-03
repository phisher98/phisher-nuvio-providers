const cheerio = require("cheerio-without-node-native");
// animecloud.js
// AnimeCloud (https://fireani.me) - German anime site with REST JSON API
// API: /api/anime/search?q=, /api/anime?slug=, /api/anime/episode?slug=&season=&episode=

const BASE_URL = "https://fireani.me";
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

    // 2. Search AnimeCloud API
    const searchUrl = `${BASE_URL}/api/anime/search?q=${encodeURIComponent(title)}`;
    const searchRes = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const results = searchRes?.data || [];
    if (!results.length) return [];

    // 3. Find best match by slug
    const slug = results[0]?.slug;
    if (!slug) return [];

    // 4. Get anime detail to find season info
    const detailUrl = `${BASE_URL}/api/anime?slug=${slug}`;
    const detailRes = await (await fetch(detailUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const animeData = detailRes?.data;
    if (!animeData) return [];

    const animeSeasons = animeData.anime_seasons || [];

    // 5. Find correct season
    const targetSeason = season || 1;
    const targetEp = episode || 1;

    let searchSeason = String(targetSeason);
    // Season 0 = "Filme" for movies
    if (targetSeason === 0) searchSeason = "Filme";

    // 6. Fetch episode links
    const epUrl = `${BASE_URL}/api/anime/episode?slug=${slug}&season=${encodeURIComponent(searchSeason)}&episode=${targetEp}`;
    const epRes = await (await fetch(epUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const episodeLinks = epRes?.data?.anime_episode_links || [];

    if (!episodeLinks.length) return [];

    const streams = [];

    for (const link of episodeLinks) {
      const href = link.link;
      const lang = link.lang?.toUpperCase() || "Unknown";
      if (!href) continue;

      // Try to extract direct video from the link
      try {
        const pageHtml = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
        const $ = cheerio.load(pageHtml);

        // Look for m3u8 or direct video
        const m3u8Match = pageHtml.match(/file:\s*["']([^"']+\.m3u8[^"']*)/i);
        if (m3u8Match) {
          streams.push({
            url: m3u8Match[1],
            quality: "1080p",
            title: `AnimeCloud [${lang}]`,
            subtitles: []
          });
          continue;
        }

        // Look for iframe sources
        const iframeSrc = $("iframe").attr("src") || $("iframe").attr("data-src");
        if (iframeSrc) {
          const iframeUrl = iframeSrc.startsWith("http") ? iframeSrc : BASE_URL + iframeSrc;
          streams.push({
            url: iframeUrl,
            quality: "1080p",
            title: `AnimeCloud [${lang}]`,
            subtitles: []
          });
        }
      } catch (_) {
        // If extraction fails, add raw link
        streams.push({
          url: href,
          quality: "Unknown",
          title: `AnimeCloud [${lang}]`,
          subtitles: []
        });
      }
    }

    return streams;
  } catch (e) {
    console.error("[AnimeCloud]", e);
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
        } else if (s.url.includes('.mp4') || s.url.includes('.m3u8') || s.url.startsWith('magnet:')) {
            finalStreams.push(s);
        }
    }
    return finalStreams;
}
module.exports = { getStreams: wrappedGetStreams };

