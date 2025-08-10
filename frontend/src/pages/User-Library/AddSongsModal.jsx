import React, { useState, useEffect, useContext, useCallback } from 'react';
import { MusicContext } from '../../App'; // Adjust path if needed
import { Search, X as CloseIcon, Plus } from 'lucide-react';
import '../../Components/your-library.css'; // Adjust path if needed (using library CSS for consistency)

// --- Component receives the full playlist object and callbacks ---
const AddSongsModal = ({ playlist, onClose, onSongAdded }) => {
    // Get the handler from context to add the track
    const { handleAddToPlaylist } = useContext(MusicContext);

    // State for this modal instance
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [modalSearchResults, setModalSearchResults] = useState([]);
    const [isModalSearching, setIsModalSearching] = useState(false);
    const [modalError, setModalError] = useState(null);
    const [addedStatus, setAddedStatus] = useState({}); // Tracks { trackUri: true } for added songs

    // Debounced Search Effect for Spotify Track Search
    useEffect(() => {
        // Clear results if query is empty
        if (!modalSearchQuery.trim()) {
            setModalSearchResults([]);
            setModalError(null);
            setIsModalSearching(false); // Ensure loading stops
            return;
        }

        // Set up debounce timer
        const debounceTimer = setTimeout(async () => {
            setIsModalSearching(true);
            setModalError(null);
            setModalSearchResults([]); // Clear previous results before new search

            const token = localStorage.getItem("spotify_access_token");
            if (!token) {
                setModalError("Authentication required.");
                setIsModalSearching(false);
                return;
            }

            try {
                console.log(`Modal searching Spotify for tracks: "${modalSearchQuery}"`);
                const response = await fetch(
                    // Search Spotify API only for tracks, limit results
                    `https://api.spotify.com/v1/search?q=${encodeURIComponent(modalSearchQuery)}&type=track&limit=20`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                 if (!response.ok) {
                     // Handle API errors (e.g., rate limiting, bad token)
                     if (response.status === 401) localStorage.removeItem("spotify_access_token");
                     const errorData = await response.json().catch(() => ({}));
                     throw new Error(errorData.error?.message || `Spotify Search Error: ${response.status}`);
                 }

                 const data = await response.json();
                 // Set results, ensuring it's an array
                 setModalSearchResults(data.tracks?.items || []);
                 if (!data.tracks?.items || data.tracks.items.length === 0) {
                    console.log("No tracks found for query:", modalSearchQuery);
                 }

            } catch (err) {
                console.error("Modal Search Error:", err);
                setModalError(`Search failed: ${err.message}`);
                setModalSearchResults([]); // Clear results on error
            } finally {
                setIsModalSearching(false); // Stop loading indicator
            }
        }, 500); // 500ms debounce

        // Cleanup function to clear the timer if query changes or component unmounts
        return () => clearTimeout(debounceTimer);

    }, [modalSearchQuery]); // Re-run effect only when modalSearchQuery changes

    // Handler for clicking the "Add" button on a search result
    const handleAddClick = async (track) => {
        // Check if playlist or track info is missing
        if (!playlist || !track?.uri) {
            console.error("Missing playlist or track URI for adding.");
            return;
        }

        // Optimistically update the button state to "Added"
        setAddedStatus(prev => ({ ...prev, [track.uri]: true }));

        try {
            console.log(`Adding track "${track.name}" (${track.uri}) to playlist "${playlist.name}" (${playlist.id})`);
            // Call the context handler, passing the full playlist object (contains id and _id)
            // and track details
            await handleAddToPlaylist(
                playlist,
                track.uri,
                track.name,
                track.artists?.[0]?.name || 'Unknown Artist' // Get first artist name
            );

            // If the context handler succeeds, call the callback to notify PlaylistCard
            if (onSongAdded) {
                onSongAdded(); // Trigger track list refresh in PlaylistCard
            }
            // Keep the button showing "Added" (or remove status after a delay if preferred)
            // setTimeout(() => {
            //     setAddedStatus(prev => {
            //         const newState = { ...prev };
            //         delete newState[track.uri];
            //         return newState;
            //     });
            // }, 2000); // Example: Revert after 2 seconds

        } catch (error) {
            // If the context handler fails (it should alert/log internally), revert the button state
            console.error(`Failed to add track ${track.uri} via modal:`, error);
             setAddedStatus(prev => {
                 const newState = { ...prev };
                 delete newState[track.uri];
                 return newState;
             });
             // Error should have been alerted by handleAddToPlaylist, no need to alert again here
        }
    };

    // --- JSX Structure for the Modal ---
    return (
        // Overlay covers the screen, clicking it closes the modal
        <div className="modal-overlay" onClick={onClose}>
            {/* Content stops click propagation */}
            <div className="modal-content add-songs-modal" onClick={(e) => e.stopPropagation()}>

                {/* Close Button */}
                <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                    <CloseIcon size={24} />
                </button>

                {/* Modal Title */}
                <h2>Add Songs to "{playlist?.name || 'Playlist'}"</h2>

                {/* Search Input inside the Modal */}
                <div className="modal-search-input-wrapper">
                    <Search size={18} className="search-icon"/>
                    <input
                        type="text"
                        placeholder="Search for songs to add..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        autoFocus // Focus input when modal opens
                    />
                     {modalSearchQuery && (
                        <button onClick={() => setModalSearchQuery('')} className="clear-internal-search" aria-label="Clear search">
                             <CloseIcon size={16} />
                        </button>
                    )}
                </div>

                {/* Search Results Area */}
                <div className="modal-search-results">
                    {/* Loading Indicator */}
                    {isModalSearching && (
                        <div className="modal-loading">
                            <div className="spinner-small"></div> Searching...
                        </div>
                    )}

                    {/* Error Message */}
                    {modalError && <div className="modal-error">{modalError}</div>}

                    {/* Display Results */}
                    {!isModalSearching && modalSearchResults.length > 0 && (
                        modalSearchResults.map(track => (
                            <div key={track.id} className="modal-search-item">
                                {/* Track Image */}
                                <img
                                    src={track.album?.images?.slice(-1)[0]?.url || track.album?.images?.[0]?.url || '/default-cover.jpg'} // Prefer smallest image
                                    alt={track.album?.name || 'Album cover'}
                                    className="modal-item-image" // Use specific class if needed
                                />
                                {/* Track Info */}
                                <div className="modal-item-info">
                                    <span className="modal-item-title">{track.name}</span>
                                    <span className="modal-item-artist">
                                        {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                                    </span>
                                </div>
                                {/* Add Button */}
                                <button
                                    className={`modal-add-btn ${addedStatus[track.uri] ? 'added' : ''}`}
                                    // Prevent re-adding if already added in this session
                                    onClick={() => !addedStatus[track.uri] && handleAddClick(track)}
                                    // Disable button once clicked/added
                                    disabled={!!addedStatus[track.uri]}
                                    title={addedStatus[track.uri] ? 'Added to playlist' : 'Add to playlist'}
                                >
                                     {addedStatus[track.uri] ? 'Added' : <Plus size={16} />}
                                </button>
                            </div>
                        ))
                    )}

                    {/* No Results Message */}
                    {!isModalSearching && modalSearchResults.length === 0 && modalSearchQuery.trim() && !modalError && (
                        <p className="modal-no-results">No tracks found matching your search.</p>
                    )}
                     {/* Initial state message */}
                     {!isModalSearching && modalSearchResults.length === 0 && !modalSearchQuery.trim() && !modalError && (
                        <p className="modal-no-results">Start typing to search for songs.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddSongsModal;