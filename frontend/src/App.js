import React, { useState, createContext, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useEffect } from "react";



import SpotifyCallback from "./pages/Spotify-login/SpotifyCallback";
import HomePage from "./pages/dashboard-entry";
import MusicDashboard from "./pages/Music-player/music-dashboard";
import MusicPlayer from "./pages/Music-player/music-player";
import LikedSongs from "./pages/Music-player/likedSongs";
import PlaylistPage from "./pages/Playlist/PlaylistPage";
import YourLibrary from "./pages/User-Library/library";
import MusicRecommendationsPage from "./pages/Recommendation-Card/MusicRecommendationsPage";

import MusicRecommendations from "./pages/Music-player/music-recommendations2";
import NewReleasesPage from "./pages/Music-player/new-releases";
import PlayerBar from "./pages/Player/player";
import { Currency } from "lucide-react";

export const MusicContext = createContext();

const App = () => {
  const HARDCODED_BACKEND_PLAYLIST_ID = "1234567"; // Your hardcoded backend playlist ID
  const [musichubPlaylistId, setMusichubPlaylistId] = useState(null);
  const [likedTracks, setLikedTracks] = useState(new Set());
  const [deviceId, setDeviceId] = useState(null);
  const [playerStatus, setPlayerStatus] = useState({
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.8,
  });
  const [player, setPlayer] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);




  useEffect(() => {
    const fetchSpotifyUser = async () => {
        setIsUserLoading(true); // Start loading
        const token = localStorage.getItem("spotify_access_token");
        if (!token) {
            console.log("[App.js] No token found, cannot fetch user.");
            setCurrentUser(null);
            setIsUserLoading(false);
            return;
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn("[App.js] Spotify token invalid/expired. Clearing token.");
                    localStorage.removeItem("spotify_access_token"); // Clear bad token
                    setCurrentUser(null); // Reset user
                    // Optionally trigger re-login flow or redirect
                } else {
                     throw new Error(`Failed to fetch Spotify user: ${response.statusText}`);
                }
            } else {
                const userData = await response.json();
                console.log("[App.js] Fetched Spotify User:", userData.display_name, userData.id);
                
                setCurrentUser(userData);
                  // Set user data globally
            }
        } catch (error) {
            console.error('[App.js] Error fetching user data:', error);
            setCurrentUser(null); // Reset user on error
        } finally {
            setIsUserLoading(false); // Finish loading
        }
    };


    fetchSpotifyUser();
    // Re-fetch if the token potentially changes (e.g., after login/refresh)
    // Adding a listener or trigger for token changes might be more robust
  }, []);
  // In your App.js or context provider:
// --- Callback Handler: Like/Unlike Track (Syncs with MusicHub Spotify & Backend "1234567") ---
useEffect(() => {
  console.log("[App.js] currentUser state changed:", currentUser); // Log whenever it updates
}, [currentUser]);

const handleTrackLike = useCallback(async (trackUri, shouldLike, trackName = 'Unknown Track', artist = 'Unknown Artist') => {
  // Retrieve necessary values from component scope/state/localStorage
  const token = localStorage.getItem("spotify_access_token");
  // 'musichubPlaylistId' should be available from component state (useState)
  // It holds the Spotify ID for the user's main "liked" playlist (e.g., "MusicHub")
  const spotifyPlaylistId = musichubPlaylistId;
  const backendPlaylistId = HARDCODED_BACKEND_PLAYLIST_ID; // Use hardcoded ID for backend target

  console.log(`[handleTrackLike] Attempting: ${shouldLike ? 'Like' : 'Unlike'}
      Track URI: ${trackUri}, Name: ${trackName}, Artist: ${artist}
      Spotify Playlist ID: ${spotifyPlaylistId}
      Backend Target Playlist ID: ${backendPlaylistId}`);

  // --- Validation ---
  if (!token) {
      alert("Authentication Error: Missing Spotify Token");
      console.error('[handleTrackLike] Failed: Missing Spotify Token');
      throw new Error("Missing Spotify Token");
  }
  if (!spotifyPlaylistId) {
      alert("Error: MusicHub Spotify playlist not identified. Cannot perform like/unlike.");
      console.error('[handleTrackLike] Failed: Missing MusicHub Spotify Playlist ID');
      throw new Error("Missing Spotify Playlist ID");
  }
  if (!trackUri) {
      alert("Error: Invalid track URI provided.");
      console.error('[handleTrackLike] Failed: Missing Track URI');
      throw new Error("Missing Track URI");
  }
  // --- Optimistic UI Update ---
  // Assumes 'setLikedTracks' is available from component state (useState)
  setLikedTracks(prev => {
      const newSet = new Set(prev);
      shouldLike ? newSet.add(trackUri) : newSet.delete(trackUri);
      console.log('[handleTrackLike] Optimistic UI Update:', newSet);
      return newSet;
  });

  try {
      // --- 1. Call Spotify API ---
      const spotifyEndpoint = `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`;
      const spotifyMethod = shouldLike ? 'POST' : 'DELETE';
      const spotifyBody = shouldLike
          ? JSON.stringify({ uris: [trackUri] })
          : JSON.stringify({ tracks: [{ uri: trackUri }] }); // Spotify's expected format for DELETE

      console.log(`[handleTrackLike] Calling Spotify API: ${spotifyMethod} ${spotifyEndpoint}`);
      const spotifyResponse = await fetch(spotifyEndpoint, {
          method: spotifyMethod,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: spotifyBody
      });

      if (!spotifyResponse.ok) {
          let errorMsg = `Spotify API Error (${spotifyResponse.status})`;
          try { const errData = await spotifyResponse.json(); errorMsg = errData.error?.message || errorMsg; } catch (e) { /* Ignore if no JSON body */ }
          console.error(`[handleTrackLike] Spotify ${shouldLike ? 'like' : 'unlike'} failed: ${errorMsg}`);
          throw new Error(`Spotify ${shouldLike ? 'like' : 'unlike'} failed: ${errorMsg}`); // Throw to trigger catch block
      }
      console.log(`[handleTrackLike] Spotify ${shouldLike ? 'like' : 'unlike'} successful.`);
      const spotifyResultData = await spotifyResponse.json(); // Store snapshot_id or other relevant data

      // --- 2. Call Backend API (using hardcoded backendPlaylistId) ---
      const backendEndpoint = `https://recommender-pro.onrender.com/api/playlists/${backendPlaylistId}/tracks`; // Use hardcoded ID
      const backendMethod = shouldLike ? 'POST' : 'DELETE';
      // Ensure backendBody matches what your backend endpoint expects
      const backendBody = shouldLike
          ? JSON.stringify({ uri: trackUri, name: trackName, artist: artist,userId:currentUser.id }) // Send details on POST
          : JSON.stringify({ tracks: [{ uri: trackUri}] ,userId:currentUser.id }); // Send URI structure on DELETE (adjust if backend differs)

      console.log(`[handleTrackLike] Calling Backend API: ${backendMethod} ${backendEndpoint}`);
      const backendResponse = await fetch(backendEndpoint, {
          method: backendMethod,
          headers: { 'Content-Type': 'application/json' /* Add Auth header if backend requires it */ },
          body: backendBody
      });

      if (!backendResponse.ok) {
          // Backend failed, but Spotify succeeded. Log a warning.
          let errorMsg = `Backend API Error (${backendResponse.status})`;
          try { const errData = await backendResponse.json(); errorMsg = errData.message || errData.error || errorMsg; } catch (e) {}
          console.warn(`[handleTrackLike] Backend ${shouldLike ? 'add' : 'remove'} failed: ${errorMsg}. Spotify operation succeeded.`);
          // Optionally notify user of sync issue: alert("Warning: Could not sync like status with backend storage.");
      } else {
          console.log(`[handleTrackLike] Backend ${shouldLike ? 'add' : 'remove'} successful.`);
      }

      return spotifyResultData; // Return result from the primary (Spotify) operation

  } catch (error) {
      // Catch errors from either fetch call or thrown validation errors
      console.error('[handleTrackLike] Operation failed overall:', error);

      // --- Rollback Optimistic UI Update ---
      setLikedTracks(prev => {
          const newSet = new Set(prev);
          // Revert the change
          shouldLike ? newSet.delete(trackUri) : newSet.add(trackUri);
          console.log('[handleTrackLike] Rolling back UI Update:', newSet);
          return newSet;
      });

      // Notify user and re-throw
      alert(`Failed to ${shouldLike ? 'like' : 'unlike'} track: ${error.message}`);
      throw error; // Re-throw for potential further handling in the calling component
  }
  // Define dependencies for useCallback. 'musichubPlaylistId' is needed from state.
  // 'setLikedTracks' is stable if defined via useState.
}, [musichubPlaylistId, setLikedTracks,currentUser]);

// In your MusicContext provider
// --- Callback Handler: Remove Track from a specific Playlist (Syncs remove with Backend "1234567") ---
const handleRemoveFromPlaylist = useCallback(async (playlist, trackUri) => {
  // 'playlist' object is expected to contain 'spotifyId' or 'id' for Spotify's API
  const token = localStorage.getItem("spotify_access_token");
  const spotifyPlaylistId = playlist?.spotifyId || playlist?.id; // Get Spotify ID from the passed playlist object
  const backendPlaylistId = HARDCODED_BACKEND_PLAYLIST_ID; // Target backend playlist

  console.log(`[handleRemoveFromPlaylist] Attempting removal:
      Track URI: ${trackUri}
      From Spotify Playlist ID: ${spotifyPlaylistId}
      From Backend Target Playlist ID: ${backendPlaylistId}`); // Log the target

  // --- Validation ---
  if (!token) {
      alert("Authentication Error: Missing Spotify Token");
      console.error('[handleRemoveFromPlaylist] Failed: Missing Spotify Token');
      throw new Error("Missing Spotify Token");
  }
  if (!spotifyPlaylistId) {
      alert("Error: Could not identify the target Spotify playlist.");
      console.error('[handleRemoveFromPlaylist] Failed: Missing Spotify Playlist ID');
      throw new Error("Missing Spotify Playlist ID");
  }
  if (!trackUri) {
      alert("Error: Invalid track URI provided.");
      console.error('[handleRemoveFromPlaylist] Failed: Missing Track URI');
      throw new Error("Missing Track URI");
  }

  try {
      // --- 1. Call Spotify API ---
      const spotifyEndpoint = `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`;
      const spotifyMethod = 'DELETE';
      const spotifyBody = JSON.stringify({ tracks: [{ uri: trackUri }] }); // Spotify's expected format

      console.log(`[handleRemoveFromPlaylist] Calling Spotify API: ${spotifyMethod} ${spotifyEndpoint}`);
      const spotifyResponse = await fetch(spotifyEndpoint, {
          method: spotifyMethod,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: spotifyBody
      });

      if (!spotifyResponse.ok) {
          let errorMsg = `Spotify API Error (${spotifyResponse.status})`;
          try { const errData = await spotifyResponse.json(); errorMsg = errData.error?.message || errorMsg; } catch (e) {}
          console.error(`[handleRemoveFromPlaylist] Spotify remove failed: ${errorMsg}`);
          throw new Error(`Spotify remove failed: ${errorMsg}`);
      }
      console.log(`[handleRemoveFromPlaylist] Spotify remove successful.`);
      const spotifyResultData = await spotifyResponse.json(); // Store snapshot_id etc.

      // --- 2. Call Backend API (using hardcoded backendPlaylistId) ---
      const backendEndpoint = `https://recommender-pro.onrender.com
/api/playlists/${backendPlaylistId}/tracks`; // Use hardcoded ID
      const backendMethod = 'DELETE';
      // Ensure backendBody matches what your backend endpoint expects for DELETE
      const backendBody =
      JSON.stringify({ tracks: [{ uri: trackUri}],userId:currentUser.id  }); // Adjust if backend differs

      console.log(`[handleRemoveFromPlaylist] Calling Backend API: ${backendMethod} ${backendEndpoint}`);
      const backendResponse = await fetch(backendEndpoint, {
          method: backendMethod,
          headers: { 'Content-Type': 'application/json' /* + Auth */ },
          body: backendBody
      });

      if (!backendResponse.ok) {
          // Backend failed, but Spotify succeeded. Log a warning.
          let errorMsg = `Backend API Error (${backendResponse.status})`;
          try { const errData = await backendResponse.json(); errorMsg = errData.message || errData.error || errorMsg; } catch(e) {}
          console.warn(`[handleRemoveFromPlaylist] Backend remove failed: ${errorMsg}. Spotify remove succeeded.`);
          // alert("Warning: Could not sync removal with backend storage."); // Optional user warning
      } else {
          console.log(`[handleRemoveFromPlaylist] Backend remove successful.`);
      }

      return spotifyResultData; // Return result from the primary (Spotify) operation

  } catch (error) {
      // Catch errors from either fetch call or thrown validation errors
      console.error('[handleRemoveFromPlaylist] Operation failed overall:', error);
      // Note: No optimistic UI rollback needed here unless you manage playlist content in UI state directly
      alert(`Failed to remove track: ${error.message}`);
      throw error; // Re-throw for potential further handling
  }
  // No specific state dependencies needed for useCallback if only using hardcoded ID and passed args
}, [currentUser]);

// --- Callback Handler: Add Track to a specific Playlist (Syncs add with Backend "1234567") ---
const handleAddToPlaylist = useCallback(async (playlist, trackUri, trackName = 'Track', artist = 'Artist') => {
  // 'playlist' object is expected to contain 'spotifyId' or 'id' for Spotify's API
  const token = localStorage.getItem('spotify_access_token');
  const spotifyPlaylistId = playlist?.spotifyId || playlist?.id; // Get Spotify ID from passed playlist object
  const backendPlaylistId = HARDCODED_BACKEND_PLAYLIST_ID; // Target backend playlist

  console.log(`[handleAddToPlaylist] Attempting to add track:
      Track URI: ${trackUri}, Name: ${trackName}, Artist: ${artist}
      To Spotify Playlist ID: ${spotifyPlaylistId}
      To Backend Target Playlist ID: ${backendPlaylistId}`); // Log the target

  // --- Validation ---
  if (!token) {
      alert("Authentication Error: Missing Spotify Token");
      console.error('[handleAddToPlaylist] Failed: Missing Spotify Token');
      throw new Error("Missing Spotify Token");
  }
  if (!spotifyPlaylistId) {
      alert("Error: Could not identify the target Spotify playlist.");
      console.error('[handleAddToPlaylist] Failed: Missing Spotify Playlist ID');
      throw new Error("Missing Spotify Playlist ID");
  }
  if (!trackUri) {
      alert("Error: Invalid track URI provided.");
      console.error('[handleAddToPlaylist] Failed: Missing Track URI');
      throw new Error("Missing Track URI");
  }

  try {
      // --- 1. Call Spotify API ---
      const spotifyEndpoint = `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`;
      const spotifyMethod = 'POST';
      const spotifyBody = JSON.stringify({ uris: [trackUri] });

      console.log(`[handleAddToPlaylist] Calling Spotify API: ${spotifyMethod} ${spotifyEndpoint}`);
      const spotifyRes = await fetch(spotifyEndpoint, {
          method: spotifyMethod,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: spotifyBody
      });

      if (!spotifyRes.ok) {
          let errorMsg = `Spotify API Error (${spotifyRes.status})`;
          try { const errData = await spotifyRes.json(); errorMsg = errData.error?.message || errorMsg; } catch (e) {}
          console.error(`[handleAddToPlaylist] Spotify add failed: ${errorMsg}`);
          throw new Error(`Spotify add failed: ${errorMsg}`);
      }
      console.log("[handleAddToPlaylist] Successfully added to Spotify playlist.");
      const spotifyResultData = await spotifyRes.json(); // Store snapshot_id etc.

      // --- 2. Call Backend API (using hardcoded backendPlaylistId) ---
      const backendEndpoint = `https://recommender-pro.onrender.com/api/playlists/${backendPlaylistId}/tracks`; // Use hardcoded ID
      const backendMethod = 'POST';
      // Ensure backendBody matches what your backend endpoint expects for POST
      const backendBody = JSON.stringify({ uri: trackUri, name: trackName, artist: artist,userId:currentUser.id }); // Send details on POST

      console.log(`[handleAddToPlaylist] Calling Backend API: ${backendMethod} ${backendEndpoint}`);
      const backendRes = await fetch(backendEndpoint, {
          method: backendMethod,
          headers: { 'Content-Type': 'application/json' /* + Auth */ },
          body: backendBody
      });

      if (!backendRes.ok) {
          // Backend failed, but Spotify succeeded. Log a warning.
          let errorMsg = `Backend API Error (${backendRes.status})`;
          try { const errData = await backendRes.json(); errorMsg = errData.message || errData.error || errorMsg; } catch(e) {}
          console.warn(`[handleAddToPlaylist] Backend track add failed: ${errorMsg}. Spotify add succeeded.`);
          // alert("Warning: Could not sync add with backend storage."); // Optional user warning
      } else {
          console.log("[handleAddToPlaylist] Successfully added track reference to backend.");
      }

      return spotifyResultData; // Return result from the primary (Spotify) operation

  } catch (error) {
      // Catch errors from either fetch call or thrown validation errors
      console.error('[handleAddToPlaylist] Error during API call:', error);
       // Note: No optimistic UI rollback needed here unless you manage playlist content in UI state directly
      alert(`Failed to add track: ${error.message}`);
      throw error; // Re-throw for potential further handling
  }
   // No specific state dependencies needed for useCallback if only using hardcoded ID and passed args
}, [currentUser]);

 // --- NEW Handlers for Playlist Card ---
 const handlePlayContext = useCallback(async (contextUri, trackUri = null) => {
  // Plays a playlist, album, or artist context, optionally starting with a specific track
  if (!deviceId) { alert('Player not ready yet'); return; }
  const token = localStorage.getItem("spotify_access_token");
  if (!token) { console.error("No token"); return; }

  let body = { context_uri: contextUri };
  if (trackUri) {
      body.offset = { uri: trackUri };
  }

  try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body)
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error.message); }
      console.log(`Playing context: ${contextUri}`);
  } catch (error) {
      console.error('Playback Error:', error.message);
      alert(`Playback failed: ${error.message}`);
  }
}, [deviceId]);

const handleToggleShuffle = useCallback(async (shouldShuffle) => {
    if (!deviceId) { alert('Player not ready yet'); return; }
    const token = localStorage.getItem("spotify_access_token");
    if (!token) { console.error("No token"); return; }
    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shouldShuffle}&device_id=${deviceId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
        });
         if (!response.ok) { const error = await response.json(); throw new Error(error.error.message); }
         console.log(`Shuffle set to: ${shouldShuffle}`);
         // Note: You might need to update playerStatus locally if needed immediately
    } catch (error) {
        console.error('Shuffle Toggle Error:', error.message);
        alert(`Failed to toggle shuffle: ${error.message}`);
    }

}, [deviceId]);



  const handlePlayTrack = async (track) => {
      if (!deviceId) {
        alert('Player not ready yet');
        return;
      }
    
      try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem("spotify_access_token")}`
          },
          body: JSON.stringify({
            uris: [track.uri],
            position_ms: 0
          })
        });
    
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error.message);
        }
      } catch (error) {
        console.error('Playback Error:', error.message);
        if (error.message.includes('PREMIUM_REQUIRED')) {
          alert('Spotify Premium account required for playback');
        }
      }
    };
  
  
    useEffect(() => {
      const script = document.createElement('script');
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
  
      window.onSpotifyWebPlaybackSDKReady = () => {
        const newPlayer = new window.Spotify.Player({
          name: 'MusicHub Player',
          getOAuthToken: cb => {
            const token = localStorage.getItem("spotify_access_token");
            cb(token);
          },
          volume: 0.8
        });
  
        // Ready event
        newPlayer.addListener('ready', ({ device_id }) => {
          console.log('Device ID:', device_id);
          setDeviceId(device_id);
        });
  
        // Playback state updates
        newPlayer.addListener('player_state_changed', state => {
          if (!state) return;
          
          setPlayerStatus({
            isPlaying: !state.paused,
            currentTrack: state.track_window.current_track,
            position: state.position,
            duration: state.duration,
            volume: state.volume
          });
        });
  
        // Connect to player
        newPlayer.connect();
        setPlayer(newPlayer);
  
        // Error handling
        newPlayer.addListener('initialization_error', ({ message }) => {
          console.error('Initialization Error:', message);
        });
      };
  
      return () => {
        if (player) {
          player.disconnect();
        }
      };
    }, []);

  return (
    <MusicContext.Provider value={{
      musichubPlaylistId,
      setMusichubPlaylistId,
      likedTracks,
      setLikedTracks,
      handleTrackLike,
      handlePlayTrack,
      deviceId,
      playerStatus,
      player,handleAddToPlaylist
      ,handleRemoveFromPlaylist,
      handlePlayContext,
      handleToggleShuffle,
      currentUser,setCurrentUser
          }}>
      <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <SignedIn>
                  <HomePage/>
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />
          <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
          <Route path="/callback-spotify" element={<SpotifyCallback />} />
          <Route path="/music-dashboard" element={<MusicDashboard />} />
          <Route path="/music-player" element={<MusicPlayer/>} />
          <Route 
            path="/liked-songs" 
            element={<LikedSongs />} 
          />
          <Route path="/recommendations-main" element={<MusicRecommendationsPage />} />
          <Route path="/recommendations" element={<MusicRecommendations />} />
            {/* --- NEW ROUTE for Library --- */}
            <Route path="/library" element={ <SignedIn><YourLibrary /></SignedIn>} />
            <Route path="/new-releases" element={<SignedIn><NewReleasesPage /></SignedIn>} />
        </Routes>
        <PlayerBar />
        </div>
      </Router>
    </MusicContext.Provider>
  );
};

export default App;