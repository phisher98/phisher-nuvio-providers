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
const BASE_URL = "https://istreamflare.com";
const API_KEY = "kC7V1f8QRaZyvYnh";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; Subsystem for Android(TM) Build/TQ3A.230901.001)",
  "x-api-key": API_KEY
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/android/searchContent/${encodeURIComponent(title)}/1`;
      const searchResp = yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true });
      const searchText = yield searchResp.text();
      let searchData;
      try {
        searchData = JSON.parse(searchText);
      } catch (e) {
        return [];
      }
      let items = [];
      if (Array.isArray(searchData)) {
        items = searchData;
      } else if (searchData && searchData.data) {
        try {
          items = JSON.parse(searchData.data);
        } catch (e) {
          items = [];
        }
      }
      if (!items || items.length === 0)
        return [];
      const isMovie = mediaType === "movie";
      const targetType = isMovie ? "1" : "2";
      const match = items.find(
        (i) => (i.name || "").toLowerCase().includes(title.toLowerCase()) && (i.content_type === targetType || !i.content_type)
      ) || items[0];
      if (!match)
        return [];
      const contentId = match.id;
      const contentType = match.content_type;
      const streams = [];
      if (isMovie || contentType === "1") {
        const linksUrl = `${BASE_URL}/android/getMoviePlayLinks/${contentId}/0`;
        const linksResp = yield fetch(linksUrl, { headers: HEADERS, skipSizeCheck: true });
        const linksText = yield linksResp.text();
        let links = [];
        try {
          const parsed = JSON.parse(linksText);
          if (Array.isArray(parsed)) {
            links = parsed;
          } else if (parsed && parsed.data) {
            links = JSON.parse(parsed.data);
          }
        } catch (e) {
        }
        for (const link of links) {
          if (!link.url)
            continue;
          streams.push({
            url: link.url,
            quality: mapQuality(link.quality || ""),
            title: `IStreamFlare ${link.name || ""}`.trim(),
            subtitles: []
          });
        }
      } else {
        const seasonsUrl = `${BASE_URL}/android/getSeasons/${contentId}`;
        const seasonsResp = yield fetch(seasonsUrl, { headers: HEADERS, skipSizeCheck: true });
        const seasonsText = yield seasonsResp.text();
        let seasons = [];
        try {
          const parsed = JSON.parse(seasonsText);
          if (Array.isArray(parsed))
            seasons = parsed;
          else if (parsed && parsed.data)
            seasons = JSON.parse(parsed.data);
        } catch (e) {
        }
        for (const s of seasons) {
          const sNumMatch = (s.Session_Name || s.sessionName || "").match(/(\d+)/);
          const sNum = sNumMatch ? parseInt(sNumMatch[1]) : 1;
          if (season && sNum !== parseInt(season))
            continue;
          const epsUrl = `${BASE_URL}/android/getEpisodes/${s.id}/0`;
          const epsResp = yield fetch(epsUrl, { headers: HEADERS, skipSizeCheck: true });
          const epsText = yield epsResp.text();
          let episodes = [];
          try {
            const parsed = JSON.parse(epsText);
            if (Array.isArray(parsed))
              episodes = parsed;
            else if (parsed && parsed.data)
              episodes = JSON.parse(parsed.data);
          } catch (e) {
          }
          for (const ep of episodes) {
            const epNum = parseInt(ep.episoade_order || ep.episoadeOrder || 0);
            if (episode && epNum !== parseInt(episode))
              continue;
            if (!ep.url)
              continue;
            streams.push({
              url: ep.url,
              quality: "Unknown",
              title: `IStreamFlare ${ep.Episoade_Name || ep.episoadeName || `E${epNum}`}`.trim(),
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[IStreamFlare]", e);
      return [];
    }
  });
}
function mapQuality(q) {
  const u = (q || "").toLowerCase();
  if (u.includes("4k") || u.includes("2160"))
    return "4K";
  if (u.includes("1080"))
    return "1080p";
  if (u.includes("720"))
    return "720p";
  if (u.includes("480"))
    return "480p";
  if (u.includes("360"))
    return "360p";
  return "Unknown";
}
module.exports = { getStreams };
