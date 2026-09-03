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

// src/providers/xdmovies.js
var cheerio = require("cheerio-without-node-native");
var XDMOVIES_API = "https://new.xdmovies.wtf";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var XDMOVIES_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Referer": `${XDMOVIES_API}/`,
  "x-requested-with": "XMLHttpRequest",
  "x-auth-token": atob("NzI5N3Nra2loa2Fqd25zZ2FrbGFrc2h1d2Q=")
};
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Referer": `${XDMOVIES_API}/`
};
function formatBytes(bytes) {
  if (!bytes || bytes === 0)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function cleanTitle(title) {
  const parts = title.split(/[.\-_]/);
  const qualityTags = [
    "WEBRip",
    "WEB-DL",
    "WEB",
    "BluRay",
    "HDRip",
    "DVDRip",
    "HDTV",
    "CAM",
    "TS",
    "R5",
    "DVDScr",
    "BRRip",
    "BDRip",
    "DVD",
    "PDTV",
    "HD"
  ];
  const audioTags = [
    "AAC",
    "AC3",
    "DTS",
    "MP3",
    "FLAC",
    "DD5",
    "EAC3",
    "Atmos"
  ];
  const subTags = [
    "ESub",
    "ESubs",
    "Subs",
    "MultiSub",
    "NoSub",
    "EnglishSub",
    "HindiSub"
  ];
  const codecTags = [
    "x264",
    "x265",
    "H264",
    "HEVC",
    "AVC"
  ];
  const startIndex = parts.findIndex(
    (part) => qualityTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase()))
  );
  const endIndex = parts.findLastIndex(
    (part) => subTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase())) || audioTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase())) || codecTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase()))
  );
  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    return parts.slice(startIndex, endIndex + 1).join(".");
  } else if (startIndex !== -1) {
    return parts.slice(startIndex).join(".");
  } else {
    return parts.slice(-3).join(".");
  }
}
function extractServerName(source) {
  if (!source)
    return "Unknown";
  const src = source.trim();
  if (/HubCloud/i.test(src)) {
    if (/FSL/i.test(src))
      return "HubCloud FSL Server";
    if (/FSL V2/i.test(src))
      return "HubCloud FSL V2 Server";
    if (/S3/i.test(src))
      return "HubCloud S3 Server";
    if (/Buzz/i.test(src))
      return "HubCloud BuzzServer";
    if (/10\s*Gbps/i.test(src))
      return "HubCloud 10Gbps";
    return "HubCloud";
  }
  if (/Pixeldrain/i.test(src))
    return "Pixeldrain";
  if (/StreamTape/i.test(src))
    return "StreamTape";
  if (/HubCdn/i.test(src))
    return "HubCdn";
  if (/HbLinks/i.test(src))
    return "HbLinks";
  if (/Hubstream/i.test(src))
    return "Hubstream";
  return src.replace(/^www\./i, "").split(/[.\s]/)[0];
}
function pixelDrainExtractor(link, quality) {
  return Promise.resolve().then(() => {
    let fileId;
    const match = link.match(/(?:file|u)\/([A-Za-z0-9]+)/);
    if (match) {
      fileId = match[1];
    } else {
      fileId = link.split("/").pop();
    }
    if (!fileId) {
      return [{ source: "Pixeldrain", quality: "Unknown", url: link }];
    }
    const infoUrl = `https://pixeldrain.com/api/file/${fileId}/info`;
    let fileInfo = { name: "", quality: "Unknown", size: 0 };
    return fetch(infoUrl, { headers: HEADERS }).then((response) => response.json()).then((info) => {
      if (info && info.name) {
        fileInfo.name = info.name;
        fileInfo.size = info.size || 0;
        const qualityMatch = info.name.match(/(\d{3,4})p/);
        if (qualityMatch) {
          fileInfo.quality = qualityMatch[0];
        }
      }
      const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
      return [{
        source: "Pixeldrain",
        quality: quality ? quality : fileInfo.quality,
        url: directUrl,
        name: fileInfo.name,
        size: fileInfo.size
      }];
    }).catch((e) => {
      console.warn(`[Pixeldrain] Could not fetch file info for ${fileId}:`, e.message);
      const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
      return [{
        source: "Pixeldrain",
        quality: fileInfo.quality,
        url: directUrl,
        name: fileInfo.name,
        size: fileInfo.size
      }];
    });
  }).catch((e) => {
    console.error("[Pixeldrain] extraction failed", e.message);
    return [{ source: "Pixeldrain", quality: "Unknown", url: link }];
  });
}
function streamTapeExtractor(link) {
  const url = new URL(link);
  url.hostname = "streamtape.com";
  const normalizedLink = url.toString();
  return fetch(normalizedLink, { headers: HEADERS }).then((res) => res.text()).then((data) => {
    const match = data.match(/document\.getElementById\('videolink'\)\.innerHTML = (.*?);/);
    if (match && match[1]) {
      const scriptContent = match[1];
      const urlPartMatch = scriptContent.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
      if (urlPartMatch && urlPartMatch[1]) {
        const videoSrc = "https:" + urlPartMatch[1];
        return [{ source: "StreamTape", quality: "Stream", url: videoSrc }];
      }
    }
    const simpleMatch = data.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
    if (simpleMatch && simpleMatch[0]) {
      const videoSrc = "https:" + simpleMatch[0].slice(1, -1);
      return [{ source: "StreamTape", quality: "Stream", url: videoSrc }];
    }
    return [];
  }).catch((e) => {
    if (!e.response || e.response.status !== 404) {
      console.error(`[StreamTape] An unexpected error occurred for ${normalizedLink}:`, e.message);
    }
    return [];
  });
}
function hubStreamExtractor(url, referer) {
  return fetch(url, { headers: { ...HEADERS, Referer: referer } }).then((response) => {
    return [{ source: "Hubstream", quality: "Unknown", url }];
  }).catch((e) => {
    console.error(`[Hubstream] Failed to extract from ${url}:`, e.message);
    return [];
  });
}
function hbLinksExtractor(url, referer) {
  return fetch(url, { headers: { ...HEADERS, Referer: referer } }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    const links = $("h3 a, div.entry-content p a").map((i, el) => $(el).attr("href")).get();
    const finalLinks = [];
    const promises = links.map((link) => loadExtractor(link, url));
    return Promise.all(promises).then((results) => {
      results.forEach((extracted) => finalLinks.push(...extracted));
      return finalLinks;
    });
  });
}
function hubCdnExtractor(url, referer) {
  return fetch(url, { headers: { ...HEADERS, Referer: referer } }).then((response) => response.text()).then((data) => {
    const encodedMatch = data.match(/r=([A-Za-z0-9+/=]+)/);
    if (encodedMatch && encodedMatch[1]) {
      const m3u8Data = atob(encodedMatch[1]);
      const m3u8Link = m3u8Data.substring(m3u8Data.lastIndexOf("link=") + 5);
      return [{
        source: "HubCdn",
        quality: "M3U8",
        url: m3u8Link
      }];
    }
    return [];
  }).catch(() => []);
}
function hubDriveExtractor(url, referer) {
  return fetch(url, { headers: { ...HEADERS, Referer: referer } }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    const href = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
    if (href) {
      return loadExtractor(href, url);
    }
    return [];
  }).catch(() => []);
}
function hubCloudExtractor(url, referer) {
  let currentUrl = url;
  if (currentUrl.includes("hubcloud.ink")) {
    currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
  }
  if (/\/(video|drive)\//i.test(currentUrl)) {
    return fetch(currentUrl, {
      headers: { ...HEADERS, Referer: referer }
    }).then((r) => r.text()).then((html) => {
      const $ = cheerio.load(html);
      const hubPhp = $('a[href*="hubcloud.php"]').attr("href");
      if (!hubPhp)
        return [];
      return hubCloudExtractor(hubPhp, currentUrl);
    }).catch(() => []);
  }
  const initialFetch = currentUrl.includes("hubcloud.php") ? fetch(currentUrl, {
    headers: { ...HEADERS, Referer: referer },
    redirect: "follow"
  }).then(
    (response) => response.text().then((html) => ({
      pageData: html,
      finalUrl: response.url || currentUrl
    }))
  ) : fetch(currentUrl, {
    headers: { ...HEADERS, Referer: referer }
  }).then((r) => r.text()).then((pageData) => {
    let finalUrl = currentUrl;
    const scriptUrlMatch = pageData.match(/var url = '([^']*)'/);
    if (scriptUrlMatch && scriptUrlMatch[1]) {
      finalUrl = scriptUrlMatch[1];
      return fetch(finalUrl, {
        headers: { ...HEADERS, Referer: currentUrl }
      }).then((r) => r.text()).then((secondData) => ({
        pageData: secondData,
        finalUrl
      }));
    }
    return { pageData, finalUrl };
  });
  return initialFetch.then(({ pageData, finalUrl }) => {
    const $ = cheerio.load(pageData);
    const size = $("i#size").text().trim();
    const header = $("div.card-header").text().trim();
    const getIndexQuality = (str) => {
      const match = (str || "").match(/(\d{3,4})[pP]/);
      return match ? parseInt(match[1]) : 2160;
    };
    const quality = getIndexQuality(header);
    const headerDetails = cleanTitle(header);
    const labelExtras = (() => {
      let extras = "";
      if (headerDetails)
        extras += `[${headerDetails}]`;
      if (size)
        extras += `[${size}]`;
      return extras;
    })();
    const sizeInBytes = (() => {
      if (!size)
        return 0;
      const m = size.match(/([\d.]+)\s*(GB|MB|KB)/i);
      if (!m)
        return 0;
      const v = parseFloat(m[1]);
      if (m[2].toUpperCase() === "GB")
        return v * 1024 ** 3;
      if (m[2].toUpperCase() === "MB")
        return v * 1024 ** 2;
      if (m[2].toUpperCase() === "KB")
        return v * 1024;
      return 0;
    })();
    const links = [];
    const elements = $("a.btn[href]").get();
    const processElements = elements.map((el) => {
      const link = $(el).attr("href");
      const text = $(el).text();
      if (/telegram/i.test(text) || /telegram/i.test(link)) {
        return Promise.resolve();
      }
      const fileName = header || headerDetails || "Unknown";
      if (text.includes("Download File")) {
        links.push({
          source: `HubCloud ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("FSL V2")) {
        links.push({
          source: `HubCloud - FSL V2 Server ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("FSL")) {
        links.push({
          source: `HubCloud - FSL Server ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("S3 Server")) {
        links.push({
          source: `HubCloud - S3 Server ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("BuzzServer")) {
        return fetch(`${link}/download`, {
          method: "GET",
          headers: { ...HEADERS, Referer: link },
          redirect: "manual"
        }).then((resp) => {
          if (resp.status >= 300 && resp.status < 400) {
            const loc = resp.headers.get("location");
            const m = loc?.match(/hx-redirect=([^&]+)/);
            if (m) {
              links.push({
                source: `HubCloud - BuzzServer ${labelExtras}`,
                quality,
                url: decodeURIComponent(m[1]),
                size: sizeInBytes,
                fileName
              });
            }
          }
        }).catch(() => {
        });
      }
      if (link.includes("pixeldra")) {
        console.log("[HubCloud] Using Pixeldrain extractor for link:", link);
        return pixelDrainExtractor(link, quality).then((extracted) => {
          links.push(...extracted.map((l) => ({
            ...l,
            quality: typeof l.quality === "number" ? l.quality : quality,
            size: l.size || sizeInBytes,
            fileName
          })));
        }).catch(() => {
        });
      }
      if (text.includes("10Gbps")) {
        let redirectUrl = link;
        let finalLink = null;
        const walk = (i) => {
          if (i >= 5)
            return Promise.resolve(finalLink);
          return fetch(redirectUrl, { redirect: "manual" }).then((r) => {
            if (r.status >= 300 && r.status < 400) {
              const loc = r.headers.get("location");
              if (loc?.includes("link=")) {
                finalLink = loc.split("link=")[1];
                return finalLink;
              }
              if (loc)
                redirectUrl = new URL(loc, redirectUrl).toString();
              return walk(i + 1);
            }
            return finalLink;
          }).catch(() => finalLink);
        };
        return walk(0).then((dlink) => {
          if (dlink) {
            links.push({
              source: `HubCloud - 10Gbps ${labelExtras}`,
              quality,
              url: dlink,
              size: sizeInBytes,
              fileName
            });
          }
        });
      }
      const host = new URL(link).hostname;
      if (host.includes("hubcloud") || host.includes("hubdrive") || host.includes("hubcdn")) {
        return Promise.resolve();
      }
      return loadExtractor(link, finalUrl).then((r) => links.push(...r));
    });
    return Promise.all(processElements).then(() => links);
  }).catch(() => []);
}
function loadExtractor(url, referer = MAIN_URL) {
  const hostname = new URL(url).hostname;
  if (hostname.includes("gdflix")) {
    return gdFlixExtractor(url, referer);
  }
  if (hostname.includes("gofile")) {
    return goFileExtractor(url);
  }
  if (hostname.includes("hubcloud")) {
    return hubCloudExtractor(url, referer);
  }
  if (hostname.includes("hubdrive")) {
    return hubDriveExtractor(url, referer);
  }
  if (hostname.includes("hubcdn")) {
    return hubCdnExtractor(url, referer);
  }
  if (hostname.includes("hblinks")) {
    return hbLinksExtractor(url, referer);
  }
  if (hostname.includes("hubstream")) {
    return hubStreamExtractor(url, referer);
  }
  if (hostname.includes("pixeldrain")) {
    return pixelDrainExtractor(url);
  }
  if (hostname.includes("streamtape")) {
    return streamTapeExtractor(url);
  }
  if (hostname.includes("hdstream4u")) {
    return Promise.resolve([{ source: "HdStream4u", quality: "Unknown", url }]);
  }
  if (hostname.includes("linkrit")) {
    return Promise.resolve([]);
  }
  if (hostname.includes("google.") || hostname.includes("ampproject.org") || hostname.includes("gstatic.") || hostname.includes("doubleclick.") || hostname.includes("ddl2")) {
    console.warn("[XDMovies] Blocked redirect host:", hostname);
    return Promise.resolve([]);
  }
  const sourceName = hostname.replace(/^www\./, "");
  return Promise.resolve([{ source: sourceName, quality: "Unknown", url }]);
}
function getTMDBDetails(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  return fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }).then(function(response) {
    console.error("[TMDB] HTTP status:", response.status);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    return response.json();
  }).then(function(data) {
    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return {
      title,
      year,
      imdbId: data.external_ids?.imdb_id || null
    };
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return getTMDBDetails(tmdbId, mediaType).then((mediaInfo) => {
    if (!mediaInfo?.title)
      return [];
    return fetch(
      `${XDMOVIES_API}/php/search_api.php?query=${encodeURIComponent(mediaInfo.title)}&fuzzy=true`,
      { headers: XDMOVIES_HEADERS }
    ).then((r) => r.ok ? r.json() : []).then((searchData) => {
      if (!Array.isArray(searchData))
        return [];
      const matched = searchData.find(
        (x) => Number(x.tmdb_id) === Number(tmdbId)
      );
      if (!matched?.path)
        return [];
      return fetch(XDMOVIES_API + matched.path, {
        headers: XDMOVIES_HEADERS
      }).then((r) => r.text()).then((html) => {
        const $ = cheerio.load(html);
        const collectedUrls = [];
        const resolveRedirect = (url) => fetch(url, {
          headers: XDMOVIES_HEADERS,
          redirect: "manual"
        }).then((res) => {
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get("location");
            return loc ? new URL(loc, url).toString() : null;
          }
          return url;
        }).catch(() => null);
        if (!season) {
          const rawLinks = $("div.download-item a[href]").map((_, a) => $(a).attr("href")).get();
          return Promise.all(
            rawLinks.map(
              (raw) => resolveRedirect(raw).then((finalUrl) => {
                if (finalUrl)
                  collectedUrls.push(finalUrl);
              })
            )
          ).then(() => collectedUrls);
        }
        const epRegex = new RegExp(
          `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`,
          "i"
        );
        const jobs = [];
        $("div.episode-card").each((_, card) => {
          const $card = $(card);
          const title = $card.find(".episode-title").text() || "";
          if (!epRegex.test(title))
            return;
          $card.find("a[href]").each((_2, a) => {
            const raw = $(a).attr("href");
            if (!raw)
              return;
            jobs.push(
              resolveRedirect(raw).then((finalUrl) => {
                if (finalUrl)
                  collectedUrls.push(finalUrl);
              })
            );
          });
        });
        return Promise.all(jobs).then(() => collectedUrls);
      }).then((collectedUrls) => {
        if (!collectedUrls.length)
          return [];
        return Promise.all(
          collectedUrls.map(
            (url) => loadExtractor(url, XDMOVIES_API).catch(() => [])
          )
        ).then((results) => {
          const flat = results.flat();
          const seen = /* @__PURE__ */ new Set();
          return flat.filter((link) => {
            if (!link || !link.url)
              return false;
            if (seen.has(link.url))
              return false;
            seen.add(link.url);
            return true;
          }).map((link) => {
            let title;
            if (mediaType === "tv") {
              title = `${mediaInfo.title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
            } else if (mediaInfo.year) {
              title = `${mediaInfo.title} (${mediaInfo.year})`;
            } else {
              title = mediaInfo.title;
            }
            let quality = "Unknown";
            if (link.quality >= 2160)
              quality = "2160p";
            else if (link.quality >= 1440)
              quality = "1440p";
            else if (link.quality >= 1080)
              quality = "1080p";
            else if (link.quality >= 720)
              quality = "720p";
            else if (link.quality >= 480)
              quality = "480p";
            else if (link.quality >= 360)
              quality = "360p";
            return {
              name: `XDmovies ${extractServerName(link.source)}`,
              title,
              url: link.url,
              quality,
              size: formatBytes(link.size),
              headers: link.headers,
              provider: "XDmovies"
            };
          });
        });
      });
    });
  }).catch((err) => {
    console.error("[XDmovies] getStreams failed:", err.message);
    return [];
  });
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
