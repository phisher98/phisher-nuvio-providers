var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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

// src/utils/extractors.js
var require_extractors = __commonJS({
  "src/utils/extractors.js"(exports2, module2) {
    var cheerio2 = require("cheerio-without-node-native");
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
    function extractVidmoly(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const m = html.match(/file:\s*["'](.*?m3u8.*?)["']/);
          if (m)
            return { url: m[1], quality: "Unknown", source: "Vidmoly" };
        } catch (e) {
        }
        return null;
      });
    }
    function extractFilemoon(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const unpacked = unpack(html);
          if (unpacked) {
            const m = unpacked.match(/file:\s*["'](.*?m3u8.*?)["']/);
            if (m)
              return { url: m[1], quality: "Unknown", source: "Filemoon" };
          }
        } catch (e) {
        }
        return null;
      });
    }
    function extractStreamhide(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const unpacked = unpack(html);
          if (unpacked) {
            const m = unpacked.match(/sources:\s*\[\s*{\s*file:\s*["'](.*?m3u8.*?)["']/);
            if (m)
              return { url: m[1], quality: "Unknown", source: "Streamhide" };
          }
        } catch (e) {
        }
        return null;
      });
    }
    function extractVoe(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url);
          const html = yield res.text();
          const m = html.match(/hls':\s*'(.*?)'/);
          if (m)
            return { url: m[1], quality: "Unknown", source: "Voe" };
        } catch (e) {
        }
        return null;
      });
    }
    function extract(url) {
      return __async(this, null, function* () {
        if (!url)
          return null;
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes("vidmoly")) {
          return yield extractVidmoly(url);
        } else if (lowerUrl.includes("filemoon") || lowerUrl.includes("abyssplayer") || lowerUrl.includes("rubystm")) {
          return yield extractFilemoon(url);
        } else if (lowerUrl.includes("streamhide") || lowerUrl.includes("cloudy.upns") || lowerUrl.includes("gdmirrorbot") || lowerUrl.includes("emturbovid")) {
          return yield extractStreamhide(url);
        } else if (lowerUrl.includes("voe.sx") || lowerUrl.includes("voe.network")) {
          return yield extractVoe(url);
        }
        return null;
      });
    }
    module2.exports = { extract };
  }
});

// src/providers/hianime.js
var cheerio = require("cheerio-without-node-native");
var HIANIME_APIS = [
  "https://hianimez.is",
  "https://hianimez.to",
  "https://hianime.nz",
  "https://hianime.bz",
  "https://hianime.pe"
];
var AJAX_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
  "Referer": "https://hianime.to/",
  "User-Agent": "Mozilla/5.0"
};
var megaHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Origin": "https://megacloud.blog",
  "Referer": "https://megacloud.blog/",
  "Connection": "keep-alive"
};
function extractMegacloud(embedUrl, effectiveType) {
  const mainUrl = "https://megacloud.blog";
  const headers = {
    "Accept": "*/*",
    "Referer": mainUrl,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0"
  };
  return fetch(embedUrl, { headers }).then((r) => r.ok ? r.text() : null).then((page) => {
    if (!page)
      return [];
    const nonce = page.match(/window\._xy_ws\s*=\s*"([^"]+)"/)?.[1] || page.match(/_is_th:([A-Za-z0-9]{48})/)?.[1];
    if (!nonce)
      return [];
    const id = embedUrl.split("/").pop().split("?")[0];
    const apiUrl = `${mainUrl}/embed-2/v3/e-1/getSources?id=${id}&_k=${nonce}`;
    return fetch(apiUrl, { headers }).then((r) => r.ok ? r.json() : null).then((json) => {
      if (!json?.sources?.length)
        return [];
      const build = (url) => [{
        url,
        type: effectiveType,
        subtitles: (json.tracks || []).filter((t) => t.kind === "captions" || t.kind === "subtitles").map((t) => ({ label: t.label, url: t.file }))
      }];
      const encoded = json.sources[0].file;
      if (encoded.includes(".m3u8"))
        return build(encoded);
      return fetch(
        "https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json"
      ).then((r) => r.ok ? r.json() : null).then((keys) => {
        const secret = keys?.mega;
        if (!secret)
          return [];
        const decodeUrl = "https://script.google.com/macros/s/AKfycbxHbYHbrGMXYD2-bC-C43D3njIbU-wGiYQuJL61H4vyy6YVXkybMNNEPJNPPuZrD1gRVA/exec";
        const fullUrl = `${decodeUrl}?encrypted_data=${encodeURIComponent(encoded)}&nonce=${encodeURIComponent(nonce)}&secret=${encodeURIComponent(secret)}`;
        return fetch(fullUrl).then((r) => r.ok ? r.text() : null).then((txt) => {
          const m3u8 = txt?.match(/"file":"(.*?)"/)?.[1];
          return m3u8 ? build(m3u8) : [];
        });
      });
    });
  }).catch(() => []);
}
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
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
function getTMDBSeasonAirDate(tmdbId, season) {
  return tmdbFetch(`/tv/${tmdbId}/season/${season}`).then((d) => d?.air_date ?? null);
}
var ANILIST_API = "https://graphql.anilist.co";
function tmdbToAnimeId(title, year) {
  if (!title || !year)
    return Promise.resolve({ idMal: null });
  return fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
            query ($search: String, $seasonYear: Int) {
              Page(perPage: 5) {
                media(search: $search, seasonYear: $seasonYear, type: ANIME) {
                  idMal
                }
              }
            }`,
      variables: { search: title, seasonYear: year }
    })
  }).then((r) => r.ok ? r.json() : null).then((j) => ({ idMal: j?.data?.Page?.media?.[0]?.idMal ?? null })).catch(() => ({ idMal: null }));
}
function getHiAnimeIdFromMalSync(malId) {
  return fetch(`https://api.malsync.moe/mal/anime/${malId}`).then((r) => r.ok ? r.json() : null).then((j) => {
    const z = j?.Sites?.Zoro;
    return z ? Object.values(z)[0]?.identifier ?? null : null;
  }).catch(() => null);
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return getTMDBDetails(tmdbId, mediaType).then((info) => {
    if (!info)
      return [];
    const aired = mediaType === "tv" && season > 1 ? getTMDBSeasonAirDate(tmdbId, season) : Promise.resolve(info.firstAirDate);
    return aired.then((airedDate) => ({ info, airedDate }));
  }).then(({ info, airedDate }) => {
    const year = (airedDate || info.releaseDate)?.split("-")?.[0];
    return tmdbToAnimeId(info.title, Number(year)).then((ids) => ({ info, ids }));
  }).then(({ info, ids }) => {
    if (!ids.idMal)
      return [];
    return getHiAnimeIdFromMalSync(ids.idMal).then((hiId) => {
      if (!hiId)
        return [];
      const epNum = String(episode ?? 1);
      const apis = [...HIANIME_APIS].sort(() => Math.random() - 0.5);
      let chain = Promise.resolve([]);
      for (const api of apis) {
        chain = chain.then((res) => {
          if (res.length)
            return res;
          return fetch(`${api}/ajax/v2/episode/list/${hiId}`, { headers: AJAX_HEADERS }).then((r) => r.ok ? r.json() : null).then((list) => {
            if (!list?.html)
              return [];
            const $ = cheerio.load(list.html);
            const epId = $("a[data-number]").filter((_, e) => $(e).attr("data-number") === epNum).attr("data-id");
            if (!epId)
              return [];
            return fetch(`${api}/ajax/v2/episode/servers?episodeId=${epId}`, { headers: AJAX_HEADERS }).then((r) => r.ok ? r.json() : null).then((srv) => {
              if (!srv?.html)
                return [];
              const $$ = cheerio.load(srv.html);
              const servers = $$("div.server-item").map((_, e) => {
                const t = $$(e).attr("data-type");
                let effectiveType;
                if (t === "raw")
                  effectiveType = "RAW";
                else if (t === "sub")
                  effectiveType = "SUB";
                else if (t === "dub")
                  effectiveType = "DUB";
                else
                  effectiveType = "UNKNOWN";
                return {
                  label: $$(e).text().trim(),
                  id: $$(e).attr("data-id"),
                  type: effectiveType
                };
              }).get();
              let out = [];
              let sChain = Promise.resolve();
              servers.forEach((s) => {
                sChain = sChain.then(() => {
                  console.log("[HiAnime] Server:", {
                    label: s.label,
                    id: s.id,
                    type: s.type
                  });
                  return fetch(`${api}/ajax/v2/episode/sources?id=${s.id}`, {
                    headers: AJAX_HEADERS
                  }).then((r) => r.ok ? r.json() : null).then((src) => {
                    if (!src?.link) {
                      console.log("[HiAnime] No embed link for server", s.label);
                      return;
                    }
                    if (!src.link.includes("megacloud")) {
                      console.log("[HiAnime] Skipping non-megacloud server:", src.link);
                      return;
                    }
                    return extractMegacloud(src.link, s.type).then((xs) => {
                      xs.forEach((x) => {
                        out.push({
                          name: `\u231C HiAnime \u231F | ${s.label} | ${s.type}`,
                          title: info.title,
                          url: x.url,
                          quality: "1080p",
                          provider: "HiAnime",
                          headers: megaHeaders,
                          subtitles: x.subtitles
                        });
                      });
                    });
                  });
                });
              });
              return sChain.then(() => {
                if (out.length) {
                  return out;
                }
                return [];
              });
            });
          });
        });
      }
      return chain;
    });
  }).catch(() => []);
}
if (typeof module !== "undefined" && module.exports) {
  const { extract } = require_extractors();
  function wrappedGetStreams(...args) {
    return __async(this, null, function* () {
      const streams = yield getStreams(...args);
      const finalStreams = [];
      for (const s of streams) {
        if (!s.url)
          continue;
        const ext = yield extract(s.url);
        if (ext) {
          s.url = ext.url;
          if (ext.quality !== "Unknown")
            s.quality = ext.quality;
          finalStreams.push(s);
        } else if (s.url.includes(".mp4") || s.url.includes(".m3u8") || s.url.includes(".mkv") || s.url.includes(".avi") || s.url.startsWith("magnet:") || s.url.includes("/api/file/") || s.url.includes(".cloudflarestorage.com")) {
          finalStreams.push(s);
        }
      }
      return finalStreams;
    });
  }
  module.exports = { getStreams: wrappedGetStreams };
} else {
  global.getStreams = { getStreams };
}
