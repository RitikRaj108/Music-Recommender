import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, Search, Play, ArrowLeft, Clock, MoreVertical } from 'lucide-react';
import '../../Components/likedSongs.css';
import { MusicContext } from '../../App';

const LikedSongs = () => {
  const {
    musichubPlaylistId,
    setMusichubPlaylistId,
    likedTracks,
    setLikedTracks,
    handleTrackLike,
    handlePlayTrack,
    deviceId,
    playerStatus,
    player
  } = useContext(MusicContext);

  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  const fetchLikedSongs = async () => {
    const token = localStorage.getItem("spotify_access_token");
    const playlistId = localStorage.getItem('musichub_playlist_id');
    
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setTracks(data.items.map(item => ({
        ...item.track,
        added_at: item.added_at
      })));
    } catch (error) {
      console.error('Error fetching liked songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Click outside handler for the menu
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    fetchLikedSongs();
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleShufflePlay = () => {
    const shuffled = [...tracks].sort(() => 0.5 - Math.random());
    handlePlayTrack(shuffled[0]);
  };

  const filteredTracks = tracks.filter(track =>
    track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artists[0].name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="liked-songs-container">
      <div className="liked-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={24} />
        </button>
        <h1>Liked Songs</h1>
        <div className="header-controls">
          <button className="shuffle-btn" onClick={handleShufflePlay}>
            <Shuffle size={20} /> Shuffle Play
          </button>
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search in liked songs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <p>Loading...</p>}

      {/* Empty state fallback */}
      {!isLoading && filteredTracks.length === 0 && <p>No track playing</p>}

      {/* Tracks list */}
      {filteredTracks.length > 0 && (
        <div className="tracks-list">
          <div className="list-header">
            <span>S.no</span>
            <span>Title</span>
            <span>Release Date</span>
            <span className="duration">
              <Clock size={16} />
            </span>
          </div>
          {filteredTracks.map((track, index) => (
            <div key={track.id} className="track-item">
              <span className="track-number">{index + 1}</span>
              <div className="track-info">
                <div className="track-image-container">
                  <img src={track.album.images[0]?.url} alt="Album cover" />
                  <div 
                    className="play-overlay"
                    onClick={() => handlePlayTrack(track)}
                  >
                    <Play size={24} />
                  </div>
                </div>
                <div className="track-details">
                  <span className="track-name">{track.name}</span>
                  <span className="track-artist">{track.artists[0].name}</span>
                </div>
              </div>
              <span className="track-added">
                {new Date(track.added_at).toLocaleDateString()}
              </span>
              <div className="track-controls">
                <span className="track-duration">
                  {Math.floor(track.duration_ms / 60000)}:
                  {(Math.floor(track.duration_ms % 60000) / 1000)
                    .toFixed(0)
                    .padStart(2, '0')}
                </span>
                <div className="menu-container" ref={menuRef}>
                  <button 
                    className="menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === track.id ? null : track.id);
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuOpenId === track.id && (
                    <div className="dropdown-menu">
                      <button 
                        className="menu-item"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await handleTrackLike(track.uri, false);
                            // Refresh the list after successful removal
                            await fetchLikedSongs();
                          } catch (error) {
                            console.error('Failed to remove track:', error);
                          }
                          setMenuOpenId(null);
                        }}
                      >
                        Remove from Liked Songs
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedSongs;
