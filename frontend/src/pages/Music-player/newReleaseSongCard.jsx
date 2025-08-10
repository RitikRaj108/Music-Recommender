import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, MoreVertical, Heart, Plus, Check } from 'lucide-react';
import { MusicContext } from '../../App'; // Adjust path relative to your App.js
import '../../Components/newReleaseSongCard.css'; // Styles for this specific card
import { useCallback } from 'react';
const NewReleaseSongCard = ({ song }) => {
    // Get necessary functions and state from context
    const {
        handlePlayTrack,
        likedTracks,
        handleTrackLike,
        handleAddToPlaylist,
        currentUser, // Needed for fetching playlists
    } = useContext(MusicContext);
    //fgjnjidfjidf
    const [showMenu, setShowMenu] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState([]); // State to hold fetched playlists
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [addedToPlaylistId, setAddedToPlaylistId] = useState(null); // For temporary feedback
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const isLiked = likedTracks.has(song.uri);
    const token = localStorage.getItem("spotify_access_token"); // Get token for playlist fetch

    // --- Event Handlers ---
    const handleLikeClick = (e) => {
        e.stopPropagation();
        if (song.uri) {
            handleTrackLike(song.uri, !isLiked, song.title, song.artist);
        }
        setShowMenu(false);
    };

    const handleAddToPlaylistClick = async (e, playlist) => {
        e.stopPropagation();
        if (!song.uri || !playlist) return;
        const playlistIdentifier = playlist.spotifyId || playlist._id; // Use consistent ID
        setAddedToPlaylistId(playlistIdentifier); // Indicate processing using the unique ID
        try {
            await handleAddToPlaylist(playlist, song.uri, song.title, song.artist);
            // Keep the checkmark for a short duration
            setTimeout(() => {
                setAddedToPlaylistId(null); // Clear the specific checkmark
                setShowMenu(false); // Close menu after success and timeout
            }, 1500);
        } catch (error) {
            console.error('Error adding to playlist from card:', error);
            alert(`Failed to add to playlist: ${error.message}`);
            setAddedToPlaylistId(null); // Clear indicator on error
            setShowMenu(false);
        }
    };

    // --- Fetch User Playlists (when menu opens and not already loaded) ---
    const fetchUserPlaylists = useCallback(async () => {
        // Don't fetch if no user, no token, already loading, or already loaded
        if (!currentUser?.id || !token || loadingPlaylists || userPlaylists.length > 0) {
            return;
        }
        setLoadingPlaylists(true);
        try {
            // Ensure the backend URL is correct
            const res = await fetch(`https://recommender-pro.onrender.com/api/playlists/user/${currentUser.id}`);
            if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.statusText}`);
            const data = await res.json();
            // Filter out the "Musichub_Liked_Songs" playlist if it exists in the list
            const filteredPlaylists = data.filter(pl => pl.name !== 'Musichub_Liked_Songs');
            setUserPlaylists(filteredPlaylists);
        } catch (err) {
            console.error('Playlist fetch error:', err);
            setUserPlaylists([]); // Set empty on error
        } finally {
            setLoadingPlaylists(false);
        }
    }, [currentUser?.id, token, userPlaylists.length, loadingPlaylists]); // Add loadingPlaylists dependency

    // --- Effects ---
    // Fetch playlists when menu is opened for the first time
    useEffect(() => {
        if (showMenu && userPlaylists.length === 0 && !loadingPlaylists) {
            fetchUserPlaylists();
        }
    }, [showMenu, userPlaylists.length, loadingPlaylists, fetchUserPlaylists]);

    // Close menu if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Render ---
    return (
        <div className="new-release-song-card">
            <div className="nr-card-image-container">
                <img src={song.cover || '/default-cover.jpg'} alt={song.title || 'Song cover'} className="nr-card-image" />
                <div className="nr-card-overlay">
                    {/* Play Button positioned center */}
                    <button
                        className="nr-play-button"
                        onClick={(e) => { e.stopPropagation(); handlePlayTrack(song); }}
                        aria-label={`Play ${song.title}`}
                    >
                        <Play size={24} fill="currentColor" /> {/* Fill icon for better visibility */}
                    </button>

                    {/* Options Menu Button positioned top right */}
                    <div className="nr-options-container" ref={menuRef}>
                        <button
                            className="nr-menu-button"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            aria-label="More options"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="nr-dropdown-menu">
                                {/* Like Button */}
                                <button className="nr-menu-item" onClick={handleLikeClick} disabled={!song.uri}>
                                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} className="nr-menu-icon" />
                                    <span>{isLiked ? 'Remove from Liked' : 'Add to Liked Songs'}</span>
                                </button>

                                {/* Add to Playlist Submenu */}
                                <div className="nr-submenu">
                                    <div className="nr-submenu-header">
                                        <Plus size={16} className="nr-menu-icon" />
                                        <span>Add to Playlist</span>
                                    </div>
                                    <div className="nr-submenu-content">
                                        {loadingPlaylists ? (
                                            <span className="nr-loading-msg">Loading playlists...</span>
                                        ) : (Array.isArray(userPlaylists) && userPlaylists.length > 0) ? (
                                            userPlaylists.map((pl) => {
                                                const playlistIdentifier = pl.spotifyId || pl._id;
                                                const isAdded = addedToPlaylistId === playlistIdentifier;
                                                return (
                                                    <button
                                                        key={playlistIdentifier}
                                                        onClick={(e) => handleAddToPlaylistClick(e, pl)}
                                                        className="nr-playlist-button"
                                                        title={`Add to ${pl.name}`}
                                                        // Disable button briefly while it shows the checkmark
                                                        disabled={isAdded}
                                                    >
                                                        <span className="nr-playlist-name">{pl.name}</span>
                                                        {isAdded && (
                                                            <Check size={16} className="nr-added-icon" />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <span className="nr-no-playlists-msg">No playlists created yet.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Info Section below image */}
            <div className="nr-card-info">
                <h3 className="nr-title" title={song.title || 'Unknown Title'}>{song.title || 'Unknown Title'}</h3>
                <p className="nr-artist" title={song.artist || 'Unknown Artist'}>{song.artist || 'Unknown Artist'}</p>
            </div>
        </div>
    );
};

export default NewReleaseSongCard;