const cheerio = require("cheerio-without-node-native");
// masstamilan.js
// MassTamilan - Tamil/Telugu/Hindi music songs provider via masstamilan.dev
// Note: This is primarily a music provider (audio streams), not video

const BASE_URL = "https://masstamilan.dev";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const PROXY = "https://goodproxy.goodproxy.workers.dev/fetch?url=";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search MassTamilan
    const searchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(title)}`;
    const searchResp = await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true });
    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("div.a-i").each((i, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href");
      const name = $(el).find("div h2").text().trim();
      if (href && name) {
        results.push({
          href: href.startsWith("http") ? href : BASE_URL + href,
          name
        });
      }
    });

    if (results.length === 0) return [];

    // Best match
    const match = results.find(r =>
      r.name.toLowerCase().includes(title.toLowerCase())
    ) || results[0];

    // Step 3: Load the album/movie page
    const pageResp = await fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
    const pageHtml = await pageResp.text();
    const $p = cheerio.load(pageHtml);

    const streams = [];

    // Step 4: Extract song download links from #tlist tbody tr
    // Each row has multiple quality download links
    $p("#tlist > tbody > tr[itemprop]").each((i, row) => {
      const songName = $p(row).find("td > span > h2 > span[itemprop~=name] > a").text().trim();
      $p(row).find("td > a").each((j, a) => {
        const linkHref = $p(a).attr("href");
        const linkText = $p(a).text().trim();
        if (linkHref) {
          const fullLink = linkHref.startsWith("http") ? linkHref : BASE_URL + linkHref;
          streams.push({
            url: `${PROXY}${encodeURIComponent(fullLink)}`,
            quality: extractQuality(linkText),
            title: `MassTamilan - ${songName || title} (${linkText})`,
            subtitles: []
          });
        }
      });
    });

    // Also look for zip download links
    $p("h2.ziparea > a.dlink").each((i, el) => {
      const linkHref = $p(el).attr("href");
      const linkText = $p(el).text().trim();
      if (linkHref) {
        const fullLink = linkHref.startsWith("http") ? linkHref : BASE_URL + linkHref;
        streams.push({
          url: `${PROXY}${encodeURIComponent(fullLink)}`,
          quality: "Unknown",
          title: `MassTamilan - Full Zip (${linkText})`,
          subtitles: []
        });
      }
    });

    return streams;
  } catch (e) {
    console.error("[MassTamilan]", e);
    return [];
  }
}

function extractQuality(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("320") || t.includes("hq")) return "Unknown"; // Audio quality
  if (t.includes("128")) return "Unknown";
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

