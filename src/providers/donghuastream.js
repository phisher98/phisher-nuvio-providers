const cheerio = require("cheerio-without-node-native");
// donghuastream.js
// Donghuastream - Chinese Anime/Donghua site (donghuastream.org)
// Search: /pagg/{page}/?s={query}
// Episodes: /eplister li > a  then episode page has option[data-index] with base64 encoded HTML containing iframe

const BASE_URL = "https://donghuastream.org";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

function extractQuality(str) {
  const u = (str || "").toLowerCase();
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

    // 2. Search
    const searchUrl = `${BASE_URL}/pagg/1/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("div.listupd > article").each((i, el) => {
      const href = $("div.bsx > a", el).attr("href");
      const t = $("div.bsx > a", el).attr("title") || "";
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const showUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;

    // 3. Load show page
    const showHtml = await (await fetch(showUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $show = cheerio.load(showHtml);

    const isMovie = $show(".spe").text().includes("Movie");

    let targetUrl = showUrl;

    if (!isMovie) {
      // For TV: get episode list page from first eplister link, then find episode
      const epListUrl = $show(".eplister li > a").first().attr("href") || "";
      if (!epListUrl) return [];

      const epListHtml = await (await fetch(epListUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $epList = cheerio.load(epListHtml);

      // Episodes in "div.episodelist > ul > li"
      const epItems = $epList("div.episodelist > ul > li").toArray();

      // Find the episode matching the requested episode number
      let epUrl = "";
      for (const item of epItems) {
        const epNumStr = $epList("a span", item).text().split("-")[0].trim();
        const epNum = parseInt(epNumStr);
        if (epNum === episode) {
          epUrl = $epList("a", item).attr("href") || "";
          break;
        }
      }

      if (!epUrl) {
        // Fallback: try last episode if only one season
        if (epItems.length > 0) {
          epUrl = $epList("a", epItems[epItems.length - 1]).attr("href") || "";
        }
      }

      if (!epUrl) return [];
      targetUrl = epUrl.startsWith("http") ? epUrl : `${BASE_URL}${epUrl}`;
    } else {
      // Movie: use first episode link if present
      const movieHref = $show(".eplister li > a").first().attr("href") || "";
      if (movieHref) {
        targetUrl = movieHref.startsWith("http") ? movieHref : `${BASE_URL}${movieHref}`;
      }
    }

    // 4. Load episode/movie page and extract streams
    const epHtml = await (await fetch(targetUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ep = cheerio.load(epHtml);

    const streams = [];

    // option[data-index] elements contain base64-encoded HTML with iframes
    const options = $ep("option[data-index]").toArray();
    for (const opt of options) {
      const b64 = $ep(opt).attr("value") || "";
      const label = $ep(opt).text().trim();
      if (!b64) continue;
      try {
        const decodedHtml = atob(b64);
        const $decoded = cheerio.load(decodedHtml);
        let iframeSrc = $decoded("iframe").attr("src") || "";

        if (!iframeSrc) continue;

        // Fix protocol
        if (iframeSrc.startsWith("//")) iframeSrc = "https:" + iframeSrc;
        if (!iframeSrc.startsWith("http")) continue;

        // Handle vidmoly special case
        if (iframeSrc.includes("vidmoly")) {
          const cleaned = "http:" + iframeSrc.substring(iframeSrc.indexOf('="') + 2).replace('"', "");
          streams.push({
            url: cleaned,
            quality: extractQuality(label),
            title: `Donghuastream [${label}]`,
            subtitles: []
          });
        } else if (iframeSrc.endsWith(".mp4")) {
          streams.push({
            url: iframeSrc,
            quality: extractQuality(label),
            title: `Donghuastream [${label}]`,
            subtitles: []
          });
        } else {
          streams.push({
            url: iframeSrc,
            quality: extractQuality(label),
            title: `Donghuastream [${label}]`,
            subtitles: []
          });
        }
      } catch (e) {}
    }

    return streams;
  } catch (e) {
    console.error("[Donghuastream]", e);
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


