const cheerio = require("cheerio-without-node-native");
// movies4u.js
// Movies4u - Hindi/Bollywood/Hollywood download links provider via movies4u.style

const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const FALLBACK_URL = "https://new2.movies4u.style";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "xla=s4t"
};

let cachedBaseUrl = null;

async function getBaseUrl() {
  if (cachedBaseUrl) return cachedBaseUrl;
  try {
    const resp = await fetch(DOMAINS_URL, { skipSizeCheck: true });
    const data = await resp.json();
    cachedBaseUrl = data.movies4u || FALLBACK_URL;
  } catch(e) {
    cachedBaseUrl = FALLBACK_URL;
  }
  return cachedBaseUrl;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const BASE_URL = await getBaseUrl();

    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search Movies4u
    const searchResp = await fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
      headers: HEADERS,
      skipSizeCheck: true
    });
    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("article").each((i, el) => {
      const a = $(el).find("h3 a, h2 a").first();
      const href = a.attr("href");
      const name = a.text().replace(/\(\d{4}\)/, "").trim();
      if (href && name) results.push({ href, name });
    });

    if (results.length === 0) return [];

    const isMovie = mediaType === "movie";
    const match = results.find(r =>
      r.name.toLowerCase().includes(title.toLowerCase())
    ) || results[0];

    // Step 3: Load content page
    const pageResp = await fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
    const pageHtml = await pageResp.text();
    const $p = cheerio.load(pageHtml);

    const streams = [];

    if (isMovie) {
      // Movie: get direct download links
      const downloadLinks = [];
      $p("div.downloads-btns-div a[href]").each((i, el) => {
        downloadLinks.push($p(el).attr("href"));
      });

      for (const link of downloadLinks.slice(0, 8)) {
        if (!link) continue;
        streams.push({
          url: link,
          quality: extractQuality(link),
          title: `Movies4u (${extractQuality(link)})`,
          subtitles: []
        });
      }
    } else {
      // TV Series: navigate to season quality page, then find episodes
      const seasonLinks = [];

      // "div.download-links-div h4" - each h4 mentions Season N
      $p("div.download-links-div h4").each((i, el) => {
        const h4Text = $p(el).text();
        const sMatch = h4Text.match(/Season\s*(\d+)/i);
        if (!sMatch) return;
        const sNum = parseInt(sMatch[1]);
        if (season && sNum !== parseInt(season)) return;

        // Quality links follow as siblings
        const nextEl = $p(el).next();
        nextEl.find("a[href]").each((j, a) => {
          const href = $p(a).attr("href");
          if (href && !$p(a).text().includes("zip")) {
            seasonLinks.push({ href, season: sNum });
          }
        });
      });

      // For each quality link, try to navigate to episode list
      for (const { href, season: sNum } of seasonLinks.slice(0, 3)) {
        try {
          const seasonResp = await fetch(href, { headers: HEADERS, skipSizeCheck: true });
          const seasonHtml = await seasonResp.text();
          const $s = cheerio.load(seasonHtml);

          // Find episodes: h5 elements or direct links
          const epBlocks = $s("h5");
          if (epBlocks.length > 0) {
            $s("h5").each((i, h5) => {
              const epText = $s(h5).text();
              const epMatch = epText.match(/Episodes:\s*(\d+)/);
              if (!epMatch) return;
              const epNum = parseInt(epMatch[1]);
              if (episode && epNum !== parseInt(episode)) return;

              const links = [];
              $s(h5).next().find("a[href]").each((j, a) => {
                links.push($s(a).attr("href"));
              });

              for (const lnk of links) {
                if (!lnk) continue;
                streams.push({
                  url: lnk,
                  quality: extractQuality(lnk),
                  title: `Movies4u S${sNum}E${epNum}`,
                  subtitles: []
                });
              }
            });
          } else {
            // No episode blocks - this might be the direct link
            if (!episode || episode === "1") {
              streams.push({
                url: href,
                quality: extractQuality(href),
                title: `Movies4u S${sNum}`,
                subtitles: []
              });
            }
          }
        } catch(e) {}
      }
    }

    return streams;
  } catch (e) {
    console.error("[Movies4u]", e);
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

