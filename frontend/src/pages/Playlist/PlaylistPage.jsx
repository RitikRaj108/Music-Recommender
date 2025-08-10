import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shuffle, Search, Play, ArrowLeft, Clock, MoreVertical } from 'lucide-react';
import '../../Components/likedSongs.css';
import { MusicContext } from '../../App';

const PlaylistPage = () => {
  const { playlistId } = useParams();
  const {
    handleRemoveFromPlaylist,
    handlePlayTrack,
    player
  } = useContext(MusicContext);

  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);
  const [playlistInfo, setPlaylistInfo] = useState(null);

  const fetchPlaylistData = async () => {
    const token = localStorage.getItem("spotify_access_token");
    
    try {
      // Fetch playlist details
      const playlistRes = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const playlistData = await playlistRes.json();
      setPlaylistInfo({
        name: playlistData.name,
        description: playlistData.description,
        image: playlistData.images[0]?.url
      });

      // Fetch tracks
      const tracksRes = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const tracksData = await tracksRes.json();
      
      setTracks(tracksData.items.map(item => ({
        ...item.track,
        added_at: item.added_at
      })));
    } catch (error) {
      console.error('Error fetching playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    fetchPlaylistData();
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [playlistId]);

  const handleShufflePlay = () => {
    const shuffled = [...tracks].sort(() => 0.5 - Math.random());
    handlePlayTrack(shuffled[0]);
  };

  const filteredTracks = tracks.filter(track =>
    track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (track.artists[0]?.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="liked-songs-container">
      <div className="liked-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={24} />
        </button>
        <h1>{playlistInfo?.name || 'Playlist'}</h1>
        <div className="header-controls">
          <button className="shuffle-btn" onClick={handleShufflePlay}>
            <Shuffle size={20} /> Shuffle Play
          </button>
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search in playlist"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tracks-list">
        <div className="list-header">
          <span>#</span>
          <span>Title</span>
          <span>Artist</span>
          <span className="duration"><Clock size={16} /></span>
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
                <span className="track-artist">{track.artists[0]?.name}</span>
              </div>
            </div>
            <div className="track-controls">
              <span className="track-duration">
                {Math.floor(track.duration_ms / 60000)}:
                {(Math.floor(track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}
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
                          await handleRemoveFromPlaylist(playlistId, track.uri);
                          await fetchPlaylistData();
                        } catch (error) {
                          console.error('Failed to remove track:', error);
                        }
                        setMenuOpenId(null);
                      }}
                    >
                      Remove from Playlist
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistPage;