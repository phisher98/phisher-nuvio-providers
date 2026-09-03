var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
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
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
  return "Unknown";
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const isTV = mediaType === "tv";
      const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(title)}&page=1&limit=8`;
      const searchData = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const results = (searchData && searchData.results) || [];
      if (!results.length)
        return [];
      const lcTitle = title.toLowerCase();
      let match = results.find(
        (r) => (r.title || "").toLowerCase().includes(lcTitle) && (isTV ? r.contentType === "tv_series" || r.contentType === "series" : r.contentType === "movie")
      );
      if (!match)
        match = results.find((r) => (r.title || "").toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      if (!match || !match.slug)
        return [];
      const detailUrl = isTV ? `${BASE_URL}/api/series/${match.slug}` : `${BASE_URL}/api/movies/${match.slug}`;
      const detail = yield (yield fetch(detailUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      let contentId = "";
      let contentType = "";
      if (isTV) {
        const firstSeason = detail.firstSeason;
        const allSeasons = detail.seasons || [];
        let targetEpisode = null;
        if (firstSeason && firstSeason.seasonNumber === season) {
          targetEpisode = (firstSeason.episodes || []).find((e) => e.episodeNumber === episode);
        }
        if (!targetEpisode) {
          for (const s of allSeasons) {
            const sNum = s.seasonNumber;
            if (sNum !== season)
              continue;
            const seasonUrl = `${BASE_URL}/api/series/${match.slug}/season/${sNum}`;
            try {
              const seasonData = yield (yield fetch(seasonUrl, { headers: HEADERS, skipSizeCheck: true })).json();
              const seasonObj = seasonData.season || seasonData;
              targetEpisode = (seasonObj.episodes || []).find((e) => e.episodeNumber === episode);
            } catch (e) {
            }
            break;
          }
        }
        if (!targetEpisode || !targetEpisode.id)
          return [];
        contentId = targetEpisode.id;
        contentType = "episode";
      } else {
        contentId = detail.id;
        contentType = "movie";
      }
      if (!contentId)
        return [];
      const playUrl = `${BASE_URL}/api/watch/play-info/${contentType}/${contentId}`;
      const playResp = yield fetch(playUrl, { headers: HEADERS, skipSizeCheck: true });
      const playCookies = playResp.headers.get ? playResp.headers.get("set-cookie") : "";
      const playInfo = yield playResp.json();
      if (!playInfo.gateToken)
        return [];
      const waitMs = Math.max(0, (playInfo.unlockAt || 0) - (playInfo.serverNow || Date.now()));
      const waitSec = Math.ceil(waitMs / 1e3);
      if (waitSec > 0 && waitSec <= 30) {
        yield sleep(waitSec * 1e3);
      }
      const claimResp = yield fetch(`${BASE_URL}/api/watch/session/claim`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ gateToken: playInfo.gateToken }),
        skipSizeCheck: true
      });
      const claimData = yield claimResp.json();
      if (!claimData.claim || !claimData.redeemUrl)
        return [];
      const redeemResp = yield fetch(claimData.redeemUrl, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ claim: claimData.claim }),
        skipSizeCheck: true
      });
      const redeemData = yield redeemResp.json();
      if (!redeemData.url)
        return [];
      const streams = [];
      streams.push({
        url: redeemData.url,
        quality: "1080p",
        title: "Idlix",
        subtitles: (redeemData.subtitles || []).map((sub) => ({
          url: sub.path,
          lang: sub.label || sub.lang
        }))
      });
      return streams;
    } catch (e) {
      console.error("[Idlix]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
