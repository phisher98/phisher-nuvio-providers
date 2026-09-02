// istreamflare.js
// IStreamFlare - Indian movies/series/anime provider with encrypted JSON API

const BASE_URL = "https://istreamflare.com"; // dynamic, fallback
const API_KEY = "kC7V1f8QRaZyvYnh";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; Subsystem for Android(TM) Build/TQ3A.230901.001)",
  "x-api-key": API_KEY
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search IStreamFlare API for the content
    // The API uses encrypted responses; we search by title
    const searchUrl = `${BASE_URL}/android/searchContent/${encodeURIComponent(title)}/1`;
    const searchResp = await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true });
    const searchText = await searchResp.text();

    let searchData;
    try {
      searchData = JSON.parse(searchText);
    } catch (e) {
      return [];
    }

    // Handle both encrypted and plain responses
    let items = [];
    if (Array.isArray(searchData)) {
      items = searchData;
    } else if (searchData && searchData.data) {
      try { items = JSON.parse(searchData.data); } catch(e) { items = []; }
    }

    if (!items || items.length === 0) return [];

    // Step 3: Find best match by name
    const isMovie = mediaType === "movie";
    const targetType = isMovie ? "1" : "2";
    const match = items.find(i =>
      (i.name || "").toLowerCase().includes(title.toLowerCase()) &&
      (i.content_type === targetType || !i.content_type)
    ) || items[0];

    if (!match) return [];

    const contentId = match.id;
    const contentType = match.content_type;
    const streams = [];

    if (isMovie || contentType === "1") {
      // Movie: get play links
      const linksUrl = `${BASE_URL}/android/getMoviePlayLinks/${contentId}/0`;
      const linksResp = await fetch(linksUrl, { headers: HEADERS, skipSizeCheck: true });
      const linksText = await linksResp.text();

      let links = [];
      try {
        const parsed = JSON.parse(linksText);
        if (Array.isArray(parsed)) {
          links = parsed;
        } else if (parsed && parsed.data) {
          links = JSON.parse(parsed.data);
        }
      } catch(e) {}

      for (const link of links) {
        if (!link.url) continue;
        streams.push({
          url: link.url,
          quality: mapQuality(link.quality || ""),
          title: `IStreamFlare ${link.name || ""}`.trim(),
          subtitles: []
        });
      }
    } else {
      // TV Series: get seasons -> episodes -> stream URL
      const seasonsUrl = `${BASE_URL}/android/getSeasons/${contentId}`;
      const seasonsResp = await fetch(seasonsUrl, { headers: HEADERS, skipSizeCheck: true });
      const seasonsText = await seasonsResp.text();

      let seasons = [];
      try {
        const parsed = JSON.parse(seasonsText);
        if (Array.isArray(parsed)) seasons = parsed;
        else if (parsed && parsed.data) seasons = JSON.parse(parsed.data);
      } catch(e) {}

      for (const s of seasons) {
        // Match season number
        const sNumMatch = (s.Session_Name || s.sessionName || "").match(/(\d+)/);
        const sNum = sNumMatch ? parseInt(sNumMatch[1]) : 1;
        if (season && sNum !== parseInt(season)) continue;

        const epsUrl = `${BASE_URL}/android/getEpisodes/${s.id}/0`;
        const epsResp = await fetch(epsUrl, { headers: HEADERS, skipSizeCheck: true });
        const epsText = await epsResp.text();

        let episodes = [];
        try {
          const parsed = JSON.parse(epsText);
          if (Array.isArray(parsed)) episodes = parsed;
          else if (parsed && parsed.data) episodes = JSON.parse(parsed.data);
        } catch(e) {}

        for (const ep of episodes) {
          const epNum = parseInt(ep.episoade_order || ep.episoadeOrder || 0);
          if (episode && epNum !== parseInt(episode)) continue;
          if (!ep.url) continue;

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
}

function mapQuality(q) {
  const u = (q || "").toLowerCase();
  if (u.includes("4k") || u.includes("2160")) return "4K";
  if (u.includes("1080")) return "1080p";
  if (u.includes("720")) return "720p";
  if (u.includes("480")) return "480p";
  if (u.includes("360")) return "360p";
  return "Unknown";
}


module.exports = { getStreams };
