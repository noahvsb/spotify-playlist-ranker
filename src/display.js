export function printTable(label, tracks) {
  console.log(`\n${"─".repeat(65)}`);
  console.log(label);
  console.log("─".repeat(65));

  for (let i = 0; i < tracks.length; i++) {
    const rank  = String(i + 1).padStart(2, " ");
    const plays = Number(tracks[i].playCount).toLocaleString().padStart(15, " ");
    console.log(`${rank}. ${plays} plays  ${tracks[i].name} — ${tracks[i].artists}`);
  }
}