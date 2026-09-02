// idlix.js
// Idlix - Indonesian movie & series streaming site (z1.idlixku.com)
// API-based: /api/movies/{slug}, /api/series/{slug}, /api/watch/play-info/{type}/{id}
// Flow: search → get detail → get play-info → claim session → redeem → get m3u8 URL
// Note: requires gateToken claim flow with timing wait

const BASE_URL = "https://z1.idlixku.com";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`,
  "Origin": BASE_URL,
  "Accept": "*/*",
  "Content-Type": "application/json"
};

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search via /api/search
    const isTV = mediaType === "tv";
    const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(title)}&page=1&limit=8`;
    const searchData = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const results = searchData.results || [];

    if (!results.length) return [];

    const lcTitle = title.toLowerCase();
    let match = results.find(r =>
      (r.title || "").toLowerCase().includes(lcTitle) &&
      (isTV ? r.contentType === "tv_series" || r.contentType === "series" : r.contentType === "movie")
    );
    if (!match) match = results.find(r => (r.title || "").toLowerCase().includes(lcTitle));
    if (!match) match = results[0];
    if (!match || !match.slug) return [];

    // 3. Get detail
    const detailUrl = isTV
      ? `${BASE_URL}/api/series/${match.slug}`
      : `${BASE_URL}/api/movies/${match.slug}`;

    const detail = await (await fetch(detailUrl, { headers: HEADERS, skipSizeCheck: true })).json();

    let contentId = "";
    let contentType = "";

    if (isTV) {
      // Find the right episode
      // First check firstSeason
      const firstSeason = detail.firstSeason;
      const allSeasons = detail.seasons || [];

      let targetEpisode = null;

      if (firstSeason && firstSeason.seasonNumber === season) {
        targetEpisode = (firstSeason.episodes || []).find(e => e.episodeNumber === episode);
      }

      if (!targetEpisode) {
        // Fetch other seasons
        for (const s of allSeasons) {
          const sNum = s.seasonNumber;
          if (sNum !== season) continue;

          const seasonUrl = `${BASE_URL}/api/series/${match.slug}/season/${sNum}`;
          try {
            const seasonData = await (await fetch(seasonUrl, { headers: HEADERS, skipSizeCheck: true })).json();
            const seasonObj = seasonData.season || seasonData;
            targetEpisode = (seasonObj.episodes || []).find(e => e.episodeNumber === episode);
          } catch (e) {}
          break;
        }
      }

      if (!targetEpisode || !targetEpisode.id) return [];

      contentId = targetEpisode.id;
      contentType = "episode";
    } else {
      contentId = detail.id;
      contentType = "movie";
    }

    if (!contentId) return [];

    // 4. Get play-info
    const playUrl = `${BASE_URL}/api/watch/play-info/${contentType}/${contentId}`;
    const playResp = await fetch(playUrl, { headers: HEADERS, skipSizeCheck: true });
    const playCookies = playResp.headers.get ? playResp.headers.get("set-cookie") : "";
    const playInfo = await playResp.json();

    if (!playInfo.gateToken) return [];

    // 5. Wait for unlock
    const waitMs = Math.max(0, (playInfo.unlockAt || 0) - (playInfo.serverNow || Date.now()));
    const waitSec = Math.ceil(waitMs / 1000);
    if (waitSec > 0 && waitSec <= 30) {
      await sleep(waitSec * 1000);
    }

    // 6. Claim session
    const claimResp = await fetch(`${BASE_URL}/api/watch/session/claim`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ gateToken: playInfo.gateToken }),
      skipSizeCheck: true
    });
    const claimData = await claimResp.json();

    if (!claimData.claim || !claimData.redeemUrl) return [];

    // 7. Redeem to get stream URL
    const redeemResp = await fetch(claimData.redeemUrl, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ claim: claimData.claim }),
      skipSizeCheck: true
    });
    const redeemData = await redeemResp.json();

    if (!redeemData.url) return [];

    const streams = [];
    streams.push({
      url: redeemData.url,
      quality: "1080p",
      title: "Idlix",
      subtitles: (redeemData.subtitles || []).map(sub => ({
        url: sub.path,
        lang: sub.label || sub.lang
      }))
    });

    return streams;
  } catch (e) {
    console.error("[Idlix]", e);
    return [];
  }
}


module.exports = { getStreams };
