const cheerio = require("cheerio-without-node-native");
// dorabash.js
// DoraBash - Hindi Doraemon/cartoon/anime site (dorabash.in)
// Episodes loaded via AJAX: /wp-admin/admin-ajax.php?action=get_episodes&anime_id={seasonId}&page=1&order=desc
// Stream: span[data-embed-id] with base64-encoded "name:url" pairs

const BASE_URL = "https://dorabash.in";
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
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search: DoraBash is primarily Doraemon, so search for episodes
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("article").each((i, el) => {
      const a = $("h3 > a", el);
      const href = a.attr("href");
      const t = a.attr("title") || a.text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    // Get the actual show URL from the search result page
    const resultHtml = await (await fetch(match.url, { headers: HEADERS, skipSizeCheck: true })).text();
    const $result = cheerio.load(resultHtml);
    const showUrl = $result("div.anime-data h4 a").attr("href") || match.url;

    // 3. Load show page
    const showHtml = await (await fetch(showUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $show = cheerio.load(showHtml);

    const typeText = $show("div.flex.flex-wrap.justify-center span:nth-child(2)").text() || "";
    const isMovie = typeText.toLowerCase().includes("movie");

    let targetUrl = showUrl;

    if (!isMovie) {
      // Get episodes via AJAX
      const seasonId = $show("#seasonContent").attr("data-season");
      if (!seasonId) return [];

      const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php?action=get_episodes&anime_id=${seasonId}&page=1&order=desc`;
      const epData = await (await fetch(ajaxUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const episodes = (epData.data && epData.data.episodes) || [];

      // Find the episode matching the requested number
      let ep = episodes.find(e => parseInt(e.metaNumber) === episode);
      if (!ep) ep = episodes[0];
      if (!ep || !ep.url) return [];

      targetUrl = ep.url.startsWith("http") ? ep.url : `${BASE_URL}${ep.url}`;
    } else {
      // Movie: use watch URL
      targetUrl = showUrl.replace("series", "watch");
    }

    // 4. Load player page
    const playerHtml = await (await fetch(targetUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $player = cheerio.load(playerHtml);

    const streams = [];

    $player("div.player-selection span[data-embed-id]").each((i, span) => {
      const raw = $player(span).attr("data-embed-id") || "";
      const parts = raw.split(":", 2);
      if (parts.length !== 2) return;

      try {
        const name = atob(parts[0]).replace(/dub|sub/gi, "").trim();
        const url = atob(parts[1]);
        if (url.startsWith("http")) {
          const container = $player(span).closest("div.player-selection");
          const type = container.hasClass("player-dub") ? "DUB" :
                       container.hasClass("player-sub") ? "SUB" : "";
          streams.push({
            url,
            quality: extractQuality(url),
            title: `DoraBash [${name}${type ? " " + type : ""}]`,
            subtitles: []
          });
        }
      } catch (e) {}
    });

    return streams;
  } catch (e) {
    console.error("[DoraBash]", e);
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

