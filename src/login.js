/**
 * One-time login flow. Run this once to get a refresh token saved to your .env.
 *   npm run login
 *
 * Opens a local server, sends you to Spotify's auth page, then saves the
 * refresh token into your .env file automatically.
 */

import "dotenv/config";
import http from "http";
import { exec } from "child_process";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI  = "http://127.0.0.1:8888/callback";
const SCOPES        = "playlist-read-private playlist-read-collaborative user-read-private";
const PORT          = 8888;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file first.");
  process.exit(1);
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: "code",
    redirect_uri:  REDIRECT_URI,
    scope:         SCOPES,
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") return;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.end("Auth failed: " + (error ?? "no code returned"));
    server.close();
    process.exit(1);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      Authorization:   "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    res.end("Failed to get refresh token: " + JSON.stringify(tokens));
    server.close();
    process.exit(1);
  }

  // Write refresh token into .env
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  if (envContent.includes("SPOTIFY_REFRESH_TOKEN=")) {
    envContent = envContent.replace(/SPOTIFY_REFRESH_TOKEN=.*/,`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}`);
  } else {
    envContent += `\nSPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}`;
  }

  fs.writeFileSync(envPath, envContent);

  res.end("Logged in! You can close this tab and return to your terminal.");
  console.log("\n✅ Refresh token saved to .env — you're all set!");
  console.log("   Run: npm run rank-playlist -- <playlist> --top 10\n");
  server.close();
});

server.listen(PORT, () => {
  console.log("\n🎵 Spotify Playlist Ranker — One-time login");
  console.log("─".repeat(50));
  console.log("Opening Spotify login in your browser...");
  console.log("(If it doesn't open, visit this URL manually:)");
  console.log(authUrl + "\n");

  // Try to open browser cross-platform
  const cmd =
    process.platform === "darwin" ? `open "${authUrl}"` :
    process.platform === "win32"  ? `start "" "${authUrl}"` :
                                    `xdg-open "${authUrl}"`;
  exec(cmd);
});