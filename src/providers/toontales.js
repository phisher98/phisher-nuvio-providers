const cheerio = require("cheerio-without-node-native");
// toontales.js
// Provider: ToonTales (https://www.toontales.net)
// Classic cartoons (Popeye, Tom & Jerry, etc.) - stream URL extracted from inline script

const BASE_URL = "https://www.toontales.net";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

function extractQuality(str) {
  const u = (str || '').toLowerCase();
  if (u.includes('2160p') || u.includes('4k')) return '4K';
  if (u.includes('1080p')) return '1080p';
  if (u.includes('720p')) return '720p';
  if (u.includes('480p')) return '480p';
  return 'Unknown';
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search ToonTales (multi-page search)
    let searchHref = null;
    for (let i = 1; i <= 3; i++) {
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}&paged=${i}`;
      const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);

      const firstResult = $('#movies-a > ul > li a').first();
      if (firstResult.length) {
        searchHref = firstResult.attr('href');
        break;
      }
    }

    if (!searchHref) return [];
    if (!searchHref.startsWith('http')) searchHref = BASE_URL + searchHref;

    // 3. Load the page and extract the stream URL from the inline script
    const pageHtml = await (await fetch(searchHref, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    // Extract "file: "..." from script
    let fileUrl = null;
    $('script').each((_, el) => {
      const data = $(el).html() || '';
      if (data.includes('file:')) {
        const match = data.match(/file:\s*"([^"]+)"/);
        if (match) {
          fileUrl = match[1];
        }
      }
    });

    if (!fileUrl) return [];

    return [{
      url: fileUrl,
      quality: extractQuality(fileUrl),
      title: 'ToonTales',
      subtitles: []
    }];

  } catch (e) {
    console.error('[ToonTales]', e);
    return [];
  }
}


module.exports = { getStreams };
