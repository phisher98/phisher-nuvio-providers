// kisskh.js
// KissKH - Asian drama/anime provider via kisskh.nl JSON API

const BASE_URL = "https://kisskh.nl";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search KissKH
    const searchUrl = `${BASE_URL}/api/DramaList/Search?q=${encodeURIComponent(title)}&type=0`;
    const searchResp = await fetch(searchUrl, {
      headers: { "Referer": `${BASE_URL}/` },
      skipSizeCheck: true
    });
    const searchData = await searchResp.json();

    if (!Array.isArray(searchData) || searchData.length === 0) return [];

    // Find best match
    const match = searchData.find(r =>
      (r.title || "").toLowerCase().includes(title.toLowerCase())
    ) || searchData[0];

    if (!match || !match.id) return [];

    // Step 3: Get drama detail (episode list)
    const safetitle = (match.title || "").replace(/[^a-zA-Z0-9]/g, "-");
    const detailUrl = `${BASE_URL}/api/DramaList/Drama/${match.id}?isq=false`;
    const detailResp = await fetch(detailUrl, {
      headers: { "Referer": `${BASE_URL}/Drama/${safetitle}?id=${match.id}` },
      skipSizeCheck: true
    });
    const detail = await detailResp.json();

    if (!detail || !detail.episodes) return [];

    // Step 4: Find the target episode
    let targetEp = null;
    if (mediaType === "tv" && episode) {
      targetEp = detail.episodes.find(e => Math.round(e.number || 0) === parseInt(episode));
    } else {
      targetEp = detail.episodes[0];
    }

    if (!targetEp || !targetEp.id) return [];

    // Step 5: Get stream URL via the kisskh API
    // The key API endpoint requires a "kkey" (auth key from a separate endpoint)
    // We try to get the source without the key first
    const sourceUrl = `${BASE_URL}/api/DramaList/Episode/${targetEp.id}.png?err=false&ts=&time=&kkey=`;
    const sourceResp = await fetch(sourceUrl, {
      headers: { "Referer": `${BASE_URL}/Drama/${safetitle}/Episode-${targetEp.number}?id=${match.id}&ep=${targetEp.id}&page=0&pageSize=100` },
      skipSizeCheck: true
    });
    const source = await sourceResp.json();

    const streams = [];

    // Video source
    if (source && source.Video && source.Video.includes(".m3u8")) {
      streams.push({
        url: source.Video.startsWith("http") ? source.Video : `${BASE_URL}${source.Video}`,
        quality: "1080p",
        title: "KissKH",
        subtitles: []
      });
    }

    // ThirdParty
    if (source && source.ThirdParty) {
      const tp = source.ThirdParty;
      if (tp.includes(".m3u8") || tp.includes("mp4")) {
        streams.push({
          url: tp.startsWith("http") ? tp : `${BASE_URL}${tp}`,
          quality: "720p",
          title: "KissKH (ThirdParty)",
          subtitles: []
        });
      }
    }

    // Get subtitles
    const subUrl = `${BASE_URL}/api/Sub/${targetEp.id}?kkey=`;
    try {
      const subResp = await fetch(subUrl, { skipSizeCheck: true });
      const subData = await subResp.json();
      if (Array.isArray(subData)) {
        const subs = subData
          .filter(s => s.src)
          .map(s => ({ url: s.src, lang: s.label || "Unknown" }));
        // Attach subtitles to all streams
        for (const stream of streams) {
          stream.subtitles = subs;
        }
      }
    } catch (e) {
      // Subtitle fetch failed, continue without
    }

    return streams;
  } catch (e) {
    console.error("[KissKH]", e);
    return [];
  }
}


module.exports = { getStreams };
