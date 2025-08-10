// src/pages/Recommendations/MusicRecommendationsPage.jsx (Final Version)
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { MusicContext } from '../../App';
import { useUser } from '@clerk/clerk-react'; // Keep if needed for userId source
import {ArrowLeft} from 'lucide-react'; // Importing ArrowLeft icon for back button
import { useNavigate } from 'react-router-dom';
import {
    getLastFmSimilarTracks,
    processLastFmTracksToSpotify
} from '../../api';
import RecommendationCard from './RecommendationCard';
import '../../Components/recscard.css'; // Ensure you have the correct CSS for styling

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MusicRecommendationsPage = () => {
  const navigate = useNavigate(); // <-- **** INITIALIZE useNavigate ****
    const { currentUser} = useContext(MusicContext);
    const { user: clerkUser } = useUser(); // Use Clerk user as primary ID source if possible
    const userId = currentUser?.id; // Prefer Clerk ID, fallback to Spotify ID

    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Removed seedTrack state as we no longer display it
    // const [seedTrack, setSeedTrack] = useState(null);
    const [userTrackUris, setUserTrackUris] = useState(new Set());

    const fetchAndProcessRecommendations = useCallback(async () => {
        if (!userId) { /* ... handle no user ID ... */ return; }

        setIsLoading(true);
        setError(null);
        setRecommendations([]);
        // setSeedTrack(null); // No longer needed
        setUserTrackUris(new Set());
        console.log("[RecPage] Starting fetchAndProcessRecommendations...");

        try {
            // --- Step 1: Fetch Seed ---
            console.log(`[RecPage] Fetching random seed for user: ${userId}`);
            const seedResponse = await fetch(`https://recommender-pro.onrender.com
/api/recommendations/random-seed/${userId}`);
            if (!seedResponse.ok) throw new Error(`Failed seed fetch (${seedResponse.status})`);
            const seedData = await seedResponse.json();
            console.log("[RecPage] Received seed data (URIs count):", seedData.existingTrackUris?.length || 0);
            setUserTrackUris(new Set(seedData.existingTrackUris || []));

            // Validate seed *track* data needed for Last.fm call
            if (!seedData.seedTrack || !seedData.seedTrack.trackName || !seedData.seedTrack.artist) {
                console.log("[RecPage] No valid seed track found.");
                throw new Error("Not enough listening history for recommendations.");
            }
            // We still need seedName/seedArtist for the API call, but don't set state for display
            const { trackName: seedName, artist: seedArtist } = seedData.seedTrack;
            console.log(`[RecPage] Using seed: "${seedName}" by ${seedArtist} (not displayed)`);


            // --- Step 2: Fetch Similar (Last.fm) ---
            console.log(`[RecPage] Fetching similar tracks from Last.fm...`);
            const rawSimilarTracks = await getLastFmSimilarTracks(seedName, seedArtist, 100);
            if (!rawSimilarTracks || rawSimilarTracks.length === 0) throw new Error("Couldn't find similar tracks.");
            console.log(`[RecPage] Fetched ${rawSimilarTracks.length} raw tracks.`);


            // --- Step 3: Map to Spotify ---
            console.log("[RecPage] Mapping to Spotify...");
            const spotifyTrackCandidates = await processLastFmTracksToSpotify(rawSimilarTracks.slice(0,50), 80);
            console.log(`[RecPage] Mapped ${spotifyTrackCandidates.length} Spotify tracks.`);
             if (spotifyTrackCandidates.length === 0) throw new Error("Could not find matching Spotify tracks.");


            // --- Step 4: Filter Existing ---
             const newSpotifyTracks = spotifyTrackCandidates.filter(track =>
                track?.uri && !userTrackUris.has(track.uri)
             );
             console.log(`[RecPage] Filtered to ${newSpotifyTracks.length} new recommendations.`);
             if (newSpotifyTracks.length === 0) throw new Error("No new recommendations found (you might know them all!).");


            // --- Step 5: Final Selection ---
            newSpotifyTracks.sort(() => 0.5 - Math.random());
            setRecommendations(newSpotifyTracks.slice(0, 20));
            console.log(`[RecPage] Displaying ${newSpotifyTracks.slice(0, 20).length} recommendations.`);


        } catch (err) {
            console.error("[RecPage] Error:", err);
            setError(err.message || "Could not load recommendations.");
            setRecommendations([]);
        } finally {
            setIsLoading(false);
        }
    }, [userId]); // Depend on userId

    useEffect(() => {
        if (userId) fetchAndProcessRecommendations();
        else setIsLoading(false);
    }, [userId, fetchAndProcessRecommendations]); // Correct dependency

    return (
        <div className="recommendations-page">
            <button onClick={() => navigate('/music-dashboard')} className="back-to-dashboard-btn">
                 <ArrowLeft size={18} /> Back to Dashboard
             </button>
             {/* Updated Title */}
             <h1>Based on your listening history</h1>

             {isLoading && <div className="page-loading"><div className="spinner"></div>Generating recommendations...</div>}
             {!isLoading && error && <div className="page-error"><h3>Oops!</h3><p>{error}</p></div>}
             {!isLoading && !error && (
                 <>
                    {/* Removed Seed Track Display */}
                    {recommendations.length === 0 && (
                        <p className="no-results-message">No new recommendations found right now. Try liking more diverse songs!</p>
                    )}
                    {recommendations.length > 0 && (
                         <div className="recommendations-grid">
                             {recommendations.map((track) => (
                                 <RecommendationCard key={track.uri} track={track} />
                             ))}
                         </div>
                    )}
                 </>
             )}
         </div>
    );
};

export default MusicRecommendationsPage;