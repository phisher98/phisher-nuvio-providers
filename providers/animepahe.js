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
const cheerio = require("cheerio-without-node-native");
const MAIN_URL = "https://animepahe.ru";
const HEADERS = {
  "Cookie": "__ddg2_=1234567890",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": MAIN_URL + "/"
};
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
function tmdbFetch(path) {
  return fetch(`${TMDB_BASE_URL}${path}?api_key=${TMDB_API_KEY}`).then((r) => r.ok ? r.json() : null);
}
function getTMDBDetails(tmdbId, type) {
  return tmdbFetch(`/${type}/${tmdbId}`).then((d) => {
    if (!d)
      return null;
    return type === "movie" ? {
      title: d.title,
      releaseDate: d.release_date,
      firstAirDate: null
    } : {
      title: d.name,
      releaseDate: d.first_air_date,
      firstAirDate: d.first_air_date
    };
  });
}
function unpack(packed) {
  const regex = new RegExp('eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\"(.*?)\\"\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\"(.*?)\\"\\.split\\(\\"\\|\\"\\)', "s");
  let match = packed.match(regex);
  if (!match) {
    const regexSq = new RegExp("eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\'(.*?)\\'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\'(.*?)\\'\\.split\\(\\'\\|\\'\\)", "s");
    match = packed.match(regexSq);
  }
  if (!match)
    return null;
  let p = match[1];
  const a = parseInt(match[2], 10);
  let c = parseInt(match[3], 10);
  const k = match[4].split("|");
  function e(c2) {
    return (c2 < a ? "" : e(Math.floor(c2 / a))) + (c2 % a > 35 ? String.fromCharCode(c2 % a + 29) : (c2 % a).toString(36));
  }
  while (c--) {
    if (k[c]) {
      const pattern = new RegExp("\\b" + e(c) + "\\b", "g");
      p = p.replace(pattern, k[c]);
    }
  }
  return p;
}
function extractKwik(url, title, type, source, quality) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, { headers: { "Referer": MAIN_URL + "/" } });
      const html = yield res.text();
      let unpacked = unpack(html);
      if (!unpacked)
        return [];
      const m3u8Match = unpacked.match(/source=\s*[\"|'](.*?m3u8.*?)[\"|']/);
      if (!m3u8Match)
        return [];
      const m3u8 = m3u8Match[1];
      return [{
        name: `\u231C AnimePahe \u231F | ${source} | ${type}`,
        title,
        url: m3u8,
        quality: quality + "p",
        provider: "AnimePahe",
        headers: { "Referer": "https://kwik.cx/", "Origin": "https://kwik.cx" }
      }];
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      const info = yield getTMDBDetails(tmdbId, mediaType);
      if (!info)
        return [];
      const epNum = episode != null ? episode : 1;
      const title = info.title;
      let searchUrl = `${MAIN_URL}/api?m=search&l=8&q=${encodeURIComponent(title)}`;
      let searchRes = yield fetch(searchUrl, { headers: HEADERS });
      if (!searchRes.ok)
        return [];
      let searchJson = yield searchRes.json();
      if (!searchJson || !searchJson.data || searchJson.data.length === 0)
        return [];
      let anime = searchJson.data[0];
      let session = anime.session;
      let epSession = null;
      let page = 1;
      let lastPage = 1;
      while (page <= lastPage) {
        let epUrl = `${MAIN_URL}/api?m=release&id=${session}&sort=episode_asc&page=${page}`;
        let epRes = yield fetch(epUrl, { headers: HEADERS });
        if (!epRes.ok)
          break;
        let epJson = yield epRes.json();
        lastPage = epJson.last_page || 1;
        let ep = epJson.data.find((e) => e.episode == epNum);
        if (ep) {
          epSession = ep.session;
          break;
        }
        page++;
      }
      if (!epSession)
        return [];
      let playUrl = `${MAIN_URL}/play/${session}/${epSession}`;
      let playRes = yield fetch(playUrl, { headers: HEADERS });
      if (!playRes.ok)
        return [];
      let playHtml = yield playRes.text();
      let $ = cheerio.load(playHtml);
      let streams = [];
      let promises = [];
      $("#resolutionMenu button").each((_, el) => {
        let text = $(el).text();
        let dubText = $(el).find("span").text().toLowerCase();
        let type = dubText.includes("eng") ? "DUB" : "SUB";
        let match = text.match(/(.+?)\s+·\s+(\d{3,4})p/);
        let source = match ? match[1].trim() : "Unknown";
        let quality = match ? match[2] : "Unknown";
        let href = $(el).attr("data-src");
        if (href && href.includes("kwik")) {
          promises.push(extractKwik(href, title, type, source, quality));
        }
      });
      let results = yield Promise.all(promises);
      results.forEach((res) => {
        if (res && res.length) {
          streams.push(...res);
        }
      });
      return streams;
    } catch (err) {
      console.error("AnimePahe error:", err);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
