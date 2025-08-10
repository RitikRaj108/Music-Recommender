// src/pages/Library/PlaylistCard.jsx
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { MusicContext } from '../../App'; // Adjust path
import AddSongsModal from './AddSongsModal'; // Ensure path is correct
import { Play, Shuffle, Search, Plus, MoreVertical, Trash2, X as CloseIcon } from 'lucide-react';
import '../../Components/your-library.css'; // Use the library CSS

const PlaylistCard = ({ playlist }) => { // Receives basic playlist info { id, _id, name, ownerName, coverImage (default), uri }
    const {
        
        handlePlayContext,
        handleToggleShuffle,
        handlePlayTrack,
        handleRemoveFromPlaylist,
    } = useContext(MusicContext);

    // State for fetched tracks
    const [tracks, setTracks] = useState([]);
    const [isLoadingTracks, setIsLoadingTracks] = useState(false);
    const [tracksError, setTracksError] = useState(null);

    // State for fetched playlist details (image, final name/owner)
    const [playlistDetails, setPlaylistDetails] = useState(null); // Store full details from Spotify
    const [isLoadingDetails, setIsLoadingDetails] = useState(true); // Separate loading for details

    // State for internal card functions
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showTrackMenu, setShowTrackMenu] = useState(null);
    const trackMenuRef = useRef(null);

    // --- Fetch FULL Playlist Details (Image, Owner, etc.) from Spotify ---
    const fetchPlaylistDetails = useCallback(async (playlistId) => {
        setIsLoadingDetails(true);
        const token = localStorage.getItem("spotify_access_token");
        if (!token) {
            console.error("No token to fetch playlist details");
            setIsLoadingDetails(false); // Stop loading, maybe show default
            return;
        }

        try {
            // Fetch specific fields: name, images, owner, uri
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,images,owner.display_name,uri`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) localStorage.removeItem("spotify_access_token");
                throw new Error(`Failed to fetch playlist details: ${response.statusText}`);
            }
            const data = await response.json();
            setPlaylistDetails(data);
        } catch (error) {
            console.error("Error fetching playlist details:", error);
            // Don't set an error that hides the card, just log it.
            // The component will use props as fallback.
             setPlaylistDetails(null); // Reset details on error
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);

     // --- Fetch Tracks for the Playlist ---
          // --- Fetch Tracks for the Playlist ---
          const fetchPlaylistTracks = useCallback(async (playlistId) => {
            setIsLoadingTracks(true);
            setTracksError(null);
            const token = localStorage.getItem("spotify_access_token");
            if (!token) { /* ... */ setTracksError("Auth required"); setIsLoadingTracks(false); return; } // Added error setting
   
            try {
                let allTracks = [];
                // Consider fetching more fields if needed elsewhere: &fields=items(track(id,name,uri,duration_ms,album(name,images),artists(name))),next
                let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,uri,duration_ms,album(name,images),artists(name)))`;
   
                // Basic pagination loop (only fetches first 100 for now)
                const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `Failed to fetch tracks (${response.status})`);
                }
                const data = await response.json();
   
                // --- START FIX: Modify Mapping ---
                allTracks = (data.items || [])
                    .filter(item => item.track) // Filter out items without a track object
                    .map(item => {
                        const track = item.track;
                        // Provide default values if properties are missing/null
                        return {
                            id: track.id, // Assume ID and URI are always present if track exists
                            uri: track.uri,
                            name: track.name || 'Unknown Track', // Default for name
                            artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist', // Default for artist
                            albumName: track.album?.name || 'Unknown Album', // Default for album name
                            duration_ms: track.duration_ms || 0, // Default duration
                            // Use smallest image, then first, then default
                            coverImage: track.album?.images?.slice(-1)[0]?.url || track.album?.images?.[0]?.url || '/default-cover.jpg'
                        };
                     });
                // --- END FIX ---
   
                setTracks(allTracks);
            } catch (err) {
                console.error(`Error fetching tracks for playlist ${playlistId}:`, err);
                setTracksError(err.message || "Could not load tracks."); // Set specific error
                setTracks([]); // Clear tracks on error
            }
            finally { setIsLoadingTracks(false); }
        }, []); // Dependencies are correct


    // Trigger fetches when playlist ID is available/changes
    useEffect(() => {
        if (playlist?.id) {
            fetchPlaylistDetails(playlist.id); // Fetch image/details
            fetchPlaylistTracks(playlist.id);  // Fetch tracks
        } else {
            // Reset if no valid playlist prop
             setIsLoadingDetails(false);
             setIsLoadingTracks(false);
             setPlaylistDetails(null);
             setTracks([]);
        }
    }, [playlist?.id, fetchPlaylistDetails, fetchPlaylistTracks]); // Depend on playlist ID and the fetch functions


    // Click outside track menu handler
    useEffect(() => {
        // ... (keep existing click outside logic for track menu) ...
        const handleClickOutside = (event) => { /* ... */ };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showTrackMenu]);


    // Filtered tracks based on internal search
    const filteredTracks = tracks.filter(track => {
      // Ensure query is lowercase once
      const query = internalSearchQuery.toLowerCase();

      // Check if property exists before calling toLowerCase()
      const nameMatch = track.name ? track.name.toLowerCase().includes(query) : false;
      const artistMatch = track.artist ? track.artist.toLowerCase().includes(query) : false;
      const albumMatch = track.albumName ? track.albumName.toLowerCase().includes(query) : false;

      // Return true if any field matches
      return nameMatch || artistMatch || albumMatch;
  });

    // Format duration helper
    const formatDuration = (ms) => { /* ... */ };

    // --- Handlers for Playback/Modification ---
    const playThisPlaylist = () => {
        // Use the URI from fetched details if available, otherwise from prop
        const uriToPlay = playlistDetails?.uri || playlist.uri;
        if (uriToPlay) {
            handlePlayContext(uriToPlay);
        } else {
            console.error("Missing playlist URI to play");
        }
    };

    const toggleShuffleAndPlay = async () => {
         const uriToPlay = playlistDetails?.uri || playlist.uri;
         if (!uriToPlay) { console.error("Missing playlist URI"); return; }
        try {
            await handleToggleShuffle(true); // Turn shuffle on
            handlePlayContext(uriToPlay); // Play the playlist context
        } catch (error) { /* ... */ }
    };

    const handleRemoveClick = async (trackUri) => {
        // Use playlist.id (Spotify ID) for the Spotify API call via context
        if (window.confirm(`Remove song from "${displayName}"?`)) { // Use displayed name
            try {
                 await handleRemoveFromPlaylist(playlist, trackUri);
                 fetchPlaylistTracks(playlist.id); // Refresh tracks
                 setShowTrackMenu(null);
            } catch (error) { /* ... */ }
        } else {
            setShowTrackMenu(null);
        }
    };


    // --- Determine Display Values (use fetched details with fallback to props) ---
    const displayCover = isLoadingDetails
        ? '/loading-spinner.gif' // Or a placeholder image
        : (playlistDetails?.images?.[0]?.url || playlist.coverImage); // Use fetched image[0] or prop fallback

    const displayName = isLoadingDetails
        ? 'Loading...'
        : (playlistDetails?.name || playlist.name); // Use fetched name or prop fallback

    const displayOwner = isLoadingDetails
        ? ''
        : (playlistDetails?.owner?.display_name || playlist.ownerName); // Use fetched owner or prop fallback


    // --- JSX Render ---
    return (
        <div className="playlist-card">
            {/* Header Section - Use display variables */}
            <div className="playlist-card-header">
                <img src={displayCover} alt={`${displayName} cover`} className="playlist-cover" />
                <div className="playlist-info">
                    <h2>{displayName}</h2>
                    <p>By {displayOwner}</p>
                    <div className="playlist-controls-header">
                        <button onClick={playThisPlaylist} className="playlist-button play-btn" title="Play Playlist" disabled={isLoadingDetails}>
                            <Play size={20} fill="currentColor" />
                        </button>
                        <button onClick={toggleShuffleAndPlay} className="playlist-button icon-button" title="Shuffle Play" disabled={isLoadingDetails}>
                            <Shuffle size={18} />
                        </button>
                         <button onClick={() => setIsAddModalOpen(true)} className="playlist-button icon-button add-btn" title="Add Songs">
                            <Plus size={18} /> Add
                        </button>
                    </div>
                </div>
            </div>

             {/* Internal Search Bar */}
             <div className="playlist-internal-search">
                 {/* ... (input remains the same) ... */}
                 <Search size={18} className="search-icon" />
                 <input type="text" placeholder="Filter songs..." value={internalSearchQuery} onChange={(e) => setInternalSearchQuery(e.target.value)} />
                 {internalSearchQuery && ( <button onClick={() => setInternalSearchQuery('')} className="clear-internal-search"> <CloseIcon size={16} /> </button> )}
            </div>

            {/* Track List Section */}
            <div className="playlist-tracklist">
                {isLoadingTracks ? (
                    <div className="tracklist-loading"><div className="spinner-small"></div> Loading tracks...</div>
                ) : tracksError ? (
                    <div className="tracklist-error">{tracksError}</div>
                ) : filteredTracks.length > 0 ? (
                    filteredTracks.map((track, index) => (
                        <div key={track.uri || index} className="playlist-track-item">
                             {/* Play track within the playlist context */}
                             <button className="track-item-play-btn" onClick={() => handlePlayContext(playlistDetails?.uri || playlist.uri, track.uri)} title={`Play ${track.name}`}>
                                <Play size={16} />
                            </button>
                            <div className="track-item-info">
                                <span className="track-title">{track.name}</span>
                                <span className="track-artist">{track.artist}</span>
                            </div>
                            <div className="track-item-controls">
                                <span className="track-duration">{formatDuration(track.duration_ms)}</span>
                                <div className="track-menu-container" ref={showTrackMenu === track.id ? trackMenuRef : null}>
                                    <button
                                        className="icon-button track-more-btn"
                                        onClick={(e) => { e.stopPropagation(); setShowTrackMenu(showTrackMenu === track.id ? null : track.id); }}
                                        title="More options"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {/* Track Menu Dropdown */}
                                    {showTrackMenu === track.id && (
                                        <div className="track-dropdown-menu">
                                            <button className="menu-item remove-item" onClick={(e) => {e.stopPropagation(); handleRemoveClick(track.uri); }}>
                                                <Trash2 size={14} /> Remove from Playlist
                                            </button>
                                            {/* Add other options here */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="playlist-empty-state">No tracks found.</div>
                )
                    
                }
            </div>

            {/* Add Songs Modal */}
            {isAddModalOpen && (
                <AddSongsModal
                    // Pass necessary info - crucially the playlist.id (Spotify ID)
                    playlistId={playlist.id}
                    playlistName={displayName} // Pass the potentially updated name
                     // Pass the whole playlist object if Add Modal needs the Mongo _id
                    playlist={playlist} // Pass the original playlist prop which contains _id
                    onClose={() => setIsAddModalOpen(false)}
                    onSongAdded={() => fetchPlaylistTracks(playlist.id)} // Refresh tracks after adding
                />
            )}
        </div>
    );
};

export default PlaylistCard;