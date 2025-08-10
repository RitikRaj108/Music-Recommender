// src/pages/Recommendations/RecommendationCard.jsx (Updated for new UI)
import React, { useState, useContext, useEffect, useRef,useCallback } from 'react';
import { MusicContext } from '../../App';
import { Play, Heart, Plus, MoreVertical } from 'lucide-react';

const RecommendationCard = ({ track }) => {
    // --- Context and User ID ---
    const {
        handlePlayTrack,
        handleTrackLike,
        handleAddToPlaylist,
        likedTracks,
        currentUser
     } = useContext(MusicContext);
    const spotifyUserId = currentUser?.id;

    // --- State ---
    const [showMenu, setShowMenu] = useState(false);
    const [showAddToPlaylistMenu, setShowAddToPlaylistMenu] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const menuRef = useRef(null); // Ref for the menu container within controls

    const isLiked = track?.uri ? likedTracks.has(track.uri) : false;

    // --- Fetch Playlists (Logic remains the same) ---
    const fetchUserPlaylists = useCallback(async () => {
        if (loadingPlaylists || userPlaylists.length > 0 || !spotifyUserId) return;
        setLoadingPlaylists(true);
        try {
             const res = await fetch(`https://recommender-pro.onrender.com
/api/playlists/user/${spotifyUserId}`);
             if (!res.ok) throw new Error('Failed to fetch playlists');
             const data = await res.json();
             const filteredPlaylists = data.filter(pl => pl.name !== 'Musichub_Liked_Songs');
             setUserPlaylists(filteredPlaylists);
        } catch (error) { /* ... */ }
        finally { setLoadingPlaylists(false); }
    }, [spotifyUserId, loadingPlaylists, userPlaylists.length]);

    // --- Handlers (Logic remains the same) ---
    const handleLikeClickInternal = (e) => {
        e.stopPropagation();
        if (track?.uri && track.title && track.artist) {
             handleTrackLike(track.uri, !isLiked, track.title, track.artist);
        } else { /* ... error ... */ }
        closeMenus();
    };
    const handleAddToPlaylistClickInternal = async (e, playlist) => {
         e.stopPropagation();
         if (!track?.uri || !playlist?.spotifyId) { /* ... */ return; };
         try {
             await handleAddToPlaylist(playlist, track.uri, track.title, track.artist);
             alert(`Added '${track.title}' to '${playlist.name}'!`);
             closeMenus();
         } catch (error) { /* ... */ }
    };
    const toggleMainMenu = (e) => {
        e.stopPropagation();
        setShowMenu(prev => !prev);
        setShowAddToPlaylistMenu(false);
    };
    const toggleAddToPlaylistMenu = (e) => {
        e.stopPropagation();
        if (!showAddToPlaylistMenu && userPlaylists.length === 0) { fetchUserPlaylists(); }
        setShowAddToPlaylistMenu(prev => !prev);
    };
    const closeMenus = () => { setShowMenu(false); setShowAddToPlaylistMenu(false); };

    // --- Click Outside Handler (Logic remains the same) ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the click is outside the menuRef element
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                closeMenus();
            }
        };
        if (showMenu || showAddToPlaylistMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showMenu, showAddToPlaylistMenu]);

    // --- Render ---
    if (!track || !track.uri) {
        return <div className="recommendation-card error">?</div>; // Minimal error placeholder
    }

    return (
        // Use the main card class
        <div className="recommendation-card">
            {/* Image Container holds image and play button */}
            <div className="card-image-container">
                <img src={track.cover || '/default-cover.jpg'} alt="" className="card-image" loading="lazy" />
                {/* Play button positioned absolutely */}
                <button
                    className="card-play-btn"
                    onClick={(e) => { e.stopPropagation(); handlePlayTrack(track); }} // Prevent card click if card itself has one
                    title={`Play ${track.title}`}
                 >
                    <Play size={16} fill="currentColor"/> {/* Smaller icon */}
                </button>
            </div>

            {/* Info below image */}
            <div className="card-info">
                <span className="card-title" title={track.title}>{track.title}</span>
                <span className="card-artist" title={track.artist}>{track.artist}</span>
            </div>

            {/* Controls at the bottom */}
            <div className="card-controls">
                {/* Like Button */}
                <button
                    className={`control-btn like-btn ${isLiked ? 'liked' : ''}`}
                    onClick={handleLikeClickInternal}
                    title={isLiked ? 'Unlike' : 'Like'}
                >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'}/>
                </button>

                 {/* Container for the More button and its menu */}
                 <div className="more-options-container" ref={menuRef}>
                      {/* More Options Button */}
                      <button
                          className="control-btn more-btn"
                          onClick={toggleMainMenu}
                          title="More options"
                      >
                          <MoreVertical size={16} />
                      </button>

                      {/* Dropdown Menu - Rendered conditionally */}
                      {showMenu && (
                          <div className="card-dropdown-menu">
                              <button className="menu-item" onClick={handleLikeClickInternal}>
                                  <Heart size={14}/> {isLiked ? 'Unlike' : 'Like'}
                              </button>
                              <div className="menu-separator"></div>
                              <button className="menu-item submenu-trigger" onClick={toggleAddToPlaylistMenu}>
                                   <Plus size={14} /> Add to Playlist <span className="submenu-arrow">{showAddToPlaylistMenu ? '▲':'▼'}</span>
                              </button>
                              {/* Add to Playlist Submenu Content */}
                              {showAddToPlaylistMenu && (
                                   <div className="card-submenu">
                                       {loadingPlaylists ? ( <div className="submenu-loading">Loading...</div>)
                                       : userPlaylists.length > 0 ? (
                                            userPlaylists.map((pl) => (
                                               <button key={pl.spotifyId || pl._id} onClick={(e) => handleAddToPlaylistClickInternal(e, pl)} className="submenu-item" title={`Add to ${pl.name}`}>
                                                   {pl.name}
                                               </button>
                                           ))
                                       ) : ( <div className="submenu-empty">No playlists</div> )}
                                   </div>
                              )}
                          </div>
                      )}
                </div> {/* End more-options-container */}
            </div> {/* End card-controls */}
        </div> // End recommendation-card
    );
};

export default RecommendationCard;