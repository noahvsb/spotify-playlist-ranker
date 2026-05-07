# Spotify Playlist Ranker

Rank any Spotify playlist by **real global play counts** — find the most streamed bangers and the deep cuts nobody's heard of.

Scrapes play counts directly from Spotify track pages using a headless browser, the same number you see in the Spotify app.

(Note: fully vibecoded, not proud of myself)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app
2. Under **Redirect URIs**, add `http://127.0.0.1:8888/callback` (required by the form, not actually used)
3. When asked which API/SDKs you plan to use, tick **Web API** only
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

Then log in once:

```bash
npm run login
```

This opens Spotify in your browser, authorises the app, and saves a refresh token to your `.env` automatically.

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
| `--parallel N` | `-p N` | Parallel browser pages (default: 5) |
| `--invalidateCache` | `-i` | Ignore cache and re-scrape all tracks |
| `--cacheExpiry N` | `-c N` | Cache expiry in days (default: 30) |
| `--help` | | Show usage info |

At least one of `--top` or `--bottom` is required.

### Examples

```bash
npm run rank-playlist -- 1AfKAiVDQzfmE9gjhbk5UP --top 10
npm run rank-playlist -- https://open.spotify.com/playlist/1AfKAiVDQzfmE9gjhbk5UP --bottom 5
npm run rank-playlist -- 1AfKAiVDQzfmE9gjhbk5UP --top 5 --bottom 5 --parallel 10
npm run rank-playlist -- 1AfKAiVDQzfmE9gjhbk5UP --top 10 --invalidateCache
npm run rank-playlist -- 1AfKAiVDQzfmE9gjhbk5UP --top 10 --cacheExpiry 7
```

### Example output

```
─────────────────────────────────────────────────────────────────
TOP 5 most streamed
─────────────────────────────────────────────────────────────────
 1.   3,343,776,117 plays  Iris — The Goo Goo Dolls
 2.   3,258,580,848 plays  Just the Way You Are — Bruno Mars
 3.   3,182,062,706 plays  Mr. Brightside — The Killers
 4.   3,146,661,670 plays  In the End — Linkin Park
 5.   3,144,253,634 plays  Bohemian Rhapsody - Remastered 2011 — Queen

─────────────────────────────────────────────────────────────────
BOTTOM 5 least streamed
─────────────────────────────────────────────────────────────────
 1.         187,628 plays  Auf und auf voll Lebenslust — Takeo Ischi
 2.         340,518 plays  Oración (From "Pokémon: The Rise of Darkrai") - Epic Version — Anthony Lo Re
 3.         379,266 plays  Appenzeller — Takeo Ischi
 4.       1,380,151 plays  Piet Piraat Is Op Vakantie — Piet Piraat
 5.       1,709,324 plays  Einen Jodler hör ich gern — Takeo Ischi
```

## Caching

Play counts are cached in `cache/{playlist-id}.json` and are valid for **30 days** (by default). On subsequent runs, only new or expired tracks are scraped — making re-runs near instant.

```
cache/
  1AfKAiVDQzfmE9gjhbk5UP.json   ← one file per playlist
```

Each entry looks like:
```json
{
  "67iAlVNDDdddxqSD2EZhFs": {
    "playcount": "995023018",
    "expires": 1748000000000
  }
}
```

## How it works

1. **Playlist** — Fetches all tracks via the Spotify API using client credentials (no user login needed)
2. **Cache** — Checks `cache/{playlist-id}.json` for fresh play counts (< 30 days old)
3. **Scrape** — Opens Spotify track pages in a headless Chromium browser and reads the `[data-testid="playcount"]` element for any tracks not in cache
4. **Cache update** — Writes new play counts back to the cache file
5. **Display** — Sorts and prints the results

## Notes

- First run on a large playlist takes a few minutes. Subsequent runs are fast thanks to caching.
- Increase `--concurrency` for faster scraping (be mindful of rate limiting).
- The `data-testid="playcount"` selector may break if Spotify updates their web player markup.