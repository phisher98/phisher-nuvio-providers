"use strict";
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
    step(
      (generator = generator.apply(
        __this,
        __arguments
      )).next()
    );
  });
};
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const API_URL = "https://api.allanime.day/api";
const API_ENDPOINT = "https://allanimenews.com";
const MAIN_HASH = "e42a4466d984b2c0a2cecae5dd13aa68867f634b16ee0f17b380047d14482406";
const maipageshaHash = "a24c500a1b765c68ae1d8dd85174931f661c71369c89b92b88b75a725afc471c";
const SERVER_HASH = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec";
const HEADERS = {
  "app-version": "android_c-247",
  "from-app": "4DqMXoovyMEkBc7H",
  "platformstr": "android_c",
  "Referer": "https://allmanga.to",
  "User-Agent": "Mozilla/5.0"
};
function atob(str) {
  return Buffer.from(
    str,
    "base64"
  ).toString("binary");
}
function decryptHex(inputStr) {
  const hexString = inputStr.startsWith("-") ? inputStr.split("-").pop() : inputStr;
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(
      parseInt(
        hexString.substr(i, 2),
        16
      )
    );
  }
  return bytes.map(
    (b) => String.fromCharCode(b ^ 56)
  ).join("");
}
function fixUrlPath(url) {
  if (url.includes(".json?")) {
    return API_ENDPOINT + url;
  }
  try {
    const u = new URL(url);
    return API_ENDPOINT + u.pathname + ".json?" + u.search.replace("?", "");
  } catch (_) {
    return API_ENDPOINT + url + ".json";
  }
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(
    this,
    null,
    function* () {
      var _a, _b, _c, _d;
      try {
        console.log(
          `[Anichi] Fetching ${mediaType} ${tmdbId}`
        );
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const mediaInfo = yield (yield fetch(tmdbUrl)).json();
        const title = mediaInfo.title || mediaInfo.name;
        if (!title) {
          console.log(
            "[Anichi] No title"
          );
          return [];
        }
        console.log(
          `[Anichi] Title: ${title}`
        );
        const encodedQuery = encodeURIComponent(title);
        const searchUrl = `${API_URL}?variables={"search":{"query":"${encodedQuery}"},"limit":26,"page":1,"translationType":"sub","countryOrigin":"ALL"}&extensions={"persistedQuery":{"version":1,"sha256Hash":"${maipageshaHash}"}}`;
        console.log(
          `[Anichi] Search URL: ${searchUrl}`
        );
        const responseText = yield (yield fetch(searchUrl, {
          headers: HEADERS
        })).text();
        if (responseText.includes(
          "PERSISTED_QUERY_NOT_FOUND"
        )) {
          console.log(
            "[Anichi] Persisted query failed"
          );
          return [];
        }
        const searchRes = JSON.parse(responseText);
        const edges = ((_b = (_a = searchRes == null ? void 0 : searchRes.data) == null ? void 0 : _a.shows) == null ? void 0 : _b.edges) || [];
        console.log(
          `[Anichi] Results: ${edges.length}`
        );
        if (!edges.length) {
          console.log(
            "[Anichi] No search results"
          );
          return [];
        }
        const best = edges.find(
          (e) => {
            var _a2, _b2;
            return ((_a2 = e.englishName) == null ? void 0 : _a2.toLowerCase().includes(
              title.toLowerCase()
            )) || ((_b2 = e.name) == null ? void 0 : _b2.toLowerCase().includes(
              title.toLowerCase()
            ));
          }
        ) || edges[0];
        const showId = best == null ? void 0 : best._id;
        if (!showId) {
          console.log(
            "[Anichi] No show ID"
          );
          return [];
        }
        console.log(
          `[Anichi] Show ID: ${showId}`
        );
        const epNum = String(episode || 1);
        const dubStatus = "sub";
        const episodeUrl = `${API_URL}?variables={"showId":"${showId}","translationType":"${dubStatus}","episodeString":"${epNum}"}&extensions={"persistedQuery":{"version":1,"sha256Hash":"${SERVER_HASH}"}}`;
        console.log(
          `[Anichi] Episode URL: ${episodeUrl}`
        );
        const epText = yield (yield fetch(episodeUrl, {
          headers: HEADERS
        })).text();
        if (epText.includes(
          "PERSISTED_QUERY_NOT_FOUND"
        )) {
          console.log(
            "[Anichi] Episode query failed"
          );
          return [];
        }
        const epRes = JSON.parse(epText);
        const sourceUrls = ((_d = (_c = epRes == null ? void 0 : epRes.data) == null ? void 0 : _c.episode) == null ? void 0 : _d.sourceUrls) || [];
        console.log(
          `[Anichi] Sources: ${sourceUrls.length}`
        );
        const streams = [];
        for (const source of sourceUrls.slice(0, 8)) {
          try {
            const rawLink = source.sourceUrl;
            if (!rawLink)
              continue;
            let link = rawLink;
            if (source.sourceName === "Ak" || rawLink.includes(
              "/player/vitemb"
            )) {
              try {
                const decoded = JSON.parse(
                  atob(
                    rawLink.split("=").slice(1).join("=")
                  )
                );
                link = decoded.idUrl || rawLink;
              } catch (_) {
                continue;
              }
            } else {
              link = rawLink.replace(
                / /g,
                "%20"
              );
            }
            if (link.startsWith("//")) {
              link = "https:" + link;
            }
            if (link.startsWith("--")) {
              link = decryptHex(link);
            }
            if (link.startsWith("http")) {
              yield loadExtractor(
                link,
                null,
                (stream) => {
                  stream.name = `Anichi - ${(source.sourceName || "SUB").toUpperCase()}`;
                  stream.title = `Anichi ${(source.sourceName || "SUB").toUpperCase()}`;
                  streams.push(stream);
                }
              );
              continue;
              continue;
            }
            const fixedLink = fixUrlPath(link);
            console.log(
              `[Anichi] Internal: ${fixedLink}`
            );
            const apiRes = yield (yield fetch(
              fixedLink,
              {
                headers: HEADERS
              }
            )).json();
            const links = (apiRes == null ? void 0 : apiRes.links) || [];
            for (const server of links) {
              if (server.hls !== false && server.link) {
                streams.push({
                  name: `Anichi - ${(source.sourceName || "SUB").toUpperCase()}`,
                  title: `Anichi ${(source.sourceName || "SUB").toUpperCase()}`,
                  url: server.link,
                  quality: "1080p",
                  subtitles: (server.subtitles || []).map((s) => ({
                    lang: s.lang || "Unknown",
                    url: s.src
                  }))
                });
              }
            }
          } catch (err) {
            console.log(
              `[Anichi] Source failed: ${err.message}`
            );
          }
        }
        console.log(
          `[Anichi] Streams: ${streams.length}`
        );
        return streams;
      } catch (e) {
        console.log(
          `[Anichi] ${e.message}`
        );
        return [];
      }
    }
  );
}
function loadExtractor(url, subtitleCallback, callback) {
  return __async(
    this,
    null,
    function* () {
      try {
        if (!url)
          return;
        if (url.includes("streamwish") || url.includes("swiftplayers")) {
          return yield extractStreamWish(
            url,
            callback
          );
        }
        if (url.includes("filemoon")) {
          return yield extractFilemoon(
            url,
            callback
          );
        }
        if (url.includes("mp4upload")) {
          return yield extractMp4Upload(
            url,
            callback
          );
        }
        if (url.includes("ok.ru")) {
          return yield extractOkru(
            url,
            callback
          );
        }
        if (url.includes("byse") || url.includes("bysekoze")) {
          return yield extractByse(
            url,
            callback
          );
        }
        callback({
          name: "Direct",
          title: "Direct",
          url,
          quality: "1080p"
        });
      } catch (e) {
        console.log(
          `[Extractor] ${e.message}`
        );
      }
    }
  );
}
function extractStreamWish(url, callback) {
  return __async(
    this,
    null,
    function* () {
      var _a;
      try {
        const html = yield (yield fetch(url, {
          headers: {
            "Referer": "https://streamwish.to/",
            "Origin": "https://streamwish.to"
          }
        })).text();
        const m3u8 = (_a = html.match(
          /file:\s*"(.*?m3u8.*?)"/
        )) == null ? void 0 : _a[1];
        if (!m3u8)
          return;
        callback({
          name: "StreamWish",
          title: "StreamWish HLS",
          url: m3u8,
          quality: "1080p",
          headers: {
            "Referer": "https://streamwish.to/"
          }
        });
      } catch (e) {
        console.log(
          `[StreamWish] ${e.message}`
        );
      }
    }
  );
}
function extractFilemoon(url, callback) {
  return __async(
    this,
    null,
    function* () {
      var _a;
      try {
        const html = yield (yield fetch(url, {
          headers: {
            "Referer": url
          }
        })).text();
        const packed = (_a = html.match(
          /sources:\[\{file:"(.*?)"/
        )) == null ? void 0 : _a[1];
        if (!packed)
          return;
        callback({
          name: "Filemoon",
          title: "Filemoon HLS",
          url: packed,
          quality: "1080p",
          headers: {
            "Referer": "https://filemoon.to/"
          }
        });
      } catch (e) {
        console.log(
          `[Filemoon] ${e.message}`
        );
      }
    }
  );
}
function extractMp4Upload(url, callback) {
  return __async(
    this,
    null,
    function* () {
      var _a;
      try {
        const html = yield (yield fetch(url)).text();
        const mp4 = (_a = html.match(
          /src:\s*"([^"]+\.mp4[^"]*)"/
        )) == null ? void 0 : _a[1];
        if (!mp4)
          return;
        callback({
          name: "MP4Upload",
          title: "MP4Upload",
          url: mp4,
          quality: "1080p"
        });
      } catch (e) {
        console.log(
          `[MP4Upload] ${e.message}`
        );
      }
    }
  );
}
function extractOkru(url, callback) {
  return __async(
    this,
    null,
    function* () {
      var _a;
      try {
        const html = yield (yield fetch(url)).text();
        const data = (_a = html.match(
          /data-options="([^"]+)"/
        )) == null ? void 0 : _a[1];
        if (!data)
          return;
        const decoded = JSON.parse(
          data.replace(/&quot;/g, '"')
        );
        const metadata = JSON.parse(
          decoded.flashvars.metadata
        );
        const hls = metadata == null ? void 0 : metadata.hlsManifestUrl;
        if (!hls)
          return;
        callback({
          name: "OKru",
          title: "OKru HLS",
          url: hls,
          quality: "1080p"
        });
      } catch (e) {
        console.log(
          `[OKru] ${e.message}`
        );
      }
    }
  );
}
function extractByse(url, callback) {
  return __async(
    this,
    null,
    function* () {
      try {
        const code = url.split("/").pop();
        const base = new URL(url).origin;
        const detailsUrl = `${base}/api/videos/${code}/embed/details`;
        const details = yield (yield fetch(detailsUrl)).json();
        const embedFrameUrl = details.embed_frame_url;
        if (!embedFrameUrl)
          return;
        const embedCode = embedFrameUrl.split("/").pop();
        const playbackUrl = `${base}/api/videos/${embedCode}/embed/playback`;
        const playback = yield (yield fetch(playbackUrl, {
          headers: {
            "Referer": embedFrameUrl,
            "X-Embed-Parent": embedFrameUrl
          }
        })).json();
        const payload = playback == null ? void 0 : playback.playback;
        if (!payload)
          return;
        callback({
          name: "Byse",
          title: "Byse",
          url,
          quality: "1080p"
        });
      } catch (e) {
        console.log(
          `[Byse] ${e.message}`
        );
      }
    }
  );
}
module.exports = {
  getStreams
};
