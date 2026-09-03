const cheerio = require("cheerio-without-node-native");
// goojara.js
// Goojara - English movie & series site (ww1.goojara.to)
// Search: POST to /xmre.php with form data z, x, q
// Episodes: GET season page /?s={seasonNum}  then div.seho elements
// Stream: #drl a links → redirect with Cookie → final embed URL

const BASE_URL = "https://ww1.goojara.to";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
  "Accept": "*/*",
  "Referer": BASE_URL,
  "Cookie": "aGooz=dg18hh2eittp5e7s53u0e6bloh"
};

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search via POST
    const searchBody = new URLSearchParams({
      z: "Mwxxa3Vnaw",
      x: "b3716e05ff",
      q: title
    });

    const searchResp = await fetch(`${BASE_URL}/xmre.php`, {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: searchBody.toString(),
      skipSizeCheck: true
    });

    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("li a").each((i, a) => {
      const href = $(a).attr("href");
      const t = $(a).text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const isTV = mediaType === "tv";
    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    // Get the actual show page
    const matchUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;

    // Need to fetch the intermediate page to get the real show URL
    const matchPageHtml = await (await fetch(matchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $match = cheerio.load(matchPageHtml);
    const showHref = $match("div.snfo h1 a").attr("href") || matchUrl;
    const showUrl = showHref.startsWith("http") ? showHref : `${BASE_URL}${showHref}`;

    // 3. Load show page
    const showHtml = await (await fetch(showUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $show = cheerio.load(showHtml);

    let targetUrl = showUrl;

    if (isTV) {
      // Get season link
      const seasonLink = $show("#sesh a.ste").attr("href") || "";
      if (!seasonLink) return [];

      const totalSeasons = parseInt(seasonLink.split("?s=")[1]) || 1;

      if (season > totalSeasons) return [];

      const seasonHref = seasonLink.split("?s=")[0] + `?s=${season}`;
      const seasonUrl = seasonHref.startsWith("http") ? seasonHref : `${BASE_URL}${seasonHref}`;

      const seasonHtml = await (await fetch(seasonUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $season = cheerio.load(seasonHtml);

      let epUrl = "";
      $season("div.seho").each((i, el) => {
        if (epUrl) return;
        const epText = $season("span.sea", el).text().replace(/^0/, "").trim();
        const epNum = parseInt(epText);
        if (epNum === episode) {
          const href = $season("a", el).attr("href");
          epUrl = href ? (href.startsWith("http") ? href : `${BASE_URL}${href}`) : "";
        }
      });

      if (!epUrl) return [];
      targetUrl = epUrl;
    }

    // 4. Load player page and get #drl links
    const playerResp = await fetch(targetUrl, {
      headers: { ...HEADERS, Referer: "https://www.goojara.to", Cookie: "" },
      skipSizeCheck: true
    });
    const playerHtml = await playerResp.text();
    const $player = cheerio.load(playerHtml);

    // Extract cookies from response for subsequent requests
    const setCookie = playerResp.headers.get ? playerResp.headers.get("set-cookie") : "";
    // Parse _3chk() from HTML
    const chkMatch = playerHtml.match(/_3chk\(\s*'([^']+)'\s*,\s*'([^']+)'/);
    const cookieStr = setCookie ? `${setCookie.split(";")[0]}${chkMatch ? `; ${chkMatch[1]}=${chkMatch[2]}` : ""}` : "";

    const streams = [];

    const drlLinks = $player("#drl a").toArray();
    for (const a of drlLinks) {
      const href = $player(a).attr("href") || "";
      if (!href) continue;
      try {
        // Follow the redirect to get the embed URL
        const redirectResp = await fetch(href, {
          headers: {
            ...HEADERS,
            Referer: BASE_URL,
            Cookie: cookieStr
          },
          redirect: "manual",
          skipSizeCheck: true
        });
        const embedUrl = redirectResp.headers.get ? redirectResp.headers.get("location") : "";
        if (embedUrl && embedUrl.startsWith("http")) {
          streams.push({
            url: embedUrl,
            quality: "720p",
            title: `Goojara`,
            subtitles: []
          });
        }
      } catch (e) {}
    }

    return streams;
  } catch (e) {
    console.error("[Goojara]", e);
    return [];
  }
}



const { extract } = require('../utils/extractors.js');
async function wrappedGetStreams(...args) {
    const streams = await getStreams(...args);
    const finalStreams = [];
    for (const s of streams) {
        if (!s.url) continue;
        const ext = await extract(s.url);
        if (ext) {
            s.url = ext.url;
            if (ext.quality !== 'Unknown') s.quality = ext.quality;
            finalStreams.push(s);
        } else if (
            s.url.includes('.mp4') || 
            s.url.includes('.m3u8') || 
            s.url.includes('.mkv') || 
            s.url.includes('.avi') || 
            s.url.startsWith('magnet:') ||
            s.url.includes('/api/file/') ||
            s.url.includes('.cloudflarestorage.com')
        ) {
            finalStreams.push(s);
        }
    }
    return finalStreams;
}
module.exports = { getStreams: wrappedGetStreams };

