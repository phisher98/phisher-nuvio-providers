const cheerio = require("cheerio-without-node-native");
// topcartoons.js
// Provider: Topcartoons (https://www.topcartoons.tv)
// English cartoon TV shows - extracts stream from og:video:url meta tag

const BASE_URL = "https://www.topcartoons.tv";
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

    // 2. Search TopCartoons
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const firstResult = $('article a').first();
    let href = firstResult.attr('href');
    if (!href) return [];
    if (!href.startsWith('http')) href = BASE_URL + href;

    // 3. Load the show page and list episodes
    const showHtml = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
    const $show = cheerio.load(showHtml);

    // Episodes are listed as articles within articles
    const episodes = [];
    $show('article article').each((_, el) => {
      const epHref = $show(el).find('a').attr('href');
      const epName = $show(el).find('h3 a').text().trim();
      if (epHref) episodes.push({ href: epHref, name: epName });
    });

    let targetHref = href; // fallback to show page

    if (episodes.length > 0 && mediaType === 'tv' && episode != null) {
      // Try to find the episode by index
      const targetIdx = parseInt(episode) - 1;
      if (targetIdx >= 0 && targetIdx < episodes.length) {
        targetHref = episodes[targetIdx].href;
      } else {
        targetHref = episodes[0].href;
      }
    } else if (episodes.length > 0) {
      // Movie-like or first episode
      targetHref = episodes[0].href;
    }

    if (!targetHref.startsWith('http')) targetHref = BASE_URL + targetHref;

    // 4. Load episode/movie page and extract og:video:url
    const epHtml = await (await fetch(targetHref, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ep = cheerio.load(epHtml);

    const videoUrl = $ep('meta[property="og:video:url"]').attr('content') || '';
    if (!videoUrl) return [];

    return [{
      url: videoUrl,
      quality: extractQuality(videoUrl),
      title: 'TopCartoons',
      subtitles: []
    }];

  } catch (e) {
    console.error('[TopCartoons]', e);
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

