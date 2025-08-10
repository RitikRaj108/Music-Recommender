// --- api.js ---

import PQueue from 'p-queue';

// WARNING: Hardcoding API keys is insecure. Replace with process.env.REACT_APP_LASTFM_API_KEY.
const LASTFM_API_KEY = process.env.REACT_APP_LASTFM_API_KEY;
if (!LASTFM_API_KEY) {
  console.error("Last.fm API Key is missing. Please set it in your environment variables.");
}
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

// Throttle Spotify API calls: max 10 requests per second, concurrency 5
const spotifyQueue = new PQueue({
  concurrency: 5,
  interval: 1000,
  intervalCap: 10,
});

// --- Utility Functions ---

/**
 * Shuffles array in place using the Fisher-Yates algorithm.
 * @param {Array} array Array to shuffle.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Selects a specified number of random tracks from a list for further processing.
 * @param {Array} tracks - Array of track objects from Last.fm.
 * @param {number} finalCount - The target number of tracks to display (e.g., 5).
 * @param {number} selectionMultiplier - How many times finalCount to select initially (e.g., 3 = select 15).
 * @returns {Array} A subset of tracks to be processed by Spotify.
 */
export const selectRandomTracksForProcessing = (tracks, finalCount = 5, selectionMultiplier = 3) => {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return [];
  }
  const shuffled = [...tracks];
  shuffleArray(shuffled);
  const countToSelect = Math.min(shuffled.length, finalCount * selectionMultiplier);
  return shuffled.slice(0, countToSelect);
};

// --- Core API Fetch Helpers ---

const fetchLastFm = async (params) => {
  if (!LASTFM_API_KEY) {
    console.error("Last.fm API Key missing.");
    throw new Error("Last.fm API Key is missing.");
  }
  const urlParams = new URLSearchParams({ ...params, api_key: LASTFM_API_KEY, format: 'json' });
  const url = `${LASTFM_BASE_URL}?${urlParams}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      let errorMsg = `Last.fm API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.message)
          errorMsg = `Last.fm API error (${response.status}): ${errorData.message}`;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }
    const data = await response.json();
    if (data.error) throw new Error(`Last.fm API error ${data.error}: ${data.message}`);
    return data;
  } catch (error) {
    console.error("Last.fm fetch error:", url, params, error);
    throw error;
  }
};

/**
 * Queries Spotify for a single track by name and artist.
 * @param {string} trackName
 * @param {string} artistName
 * @returns {Object|null} Spotify track object or null if not found/error.
 */
export const searchSpotifyTrack = async (trackName, artistName) => {
  const token = localStorage.getItem("spotify_access_token");
  if (!token) throw new Error("Spotify token not found.");

  // Clean for broader character support
  const cleanTrack = trackName.replace(/[^\u0000-\u007F\p{L}\p{N}\s]/gu, '').trim();
  const cleanArtist = artistName.replace(/[^\u0000-\u007F\p{L}\p{N}\s]/gu, '').trim();
  if (!cleanTrack || !cleanArtist) return null;

  const query = encodeURIComponent(`track:${cleanTrack} artist:${cleanArtist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      if (response.status === 401) throw new Error("Spotify token expired or invalid.");
      if (response.status === 429) {
        // Rate limit hit; wait and skip
        console.warn("Spotify rate limit hit. Waiting...");
        await new Promise(r => setTimeout(r, 1000));
        return null;
      }
      throw new Error(`Spotify API search error: ${response.status}`);
    }
    const data = await response.json();
    const item = data.tracks?.items?.[0];
    if (item) {
      const trackNameLower = trackName.toLowerCase();
      const artistNameLower = artistName.toLowerCase();
      const spotifyTrackNameLower = item.name.toLowerCase();
      const spotifyArtistsLower = item.artists.map(a => a.name.toLowerCase());

      const artistMatch = spotifyArtistsLower.some(a => a.includes(artistNameLower) || artistNameLower.includes(a));
      const trackMatch = spotifyTrackNameLower.includes(trackNameLower) || trackNameLower.includes(spotifyTrackNameLower);

      if (artistMatch && trackMatch) {
        return {
          id: item.id,
          title: item.name,
          artist: item.artists.map(a => a.name).join(', '),
          cover: item.album?.images?.[0]?.url || "/default-cover.jpg",
          uri: item.uri,
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error searching Spotify for "${trackName}" by ${artistName}:`, error);
    return null;
  }
};

// Wrap Spotify search in throttle queue
const throttledSearch = (track, artist) => spotifyQueue.add(() => searchSpotifyTrack(track, artist));

/**
 * Processes an array of Last.fm tracks into Spotify tracks, with throttling.
 * @param {Array} lastFmTracks
 * @param {number} limit Max number of Spotify tracks to return.
 * @returns {Array} Array of Spotify track objects.
 */
export const processLastFmTracksToSpotify = async (lastFmTracks, limit = 20) => {
  if (!Array.isArray(lastFmTracks) || lastFmTracks.length === 0) return [];
  const validTracks = lastFmTracks.filter(t => t?.name && t?.artist?.name);
  if (validTracks.length === 0) return [];

  const spotifyTracks = [];
  const seenIds = new Set();
  const batchSize = 5;

  for (let i = 0; i < validTracks.length && spotifyTracks.length < limit; i += batchSize) {
    const batch = validTracks.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(t => throttledSearch(t.name, t.artist.name)));

    for (const res of results) {
      if (res && !seenIds.has(res.id)) {
        spotifyTracks.push(res);
        seenIds.add(res.id);
        if (spotifyTracks.length >= limit) break;
      }
    }
    // brief pause between batches
    if (i + batchSize < validTracks.length) await new Promise(r => setTimeout(r, 200));
  }
  return spotifyTracks;
};

// --- Specific Last.fm Method Wrappers ---

export const getLastFmSimilarTracks = async (trackName, artistName, limit = 20) => {
  const data = await fetchLastFm({ method: 'track.getSimilar', track: trackName, artist: artistName, limit });
  return data?.similartracks?.track?.filter(t => t?.name && t?.artist?.name) || [];
};

export const getArtistTopTracks = async (artistName) => {
  const data = await fetchLastFm({ method: 'artist.getTopTracks', artist: artistName, limit: 30 });
  return data?.toptracks?.track?.filter(t => t?.name && t?.artist?.name) || [];
};

export const getSimilarArtists = async (artistName) => {
  const data = await fetchLastFm({ method: 'artist.getSimilar', artist: artistName, limit: 10 });
  return data?.similarartists?.artist?.filter(a => a?.name) || [];
};

export const getLastFmTagTopTracks = async (tag) => {
  const data = await fetchLastFm({ method: 'tag.getTopTracks', tag, limit: 100 });
  return data?.tracks?.track?.filter(t => t?.name && t?.artist?.name) || [];
};

export const getLastFmGeoTopTracks = async (country) => {
  const data = await fetchLastFm({ method: 'geo.getTopTracks', country, limit: 30 });
  return data?.tracks?.track?.filter(t => t?.name && t?.artist?.name) || [];
};

export const getLastFmTopTags = async () => {
  const data = await fetchLastFm({ method: 'tag.getTopTags' });
  return data?.toptags?.tag?.filter(t => t?.name) || [];
};
