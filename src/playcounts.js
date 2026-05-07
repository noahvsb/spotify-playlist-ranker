import puppeteer from "puppeteer";

 // number of pages scraping in parallel

export async function getPlayCounts(tracks, onProgress, concurrency = 5) {
  const browser = await puppeteer.launch({ headless: true });
  const counts = {};
  let done = 0;

  // Process tracks in parallel with a concurrency pool
  const queue = [...tracks];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const track = queue.shift();
      const page = await browser.newPage();
      try {
        await page.setRequestInterception(true);
        // Block images, fonts, stylesheets to speed up loading
        page.on("request", (req) => {
          if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
            req.abort();
          } else {
            req.continue();
          }
        });

        await page.goto(`https://open.spotify.com/track/${track.id}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        // Wait for the play count element
        await page.waitForSelector('[data-testid="playcount"]', { timeout: 10000 });
        const raw = await page.$eval('[data-testid="playcount"]', (el) => el.textContent.trim());

        // Parse "995,023,018" → BigInt
        counts[track.id] = BigInt(raw.replace(/,/g, ""));
      } catch {
        // Leave missing — will be reported as skipped
      } finally {
        await page.close();
        done++;
        if (onProgress) onProgress(done, tracks.length);
      }
    }
  });

  await Promise.all(workers);
  await browser.close();
  return counts;
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