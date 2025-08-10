import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { Search, Home, X, Library, Bell, Plus, Heart, ChevronUp, ChevronDown, Play, Pause, SkipBack, SkipForward, Volume2, Calendar, MoreVertical } from 'lucide-react';
import { useAuth } from "@clerk/clerk-react";
import '../../Components/music-dashboard.css'; // Adjust path if needed
import { Link, useNavigate } from 'react-router-dom';
import { MusicContext } from '../../App'; // Adjust path if needed
import CreatePlaylistModal from '../Playlist/CreatePlaylistModal'; // Adjust path if needed

const MusicDashboard = () => {
    // --- State Variables ---
    const [currentUser, setCurrentUser] = useState(null);
    const token = localStorage.getItem("spotify_access_token");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const navigate = useNavigate();
    const { signOut } = useAuth();

    // Music Context
    const {
        musichubPlaylistId,
        setMusichubPlaylistId,
        likedTracks,
        setLikedTracks, // Make sure this is provided if used directly, otherwise rely on handleTrackLike
        handleTrackLike,
        handlePlayTrack,
        deviceId,
        playerStatus,
        player,
        handleAddToPlaylist
    } = useContext(MusicContext);

    // Data Loading and Content State
    const [topSongs, setTopSongs] = useState([]);
    const [trendingSongs, setTrendingSongs] = useState([]);
    const [newReleases, setNewReleases] = useState([]);
    const [loading, setLoading] = useState({
        top: true,
        trending: true,
        newReleases: true
    });
    const [errors, setErrors] = useState({
        top: null,
        trending: null,
        newReleases: null
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false); // Controls search dropdown visibility

    // --- Refs ---
    const searchContainerRef = useRef(null); // Ref for the entire search area
    const searchInputRef = useRef(null);
    const userMenuRef = useRef(null);    // Ref for the user dropdown menu

    // --- Utility Functions ---
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    // --- Handlers ---
    const handleLogout = async () => {
        try {
            localStorage.removeItem("spotify_access_token");
            localStorage.removeItem("musichub_playlist_id");
            await signOut();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        }
    };

    const fetchUserPlaylists = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`https://recommender-pro.onrender.com
/api/playlists/user/${currentUser.id}`); // Ensure backend URL is correct
            if (!res.ok) throw new Error('Failed to fetch playlists');
            const data = await res.json();
            setUserPlaylists(data);
        } catch (error) {
            console.error('Playlist fetch error:', error);
            setUserPlaylists([]);
        }
    }, [currentUser?.id]);

    const handleCreatePlaylist = async (name) => {
        if (!currentUser || !token) return;
        try {
            // 1. Create in Spotify
            const spotifyRes = await fetch(
                `https://api.spotify.com/v1/users/${currentUser.id}/playlists`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, public: false, description: `Created in MusicHub` })
                }
            );
            if (!spotifyRes.ok) { const err = await spotifyRes.json(); throw new Error(`Spotify Error: ${err.error.message}`); }
            const spotifyData = await spotifyRes.json();

            // 2. Save to MongoDB via Backend
            const dbRes = await fetch('https://recommender-pro.onrender.com/api/playlists/create', { // Ensure backend URL is correct
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, // Pass token if backend needs it
                body: JSON.stringify({ userId: currentUser.id, name, spotifyId: spotifyData.id })
            });
            if (!dbRes.ok) throw new Error('Failed to save playlist to DB');

            // 3. Refresh playlists
            fetchUserPlaylists(); // Re-fetch the list
            setShowCreateModal(false); // Close modal on success
        } catch (error) {
            console.error('Playlist creation failed:', error);
            alert(`Creation failed: ${error.message}`);
        }
    };

    // --- useEffect Hooks ---

    // Fetch Current Spotify User
    useEffect(() => {
        const fetchCurrentUser = async () => {
            if (!token) return;
            try {
                const response = await fetch('https://api.spotify.com/v1/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) {
                     if (response.status === 401) localStorage.removeItem("spotify_access_token"); // Basic handling for expired token
                     throw new Error(`Failed to fetch Spotify user: ${response.statusText}`);
                }
                const userData = await response.json();
                setCurrentUser(userData);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setCurrentUser(null); // Reset user on error
            }
        };
        fetchCurrentUser();
    }, [token]);

    // Click Outside User Menu
    useEffect(() => {
        const handleClickOutsideUserMenu = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutsideUserMenu);
        return () => document.removeEventListener("mousedown", handleClickOutsideUserMenu);
    }, []);

    // Click Outside Search Results
     useEffect(() => {
        const handleClickOutsideSearch = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutsideSearch);
        return () => document.removeEventListener("mousedown", handleClickOutsideSearch);
    }, []);

    // Fetch User Playlists when currentUser is available
    useEffect(() => {
        if (currentUser?.id) {
            fetchUserPlaylists();
        }
    }, [currentUser?.id, fetchUserPlaylists]); // fetchUserPlaylists is stable due to useCallback

    // Initialize/Find Musichub Liked Songs Playlist
    useEffect(() => {
        const initializePlaylist = async () => {
            if (!currentUser?.id || !token) return;
            try {
                // 1. Check backend first
                const mongoRes = await fetch(`https://recommender-pro.onrender.com
/api/playlists/user/${currentUser.id}/musichub-playlist`);
                const contentType = mongoRes.headers.get("content-type");

                if (mongoRes.ok && contentType?.includes("application/json")) {
                    const existingPlaylist = await mongoRes.json();
                    if (existingPlaylist?.spotifyId) {
                        setMusichubPlaylistId(existingPlaylist.spotifyId);
                        localStorage.setItem('musichub_playlist_id', existingPlaylist.spotifyId);
                        // console.log("Found existing Musichub playlist:", existingPlaylist.spotifyId);
                        return; // Found it, we're done
                    }
                } else if (!mongoRes.ok && mongoRes.status !== 404) {
                     // Log error if it's not just 'not found'
                     console.error(`Backend check failed: ${mongoRes.statusText}`);
                }

                // console.log("Musichub playlist not found in DB, creating...");
                // 2. If not found in DB, create on Spotify
                const createRes = await fetch(
                    `https://api.spotify.com/v1/users/${currentUser.id}/playlists`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'Musichub_Liked_Songs', public: false, description: 'Songs liked in MusicHub' })
                    }
                );
                if (!createRes.ok) { const err = await createRes.json(); throw new Error(`Spotify create error: ${err.error.message}`); }
                const spotifyPlaylist = await createRes.json();
                //  console.log("Created Spotify playlist:", spotifyPlaylist.id);

                // 3. Save reference to DB
                const dbSaveRes = await fetch('https://recommender-pro.onrender.com/api/playlists/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ userId: currentUser.id, name: 'Musichub_Liked_Songs', spotifyId: spotifyPlaylist.id })
                });
                 if (!dbSaveRes.ok) { console.error("Failed to save new playlist ref to DB"); /* Continue, but log error */ }

                // 4. Update state/storage
                setMusichubPlaylistId(spotifyPlaylist.id);
                localStorage.setItem('musichub_playlist_id', spotifyPlaylist.id);

            } catch (error) {
                console.error('Playlist init error:', error);
            }
        };

        initializePlaylist();
    }, [currentUser?.id, token, setMusichubPlaylistId]); // Dependencies ensure this runs when needed

    // Fetch Search Results (Debounced)
     useEffect(() => {
        let isCancelled = false;
        const debounceTimer = setTimeout(async () => {
            if (searchQuery.trim() && !isCancelled) {
                setIsSearching(true);
                setShowSearchResults(true); // Show container immediately
                try {
                    const currentToken = localStorage.getItem("spotify_access_token");
                    if (!currentToken) throw new Error("No Spotify token for search");

                    const response = await fetch(
                        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track,artist,album&limit=5`,
                        { headers: { Authorization: `Bearer ${currentToken}` } }
                    );
                    if (!isCancelled) { // Check again after await
                        if (!response.ok) {
                             if (response.status === 401) { console.error("Spotify token expired or invalid during search."); localStorage.removeItem("spotify_access_token");}
                             throw new Error(`Spotify Search Error: ${response.statusText}`);
                        }
                        const data = await response.json();
                        setSearchResults(data);
                    }
                } catch (error) {
                     if (!isCancelled) {
                         console.error("Search Error:", error);
                         setSearchResults(null); // Clear results on error
                         // Consider setting an error state to display in the dropdown
                     }
                } finally {
                     if (!isCancelled) {
                         setIsSearching(false);
                     }
                }
            } else if (!searchQuery.trim()) {
                 // If query is cleared while debouncing or initially empty
                 setSearchResults(null);
                 setShowSearchResults(false);
                 setIsSearching(false);
            }
        }, 500); // Debounce time

        return () => {
            isCancelled = true;
            clearTimeout(debounceTimer);
        }
    }, [searchQuery]); // Re-run only when searchQuery changes


    // --- Data Fetching Effects (Top Songs, Trending, New Releases) ---
    useEffect(() => {
        const fetchTopSongs = async () => {
             if (!token) { setLoading(prev => ({...prev, top: false})); setErrors(prev => ({...prev, top: "No Spotify access token"})); return; }
             setLoading(prev => ({ ...prev, top: true }));
             try {
                 const response = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=5", { headers: { Authorization: `Bearer ${token}` } });
                 if (!response.ok) { if (response.status === 401) localStorage.removeItem("spotify_access_token"); throw new Error('Failed to fetch top songs');}
                 const data = await response.json();
                 const tracks = (data.items || []).map((track, index) => ({
                     id: track.id || index,
                     title: track.name,
                     artist: track.artists[0]?.name || "Unknown Artist",
                     cover: track.album?.images[0]?.url || "/default-cover.jpg",
                     uri: track.uri,
                 }));
                 setTopSongs(shuffleArray(tracks).slice(0, 5)); // Shuffle and take 5
                 setErrors(prev => ({ ...prev, top: null }));
             } catch (error) {
                 console.error("Top Songs Error:", error);
                 setErrors(prev => ({ ...prev, top: error.message }));
                 setTopSongs([]);
             } finally {
                 setLoading(prev => ({ ...prev, top: false }));
             }
         };
        fetchTopSongs();
    }, [token]); // Re-fetch if token changes

    useEffect(() => {
        const fetchTrending = async () => {
            if (!token) { setLoading(prev => ({...prev, trending: false})); setErrors(prev => ({...prev, trending: "No Spotify access token"})); return; }
            const PLAYLIST_ID = "4JZFUSM0jb3RauYuRPIUp8"; // Make sure this ID is correct
            setLoading(prev => ({ ...prev, trending: true }));
            try {
                const response = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok) throw new Error('Failed to fetch trending playlist');
                const data = await response.json();
                 const tracks = (data.items || [])
                     .filter(item => item.track?.id) // Ensure track exists
                     .map((item, index) => ({
                         id: item.track.id,
                         title: item.track.name || "Unknown Track",
                         artist: item.track.artists[0]?.name || "Unknown Artist",
                         cover: item.track.album?.images[0]?.url || "/default-cover.jpg",
                         uri: item.track.uri,
                     }));
                 setTrendingSongs(shuffleArray(tracks).slice(0, 5)); // Shuffle and take 5
                 setErrors(prev => ({ ...prev, trending: null }));
            } catch (error) {
                console.error("Trending Songs Error:", error);
                setErrors(prev => ({ ...prev, trending: error.message }));
                setTrendingSongs([]);
            } finally {
                setLoading(prev => ({ ...prev, trending: false }));
            }
        };
        fetchTrending();
    }, [token]); // Re-fetch if token changes

    useEffect(() => {
        const fetchNewReleases = async () => {
            if (!token) { setLoading(prev => ({...prev, newReleases: false})); setErrors(prev => ({...prev, newReleases: "No Spotify access token"})); return; }
            const PLAYLIST_ID = "11LHekHg08Cj88KKtuOx0z"; // Make sure this ID is correct
            setLoading(prev => ({ ...prev, newReleases: true }));
             try {
                 const response = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?market=US&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
                 if (!response.ok) throw new Error('Failed to fetch random mix playlist');
                 const data = await response.json();
                 const tracks = (data.items || [])
                     .filter(item => item.track?.uri?.startsWith('spotify:track:'))
                     .map(item => item.track);
                 const randomTracks = shuffleArray(tracks).slice(0, 3); // Shuffle and take 3
                  const formattedReleases = randomTracks.map((track, index) => ({
                     id: track.id || `track-${index}`,
                     title: track.name,
                     artist: track.artists[0]?.name || "Unknown Artist",
                     cover: track.album?.images[0]?.url || "/default-cover.jpg",
                     uri: track.uri,
                     release_date: track.album?.release_date
                 }));
                 setNewReleases(formattedReleases);
                 setErrors(prev => ({ ...prev, newReleases: null }));
             } catch (error) {
                 console.error("New Releases/Random Mix Error:", error);
                 setErrors(prev => ({ ...prev, newReleases: error.message }));
                 setNewReleases([]);
             } finally {
                 setLoading(prev => ({ ...prev, newReleases: false }));
             }
        };
        fetchNewReleases();
    }, [token, refreshTrigger]); // Re-fetch on token change or manual refresh

    // --- Child Components ---

    // Song Card Component
    const SongCard = ({ song, onPlayClick }) => {
        const [showMenu, setShowMenu] = useState(false);
        const isLiked = likedTracks.has(song.uri);

        const handleLikeClick = () => {
            if (song.uri) handleTrackLike(song.uri, !isLiked);
            setShowMenu(false);
        };

        const handleAddToPlaylistClick = async (playlist) => {
             if (!song.uri || !playlist) return;
             try {
                 await handleAddToPlaylist(playlist, song.uri, song.title, song.artist);
                 setShowMenu(false);
                 navigate(`/playlist/${playlist.spotifyId}`);
             } catch (error) {
                 console.error('Error adding to playlist from card:', error);
                 alert(`Failed to add to playlist: ${error.message}`);
                 setShowMenu(false);
             }
        };

        return (
            <div className="song-card">
                <div className="song-card-image-container">
                    <img src={song.cover || '/default-cover.jpg'} alt={song.title || 'Song cover'} className="song-card-image" />
                    <div className="song-card-overlay">
                        <button className="song-play-btn" onClick={() => onPlayClick(song)}>
                            <Play size={20} />
                        </button>
                        <div className="song-controls">
                            <div className="menu-container">
                                <button className="menu-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
                                    <MoreVertical size={20} />
                                </button>
                                {showMenu && (
                                    <div className="dropdown-menu">
                                        <button className="menu-item" onClick={handleLikeClick} disabled={!song.uri}>
                                            {isLiked ? 'Remove from Liked' : 'Add to Liked Songs'}
                                        </button>
                                        <div className="submenu">
                                            <div className="submenu-header">Add to Playlist</div>
                                            {Array.isArray(userPlaylists) && userPlaylists.map((pl) => (
                                                <button
                                                    key={pl._id || pl.spotifyId}
                                                    onClick={(e) => { e.stopPropagation(); handleAddToPlaylistClick(pl); }}
                                                    className="playlist-link-button"
                                                >
                                                    {pl.name}
                                                </button>
                                            ))}
                                            {userPlaylists?.length === 0 && <span className="no-playlists-msg">No playlists yet</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="song-card-info">
                    <h3>{song.title || 'Unknown Title'}</h3>
                    <p>{song.artist || 'Unknown Artist'}</p>
                    {song.release_date && (
                        <p className="release-date">
                            Released: {new Date(song.release_date).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // Render Search Results Component
    const RenderSearchResults = () => {
        if (!showSearchResults) return null;

        return (
            <div className="search-results-container">
                <div className="search-results">
                    {isSearching ? (
                        <div className="search-loading"><div className="spinner-small"></div> Loading...</div>
                    ) : searchResults && (searchResults.tracks?.items?.length > 0 || searchResults.artists?.items?.length > 0 || searchResults.albums?.items?.length > 0) ? (
                        <>
                            {/* Tracks */}
                            {searchResults.tracks?.items.length > 0 && (
                                <div className="search-category">
                                    <h3>Songs</h3>
                                    {searchResults.tracks.items.map(track => (
                                        <div key={track.id} className="search-item"
                                            onClick={() => {
                                                handlePlayTrack({ uri: track.uri, title: track.name, artist: track.artists[0]?.name, cover: track.album?.images?.[0]?.url });
                                                setShowSearchResults(false); // Hide on click
                                            }}>
                                            <img src={track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '/default-cover.jpg'} alt="Track" />
                                            <div className="search-item-info">
                                                <span className="search-item-title">{track.name}</span>
                                                <span className="search-item-artist">{track.artists.map(a => a.name).join(', ')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Artists */}
                            {searchResults.artists?.items.length > 0 && (
                                <div className="search-category">
                                    <h3>Artists</h3>
                                    {searchResults.artists.items.map(artist => (
                                         <div key={artist.id} className="search-item" onClick={() => { /* TODO: Navigate to artist page? */ setShowSearchResults(false); }}>
                                            <img src={artist.images?.[2]?.url || artist.images?.[0]?.url || '/default-artist.png'} alt="Artist" />
                                            <div className="search-item-info">
                                                <span className="search-item-title">{artist.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Albums */}
                            {searchResults.albums?.items.length > 0 && (
                                <div className="search-category">
                                    <h3>Albums</h3>
                                    {searchResults.albums.items.map(album => (
                                        <div key={album.id} className="search-item" onClick={() => { /* TODO: Navigate to album page? */ setShowSearchResults(false); }}>
                                            <img src={album.images?.[2]?.url || album.images?.[0]?.url || '/default-cover.jpg'} alt="Album" />
                                            <div className="search-item-info">
                                                <span className="search-item-title">{album.name}</span>
                                                <span className="search-item-artist">{album.artists.map(a => a.name).join(', ')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        searchQuery.trim() && <div className="search-no-results">No results found for "{searchQuery}"</div>
                    )}
                </div>
            </div>
        );
    };


    // --- Loading and Error States ---
    if (loading.top || loading.trending || loading.newReleases) {
        return (
            <div data-testid="loading-spinner" className="loading-container">
                <div className="spinner"></div>
                <p>Loading music data...</p>
            </div>
        );
    }
    // Only check major errors *after* initial loading is done
    const majorError = !loading.top && errors.top || !loading.trending && errors.trending || !loading.newReleases && errors.newReleases;
    if (majorError) {
         // You might want a less intrusive error display, e.g., within the affected section
        console.error("Major data loading error:", majorError);
        // Example: Display a general error but still try to render the rest
        // return ( <div className="error-container"> ... general error message ... </div> )
        // For now, let's show the full error page as before
        return (
            <div className="error-container">
                <h3>Error Loading Dashboard Content</h3>
                <p>{majorError instanceof Error ? majorError.message : String(majorError)}</p>
                <button onClick={() => window.location.reload()} className="retry-btn"> Try Again </button>
            </div>
        );
    }

    // --- Main Component JSX ---
    return (
        <div className="music-dashboard">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="logo">
                    <div className="logo-icon"><span>M</span></div>
                    <h1>MusicHub</h1>
                </div>
                <nav className="main-nav">
                    <ul>
                        <li><a href="#" className="nav-link active"><Home size={20} />Home</a></li>
                        <li><a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); searchInputRef.current?.focus(); }}> <Search size={20} />Search</a></li>
                        <li><Link to="/library" className="nav-link"><Library size={20} />Your Library</Link></li>
                        <li><Link to="/liked-songs" className="nav-link"><Heart size={20} />Liked Songs</Link></li>
                    </ul>
                </nav>
                <div className="playlists-section">
                    <h3>Your Playlists</h3>
                    <div className="playlist-links">
                        {Array.isArray(userPlaylists) && userPlaylists.map(playlist => (
                            <Link key={playlist.spotifyId || playlist._id} to={`/playlist/${playlist.spotifyId}`} className="user-playlist-link"> {playlist.name} </Link>
                        ))}
                        <button data-testid="create-new-button" onClick={() => setShowCreateModal(true)} className="create-playlist"> <Plus size={16} />Create New </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {/* Top Bar */}
                <div className="top-bar">
                    <div className="search-container" ref={searchContainerRef}>
                        <div className="search-group">
                            <div className="search-input-wrapper">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    data-testid="search-input"
                                    placeholder="Search songs, artists, albums..."
                                    className="search-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => { if (searchQuery.trim() && searchResults) { setShowSearchResults(true); } }}
                                />
                                <Search size={20} className="search-icon" />
                                {searchQuery && (
                                    <button className="clear-search-btn" onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchResults(false); }}>
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                            <Link to="/recommendations">
                                <button className="recommendation-btn"> <Plus size={18} /> <span>Get Recommendations</span> </button>
                            </Link>
                        </div>
                        <RenderSearchResults />
                    </div>

                    <div className="user-controls" ref={userMenuRef}>
                        <div className="user-profile-menu">
                            <span className="welcome-message">
                                Welcome {currentUser?.display_name?.split(' ')[0] || 'User'}
                            </span>
                            <button className="menu-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
                                <MoreVertical size={20} />
                            </button>
                            {showUserMenu && (
                                <div className="user-menu-dropdown">
                                    <Link to="/stats" className="menu-item" onClick={() => setShowUserMenu(false)}> Stats </Link>
                                    <button className="menu-item" onClick={handleLogout}> Logout </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Create Playlist Modal */}
                <CreatePlaylistModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreatePlaylist}
                />

                {/* Content Sections */}
                <div className="greeting">
                    <h1>Hello{currentUser?.display_name ? `, ${currentUser.display_name.split(' ')[0]}` : ''}</h1>
                    <p>Discover new music just for you</p>
                </div>

                {/* --- RESTORED Featured Section --- */}
                <div className="featured-section">
                    <div className="featured-grid">
                        <div className="featured-main">
                            {/* Use a real image URL or keep placeholder */}
                            <img src="/api/placeholder/800/500" alt="Featured" />
                            <div className="featured-content">
                                <div className="featured-info">
                                    <div className="featured-label">
                                        <Calendar size={16} /><span>Viral Tracks</span>
                                    </div>
                                    <h2>Weekly Discoveries</h2>
                                    <p>Rising Tracks</p>
                                    {/* Make button functional if desired */}
                                    <button className="featured-btn" onClick={() => navigate('/new-releases')}>Listen Now</button>
                                </div>
                            </div>
                        </div>
                        <div className="featured-secondary">
                            <div>
                                <h3>Made For You</h3>
                                <p>Your daily mix based on listening habits</p>
                            </div>
                             {/* Make button functional if desired */}
                            <button className="explore-btn"
                            onClick={()=>navigate('/recommendations-main')}>Explore</button>
                        </div>
                    </div>
                </div>
                {/* --- End RESTORED Featured Section --- */}


                {/* Trending Songs Section */}
                <div className="music-section">
                    <div className="section-header">
                        <h2>Trending Now</h2>
                        <a href="#" className="see-all">See All</a>
                    </div>
                    <div className="trending-grid">
                        {trendingSongs.map(song => (
                            <SongCard key={'trending-' + song.id} song={song} onPlayClick={handlePlayTrack} /> // Added prefix to key for potential collision avoidance
                        ))}
                        {trendingSongs.length === 0 && !loading.trending && <p>No trending songs found.</p>}
                         {errors.trending && <p className="section-error">Could not load trending songs.</p>} {/* Show error within section */}
                    </div>
                </div>

                {/* User's Top Songs Section */}
                <div className="music-section">
                    <div className="section-header">
                        <h2>Your Top Songs</h2>
                        <a href="#" className="see-all">See All</a>
                    </div>
                    <div className="top-songs-grid">
                        {topSongs.map(song => (
                            <SongCard key={'top-' + song.id} song={song} onPlayClick={handlePlayTrack} /> // Added prefix to key
                        ))}
                         {topSongs.length === 0 && !loading.top && <p>Could not load top songs.</p>}
                         {errors.top && <p className="section-error">Could not load top songs.</p>} {/* Show error within section */}
                    </div>
                </div>

                {/* Random Mix / New Releases Section */}
                <div className="music-section">
                    <div className="section-header">
                        <h2>Random Mix</h2>
                        <div className="header-controls">
                            <button onClick={() => setRefreshTrigger(prev => prev + 1)} className="refresh-btn"> Refresh Songs </button>
                            <a href="#" className="see-all">See All</a>
                        </div>
                    </div>
                    <div className="new-releases-grid">
                        {newReleases.map(song => (
                            <SongCard key={'release-' + song.id} song={song} onPlayClick={handlePlayTrack} /> // Added prefix to key
                        ))}
                         {newReleases.length === 0 && !loading.newReleases && <p>Could not load random mix.</p>}
                         {errors.newReleases && <p className="section-error">Could not load random mix.</p>} {/* Show error within section */}
                    </div>
                </div>

            </div> {/* End main-content */}
        </div> // End music-dashboard1
    );
};

export default MusicDashboard;