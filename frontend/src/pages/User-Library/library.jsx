// src/pages/Library/YourLibrary.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import PlaylistCard from './playlist-card';
import { MusicContext } from '../../App';
// Remove useAuth if we are fetching Spotify ID instead
// import { useAuth } from "@clerk/clerk-react";
import '../../Components/your-library.css';

const YourLibrary = () => {
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // const { userId } = useAuth(); // Not using Clerk ID directly for fetch anymore

    // --- State to store Spotify User ID ---
    const [spotifyUserId, setSpotifyUserId] = useState(null);
    const [isFetchingUserId, setIsFetchingUserId] = useState(true);

    // --- Effect to fetch Spotify User ID ---
    useEffect(() => {
        const fetchSpotifyCurrentUser = async () => {
            setIsFetchingUserId(true);
            const token = localStorage.getItem("spotify_access_token");
            if (!token) {
                setError("Spotify connection required.");
                setIsFetchingUserId(false);
                setIsLoading(false); // Stop overall loading if no token
                return;
            }
            try {
                const response = await fetch('https://api.spotify.com/v1/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) {
                    if (response.status === 401) localStorage.removeItem("spotify_access_token");
                    throw new Error('Failed to fetch Spotify user ID');
                }
                const userData = await response.json();
                console.log("[YourLibrary] Fetched Spotify User ID:", userData.id);
                setSpotifyUserId(userData.id); // Store the Spotify ID
            } catch (err) {
                console.error("Error fetching Spotify user ID in Library:", err);
                setError("Could not verify Spotify user.");
                setSpotifyUserId(null);
            } finally {
                setIsFetchingUserId(false);
            }
        };
        fetchSpotifyCurrentUser();
    }, []); // Fetch user ID once on mount

    // --- Fetch Playlists using the fetched Spotify User ID ---
    const fetchUserPlaylistsFromBackend = useCallback(async () => {
        // Wait until we have the spotifyUserId
        if (!spotifyUserId) {
            console.log("[YourLibrary] Spotify User ID not available yet for backend fetch.");
             // If still fetching user ID, keep loading true
            if (isFetchingUserId) {
                setIsLoading(true);
            } else {
                // If fetching user failed, don't try to fetch playlists
                setIsLoading(false);
                if (!error) setError("Cannot load playlists without Spotify user ID.");
            }
            return;
        }

        setIsLoading(true); // Start loading playlists specifically
        setError(null);
        setPlaylists([]);

        try {
            console.log(`[YourLibrary] Fetching playlists for Spotify user ${spotifyUserId} from backend...`);
            // --- Use spotifyUserId in the URL ---
            const response = await fetch(`https://recommender-pro.onrender.com/api/playlists/user/${spotifyUserId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' /* Add Auth if needed */ }
            });

            if (!response.ok) { /* ... error handling ... */ throw new Error('Backend error fetching playlists'); }
            const backendData = await response.json();

            // --- Mapping (remains the same, assumes backend uses spotifyId) ---
            const formattedPlaylists = (backendData || []).map(pl => ({
                id: pl.spotifyId,
                _id: pl._id,
                name: pl.name || 'Unnamed Playlist',
                ownerName: 'You',
                coverImage: '/default-cover.jpg', // PlaylistCard fetches actual
                uri: `spotify:playlist:${pl.spotifyId}`
            }));
            // --- End Mapping ---

            setPlaylists(formattedPlaylists);

        } catch (err) {
            console.error("[YourLibrary] Error fetching playlists from backend:", err);
            setError(err.message || "Could not load your playlists from MusicHub.");
            setPlaylists([]);
        } finally {
            setIsLoading(false);
        }
    }, [spotifyUserId, isFetchingUserId, error]); // Depend on spotifyUserId now

    // Trigger playlist fetch when spotifyUserId is successfully fetched
    useEffect(() => {
        if (spotifyUserId) { // Only fetch when we have the ID
            fetchUserPlaylistsFromBackend();
        }
    }, [spotifyUserId, fetchUserPlaylistsFromBackend]); // Run when ID is set

    // --- Rendering Logic ---
    // Combine loading states
    const showLoading = isLoading || isFetchingUserId;

    if (showLoading) {
        return (
            <div className="library-container loading">
                <div className="spinner"></div>
                <p>Loading Your Library...</p>
            </div>
        );
    }

    if (error) {
        // Make error message more specific if user ID fetch failed
        const displayError = error === "Cannot load playlists without Spotify user ID." && !spotifyUserId
            ? "Could not verify Spotify user. Please ensure you are logged in via Spotify."
            : error;
        return (
            <div className="library-container error">
                <h2>Error Loading Library</h2>
                <p>{displayError}</p>
                {/* Decide which fetch function the retry button should call */}
                 <button onClick={spotifyUserId ? fetchUserPlaylistsFromBackend : () => window.location.reload()} className="retry-btn">
                    {spotifyUserId ? 'Retry Fetching Playlists' : 'Reload Page'}
                 </button>
            </div>
        );
    }

    return (
        <div className="library-container">
            <h1>Your Library</h1>
            {playlists.length > 0 ? (
                <div className="playlists-grid">
                    {playlists.map((playlist) => (
                        <PlaylistCard key={playlist.id} playlist={playlist} />
                    ))}
                </div>
            ) : (
                 <div className="library-empty">
                     <p>You haven't created any playlists in MusicHub yet, or they couldn't be loaded.</p>
                 </div>
            )}
        </div>
    );
};

export default YourLibrary;