const cheerio = require("cheerio-without-node-native");
// animedubhindi.js
// AnimeDubHindi (https://www.animedubhindi.me) - Hindi dubbed anime
// Downloads via HubCloud/GDFlix links, episodes parsed from series page

const BASE_URL = "https://www.animedubhindi.me";
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

    // 2. Search AnimeDubHindi
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    let itemUrl = null;
    $("article").each((_, el) => {
      if (!itemUrl) {
        const href = $(el).find("h2 a").attr("href");
        if (href) itemUrl = href;
      }
    });
    if (!itemUrl) return [];

    // 3. Load anime detail page
    const itemHtml = await (await fetch(itemUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $2 = cheerio.load(itemHtml);

    // Get the series/episode index iframe href
    const iframeLinkHref = $2("div.wp-block-button a").attr("href");
    if (!iframeLinkHref) return [];

    const rawTitle = $2("meta[property='og:title']").attr("content") || "";
    const isMovie = rawTitle.toLowerCase().includes("movie");

    if (isMovie) {
      // Movies - direct download links
      const iframeHtml = await (await fetch(iframeLinkHref, { headers: HEADERS, skipSizeCheck: true })).text();
      const $3 = cheerio.load(iframeHtml);
      const streams = [];

      // Old structure: h4 links
      $3("div.entry-content h4").each((_, h4) => {
        const quality = $3(h4).text().split("[Size")[0].trim();
        $3(h4).find("a").each((__, a) => {
          const href = $3(a).attr("href");
          if (href && (href.includes("hubcloud") || href.includes("gdflix"))) {
            streams.push({
              url: href,
              quality: quality.includes("1080") ? "1080p" : quality.includes("720") ? "720p" : quality.includes("480") ? "480p" : "Unknown",
              title: `AnimeDubHindi [${quality}]`,
              subtitles: []
            });
          }
        });
      });

      return streams;
    } else {
      // Series - find episode by number
      const targetEp = episode || 1;
      const iframeHtml = await (await fetch(iframeLinkHref, { headers: HEADERS, skipSizeCheck: true })).text();
      const $3 = cheerio.load(iframeHtml);
      const streams = [];

      // Parse episode cards (pro-ep-card style)
      $3("div.pro-ep-card").each((_, card) => {
        const epText = $3(card).find(".pro-ep-title").text();
        const epNum = parseInt(epText.replace("Episode:", "").trim());
        if (epNum === targetEp) {
          $3(card).find(".pro-btn-group a").each((__, a) => {
            const href = $3(a).attr("href");
            if (href && (href.includes("hubcloud") || href.includes("gdflix"))) {
              streams.push({
                url: href,
                quality: "Unknown",
                title: `AnimeDubHindi [E${targetEp}]`,
                subtitles: []
              });
            }
          });
        }
      });

      // Parse wp-block-group style episodes
      if (!streams.length) {
        $3("div.wp-block-group").each((_, block) => {
          const h2 = $3(block).find("h2:contains(Episode)");
          if (!h2.length) return;
          const epText = h2.text();
          const epNum = parseInt(epText.replace("Episode:", "").trim());
          if (epNum === targetEp) {
            $3(block).find("a").each((__, a) => {
              const href = $3(a).attr("href");
              if (href && (href.includes("hubcloud") || href.includes("gdflix"))) {
                streams.push({
                  url: href,
                  quality: "Unknown",
                  title: `AnimeDubHindi [E${targetEp}]`,
                  subtitles: []
                });
              }
            });
          }
        });
      }

      return streams;
    }
  } catch (e) {
    console.error("[AnimeDubHindi]", e);
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

