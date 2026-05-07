# Spotify Playlist Ranker

Rank any Spotify playlist by **real global play counts** — find the most streamed bangers and the deep cuts nobody's heard of.

Uses the same internal API the Spotify web player uses to display stream counts on track pages.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app
2. When asked which API/SDKs you plan to use, tick **Web API** only
3. Under **Redirect URIs**, add: `http://127.0.0.1:8888/callback` (use `127.0.0.1`, not `localhost` — Spotify blocks `localhost` over HTTP but allows `127.0.0.1`)
4. Copy your **Client ID** and **Client Secret**

### 3. Configure your environment

```bash
cp .env.example .env
```

Fill in your Client ID and Secret:

```
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### 4. Log in (one time only)

```bash
npm run login
```

This opens Spotify in your browser, asks you to authorise the app, then automatically saves a refresh token into your `.env`. You won't need to do this again unless you revoke the app's access.

## Usage

```bash
npm run rank-playlist -- <playlist> [options]
```

`<playlist>` can be a full Spotify URL or just the playlist ID.

### Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--top N` | `-t N` | Show the N most streamed tracks |
| `--bottom N` | `-b N` | Show the N least streamed tracks |
| `--help` | | Show usage info |

At least one of `--top` or `--bottom` is required.

### Examples

```bash
# Top 10 most streamed tracks
npm run rank-playlist -- 37i9dQZF1DXcBWIGoYBM5M --top 10

# Bottom 5 least streamed tracks (full URL also works)
npm run rank-playlist -- https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M --bottom 5

# Both at once
npm run rank-playlist -- 37i9dQZF1DXcBWIGoYBM5M --top 5 --bottom 5
```

### Example output

```
─────────────────────────────────────────────────────────────────
🔥 TOP 5 most streamed
─────────────────────────────────────────────────────────────────
 1.  3,456,789,012 plays  Blinding Lights — The Weeknd
 2.  2,891,234,567 plays  Shape of You — Ed Sheeran
 3.  2,543,109,876 plays  Someone Like You — Adele
 4.  2,201,987,654 plays  Rockstar — Post Malone, 21 Savage
 5.  1,998,765,432 plays  Closer — The Chainsmokers, Halsey

─────────────────────────────────────────────────────────────────
💎 BOTTOM 5 least streamed
─────────────────────────────────────────────────────────────────
 1.         12,543 plays  B-Side Rarity — Some Artist
 2.         18,901 plays  Deep Cut — Obscure Band
 3.         24,310 plays  Album Track 7 — Niche Artist
 4.         31,002 plays  Forgotten Single — Old Act
 5.         45,678 plays  Intro Skit — Famous Rapper
```

## How it works

1. **Auth** — Uses the standard OAuth Authorization Code flow to get a refresh token (one-time login), then exchanges it for a short-lived access token on each run
2. **Playlist** — Fetches all tracks via the public Spotify API, paginating through playlists of any size
3. **Play counts** — Queries `api-partner.spotify.com`, the internal GraphQL API Spotify's web player uses to render stream counts, in chunks of 50 tracks
4. **Display** — Sorts and prints the results

## Notes

- The internal partner API is undocumented and may change without notice. If play counts stop loading, the `getPlayCounts` function in `src/playcounts.js` is the place to investigate.
- Works with any public playlist and any private playlist your account has access to.
- The refresh token doesn't expire unless you revoke the app in your [Spotify account settings](https://www.spotify.com/account/apps/).