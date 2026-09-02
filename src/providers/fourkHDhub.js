const cheerio = require("cheerio-without-node-native");
// fourkHDhub.js
// 4K HDHUB - High quality movie & series site (4khdhub.dad)
// Search: /?s={query}  Results in div.card-grid a
// Download links: div.download-item a[href] → redirect URLs → HubCloud extraction
// TV episodes: div.episodes-list div.season-item → div.episode-download-item → a[href]

const BASE_URL = "https://4khdhub.dad";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

async function resolveHubCloud(url) {
  try {
    // HubCloud: first get the #download link
    const html1 = await (await fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
    const $1 = cheerio.load(html1);
    let href = $1("#download").attr("href") || "";
    if (!href) return null;

    if (!href.startsWith("http")) {
      const base = url.match(/^(https?:\/\/[^/]+)/)?.[1] || "";
      href = base + "/" + href.replace(/^\//, "");
    }

    // Load the hubcloud page
    const html2 = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
    const $2 = cheerio.load(html2);
    const header = $2("div.card-header").text() || "";
    const quality = extractQuality(header);

    const streams = [];
    $2("a.btn").each((i, a) => {
      const link = $2(a).attr("href") || "";
      const label = $2(a).text().toLowerCase().trim();
      if (!link) return;

      if (link.match(/\.(mp4|mkv|m3u8)/i)) {
        streams.push({ url: link, quality, title: `4KHDHUB [${label}]` });
      } else if (label.includes("fsl") || label.includes("download") || label.includes("server") || link.startsWith("http")) {
        streams.push({ url: link, quality, title: `4KHDHUB [${label}]` });
      }
    });

    return streams.length ? streams : null;
  } catch (e) {
    return null;
  }
}

async function resolveRedirect(rawUrl) {
  // Many links have ?id= param that needs to be followed as a redirect
  try {
    if (!rawUrl.includes("id=")) return rawUrl;
    const resp = await fetch(rawUrl, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
    return resp.url || rawUrl;
  } catch (e) {
    return rawUrl;
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("div.card-grid a").each((i, a) => {
      const href = $(a).attr("href");
      const t = $("h3", a).text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const isTV = mediaType === "tv";
    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;

    // 3. Load content page
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const streams = [];

    if (isTV) {
      // Find episodes by season/episode number in div.episodes-list
      let found = false;
      $page("div.episodes-list div.season-item").each((i, seasonEl) => {
        if (found) return;
        const seasonText = $page("div.episode-number", seasonEl).text();
        const seasonMatch = seasonText.match(/S?([1-9][0-9]*)/);
        if (!seasonMatch || parseInt(seasonMatch[1]) !== season) return;

        $page("div.episode-download-item", seasonEl).each((j, epItem) => {
          if (found) return;
          const epText = $page("div.episode-file-info span.badge-psa", epItem).text();
          const epMatch = epText.match(/Episode-0*([1-9][0-9]*)/);
          if (!epMatch || parseInt(epMatch[1]) !== episode) return;

          found = true;
          $page("a", epItem).each((k, a) => {
            const href = $page(a).attr("href");
            if (href && href.startsWith("http")) {
              streams.push({
                url: href,
                quality: extractQuality(epText),
                title: `4KHDHUB [S${season}E${episode}]`,
                subtitles: []
              });
            }
          });
        });
      });
    } else {
      // Movie: get download items
      const hrefs = [];
      $page("div.download-item a").each((i, a) => {
        const href = $page(a).attr("href");
        if (href && href.startsWith("http")) hrefs.push(href);
      });

      for (const href of hrefs.slice(0, 5)) {
        try {
          const resolved = await resolveRedirect(href);

          if (resolved.toLowerCase().includes("hubcloud")) {
            const hubStreams = await resolveHubCloud(resolved);
            if (hubStreams) {
              for (const s of hubStreams) {
                streams.push({ ...s, subtitles: [] });
              }
            }
          } else {
            streams.push({
              url: resolved,
              quality: extractQuality(resolved),
              title: `4KHDHUB`,
              subtitles: []
            });
          }
        } catch (e) {}
      }
    }

    return streams;
  } catch (e) {
    console.error("[4KHDHUB]", e);
    return [];
  }
}


module.exports = { getStreams };
