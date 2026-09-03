const cheerio = require("cheerio-without-node-native");
// toonstream.js
// Provider: Toonstream (https://toonstream.vip)
// Hindi dubbed cartoons and anime - multi-server support via AJAX season loading

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

async function getBaseUrl() {
  try {
    const domains = await (await fetch(DOMAINS_URL, { skipSizeCheck: true })).json();
    return domains.toonstream || "https://toonstream.vip";
  } catch (e) {
    return "https://toonstream.vip";
  }
}

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
    const BASE_URL = await getBaseUrl();

    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search Toonstream
    let searchHref = null;
    for (let i = 1; i <= 3; i++) {
      const searchUrl = `${BASE_URL}/page/${i}/?s=${encodeURIComponent(title)}`;
      const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const first = $('#movies-a > ul > li article > a').first().attr('href');
      if (first) {
        searchHref = first;
        break;
      }
    }

    if (!searchHref) return [];
    if (!searchHref.startsWith('http')) searchHref = BASE_URL + searchHref;

    // 3. Load the content page
    const pageHtml = await (await fetch(searchHref, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const isSeries = searchHref.includes('series') || mediaType === 'tv';
    const streams = [];

    if (isSeries && season != null && episode != null) {
      // Get season/episode via AJAX
      const seasonElements = [];
      $page('div.aa-drp.choose-season > ul > li > a').each((_, el) => {
        const dataPost = $page(el).attr('data-post');
        const dataSeason = $page(el).attr('data-season');
        if (dataPost && dataSeason) {
          seasonElements.push({ dataPost, dataSeason });
        }
      });

      // Find the matching season
      const targetSeasonNum = String(season);
      let targetSeason = seasonElements.find(s => s.dataSeason === targetSeasonNum)
        || seasonElements[parseInt(season) - 1];

      if (targetSeason) {
        const ajaxResponse = await (await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
          method: 'POST',
          headers: {
            ...HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: `action=action_select_season&season=${targetSeason.dataSeason}&post=${targetSeason.dataPost}`,
          skipSizeCheck: true
        })).text();

        const $season = cheerio.load(ajaxResponse);

        // Get all episode links
        const episodeLinks = [];
        $season('article').each((_, ep) => {
          const epHref = $season(ep).find('article > a').attr('href') || '';
          const epName = $season(ep).find('article > header.entry-header > h2').text();
          episodeLinks.push({ href: epHref, name: epName });
        });

        // Find target episode
        const targetEp = episodeLinks[parseInt(episode) - 1] || episodeLinks.find(e =>
          e.name.includes(`Episode ${episode}`) || e.name.includes(`Ep ${episode}`)
        );

        if (targetEp && targetEp.href) {
          const epPageHtml = await (await fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true })).text();
          const $ep = cheerio.load(epPageHtml);

          // Extract iframes from servers
          const serverLinks = [];
          $ep('#aa-options > div > iframe').each((_, el) => {
            const src = $ep(el).attr('data-src');
            if (src) serverLinks.push(src);
          });

          for (const serverLink of serverLinks.slice(0, 3)) {
            try {
              const serverHtml = await (await fetch(serverLink, { headers: HEADERS, skipSizeCheck: true })).text();
              const $server = cheerio.load(serverHtml);
              const trueLink = $server('iframe').attr('src') || '';
              if (trueLink) {
                streams.push({
                  url: trueLink,
                  quality: extractQuality(trueLink),
                  title: 'Toonstream',
                  subtitles: []
                });
              }
            } catch (e) { /* skip failed servers */ }
          }
        }
      }
    } else {
      // Movie - extract iframes directly
      $page('#aa-options > div > iframe').each((_, el) => {
        const src = $page(el).attr('data-src');
        if (src) {
          streams.push({
            url: src,
            quality: extractQuality(src),
            title: 'Toonstream',
            subtitles: []
          });
        }
      });
    }

    return streams;

  } catch (e) {
    console.error('[Toonstream]', e);
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
        } else if (s.url.includes('.mp4') || s.url.includes('.m3u8') || s.url.startsWith('magnet:')) {
            finalStreams.push(s);
        }
    }
    return finalStreams;
}
module.exports = { getStreams: wrappedGetStreams };

