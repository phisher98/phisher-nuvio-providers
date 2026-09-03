const cheerio = require("cheerio-without-node-native");
// movierulzhd.js
// Movierulzhd - Hindi movies/series provider with WordPress admin-ajax embed extraction

const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const FALLBACK_URL = "https://123moviesfree9.cloud";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

let cachedBaseUrl = null;

async function getBaseUrl() {
  if (cachedBaseUrl) return cachedBaseUrl;
  try {
    const resp = await fetch(DOMAINS_URL, { skipSizeCheck: true });
    const data = await resp.json();
    cachedBaseUrl = data.movierulzhd || FALLBACK_URL;
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

    // Step 2: Search Movierulzhd
    const searchResp = await fetch(`${BASE_URL}/search/${encodeURIComponent(title.replace(/ /g, "-"))}`, {
      headers: HEADERS,
      skipSizeCheck: true
    });
    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("div.result-item").each((i, el) => {
      const a = $(el).find("div.title > a");
      const href = a.attr("href");
      const name = a.text().replace(/\(\d{4}\)/, "").trim();
      if (href && name) results.push({ href, name });
    });

    if (results.length === 0) return [];

    const match = results.find(r =>
      r.name.toLowerCase().includes(title.toLowerCase())
    ) || results[0];

    // Resolve proper link (handle episodes/seasons URL patterns)
    let contentUrl = match.href;
    if (contentUrl.includes("/episodes/")) {
      const t = contentUrl.split("/episodes/")[1];
      const slug = t.match(/(.+?)-season/)?.[1] || t;
      contentUrl = `${BASE_URL}/tvshows/${slug}`;
    } else if (contentUrl.includes("/seasons/")) {
      const t = contentUrl.split("/seasons/")[1];
      const slug = t.match(/(.+?)-season/)?.[1] || t;
      contentUrl = `${BASE_URL}/tvshows/${slug}`;
    }

    // Step 3: Load content page
    const pageResp = await fetch(contentUrl, { headers: HEADERS, skipSizeCheck: true });
    const pageHtml = await pageResp.text();
    const $p = cheerio.load(pageHtml);
    const directUrl = new URL(pageResp.url || contentUrl).origin;

    const isMovie = mediaType === "movie";
    const streams = [];

    if (!isMovie && mediaType === "tv") {
      // TV Series: find episode list
      const epLinks = [];
      $p("ul.episodios > li").each((i, el) => {
        const href = $p(el).find("a").attr("href");
        const numText = $p(el).find("div.numerando").text().replace(/ /g, "");
        const parts = numText.split("-");
        const sNum = parseInt(parts[0] || "0");
        const eNum = parseInt(parts[1] || "0");
        if (href) epLinks.push({ href, season: sNum, episode: eNum });
      });

      if (epLinks.length > 0) {
        // Find matching episode
        let targetEp = epLinks.find(ep =>
          ep.season === parseInt(season || 1) && ep.episode === parseInt(episode || 1)
        ) || epLinks[0];

        // Load episode page
        const epResp = await fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true });
        const epHtml = await epResp.text();
        const $ep = cheerio.load(epHtml);
        const epDirectUrl = new URL(epResp.url || targetEp.href).origin;

        const epItems = [];
        $ep("ul#playeroptionsul > li").each((i, el) => {
          epItems.push({
            post: $ep(el).attr("data-post"),
            nume: $ep(el).attr("data-nume"),
            type: $ep(el).attr("data-type")
          });
        });

        for (const item of epItems.slice(0, 5)) {
          if (!item.post || !item.nume || (item.nume || "").includes("trailer")) continue;
          const embedUrl = await fetchEmbedUrl(epDirectUrl, item.post, item.nume, item.type);
          if (embedUrl && !embedUrl.includes("youtube")) {
            streams.push({
              url: embedUrl,
              quality: extractQuality(embedUrl),
              title: "Movierulzhd",
              subtitles: []
            });
          }
        }
        return streams;
      }
    }

    // Movie or fallback: get players from current page
    const playerItems = [];
    $p("ul#playeroptionsul > li").each((i, el) => {
      playerItems.push({
        post: $p(el).attr("data-post"),
        nume: $p(el).attr("data-nume"),
        type: $p(el).attr("data-type")
      });
    });

    for (const item of playerItems.slice(0, 5)) {
      if (!item.post || !item.nume || (item.nume || "").includes("trailer")) continue;
      const embedUrl = await fetchEmbedUrl(directUrl, item.post, item.nume, item.type);
      if (embedUrl && !embedUrl.includes("youtube")) {
        streams.push({
          url: embedUrl,
          quality: extractQuality(embedUrl),
          title: "Movierulzhd",
          subtitles: []
        });
      }
    }

    return streams;
  } catch (e) {
    console.error("[Movierulzhd]", e);
    return [];
  }
}

async function fetchEmbedUrl(baseUrl, post, nume, type) {
  try {
    const resp = await fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": baseUrl
      },
      body: `action=doo_player_ajax&post=${post}&nume=${nume}&type=${type}`,
      skipSizeCheck: true
    });
    const data = await resp.json();
    const embedUrl = data.embed_url || "";

    // Try to extract real URL from HTML embed response
    const srcMatch = embedUrl.match(/SRC="(https?:[^"]+)"/i);
    if (srcMatch) return srcMatch[1].trim();

    // Try standard URL extraction
    const urlMatch = embedUrl.match(/"(https?[^"]+)"/);
    if (urlMatch) return urlMatch[1].trim();

    return embedUrl.replace(/^"|"$/g, "").trim();
  } catch(e) {
    return null;
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

