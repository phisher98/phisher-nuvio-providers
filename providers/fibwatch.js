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

// src/providers/fibwatch.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://fibwatch.top";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160") || u.includes("4k"))
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
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(title)}&page_id=1`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.video-thumb").each((i, el) => {
        const href = $("a", el).attr("href");
        const t = $("p.hptag", el).text().trim() || $("div.video-thumb img", el).attr("alt") || "";
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
      const showHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);
      const videoId = $show("input#video-id").attr("value");
      if (!videoId)
        return [];
      const streams = [];
      if (isTV) {
        const epDataUrl = `${BASE_URL}/ajax/episodes.php?video_id=${videoId}`;
        const epData = yield (yield fetch(epDataUrl, { headers: HEADERS, skipSizeCheck: true })).json();
        const episodes = epData.episodes || [];
        if (!episodes.length)
          return [];
        let targetEpUrl = "";
        for (const ep of episodes) {
          const epTitle = (ep.title || "").toLowerCase();
          const m = epTitle.match(/s(\d{1,2})e(\d{1,3})/);
          if (m) {
            const epSeason = parseInt(m[1]);
            const epEpisode = parseInt(m[2]);
            if (epSeason === season && epEpisode === episode) {
              targetEpUrl = ep.url ? ep.url.startsWith("http") ? ep.url : `${BASE_URL}${ep.url}` : "";
              break;
            }
          }
        }
        if (!targetEpUrl && episodes.length > 0) {
          targetEpUrl = episodes[0].url ? episodes[0].url.startsWith("http") ? episodes[0].url : `${BASE_URL}${episodes[0].url}` : "";
        }
        if (!targetEpUrl)
          return [];
        const epHtml = yield (yield fetch(targetEpUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $ep = cheerio.load(epHtml);
        const epVideoId = $ep("input#video-id").attr("value");
        if (epVideoId) {
          const resUrl = `${BASE_URL}/ajax/resolution_switcher.php?video_id=${epVideoId}`;
          const resData = yield (yield fetch(resUrl, { headers: HEADERS, skipSizeCheck: true })).json();
          const allLinks = [...resData.current || [], ...resData.popup || []];
          for (const item of allLinks) {
            const url = (item.url || "").trim();
            if (!url)
              continue;
            if (url.match(/\.(mp4|mkv|m3u8)/i)) {
              streams.push({
                url,
                quality: extractQuality(item.res || url),
                title: `FibWatch [${item.res || "Stream"}]`,
                subtitles: []
              });
            } else {
              try {
                const dlHtml = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
                const $dl = cheerio.load(dlHtml);
                const dlUrl = ($dl("a.hidden-button.buttonDownloadnew").attr("href") || "").replace(/.*url=/, "").trim();
                if (dlUrl && dlUrl.startsWith("http")) {
                  streams.push({
                    url: dlUrl,
                    quality: extractQuality(item.res || dlUrl),
                    title: `FibWatch [${item.res || "Stream"}]`,
                    subtitles: []
                  });
                }
              } catch (e) {
              }
            }
          }
        }
      } else {
        const resUrl = `${BASE_URL}/ajax/resolution_switcher.php?video_id=${videoId}`;
        const resData = yield (yield fetch(resUrl, { headers: HEADERS, skipSizeCheck: true })).json();
        const allLinks = [...resData.current || [], ...resData.popup || []];
        for (const item of allLinks) {
          const url = (item.url || "").trim();
          if (!url)
            continue;
          if (url.match(/\.(mp4|mkv|m3u8)/i)) {
            streams.push({
              url,
              quality: extractQuality(item.res || url),
              title: `FibWatch [${item.res || "Stream"}]`,
              subtitles: []
            });
          } else {
            try {
              const dlHtml = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
              const $dl = cheerio.load(dlHtml);
              const onclick = $dl("a.hidden-button.buttonDownloadnew").attr("href") || "";
              const dlUrl = onclick.replace(/.*url=/, "").trim();
              if (dlUrl && dlUrl.startsWith("http")) {
                streams.push({
                  url: dlUrl,
                  quality: extractQuality(item.res || dlUrl),
                  title: `FibWatch [${item.res || "Stream"}]`,
                  subtitles: []
                });
              }
            } catch (e) {
            }
          }
        }
        if (streams.length === 0) {
          const dlBtn = $show("a.hidden-button.buttonDownloadnew").attr("href") || "";
          const dlUrl = dlBtn.replace(/.*url=/, "").trim();
          if (dlUrl && dlUrl.startsWith("http")) {
            streams.push({
              url: dlUrl,
              quality: "Unknown",
              title: "FibWatch",
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[FibWatch]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
