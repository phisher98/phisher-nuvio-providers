const cheerio = require("cheerio-without-node-native");
// anime-dekho.js
// AnimeDekho (https://animedekho.app) - Hindi dubbed anime, uses WP post-ID to find iframes
// Searches site, gets body class postid, loops trdekho=0..10 to find iframes

const BASE_URL = "https://animedekho.app";
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

    // 2. Search AnimeDekho
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    let itemUrl = null;
    $("ul[data-results] li article").each((_, el) => {
      if (!itemUrl) {
        const href = $(el).find("a.lnk-blk").attr("href");
        if (href) itemUrl = href;
      }
    });

    if (!itemUrl) {
      // Fallback: try articles
      $("article").each((_, el) => {
        if (!itemUrl) {
          const href = $(el).find("a.lnk-blk").attr("href");
          if (href) itemUrl = href;
        }
      });
    }
    if (!itemUrl) return [];

    // 3. Load anime page and find postid
    const animePage = await (await fetch(itemUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $2 = cheerio.load(animePage);
    const bodyClass = $2("body").attr("class") || "";

    const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
    const term = termMatch?.[1];
    if (!term) return [];

    // 4. For TV shows, find episode page first
    // Check if there are seasons
    const seasonItems = $2("ul.seasons-lst li");
    let targetUrl = itemUrl;
    let mediaType2 = 1; // movie

    if (seasonItems.length > 0) {
      // It's a series - find the right episode
      mediaType2 = 2;
      seasonItems.each((_, el) => {
        const seasonNum = $2(el).find("h3.title > span").text().match(/S(\d+)/)?.[1];
        const href = $2(el).find("a").attr("href");
        if (href && parseInt(seasonNum) === (season || 1)) {
          targetUrl = href;
        }
      });
    }

    // 5. Get postid for target page
    const targetPage = await (await fetch(targetUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $3 = cheerio.load(targetPage);
    const targetBodyClass = $3("body").attr("class") || "";
    const targetTermMatch = targetBodyClass.match(/(?:term|postid)-(\d+)/);
    const targetTerm = targetTermMatch?.[1] || term;

    // 6. Loop trdekho 0..10 to find iframes
    const streams = [];
    const epNum = episode || 1;

    for (let i = 0; i <= 10; i++) {
      try {
        const iframePageUrl = `${BASE_URL}/?trdekho=${i}&trid=${targetTerm}&trtype=${mediaType2}`;
        const iframePageHtml = await (await fetch(iframePageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $4 = cheerio.load(iframePageHtml);
        const iframeSrc = $4("iframe").attr("src");

        if (iframeSrc && iframeSrc.startsWith("http")) {
          streams.push({
            url: iframeSrc,
            quality: "Unknown",
            title: `AnimeDekho [S${season || 1}E${epNum}]`,
            subtitles: []
          });
        }
      } catch (_) { /* skip */ }
    }

    return streams;
  } catch (e) {
    console.error("[AnimeDekho]", e);
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





