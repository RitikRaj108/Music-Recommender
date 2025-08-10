import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MusicContext } from '../../App'; // Adjust path if needed
import '../../Components/music-dashboard.css'; // Keep general styles like .main-content
import '../../Components/NewReleasesPage.css'; // Page specific styles (grid, header etc)

// --- Import the NEW Song Card ---
import NewReleaseSongCard from './newReleaseSongCard'; // Adjust path

// --- Main New Releases Page Component ---
const NewReleasesPage = () => {
    // Context is primarily used by the NewReleaseSongCard now,
    // but keep currentUser here if needed for other page logic in the future.
    const { currentUser } = useContext(MusicContext);

    const [newSongs, setNewSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const token = localStorage.getItem("spotify_access_token");

    // Choose a reliable playlist ID for new releases
    // Example: "New Music Friday" (Global) - 37i9dQZF1DX4JAvHpjipBk
    // Example: "Release Radar" (Personalized - might require different API endpoint/scope)
    // Example: A curated playlist you maintain for new tracks
    const NEW_RELEASES_PLAYLIST_ID = "0dBhCz84CQZMAXStgbabg2"; // Use a suitable ID

    // Utility: Shuffle array (Fisher-Yates)
    const shuffleArray = (array) => {
        let currentIndex = array.length, randomIndex;
        // While there remain elements to shuffle.
        while (currentIndex !== 0) {
            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    // Fetch New Songs from the specified playlist
    const fetchNewSongs = useCallback(async () => {
        if (!token) {
            setError("Authentication error: Spotify token missing.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            // Fetch a decent batch (e.g., 50) to get variety
            const response = await fetch(`https://api.spotify.com/v1/playlists/${NEW_RELEASES_PLAYLIST_ID}/tracks?limit=50&market=US`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem("spotify_access_token");
                    setError("Spotify session expired or token is invalid. Please log in again via the dashboard.");
                } else {
                    const errData = await response.json().catch(() => ({}));
                    setError(`Failed to fetch new releases (${response.status}): ${errData.error?.message || response.statusText}`);
                }
                throw new Error('Failed to fetch new releases playlist'); // Stop execution
            }

            const data = await response.json();
            const tracks = (data.items || [])
                // Ensure item and track exist, and it's a valid track URI
                .filter(item => item?.track?.uri?.startsWith('spotify:track:'))
                .map(item => item.track);

            if (tracks.length === 0) {
                 setError("No valid tracks found in the source playlist.");
                 setNewSongs([]);
            } else {
                const shuffledTracks = shuffleArray(tracks);
                const formattedSongs = shuffledTracks.slice(0, 12).map(track => ({ // Take 12 songs for a nice grid
                    id: track.id,
                    title: track.name || 'Unknown Title',
                    artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist', // Handle multiple artists
                    cover: track.album?.images[0]?.url || track.album?.images[1]?.url || '/default-cover.jpg', // Use first available image
                    uri: track.uri,
                    release_date: track.album?.release_date // Optional data
                }));
                 setNewSongs(formattedSongs);
            }

        } catch (err) {
            console.error("New Releases Fetch Error:", err);
            // Set error state only if not already set by the response handling
            if (!error) setError("An unexpected error occurred while fetching new songs.");
            setNewSongs([]); // Clear songs on error
        } finally {
            setLoading(false);
        }
    // Add 'error' to dependency array if you want retries to potentially clear a previous error message state
    }, [token, error]);

    // Initial data fetch on component mount
    useEffect(() => {
        fetchNewSongs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // --- Render Logic ---
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading fresh tracks...</p>
            </div>
        );
    }

    return (
        // Add a class for potential specific page styling if needed, reuse .main-content for padding etc.
        <div className="new-releases-page-container main-content">
             <button onClick={() => navigate(-1)} className="back-button" aria-label="Go back">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Back
             </button>
            <h1>Fresh Tracks</h1>
            <p>Explore some of the latest additions.</p>

            {error && (
                <div className="error-container">
                    <p>{error}</p>
                    {/* Provide a more specific retry or guidance */}
                    {error.includes("session expired") ? (
                        <button onClick={() => navigate('/music-dashboard')} className="retry-btn">Go to Dashboard</button>
                    ) : (
                        <button onClick={fetchNewSongs} className="retry-btn">Try Again</button>
                    )}
                </div>
            )}

            {!error && newSongs.length === 0 && !loading && (
                 <div className="info-container"> {/* Style this for better visibility */}
                    <p>No new songs could be loaded at this time. The source playlist might be empty or unavailable.</p>
                </div>
            )}

            {!error && newSongs.length > 0 && (
                // Use a consistent grid class name if defined globally, or the specific one here
                <div className="new-releases-grid">
                    {/* --- Use the NEW Card Component --- */}
                    {newSongs.map(song => (
                        <NewReleaseSongCard
                            key={song.id} // Use track ID as key
                            song={song}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default NewReleasesPage;