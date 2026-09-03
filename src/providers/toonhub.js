const cheerio = require("cheerio-without-node-native");
// toonhub.js
// Provider: ToonHub4u (https://toonhub4u.co)
// Hindi/English dubbed anime and cartoons - extracts embed links from Google Drive / cloud hosts

const BASE_URL = "https://toonhub4u.co";
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

    // 2. Search ToonHub4u
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const firstResult = $('li.post-item a').first();
    let href = firstResult.attr('href');
    if (!href) return [];
    if (!href.startsWith('http')) href = BASE_URL + href;

    // 3. Load the content page
    const pageHtml = await (await fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const isTvSeries = $page('div.entry-content p strong').text().includes('TV Series');
    const streams = [];

    if (isTvSeries && mediaType === 'tv' && season != null && episode != null) {
      // Find episodes matching the requested episode
      const epRegex = /Episode\s*(\d+)/i;

      $page('.entry-content.entry.clearfix').each((_, content) => {
        $page(content).find('p').each((_, pTag) => {
          const pText = $page(pTag).text();
          const epMatch = pText.match(epRegex);
          if (epMatch && parseInt(epMatch[1]) === parseInt(episode)) {
            // Collect links from siblings until <hr>
            let nextEl = $page(pTag).next();
            while (nextEl.length && nextEl.prop('tagName') !== 'HR') {
              if (nextEl.prop('tagName') === 'P') {
                nextEl.find('a[href]').each((_, a) => {
                  const link = $page(a).attr('href');
                  if (link) {
                    streams.push({
                      url: link.replace('/file/', '/embed/'),
                      quality: extractQuality(link),
                      title: 'ToonHub4u',
                      subtitles: []
                    });
                  }
                });
              }
              nextEl = nextEl.next();
            }
          }
        });
      });
    } else {
      // Movie/direct download links
      $page('div.mks_toggle_content a').each((_, el) => {
        const link = $page(el).attr('href');
        if (link) {
          streams.push({
            url: link.replace('/file/', '/embed/'),
            quality: extractQuality(link),
            title: 'ToonHub4u',
            subtitles: []
          });
        }
      });
    }

    return streams.slice(0, 5); // Limit to 5 results

  } catch (e) {
    console.error('[ToonHub4u]', e);
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

