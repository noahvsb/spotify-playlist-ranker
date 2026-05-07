import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { getUserToken } from "./auth.js";
import { extractPlaylistId, getPlaylistTracks } from "./playlist.js";
import { getPlayCounts, mergeTracksWithPlayCounts } from "./playcounts.js";
import { printTable } from "./display.js";

const argv = yargs(hideBin(process.argv))
  .usage("Usage: npm run rank-playlist -- <playlist> [options]")
  .command("$0 <playlist>", "Rank tracks in a Spotify playlist by global play count")
  .positional("playlist", {
    describe: "Playlist ID or URL",
    type: "string",
  })
  .option("top", {
    alias: "t",
    type: "number",
    description: "Show the N most streamed tracks",
  })
  .option("bottom", {
    alias: "b",
    type: "number",
    description: "Show the N least streamed tracks",
  })
  .option("concurrency", {
    alias: "c",
    type: "number",
    description: "Number of parallel browser pages (default: 5)",
    default: 5,
  })
  .check((argv) => {
    if (!argv.top && !argv.bottom) {
      throw new Error("Specify at least --top N or --bottom N");
    }
    return true;
  })
  .example("npm run rank-playlist -- 37i9dQZF1DXcBWIGoYBM5M --top 10")
  .example("npm run rank-playlist -- 37i9dQZF1DXcBWIGoYBM5M --bottom 5")
  .example("npm run rank-playlist -- 37i9dQZF1DXcBWIGoYBM5M --top 5 --bottom 5")
  .help()
  .argv;

function progressBar(done, total) {
  const pct = Math.floor((done / total) * 100);
  const filled = Math.floor(pct / 2);
  const bar = "█".repeat(filled) + "░".repeat(50 - filled);
  process.stdout.write(`\r  [${bar}] ${done}/${total}`);
  if (done === total) process.stdout.write("\n");
}

async function main() {
  const playlistId = extractPlaylistId(argv.playlist);
  console.log(`\nFetching playlist: ${playlistId}`);

  const token = await getUserToken();
  console.log("Authenticated");

  const tracks = await getPlaylistTracks(playlistId, token);
  console.log(`Found ${tracks.length} tracks`);

  console.log(`Scraping play counts (${argv.concurrency} pages in parallel)...`);
  const playCounts = await getPlayCounts(tracks, progressBar, argv.concurrency);

  const ranked = mergeTracksWithPlayCounts(tracks, playCounts);

  const skipped = tracks.length - ranked.length;
  if (skipped > 0) console.warn(`  ${skipped} tracks had no play count data (skipped)`);

  if (argv.top)    printTable(`TOP ${argv.top} most streamed`,        ranked.slice(0, argv.top));
  if (argv.bottom) printTable(`BOTTOM ${argv.bottom} least streamed`, ranked.slice(-argv.bottom).reverse());

  console.log();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});