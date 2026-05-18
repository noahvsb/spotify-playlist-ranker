export function printTable(label, tracks) {
  console.log(`\n${"─".repeat(65)}`);
  console.log(label);
  console.log("─".repeat(65));

  const maxArtistLen = Math.max(...tracks.map((t) => t.artists.length));

  for (let i = 0; i < tracks.length; i++) {
    const rank   = String(i + 1).padStart(2, " ");
    const plays  = Number(tracks[i].playCount).toLocaleString().padStart(15, " ");
    const artist = tracks[i].artists.padEnd(maxArtistLen, " ");
    console.log(`${rank}. ${plays}    ${artist}    ${tracks[i].name}`);
  }
}