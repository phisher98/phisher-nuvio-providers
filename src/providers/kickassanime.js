// kickassanime.js
// KickassAnime - Anime provider via kaa.lt JSON API with VidStreaming/CatStream servers

const BASE_URL = "https://kaa.lt";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Content-Type": "application/json",
  "x-origin": "kickass-anime.ru"
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search KickassAnime
    const searchBody = JSON.stringify({ page: "1", query: title });
    const searchResp = await fetch(`${BASE_URL}/api/fsearch`, {
      method: "POST",
      headers: HEADERS,
      body: searchBody,
      skipSizeCheck: true
    });
    const searchData = await searchResp.json();

    if (!searchData || !searchData.result || searchData.result.length === 0) return [];

    // Find best match
    const match = searchData.result.find(r =>
      (r.title_en || r.title || "").toLowerCase().includes(title.toLowerCase())
    ) || searchData.result[0];

    if (!match) return [];

    const showSlug = match.slug || match.watch_uri;
    if (!showSlug) return [];

    // Step 3: Get show details & episodes
    const showName = showSlug.startsWith("/") ? showSlug : `/${showSlug}`;
    const episodesUrl = `${BASE_URL}/api/show${showName}/episodes?ep=1&lang=ja-JP`;
    const epsResp = await fetch(episodesUrl, { headers: HEADERS, skipSizeCheck: true });
    const epsData = await epsResp.json();

    const episodes = epsData && epsData.result ? epsData.result : [];

    // For TV shows, find the right episode
    let targetEpisode = null;
    if (mediaType === "tv" && episode) {
      targetEpisode = episodes.find(e => {
        const epNum = Math.floor(parseFloat(e.episode_number || 0));
        return epNum === parseInt(episode);
      });
    } else if (mediaType === "movie") {
      targetEpisode = episodes[0];
    } else {
      targetEpisode = episodes[0];
    }

    if (!targetEpisode) return [];

    const epNum = Math.floor(parseFloat(targetEpisode.episode_number || 1));
    const epSlug = targetEpisode.slug;
    const episodeUrl = `${BASE_URL}/api/show${showName}/episode/ep-${epNum}-${epSlug}`;

    // Step 4: Get servers for this episode
    const serversResp = await fetch(episodeUrl, { headers: HEADERS, skipSizeCheck: true });
    const serversData = await serversResp.json();

    if (!serversData || !serversData.servers) return [];

    const streams = [];

    for (const server of serversData.servers) {
      if (!server.src) continue;

      if (server.name && (server.name.includes("VidStreaming") || server.name.includes("CatStream") || server.name.includes("BirdStream"))) {
        try {
          const serverHost = new URL(server.src).origin;
          const serverHeaders = {
            "Origin": serverHost,
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
          };

          const pageResp = await fetch(server.src, { headers: serverHeaders, skipSizeCheck: true });
          const pageText = await pageResp.text();

          // Try to find m3u8 directly
          const m3u8Match = pageText.match(/(https?:)?\/\/[^\s"'<>]+\.m3u8/i);
          if (m3u8Match) {
            const m3u8Url = m3u8Match[0].startsWith("//") ? "https:" + m3u8Match[0] : m3u8Match[0];
            streams.push({
              url: m3u8Url,
              quality: "1080p",
              title: `KickassAnime ${server.name}`,
              subtitles: []
            });
            continue;
          }

          // Try props JSON extraction (CatStream/BirdStream)
          const propsMatch = pageText.match(/props="([^"]+)"/);
          if (propsMatch) {
            // Unescape HTML entities
            const unescaped = propsMatch[1]
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");

            const json = JSON.parse(unescaped);
            const manifests = json.manifest;
            if (manifests && manifests[1]) {
              const videoUrl = "https:" + manifests[1];
              const subtitles = [];
              if (json.subtitles && json.subtitles[1]) {
                for (const sub of json.subtitles[1]) {
                  if (sub && sub[1]) {
                    const src = sub[1].src && sub[1].src[1];
                    const name = sub[1].name && sub[1].name[1];
                    if (src) subtitles.push({ url: src, lang: name || "Unknown" });
                  }
                }
              }
              streams.push({
                url: videoUrl,
                quality: "1080p",
                title: `KickassAnime ${server.name}`,
                subtitles
              });
            }
          }
        } catch (e) {
          // Skip failed server
        }
      }
    }

    return streams;
  } catch (e) {
    console.error("[KickassAnime]", e);
    return [];
  }
}


module.exports = { getStreams };
