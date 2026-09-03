const cheerio = require("cheerio-without-node-native");
// topstreamfilm.js
// Provider: TopStreamFilm (https://www.topstreamfilm.live)
// German streaming site for movies and TV series

const BASE_URL = "https://www.topstreamfilm.live";
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

function extractUrlsFromBracketList(text) {
  return text
    .replace(/^\[/, '').replace(/\]$/, '')
    .split(',')
    .map(p => p.trim())
    .filter(p => p.startsWith('http://') || p.startsWith('https://'));
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search TopStreamFilm
    const searchUrl = `${BASE_URL}/?story=${encodeURIComponent(title)}&do=search&subaction=search`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const firstResult = $('article h3').first().closest('article');
    let href = firstResult.find('a').attr('href') || '';
    if (!href) return [];
    if (!href.startsWith('http')) href = BASE_URL + href;

    // 3. Load the content page
    const pageHtml = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const isSeries = $page('div.tt_season').text().trim() !== '';
    const streams = [];

    if (isSeries && mediaType === 'tv' && season != null && episode != null) {
      // TV series: find episodes in accordion
      $page('div.su-accordion div.cu-ss').each((_, el) => {
        const text = $page(el).text();
        const epMatch = text.match(/Episode\s*(\d+)/i);
        const seasonMatch = text.match(/^(\d+)x/);

        const epNum = epMatch ? parseInt(epMatch[1]) : null;
        const seasonNum = seasonMatch ? parseInt(seasonMatch[1]) : null;

        if (epNum === parseInt(episode) && (seasonNum === null || seasonNum === parseInt(season))) {
          const links = $page(el).find('a').map((_, a) => $page(a).attr('href')).get().filter(Boolean);
          for (const link of links) {
            streams.push({
              url: link,
              quality: extractQuality(link),
              title: 'TopStreamFilm',
              subtitles: []
            });
          }
        }
      });

      // If no episode-specific streams, try iframe approach
      if (streams.length === 0) {
        const iframeSrc = $page('div.TPlayer iframe').attr('src') || '';
        if (iframeSrc) {
          const iframeHtml = await (await fetch(iframeSrc.startsWith('http') ? iframeSrc : BASE_URL + iframeSrc, { headers: HEADERS, skipSizeCheck: true })).text();
          const $iframe = cheerio.load(iframeHtml);
          $iframe('ul li').each((_, li) => {
            const dataLink = $iframe(li).attr('data-link') || '';
            const finalLink = dataLink.startsWith('//') ? 'https:' + dataLink : dataLink;
            if (finalLink) {
              streams.push({
                url: finalLink,
                quality: extractQuality(finalLink),
                title: 'TopStreamFilm',
                subtitles: []
              });
            }
          });
        }
      }
    } else {
      // Movie - try to get iframe then list servers
      const iframeSrc = $page('div.TPlayer iframe').attr('src') || '';
      if (iframeSrc) {
        try {
          const iframeUrl = iframeSrc.startsWith('http') ? iframeSrc : BASE_URL + iframeSrc;
          const iframeHtml = await (await fetch(iframeUrl, { headers: HEADERS, skipSizeCheck: true })).text();
          const $iframe = cheerio.load(iframeHtml);
          $iframe('ul li').each((_, li) => {
            const dataLink = $iframe(li).attr('data-link') || '';
            const finalLink = dataLink.startsWith('//') ? 'https:' + dataLink : dataLink;
            if (finalLink) {
              streams.push({
                url: finalLink,
                quality: extractQuality(finalLink),
                title: 'TopStreamFilm',
                subtitles: []
              });
            }
          });
        } catch (e) { /* skip */ }
      }
    }

    return streams;

  } catch (e) {
    console.error('[TopStreamFilm]', e);
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


