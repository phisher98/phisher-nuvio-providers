
"use strict";

import cheerio from "cheerio-without-node-native";

const BASE_URL = "https://dudefilms.sarl";

const TMDB_API_KEY =
  "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0",
  Referer: `${BASE_URL}/`
};

// ======================
// Utils
// ======================

async function fetchText(
  url,
  headers = HEADERS
) {
  return await (
    await fetch(url, {
      headers
    })
  ).text();
}

async function fetchJson(
  url,
  headers = HEADERS
) {
  return await (
    await fetch(url, {
      headers
    })
  ).json();
}

function normalizeQuality(q) {
  const n = parseInt(q);

  if (n >= 2160)
    return "2160p";

  if (n >= 1440)
    return "1440p";

  if (n >= 1080)
    return "1080p";

  if (n >= 720)
    return "720p";

  if (n >= 480)
    return "480p";

  return "Unknown";
}

function extractQuality(
  str = ""
) {
  const match = str.match(
    /(\d{3,4})p/i
  );

  return normalizeQuality(
    match?.[1]
  );
}

// ======================
// IMDb -> TMDB
// ======================

async function resolveTmdbId(
  id,
  mediaType
) {
  if (
    !String(id).startsWith(
      "tt"
    )
  ) {
    return id;
  }

  const url =
    `https://api.themoviedb.org/3/find/${id}` +
    `?api_key=${TMDB_API_KEY}` +
    `&external_source=imdb_id`;

  const data =
    await fetchJson(url);

  return mediaType ===
    "movie"
    ? data?.movie_results?.[0]
        ?.id
    : data?.tv_results?.[0]
        ?.id;
}

async function getTmdbTitle(
  tmdbId,
  mediaType
) {
  const url =
    `https://api.themoviedb.org/3/${mediaType}/${tmdbId}` +
    `?api_key=${TMDB_API_KEY}`;

  const data =
    await fetchJson(url);

  return (
    data.title ||
    data.name
  );
}

// ======================
// Extractors
// ======================

async function hubCloudExtractor(
  url
) {
  return [
    {
      source: "HubCloud",
      quality: "1080p",
      url
    }
  ];
}

async function loadExtractor(
  url
) {
  if (!url) return [];

  if (
    url.includes("hubcloud")
  ) {
    return await hubCloudExtractor(
      url
    );
  }

  return [
    {
      source: "Direct",
      quality:
        extractQuality(url),
      url
    }
  ];
}

// ======================
// Main
// ======================

async function getStreams(
  tmdbId,
  mediaType,
  season,
  episode
) {
  try {
    tmdbId =
      await resolveTmdbId(
        tmdbId,
        mediaType
      );

    const title =
      await getTmdbTitle(
        tmdbId,
        mediaType
      );

    if (!title) return [];

    const searchUrl =
      `${BASE_URL}/page/1/?s=${encodeURIComponent(title)}`;

    const searchHtml =
      await fetchText(
        searchUrl
      );

    const $ =
      cheerio.load(searchHtml);

    const results = [];

    $(
      "div.simple-grid-grid-post"
    ).each((i, el) => {
      const href = $(
        "h3 a",
        el
      ).attr("href");

      const t = $(
        "h3",
        el
      )
        .text()
        .trim();

      if (href) {
        results.push({
          title: t,
          url: href
        });
      }
    });

    if (!results.length)
      return [];

    const match =
      results[0];

    const pageHtml =
      await fetchText(
        match.url
      );

    const $page =
      cheerio.load(pageHtml);

    const streams = [];

    const buttons =
      $page(
        "a.maxbutton"
      ).toArray();

    for (const btn of buttons) {
      const href = $page(btn).attr(
        "href"
      );

      if (!href) continue;

      const extracted =
        await loadExtractor(
          href
        );

      extracted.forEach(
        (link) => {
          streams.push({
            name:
              "DudeFilms",

            title: title,

            url: link.url,

            quality:
              normalizeQuality(
                link.quality
              ),

            headers:
              HEADERS
          });
        }
      );
    }

    const seen = new Set();

    return streams.filter(
      (s) => {
        if (
          !s.url ||
          seen.has(s.url)
        ) {
          return false;
        }

        seen.add(s.url);

        return true;
      }
    );
  } catch (e) {
    console.log(
      `[DudeFilms] ${e.message}`
    );

    return [];
  }
}

export { getStreams };
