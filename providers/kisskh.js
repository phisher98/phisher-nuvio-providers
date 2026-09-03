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
const BASE_URL = "https://kisskh.nl";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/api/DramaList/Search?q=${encodeURIComponent(title)}&type=0`;
      const searchResp = yield fetch(searchUrl, {
        headers: { "Referer": `${BASE_URL}/` },
        skipSizeCheck: true
      });
      const searchData = yield searchResp.json();
      if (!Array.isArray(searchData) || searchData.length === 0)
        return [];
      const match = searchData.find(
        (r) => (r.title || "").toLowerCase().includes(title.toLowerCase())
      ) || searchData[0];
      if (!match || !match.id)
        return [];
      const safetitle = (match.title || "").replace(/[^a-zA-Z0-9]/g, "-");
      const detailUrl = `${BASE_URL}/api/DramaList/Drama/${match.id}?isq=false`;
      const detailResp = yield fetch(detailUrl, {
        headers: { "Referer": `${BASE_URL}/Drama/${safetitle}?id=${match.id}` },
        skipSizeCheck: true
      });
      const detail = yield detailResp.json();
      if (!detail || !detail.episodes)
        return [];
      let targetEp = null;
      if (mediaType === "tv" && episode) {
        targetEp = detail.episodes.find((e) => Math.round(e.number || 0) === parseInt(episode));
      } else {
        targetEp = detail.episodes[0];
      }
      if (!targetEp || !targetEp.id)
        return [];
      const sourceUrl = `${BASE_URL}/api/DramaList/Episode/${targetEp.id}.png?err=false&ts=&time=&kkey=`;
      const sourceResp = yield fetch(sourceUrl, {
        headers: { "Referer": `${BASE_URL}/Drama/${safetitle}/Episode-${targetEp.number}?id=${match.id}&ep=${targetEp.id}&page=0&pageSize=100` },
        skipSizeCheck: true
      });
      const source = yield sourceResp.json();
      const streams = [];
      if (source && source.Video && source.Video.includes(".m3u8")) {
        streams.push({
          url: source.Video.startsWith("http") ? source.Video : `${BASE_URL}${source.Video}`,
          quality: "1080p",
          title: "KissKH",
          subtitles: []
        });
      }
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
      const subUrl = `${BASE_URL}/api/Sub/${targetEp.id}?kkey=`;
      try {
        const subResp = yield fetch(subUrl, { skipSizeCheck: true });
        const subData = yield subResp.json();
        if (Array.isArray(subData)) {
          const subs = subData.filter((s) => s.src).map((s) => ({ url: s.src, lang: s.label || "Unknown" }));
          for (const stream of streams) {
            stream.subtitles = subs;
          }
        }
      } catch (e) {
      }
      return streams;
    } catch (e) {
      console.error("[KissKH]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
