const cheerio = require("cheerio-without-node-native");
// mplayer.js
// MPlayer - MX Player India streaming provider via api.mxplayer.in

const BASE_URL = "https://www.mxplayer.in";
const WEB_API = "https://api.mxplayer.in/v1/web";
const ENDPOINT_URL = "https://d3sgzbosmwirao.cloudfront.net/";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Get UserID cookie from MX Player homepage
    let userId = "";
    try {
      const homeResp = await fetch(BASE_URL, { headers: HEADERS, skipSizeCheck: true });
      // Try to extract UserID from Set-Cookie
      const cookieHeader = homeResp.headers?.get("set-cookie") || "";
      const userIdMatch = cookieHeader.match(/UserID=([^;]+)/);
      if (userIdMatch) userId = userIdMatch[1];
    } catch(e) {}

    const endParam = `&device-density=2&userid=${userId}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`;

    // Step 3: Search MX Player
    const searchResp = await fetch(`${WEB_API}/search/resultv2?query=${encodeURIComponent(title)}${endParam}`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: "{}",
      skipSizeCheck: true
    });
    const searchText = await searchResp.text();

    let searchRoot;
    try { searchRoot = JSON.parse(searchText); } catch(e) { return []; }

    const sections = searchRoot.sections || [];
    let bestMatch = null;
    const isMovie = mediaType === "movie";

    for (const section of sections) {
      for (const item of (section.items || [])) {
        const itemTitle = item.title || "";
        const itemType = item.type || "";
        if (itemTitle.toLowerCase().includes(title.toLowerCase())) {
          if (isMovie && itemType.includes("movie")) {
            bestMatch = item;
            break;
          } else if (!isMovie && itemType.includes("tvshow")) {
            bestMatch = item;
            break;
          } else if (!bestMatch) {
            bestMatch = item;
          }
        }
      }
      if (bestMatch) break;
    }

    if (!bestMatch) return [];

    const streams = [];

    // Step 4: Extract stream URLs from the matched item
    const extractStreamUrls = (streamObj) => {
      const urls = [];
      if (!streamObj) return urls;
      const hlsObj = streamObj.hls || streamObj.mxplay?.hls;
      const dashObj = streamObj.dash || streamObj.mxplay?.dash;
      const thirdParty = streamObj.thirdParty;

      for (const variant of ["high", "base", "main"]) {
        if (hlsObj?.[variant]) urls.push(normalizeUrl(hlsObj[variant]));
        if (dashObj?.[variant]) urls.push(normalizeUrl(dashObj[variant]));
      }
      if (thirdParty?.hlsUrl) urls.push(thirdParty.hlsUrl);
      if (thirdParty?.dashUrl) urls.push(thirdParty.dashUrl);

      return [...new Set(urls.filter(Boolean))];
    };

    if (isMovie) {
      const movieStream = bestMatch.stream;
      const urls = extractStreamUrls(movieStream);
      for (const url of urls) {
        streams.push({
          url,
          quality: url.includes(".m3u8") ? "1080p" : "Unknown",
          title: `MXPlayer${url.includes(".m3u8") ? " HLS" : " DASH"}`,
          subtitles: []
        });
      }
    } else {
      // TV show: need to get season data from the share URL
      const shareUrl = bestMatch.shareUrl;
      if (!shareUrl) return [];

      const fullShareUrl = `${BASE_URL}${shareUrl}`;
      try {
        const seasonPageResp = await fetch(fullShareUrl, { headers: HEADERS, skipSizeCheck: true });
        const seasonHtml = await seasonPageResp.text();
        const $ = cheerio.load(seasonHtml);

        // Find seasons: "div.hs__items-container > div"
        const seasonItems = [];
        $("div.hs__items-container > div").each((i, el) => {
          const tab = parseInt($(el).attr("data-tab") || "0");
          const id = $(el).attr("data-id");
          if (id) seasonItems.push({ tab, id });
        });

        // Find target season
        const targetSeason = season ? seasonItems.find(s => s.tab === parseInt(season)) : seasonItems[0];
        if (!targetSeason) return [];

        // Get episodes for this season
        const episodesUrl = `${WEB_API}/detail/tab/tvshowepisodes?type=season&id=${targetSeason.id}&sortOrder=0${endParam}`;
        const epsResp = await fetch(episodesUrl, { headers: HEADERS, skipSizeCheck: true });
        const epsData = await epsResp.json();

        const epItems = epsData.items || [];
        let targetEp = null;
        if (episode) {
          targetEp = epItems.find(ep => ep.sequence === parseInt(episode) || ep.sequence === episode);
        }
        if (!targetEp) targetEp = epItems[0];

        if (!targetEp) return [];

        const epStream = targetEp.stream;
        const epUrls = extractStreamUrls(epStream);
        for (const url of epUrls) {
          streams.push({
            url,
            quality: url.includes(".m3u8") ? "1080p" : "Unknown",
            title: `MXPlayer${url.includes(".m3u8") ? " HLS" : " DASH"}`,
            subtitles: []
          });
        }
      } catch(e) {}
    }

    return streams;
  } catch (e) {
    console.error("[MPlayer]", e);
    return [];
  }
}

function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return ENDPOINT_URL + url;
}


module.exports = { getStreams };
