import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, Play, Pause, SkipBack, SkipForward, Volume2, Heart, MoreVertical, Check, Plus } from 'lucide-react'; // Added Check, Plus
import { MusicContext } from '../../App';
import '../../Components/music-dashboard.css'; // Ensure this path is correct and contains player styles
import { useNavigate } from 'react-router-dom'; // useNavigate might be needed for playlist navigation

const PlayerBar = () => {
    const {
        playerStatus,
        player,
        handleTrackLike,
        likedTracks,
        handleAddToPlaylist, // Ensure this is correctly provided by context
        // Add currentUser from context if it's managed there, otherwise fetch here
        // currentUser: contextCurrentUser
    } = useContext(MusicContext);

    // --- State ---
    // FIX 1: Use consistent lowercase 'u' for state variable
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    const [isFullPlayer, setIsFullPlayer] = useState(false);
    // Fetch currentUser locally or get from context
    const [currentUser, setCurrentUser] = useState(null); // Use local state if not from context
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [addedToPlaylistId, setAddedToPlaylistId] = useState(null); // For feedback

    // Volume State
    const [sliderVolume, setSliderVolume] = useState(playerStatus.volume);

    // Progress State
    const [currentPosition, setCurrentPosition] = useState(playerStatus.position);

    // --- Refs ---
    const volumeInputRef = useRef(null);
    const progressIntervalRef = useRef(null);
    const progressInputRef = useRef(null);
    const menuRef = useRef(null); // Ref for the dropdown menu container

    const navigate = useNavigate();
    const token = localStorage.getItem("spotify_access_token");

    // --- Effects ---

    // Fetch Current User (More robust)
    useEffect(() => {
        const fetchCurrentUser = async () => {
            if (!token) {
                setCurrentUser(null); // Clear user if no token
                return;
            }
            try {
                const response = await fetch('https://api.spotify.com/v1/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) {
                    if (response.status === 401) localStorage.removeItem("spotify_access_token");
                    throw new Error(`Failed to fetch Spotify user: ${response.statusText}`);
                }
                const userData = await response.json();
                setCurrentUser(userData);
                // console.log("[PlayerBar] Current User fetched:", userData.id);
            } catch (error) {
                console.error('[PlayerBar] Error fetching user data:', error);
                setCurrentUser(null);
            }
        };
        fetchCurrentUser();
        // Re-run if the token changes (e.g., after login/refresh)
    }, [token]);

    // Fetch User Playlists when currentUser is available
    const fetchUserPlaylists = useCallback(async () => {
        // FIX 2: Check currentUser.id exists before fetching
        if (!currentUser?.id || !token) {
            // console.log("[PlayerBar] Skipping playlist fetch: No user ID or token.");
            return;
        }
        // console.log("[PlayerBar] Attempting to fetch playlists for user:", currentUser.id);
        setLoadingPlaylists(true); // Indicate loading
        try {
            // Ensure backend URL is correct
            const res = await fetch(`https://recommender-pro.onrender.com/api/playlists/user/${currentUser.id}`);
            if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.statusText}`);
            const data = await res.json();
            // Filter out the "Liked Songs" playlist if it's managed separately
            const filteredPlaylists = data.filter(pl => pl.name !== 'Musichub_Liked_Songs');
            setUserPlaylists(filteredPlaylists); // Set the correct state variable
            // console.log("[PlayerBar] Playlists fetched:", filteredPlaylists);
        } catch (error) {
            console.error('[PlayerBar] Playlist fetch error:', error);
            setUserPlaylists([]); // Reset on error
        } finally {
             setLoadingPlaylists(false); // Finish loading
        }
        // Depend on currentUser.id and token
    }, [currentUser?.id, token]);

    // Trigger playlist fetch when menu is shown *and* playlists aren't loaded
     useEffect(() => {
         // Only fetch if menu is open, we don't have playlists, and not currently loading
         if (showMenu && userPlaylists.length === 0 && !loadingPlaylists) {
             fetchUserPlaylists();
         }
     }, [showMenu, userPlaylists.length, loadingPlaylists, fetchUserPlaylists]);


    // Effect to sync local volume slider with context
    useEffect(() => {
        if (document.activeElement !== volumeInputRef.current) {
            setSliderVolume(playerStatus.volume);
        }
    }, [playerStatus.volume]);

    // Effect to sync local progress with context (only when not dragging)
    useEffect(() => {
        if (document.activeElement !== progressInputRef.current) {
            setCurrentPosition(playerStatus.position);
        }
    }, [playerStatus.position]);

    // Effect for the progress timer
    useEffect(() => {
        clearInterval(progressIntervalRef.current);
        if (playerStatus.isPlaying && playerStatus.duration > 0) { // Only run if duration is known
            progressIntervalRef.current = setInterval(() => {
                // Only update if the user isn't actively seeking
                if (document.activeElement !== progressInputRef.current) {
                    setCurrentPosition(prev => {
                        const nextPos = prev + 1000;
                        // Ensure we don't exceed duration
                        return Math.min(nextPos, playerStatus.duration);
                    });
                }
            }, 1000);
        }
        return () => clearInterval(progressIntervalRef.current);
        // Added playerStatus.duration dependency
    }, [playerStatus.isPlaying, playerStatus.duration]);

     // Effect to close menu when clicking outside
     useEffect(() => {
         const handleClickOutside = (event) => {
             // Check if the click is outside the menuRef's current element
             if (menuRef.current && !menuRef.current.contains(event.target)) {
                 setShowMenu(false);
             }
         };
         // Add listener if menu is open
         if (showMenu) {
             document.addEventListener("mousedown", handleClickOutside);
         }
         // Cleanup: remove listener when effect cleans up or menu closes
         return () => {
             document.removeEventListener("mousedown", handleClickOutside);
         };
     }, [showMenu]); // Only re-run when showMenu changes


    // --- Handlers ---
    const togglePlayPause = async () => {
        if (!player) {
            console.error("[PlayerBar] Player not ready");
            alert("Player is not ready.");
            return;
        }
        try {
            await player.togglePlay();
        } catch (error) {
            console.error('[PlayerBar] Playback Error (togglePlay):', error);
            // Provide more context for specific errors if possible
            if (error.message?.includes("No active device")) {
                alert("No active Spotify device found. Please start playback on a device.");
            } else if (error.message?.includes("Device not found")) {
                 alert("Player device disconnected. Please refresh or select the player again.");
            }
            else {
                alert(`Playback error: ${error.message || 'Unknown error'}`);
            }
        }
    };

    // SeekBar: Update visual while dragging
    const handleProgressInput = (e) => {
        setCurrentPosition(Number(e.target.value));
    };
    // SeekBar: Apply change on release
    const handleSeek = (e) => {
        const newPosition = Number(e.target.value);
        if (player) {
            player.seek(newPosition).catch(err => {
                console.error("[PlayerBar] Error seeking:", err);
                // Revert visual position if seek fails
                setCurrentPosition(playerStatus.position);
            });
        }
    };

    // Volume: Update visual while dragging
    const handleVolumeInput = (e) => {
        setSliderVolume(Number(e.target.value));
    };
    // Volume: Apply change on release
    const handleSetVolume = (e) => { // Triggered by onChange (usually on mouse up)
        const newVolume = Number(e.target.value);
        if (player) {
            player.setVolume(newVolume).catch(err => {
                console.error("[PlayerBar] Error setting volume:", err);
                setSliderVolume(playerStatus.volume); // Revert visual
                alert(`Failed to set volume: ${err.message}`);
            });
        }
    };

    // Add to Playlist Handler (within PlayerBar scope)
    const handleAddToPlaylistClick = async (e, playlist) => {
         e.stopPropagation(); // Prevent menu close if needed immediately
         const currentTrack = playerStatus.currentTrack;
         if (!currentTrack || !playlist) return;

         const playlistIdentifier = playlist.spotifyId || playlist._id;
         setAddedToPlaylistId(playlistIdentifier); // Show loading/added state

         try {
             await handleAddToPlaylist( // Call context function
                 playlist,
                 currentTrack.uri,
                 currentTrack.name,
                 currentTrack.artists[0]?.name || 'Unknown Artist'
             );
             // Keep checkmark visible briefly
             setTimeout(() => {
                 setAddedToPlaylistId(null);
                 setShowMenu(false); // Close menu after action
             }, 1500);

             // Optional: Notify user
             // alert(`Added '${currentTrack.name}' to '${playlist.name}'`);

         } catch (error) {
             console.error('[PlayerBar] Error adding to playlist:', error);
             alert(`Failed to add track: ${error.message}`);
             setAddedToPlaylistId(null); // Reset indicator on error
             setShowMenu(false); // Close menu on error too
         }
     };


    const formatTime = (ms) => {
        if (isNaN(ms) || ms < 0) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // --- Render Functions ---

    const renderFullPlayer = () => {
        const currentTrack = playerStatus.currentTrack; // Use currentTrack for clarity
        const currentUri = currentTrack?.uri;
        const isLiked = currentUri ? likedTracks.has(currentUri) : false;
        // FIX 3: Use the correct state variable 'userPlaylists'
        const playlistsToRender = userPlaylists;

        return (
            // Add a class for easier targeting
            <div className="full-player active">
                <div className="full-player-header">
                    <button
                        onClick={() => setIsFullPlayer(false)}
                        className="control-btn close-btn" // Style this button
                        aria-label="Minimize player"
                    >
                        <ChevronDown size={24} />
                    </button>

                    {/* FIX 4: Wrap menu button and dropdown in a container with ref */}
                    <div className="menu-container full-player-menu-container" ref={menuRef}>
                        <button
                            className="control-btn menu-btn" // Style this button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu); // Toggle state
                            }}
                            aria-label="More options"
                        >
                            <MoreVertical size={24} />
                        </button>

                        {showMenu && (
                            <div className="dropdown-menu player-dropdown-menu"> {/* Add specific class */}
                                {/* Like/Unlike */}
                                <button
                                    className="menu-item"
                                    onClick={() => {
                                        if (currentUri && currentTrack) { // Check track exists
                                            handleTrackLike(
                                                currentUri,
                                                !isLiked,
                                                currentTrack.name,
                                                currentTrack.artists[0]?.name
                                            );
                                        }
                                        setShowMenu(false);
                                    }}
                                    disabled={!currentUri}
                                >
                                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                                    {isLiked ? 'Remove from Liked' : 'Add to Liked Songs'}
                                </button>

                                {/* Add to Playlist Submenu */}
                                <div className="submenu player-submenu"> {/* Add specific class */}
                                    <div className="submenu-header">
                                        <Plus size={16} /> Add to Playlist
                                    </div>
                                    {/* FIX 5: Scrollable container for playlists */}
                                    <div className="playlist-items-container">
                                         {loadingPlaylists ? (
                                             <div className="loading-playlists-msg">Loading...</div>
                                         ) : playlistsToRender && playlistsToRender.length > 0 ? (
                                            playlistsToRender.map((pl) => {
                                                const playlistIdentifier = pl.spotifyId || pl._id;
                                                const isAdded = addedToPlaylistId === playlistIdentifier;
                                                return (
                                                    // Use the specific handler defined above
                                                    <button
                                                        key={playlistIdentifier} // Use a reliable unique ID
                                                        className="playlist-link-button" // Style this button
                                                        onClick={(e) => handleAddToPlaylistClick(e, pl)}
                                                        disabled={isAdded} // Disable briefly after adding
                                                    >
                                                        <span>{pl.name}</span>
                                                         {isAdded && <Check size={16} className="added-icon"/>} {/* Feedback Icon */}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="no-playlists-msg">No playlists found.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {currentTrack ? ( // Render content only if there's a track
                    <div className="full-player-content">
                        <div className="full-player-album-art">
                            <img
                                src={currentTrack.album.images[0]?.url || '/default-cover.jpg'}
                                alt={currentTrack.album.name || 'Album Art'}
                            />
                        </div>
                        <div className="full-player-info">
                            {/* Link to album/artist could be added here */}
                            <h2>{currentTrack.name}</h2>
                            <p>{currentTrack.artists.map(a => a.name).join(', ')}</p>
                        </div>

                        <div className="full-player-progress">
                            <div className="progress-time">
                                <span>{formatTime(currentPosition)}</span>
                                <span>{formatTime(playerStatus.duration)}</span>
                            </div>
                            <input
                                ref={progressInputRef}
                                type="range"
                                min="0"
                                max={playerStatus.duration || 0}
                                value={currentPosition}
                                onInput={handleProgressInput} // Update visual while dragging
                                onChange={handleSeek}      // Seek on mouse release / change commit
                                className="progress-bar"
                                disabled={!currentTrack || playerStatus.duration === 0} // Disable if no duration
                                aria-label="Track progress"
                            />
                        </div>

                        <div className="full-player-controls">
                            {/* Like Button */}
                            <button
                                className={`control-btn like-btn ${isLiked ? 'liked' : ''}`}
                                onClick={() => currentUri && currentTrack && handleTrackLike(
                                    currentUri, !isLiked, currentTrack.name, currentTrack.artists[0]?.name
                                    )}
                                disabled={!currentUri}
                                aria-label={isLiked ? 'Unlike track' : 'Like track'}
                            >
                                <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} /> {/* Adjusted size */}
                            </button>
                            {/* Previous Track */}
                            <button
                                className="control-btn"
                                onClick={() => player?.previousTrack().catch(err => console.error("Prev track error:", err))}
                                disabled={!player} // Maybe disable based on playback state capabilities later
                                aria-label="Previous track"
                            >
                                <SkipBack size={28} fill="currentColor"/> {/* Fill icons */}
                            </button>
                            {/* Play/Pause */}
                            <button
                                onClick={togglePlayPause}
                                className="play-pause-btn" // Larger, distinct button
                                disabled={!currentTrack || !player}
                                aria-label={playerStatus.isPlaying ? 'Pause' : 'Play'}
                            >
                                {/* Ensure icons are filled */}
                                {playerStatus.isPlaying ? <Pause size={32} fill="currentColor"/> : <Play size={32} fill="currentColor"/>}
                            </button>
                            {/* Next Track */}
                            <button
                                className="control-btn"
                                onClick={() => player?.nextTrack().catch(err => console.error("Next track error:", err))}
                                disabled={!player} // Maybe disable based on playback state capabilities later
                                aria-label="Next track"
                            >
                                <SkipForward size={28} fill="currentColor"/> {/* Fill icons */}
                            </button>
                            {/* Volume Control - Moved here for better layout */}
                             <div className="volume-control full-player-volume">
                                <Volume2 size={22} className="volume-icon" /> {/* Adjusted size */}
                                <input
                                    ref={volumeInputRef}
                                    type="range"
                                    aria-label="Volume"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={sliderVolume}
                                    onInput={handleVolumeInput} // Update visual while dragging
                                    onChange={handleSetVolume}  // Set volume on release
                                    className="volume-bar"
                                    disabled={!player}
                                />
                            </div>
                        </div>
                        {/* Volume might be better placed elsewhere in full view depending on design */}
                    </div>
                ) : (
                     <div className="full-player-placeholder"> {/* Show when no track is loaded */}
                        Select a song to play
                     </div>
                )}
            </div>
        );
    };

    const renderMiniPlayer = () => {
        const currentTrack = playerStatus.currentTrack;
        const currentUri = currentTrack?.uri;
        const isLiked = currentUri ? likedTracks.has(currentUri) : false;

        // Don't render mini player if nothing is selected/playing yet
        // if (!currentTrack) return null;

        return (
            <div className="mini-player">
                <div className="mini-player-info">
                    <div className="mini-player-image">
                        {currentTrack && (
                            <img
                                src={currentTrack.album.images[0]?.url || '/default-cover.jpg'}
                                alt={currentTrack.album.name || "Album Art"}
                            />
                        )}
                    </div>
                    <div className="mini-player-text">
                         {/* Use Link for navigation if desired */}
                        <h4>{currentTrack?.name || 'No track playing'}</h4>
                        <p>{currentTrack?.artists.map(a => a.name).join(', ') || ''}</p>
                    </div>
                </div>

                {/* Progress Bar (Mini) - Optional but recommended */}
                 <div className="mini-player-progress-container">
                     <input
                         type="range"
                         min="0"
                         max={playerStatus.duration || 0}
                         value={currentPosition}
                         readOnly // Make it read-only display, not interactive
                         className="mini-progress-bar"
                         style={{ '--progress-percent': `${(currentPosition / (playerStatus.duration || 1)) * 100}%` }} // Style fill via CSS variable
                         aria-label="Track progress display"
                    />
                 </div>


                <div className="mini-player-controls">
                    <button
                        className={`control-btn like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={() => currentUri && currentTrack && handleTrackLike(
                            currentUri, !isLiked, currentTrack.name, currentTrack.artists[0]?.name
                        )}
                        disabled={!currentUri}
                        aria-label={isLiked ? 'Unlike track' : 'Like track'}
                    >
                        <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        onClick={togglePlayPause}
                        className="control-btn mini-play-btn" // Use consistent naming
                        data-testid="mini-play-btn"
                        disabled={!currentTrack || !player}
                        aria-label={playerStatus.isPlaying ? 'Pause' : 'Play'}
                    >
                        {playerStatus.isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
                    </button>
                    <button
                        onClick={() => setIsFullPlayer(true)}
                        className="control-btn mini-expand-btn" // Use consistent naming
                        data-testid="expand-btn"
                        aria-label="Expand player"
                        disabled={!currentTrack} // Disable expand if nothing is playing
                    >
                        <ChevronUp size={20} />
                    </button>
                </div>
            </div>
        );
    };

    // Main Return: Use a container and conditional rendering
    return (
        <div className={`player-bar-container ${isFullPlayer ? 'full-mode' : 'mini-mode'}`}>
            {/* Conditionally render based player readiness and view mode */}
            {player && (playerStatus.currentTrack || !isFullPlayer) ? ( // Render mini even if no track initially
                isFullPlayer ? renderFullPlayer() : renderMiniPlayer()
            ) : player ? ( // Player ready, full mode, but no track yet
                 renderFullPlayer() // Render the full player placeholder state
            ) : (
                <div className="player-placeholder">Initializing Player...</div>
            )}
        </div>
    );
};

export default PlayerBar;