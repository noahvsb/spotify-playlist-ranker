import fetch from "node-fetch";

export function extractPlaylistId(input) {
  const match = input.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : input.trim();
}

export async function getPlaylistTracks(playlistId, token) {
  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`Playlist fetch failed: ${res.status} ${res.statusText}`);

    const data = await res.json();

    for (const item of data.items) {
      if (item.item?.id) tracks.push(item.item);
    }

    url = data.next;
  }

  return tracks;
}