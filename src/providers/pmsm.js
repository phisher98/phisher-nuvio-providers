const cheerio = require("cheerio-without-node-native");
// pmsm.js
// PMSM (PencurimovieSubMalay) provider — Malay subtitle movies/series
// Uses zeta_player_ajax WordPress endpoint to get embed iframes
// Domain is fetched from a GitHub JSON config file

const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const FALLBACK_URL = "https://ww105.pencurimoviesubmalay.guru";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
};

async function getBaseUrl() {
  try {
    const domains = await (await fetch(DOMAINS_URL, { headers: HEADERS, skipSizeCheck: true })).json();
    return domains.pencurimoviesubmalay || FALLBACK_URL;
  } catch (_) {
    return FALLBACK_URL;
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const BASE_URL = await getBaseUrl();

    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search PMSM
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $s = cheerio.load(searchHtml);

    let pageUrl = null;
    $s("div.item-box").each((_, el) => {
      if (!pageUrl) {
        const href = $s(el).find("a").attr("href");
        if (href && href.startsWith("http")) pageUrl = href;
      }
    });

    if (!pageUrl) return [];

    // 3. For TV series, navigate to episode URL
    if (mediaType === "tv" && season && episode) {
      const showHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);

      let epUrl = null;
      $show("div.content-episodes ul.episodes-list li").each((_, el) => {
        const $ep = $show(el);
        const epNum = $ep.find("span.ep-num").text().trim();
        // Check class for season: ep-{season}-{epNum}
        const classNames = ($ep.attr("class") || "").split(" ");
        const seasonClass = classNames.find(c => /ep-\d+-\d+/.test(c));
        let epSeason = null;
        if (seasonClass) {
          epSeason = parseInt(seasonClass.split("-")[1]);
        }
        if (epNum && parseInt(epNum) === parseInt(episode) &&
            (!epSeason || epSeason === parseInt(season))) {
          const href = $ep.find("a[href]").attr("href");
          if (href) epUrl = href.startsWith("http") ? href : BASE_URL + href;
        }
      });

      if (epUrl) pageUrl = epUrl;
    }

    // 4. Extract player options and call zeta_player_ajax
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    const streams = [];

    const playerItems = $("#playeroptionsul > li").toArray();
    for (const li of playerItems) {
      const post = $(li).attr("data-post") || "";
      const nume = $(li).attr("data-nume") || "";
      const type = $(li).attr("data-type") || "";

      if (!post || !nume) continue;

      try {
        const ajaxResp = await (await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
          method: "POST",
          headers: {
            ...HEADERS,
            "Referer": pageUrl,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: `action=zeta_player_ajax&post=${post}&nume=${nume}&type=${type}`,
          skipSizeCheck: true
        })).json();

        const embedUrl = ajaxResp?.embed_url;
        if (!embedUrl) continue;

        // Parse iframe src from embed_url HTML string
        const $embed = cheerio.load(embedUrl);
        const iframeSrc = $embed("iframe").attr("src");
        if (iframeSrc && iframeSrc.startsWith("http")) {
          streams.push({
            url: iframeSrc,
            quality: extractQuality(iframeSrc),
            title: "PMSM",
            subtitles: []
          });
        }
      } catch (_) {}
    }

    return streams;
  } catch (e) {
    console.error("[PMSM]", e);
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


