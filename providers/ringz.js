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
const BASE_URL = atob("aHR0cHM6Ly9kYXRhYXBpLnlvbW92aWVzYXBrLmNvbS8=");
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const CF_HEADERS = {
  "cf-access-client-id": atob("ZTNhMTVhZDk5OWRhYjdmMzU5MmYzZDg1NWUwZWM2ZWQuYWNjZXNz"),
  "cf-access-client-secret": atob("OGEyMjUzNmUyZGFjODYzNjlhMmNhYTkxMWQ1NWE4OWExMDk5MzljYzY5ZTY2NDZlNTFiZjVkODUyN2ExZGNhNQ=="),
  "user-agent": "Dart/3.8 (dart:io)"
};
function searchRingZ(title, mediaType) {
  return __async(this, null, function* () {
    const endpoints = [
      "Nwm.json",
      // Movies
      "Nws.json",
      // Web Series
      "lstanime.json"
      // Anime
    ];
    for (const ep of endpoints) {
      try {
        const url = `${BASE_URL}${ep}`;
        const text = yield (yield fetch(url, { headers: CF_HEADERS, skipSizeCheck: true })).text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          continue;
        }
        const movieList = (data == null ? void 0 : data.AllMovieDataList) || (data == null ? void 0 : data.allData) || [];
        const seriesList = (data == null ? void 0 : data.webSeriesDataList) || [];
        const searchIn = mediaType === "movie" ? movieList : [...seriesList, ...movieList];
        const titleLower = title.toLowerCase();
        const found = searchIn.find((item) => {
          const mn = ((item == null ? void 0 : item.mn) || "").toLowerCase();
          return mn.includes(titleLower) || titleLower.includes(mn.split(" ")[0]);
        });
        if (found)
          return { item: found, endpoint: ep, isSeries: !!(data == null ? void 0 : data.webSeriesDataList) && seriesList.includes(found) };
      } catch (_) {
      }
    }
    return null;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: CF_HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const result = yield searchRingZ(title, mediaType);
      if (!result)
        return [];
      const { item, isSeries } = result;
      const streams = [];
      if (isSeries && season && episode) {
        const sourceKeys = Object.keys(item).filter((k) => !["id", "mn", "IH", "lng", "gn", "cg", "qlty", "hf"].includes(k));
        for (const key of sourceKeys) {
          const value = item[key];
          if (typeof value === "string" && value.startsWith("http")) {
            const epMatch = key.match(/(\d+)/);
            if (epMatch && parseInt(epMatch[1]) === parseInt(episode)) {
              streams.push({
                url: value,
                quality: inferQuality(value, key),
                title: `RingZ [${key}]`,
                subtitles: []
              });
            }
          }
        }
      } else {
        const keys = Object.keys(item);
        for (const key of keys) {
          if (key === "hf")
            continue;
          const value = item[key];
          if (typeof value === "string" && value.startsWith("http")) {
            streams.push({
              url: value,
              quality: inferQuality(value, key),
              title: `RingZ [${key}]`,
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[RingZ]", e);
      return [];
    }
  });
}
function inferQuality(url, key) {
  const check = (s) => {
    if (!s)
      return null;
    const l = s.toLowerCase();
    if (l.includes("2160") || l.includes("4k"))
      return "4K";
    if (l.includes("1080"))
      return "1080p";
    if (l.includes("720"))
      return "720p";
    if (l.includes("480"))
      return "480p";
    if (l.includes("360"))
      return "360p";
    return null;
  };
  return check(url) || check(key) || "Unknown";
}
module.exports = { getStreams };
