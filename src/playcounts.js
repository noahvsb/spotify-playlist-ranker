import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.resolve("cache");
const MAX_RETRIES = 3;

function cacheFile(playlistId) {
  return path.join(CACHE_DIR, `${playlistId}.json`);
}

function readCache(playlistId) {
  const file = cacheFile(playlistId);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function writeCache(playlistId, cache) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile(playlistId), JSON.stringify(cache, null, 2));
}

function isFresh(entry, now) {
  return entry && now < entry.expires;
}

async function scrapeTrack(browser, track) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const page = await browser.newPage();
    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(`https://open.spotify.com/track/${track.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      await page.waitForSelector('[data-testid="playcount"]', { timeout: 15000 });
      const raw = await page.$eval('[data-testid="playcount"]', (el) => el.textContent.trim());
      return BigInt(raw.replace(/,/g, ""));
    } catch {
      if (attempt === MAX_RETRIES) return null;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    } finally {
      await page.close();
    }
  }
  return null;
}

async function scrapePlayCounts(tracks, onProgress, concurrency) {
  const browser = await puppeteer.launch({ headless: true });
  const counts = {};
  let done = 0;
  const queue = [...tracks];

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const track = queue.shift();
      const result = await scrapeTrack(browser, track);
      if (result !== null) counts[track.id] = result;
      done++;
      if (onProgress) onProgress(done, tracks.length);
    }
  });

  await Promise.all(workers);
  await browser.close();
  return counts;
}

export async function getPlayCounts(playlistId, tracks, onProgress, options = {}) {
  const {
    concurrency = 5,
    invalidateCache = false,
    cacheExpiryDays = 30,
  } = options;

  const cacheTtlMs = cacheExpiryDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const cache = invalidateCache ? {} : readCache(playlistId);

  if (invalidateCache) {
    console.log("  Cache invalidated — re-scraping all tracks");
  }

  const fresh = {};
  const stale = [];

  for (const track of tracks) {
    const entry = cache[track.id];
    if (isFresh(entry, now)) {
      fresh[track.id] = BigInt(entry.playcount);
    } else {
      stale.push(track);
    }
  }

  const cachedCount = Object.keys(fresh).length;
  if (!invalidateCache && cachedCount > 0) {
    console.log(`  Using ${cachedCount} cached, scraping ${stale.length} new/expired`);
  }

  let scraped = {};
  if (stale.length > 0) {
    scraped = await scrapePlayCounts(stale, onProgress, concurrency);

    // Merge into the real cache file (not the emptied one) so we don't wipe unrelated tracks
    const persistedCache = invalidateCache ? {} : readCache(playlistId);
    for (const [id, playcount] of Object.entries(scraped)) {
      persistedCache[id] = {
        playcount: playcount.toString(),
        expires: now + cacheTtlMs,
      };
    }
    writeCache(playlistId, persistedCache);
  } else {
    console.log("  All tracks cached, skipping scrape");
  }

  return { ...fresh, ...scraped };
}

export function mergeTracksWithPlayCounts(tracks, playCounts) {
  return tracks
    .map((track) => ({
      name: track.name,
      artists: track.artists.map((a) => a.name).join(", "),
      id: track.id,
      playCount: playCounts[track.id] ?? null,
    }))
    .filter((t) => t.playCount !== null)
    .sort((a, b) => (b.playCount > a.playCount ? 1 : b.playCount < a.playCount ? -1 : 0));
}