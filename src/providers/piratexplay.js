const cheerio = require("cheerio-without-node-native");
// piratexplay.js
// Piratexplay provider — Anime/Cartoon/Movies (Hindi)
// Searches title, finds episode URL, extracts iframes from page
// Iframes may use url= param, also handles PiratexplayExtractor (#playerFrame)

const BASE_URL = "https://piratexplay.cc";
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

    // 2. Search Piratexplay
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $s = cheerio.load(searchHtml);

    let pageUrl = null;
    $s("#movies-a ul li").each((_, el) => {
      if (!pageUrl) {
        const href = $s(el).find("a").attr("href");
        if (href && href.startsWith("http")) pageUrl = href;
      }
    });

    if (!pageUrl) return [];

    // 3. If TV series, navigate to correct season/episode
    if (mediaType === "tv" && season && episode) {
      const showHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);

      // Find season links
      const seasonLinks = [];
      $show("div.season-swiper a.season-btn").each((_, el) => {
        seasonLinks.push($show(el).attr("href"));
      });

      let targetSeasonUrl = seasonLinks[parseInt(season) - 1] || seasonLinks[0];
      if (targetSeasonUrl) {
        const fullSeasonUrl = targetSeasonUrl.startsWith("http") ? targetSeasonUrl : BASE_URL + targetSeasonUrl;
        const seasonHtml = await (await fetch(fullSeasonUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $season = cheerio.load(seasonHtml);

        let epUrl = null;
        $season("#episode_by_temp li").each((_, epEl) => {
          const $ep = $season(epEl);
          const headerSpan = $ep.find("header.entry-header span").text().trim();
          const parts = headerSpan.split("x");
          const epNum = parts[1] ? parseInt(parts[1]) : null;
          if (epNum === parseInt(episode)) {
            epUrl = $ep.find("a").attr("href");
          }
        });

        if (epUrl) pageUrl = epUrl.startsWith("http") ? epUrl : BASE_URL + epUrl;
      }
    }

    // 4. Fetch the final page and extract iframes
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    const streams = [];

    for (const el of $("iframe").toArray()) {
      let src = $(el).attr("src") || $(el).attr("data-src") || "";

      // Some iframes use url= param encoding
      if (src.includes("url=")) {
        src = src.split("url=").pop() || "";
      }

      src = src.trim();
      if (!src || !src.startsWith("http")) continue;

      // Handle PiratexplayExtractor pattern — look for #playerFrame on the embed page
      try {
        if (src.includes("piratexplay.cc")) {
          const innerHtml = await (await fetch(src, { headers: HEADERS, skipSizeCheck: true })).text();
          const $inner = cheerio.load(innerHtml);
          const innerSrc = $inner("#playerFrame").attr("src");
          if (innerSrc && innerSrc.startsWith("http")) {
            streams.push({
              url: innerSrc,
              quality: extractQuality(innerSrc),
              title: "Piratexplay",
              subtitles: []
            });
            continue;
          }
        }
      } catch (_) {}

      streams.push({
        url: src,
        quality: extractQuality(src),
        title: "Piratexplay",
        subtitles: []
      });
    }

    return streams;
  } catch (e) {
    console.error("[Piratexplay]", e);
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


