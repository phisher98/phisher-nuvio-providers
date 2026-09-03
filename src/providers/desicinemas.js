const cheerio = require("cheerio-without-node-native");
// desicinemas.js
// Desicinemas - Hindi/Punjabi/Bollywood movie site (desicinemas.to)
// Uses a Cloudflare Worker proxy for requests
// Stream links: found from .MovieList .OptionBx items → iframe extraction

const BASE_URL = "https://desicinemas.to";
const PROXY = "https://desicinemas.phisherdesicinema.workers.dev/";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": BASE_URL,
  "Connection": "keep-alive",
  "Cache-Control": "no-cache"
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
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search via proxy
    const searchUrl = `${PROXY}?url=${encodeURIComponent(`${BASE_URL}/?s=${encodeURIComponent(title)}`)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $(".MovieList li, .MovieList .TPostMv").each((i, el) => {
      const href = $("a", el).attr("href");
      const t = $("h2", el).text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
    const proxyPageUrl = `${PROXY}?url=${encodeURIComponent(pageUrl)}`;

    // 3. Load page via proxy to get option boxes
    const pageHtml = await (await fetch(proxyPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const streams = [];

    const optionBoxes = $page(".MovieList .OptionBx, .OptionBx").toArray();
    for (const box of optionBoxes) {
      try {
        const linkEl = $page("a", box);
        const link = linkEl.attr("href");
        if (!link) continue;

        // Fetch the embed page
        const embedHtml = await (await fetch(link, { headers: HEADERS, skipSizeCheck: true })).text();
        const $embed = cheerio.load(embedHtml);
        const iframeSrc = $embed("iframe").attr("src");
        if (!iframeSrc) continue;

        const name = $page("p.AAIco-dns", box).text().trim() || "Desicinemas";
        streams.push({
          url: iframeSrc,
          quality: extractQuality(iframeSrc),
          title: `Desicinemas [${name}]`,
          subtitles: []
        });
      } catch (e) {}
    }

    return streams;
  } catch (e) {
    console.error("[Desicinemas]", e);
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


