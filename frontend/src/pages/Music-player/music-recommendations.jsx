import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { MusicContext } from '../../App';
import { ChevronLeft, Play, Heart, Sliders, MapPin, Music, Calendar, Clock, Sparkles, Disc, PieChart, Smile, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../Components/recommendations.css';

const MusicRecommendations = () => {
  const {
    handleTrackLike,
    handlePlayTrack,
    likedTracks,
  } = useContext(MusicContext);

  // States for recommendation parameters
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMood, setSelectedMood] = useState('energetic');
  const [selectedLocation, setSelectedLocation] = useState('global');
  const [audioFeatures, setAudioFeatures] = useState({
    acousticness: 0.5,
    danceability: 0.5,
    energy: 0.5,
    tempo: 0.5
  });

  // States for recommendation results
  const [moodRecommendations, setMoodRecommendations] = useState([]);
  const [locationRecommendations, setLocationRecommendations] = useState([]);
  const [genreRecommendations, setGenreRecommendations] = useState([]);
  const [featureRecommendations, setFeatureRecommendations] = useState([]);
  const [timeBasedRecommendations, setTimeBasedRecommendations] = useState([]);
  const [popularNowRecommendations, setPopularNowRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const moods = [
    { id: 'energetic', name: 'Energetic', icon: '⚡', color: '#FF5722' },
    { id: 'chill', name: 'Chill', icon: '🌊', color: '#03A9F4' },
    { id: 'happy', name: 'Happy', icon: '😄', color: '#FFEB3B' },
    { id: 'sad', name: 'Sad', icon: '😢', color: '#9C27B0' },
    { id: 'focused', name: 'Focused', icon: '🎯', color: '#4CAF50' },
    { id: 'romantic', name: 'Romantic', icon: '❤️', color: '#E91E63' }
  ];

  const locations = [
    { id: 'global', name: 'Global' },
    { id: 'usa', name: 'United States' },
    { id: 'uk', name: 'United Kingdom' },
    { id: 'korea', name: 'South Korea' },
    { id: 'india', name: 'India' },
    { id: 'brazil', name: 'Brazil' },
    { id: 'japan', name: 'Japan' },
    { id: 'spain', name: 'Spain' }
  ];

  const genres = [
    'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Classical', 'Electronic', 
    'Country', 'Latin', 'Metal', 'Alternative', 'Folk', 'Blues', 'Reggae', 'K-Pop'
  ];

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else if (selectedGenres.length < 5) {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  // Fetch recommendations based on mood
  useEffect(() => {
    const fetchMoodRecommendations = async () => {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) return;

        // Map moods to Spotify parameters
        const moodParams = {
          energetic: { min_energy: 0.8, min_tempo: 120, target_valence: 0.8 },
          chill: { max_energy: 0.4, max_tempo: 100, target_valence: 0.5 },
          happy: { min_valence: 0.7, target_energy: 0.6 },
          sad: { max_valence: 0.4, target_energy: 0.4 },
          focused: { target_instrumentalness: 0.5, max_energy: 0.6 },
          romantic: { target_acousticness: 0.6, target_valence: 0.6, max_tempo: 110 }
        };

        const params = moodParams[selectedMood];
        const searchParams = new URLSearchParams({
          limit: 5,
          seed_genres: 'pop,rock,hip-hop',
          ...params
        });

        const response = await fetch(
          `https://api.spotify.com/v1/recommendations?${searchParams}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        
        if (data.tracks) {
          setMoodRecommendations(data.tracks.map(formatTrack));
        }
      } catch (error) {
        console.error("Error fetching mood recommendations:", error);
      }
    };

    fetchMoodRecommendations();
  }, [selectedMood]);

  // Fetch recommendations based on location
  useEffect(() => {
    const fetchLocationRecommendations = async () => {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) return;

        // Map locations to playlist IDs (these would be your curated playlists)
        const locationPlaylists = {
          global: '37i9dQZEVXbMDoHDwVN2tF', // Global Top 50
          usa: '37i9dQZEVXbLRQDuF5jeBp',    // US Top 50
          uk: '37i9dQZEVXbLnolsZ8PSNw',     // UK Top 50
          korea: '37i9dQZEVXbNxXF4SkHj9F',  // K-Pop Daebak
          india: '37i9dQZEVXbLZ52XmnySJg',  // Top Hits India
          brazil: '37i9dQZEVXbMXbN3EUUhlg', // Top Brazil
          japan: '37i9dQZEVXbKXQ4mDTEBXq',  // Top Japan
          spain: '37i9dQZEVXbNFJfN1Vw8d9'   // Top Spain
        };

        const playlistId = locationPlaylists[selectedLocation];
        
        const response = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        
        if (data.items) {
          setLocationRecommendations(data.items.map(item => formatTrack(item.track)));
        }
      } catch (error) {
        console.error("Error fetching location recommendations:", error);
      }
    };

    fetchLocationRecommendations();
  }, [selectedLocation]);

  // Fetch recommendations based on genres
  useEffect(() => {
    const fetchGenreRecommendations = async () => {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (!token || selectedGenres.length === 0) return;

        const seedGenres = selectedGenres.slice(0, 5).map(g => g.toLowerCase()).join(',');
        
        const response = await fetch(
          `https://api.spotify.com/v1/recommendations?limit=5&seed_genres=${seedGenres}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        
        if (data.tracks) {
          setGenreRecommendations(data.tracks.map(formatTrack));
        }
      } catch (error) {
        console.error("Error fetching genre recommendations:", error);
      }
    };

    if (selectedGenres.length > 0) {
      fetchGenreRecommendations();
    }
  }, [selectedGenres]);

  // Fetch recommendations based on audio features
  useEffect(() => {
    const fetchFeatureRecommendations = async () => {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) return;

        const params = new URLSearchParams({
          limit: 5,
          seed_genres: 'pop,rock,hip-hop,electronic,r-n-b',
          target_acousticness: audioFeatures.acousticness,
          target_danceability: audioFeatures.danceability,
          target_energy: audioFeatures.energy,
          target_tempo: 70 + (audioFeatures.tempo * 130) // Map 0-1 to 70-200 BPM
        });
        
        const response = await fetch(
          `https://api.spotify.com/v1/recommendations?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        
        if (data.tracks) {
          setFeatureRecommendations(data.tracks.map(formatTrack));
        }
      } catch (error) {
        console.error("Error fetching feature recommendations:", error);
      }
    };

    fetchFeatureRecommendations();
  }, [audioFeatures]);

  // Fetch time-based recommendations (morning/afternoon/evening)
  useEffect(() => {
    const fetchTimeBasedRecommendations = async () => {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) return;

        // Get current hour and determine the appropriate playlist
        const hour = new Date().getHours();
        let playlistId;
        
        if (hour < 12) {
          playlistId = '37i9dQZF1DX6nz6I0JrBvV'; // Morning Motivation
        } else if (hour < 18) {
          playlistId = '37i9dQZF1DX7KNKjOK0o75'; // Afternoon Acoustic 
        } else {
          playlistId = '37i9dQZF1DX4E3UdUs7fUx'; // Evening Chill
        }
        
        const response = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        
        if (data.items) {
          setTimeBasedRecommendations(data.items.map(item => formatTrack(item.track)));
        }
      } catch (error) {
        console.error("Error fetching time-based recommendations:", error);
      }
    };

    fetchTimeBasedRecommendations();
  }, []);

  // Fetch popular now recommendations
  useEffect(() => {
    const fetchPopularNow = async () => {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) return;
        
        const response = await fetch(
          `https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks?limit=5`, // Global Top 50
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        
        if (data.items) {
          setPopularNowRecommendations(data.items.map(item => formatTrack(item.track)));
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching popular now:", error);
        setLoading(false);
      }
    };

    fetchPopularNow();
  }, []);

  // Helper function to format track data
  const formatTrack = (track) => {
    if (!track) return null;
    return {
      id: track.id,
      title: track.name,
      artist: track.artists?.[0]?.name || "Unknown Artist",
      cover: track.album?.images?.[0]?.url || "/default-cover.jpg",
      uri: track.uri
    };
  };

  // Song card component
  const SongCard = ({ song }) => {
    if (!song) return null;
    const isLiked = likedTracks.has(song.uri);
    
    return (
      <div className="rec-song-card">
        <div className="rec-song-image">
          <img src={song.cover} alt={song.title} />
          <div className="rec-song-overlay">
            <button 
              className="rec-play-btn"
              onClick={() => handlePlayTrack(song)}
            >
              <Play size={16} />
            </button>
          </div>
        </div>
        <div className="rec-song-info">
          <h3 className="rec-song-title">{song.title}</h3>
          <p className="rec-song-artist">{song.artist}</p>
        </div>
        <button 
          className={`rec-like-btn ${isLiked ? 'liked' : ''}`}
          onClick={() => handleTrackLike(song.uri, !isLiked)}
        >
          <Heart size={18} fill={isLiked ? '#1db954' : 'none'} />
        </button>
      </div>
    );
  };

  // Recommendation section component
  const RecommendationSection = ({ title, icon, tracks, description }) => {
    if (!tracks || tracks.length === 0) return null;
    
    return (
      <div className="rec-section">
        <div className="rec-section-header">
          <div className="rec-section-title">
            {icon}
            <h2>{title}</h2>
          </div>
          <p className="rec-section-description">{description}</p>
        </div>
        <div className="rec-tracks-container">
          {tracks.map(track => (
            <SongCard key={track.id} song={track} />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="recommendations-loading">
        <div className="rec-spinner"></div>
        <p>Discovering perfect music for you...</p>
      </div>
    );
  }


  return (
    <div className="recommendations-page">
      <div className="rec-header">
        <Link to="/" className="rec-back-btn">
          <ChevronLeft size={20} />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="rec-page-title">Discover Your Perfect Mix</h1>
        <p className="rec-subtitle">Personalized recommendations based on your preferences</p>
      </div>

      <div className="rec-controls-container">
        {/* Mood Selector */}
        <div className="rec-control-section mood-selector">
          <div className="rec-section-header">
            <Smile size={20} />
            <h3>Select Mood</h3>
          </div>
          <div className="mood-buttons">
            {moods.map(mood => (
              <button
                key={mood.id}
                className={`mood-btn ${selectedMood === mood.id ? 'selected' : ''}`}
                onClick={() => setSelectedMood(mood.id)}
                style={{ '--mood-color': mood.color }}
              >
                <span className="mood-emoji">{mood.icon}</span>
                {mood.name}
              </button>
            ))}
          </div>
        </div>

        {/* Location Selector */}
        <div className="rec-control-section location-selector">
          <div className="rec-section-header">
            <MapPin size={20} />
            <h3>Select Region</h3>
          </div>
          <div className="location-grid">
            {locations.map(location => (
              <div
                key={location.id}
                className={`location-card ${selectedLocation === location.id ? 'selected' : ''}`}
                onClick={() => setSelectedLocation(location.id)}
              >
                <div className="location-content">
                  <span className="location-flag">{getFlagEmoji(location.id)}</span>
                  <span className="location-name">{location.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Genre Selector */}
        <div className="rec-control-section genre-selector">
          <div className="rec-section-header">
            <Music size={20} />
            <h3>Select Genres (max 5)</h3>
          </div>
          <div className="genre-chips">
            {genres.map(genre => (
              <button
                key={genre}
                className={`genre-chip ${selectedGenres.includes(genre) ? 'selected' : ''}`}
                onClick={() => toggleGenre(genre)}
                disabled={!selectedGenres.includes(genre) && selectedGenres.length >= 5}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Features Controls */}
        <div className="rec-control-section audio-features">
          <div className="rec-section-header">
            <Sliders size={20} />
            <h3>Audio Features Mixer</h3>
          </div>
          <div className="feature-sliders">
            {Object.entries(audioFeatures).map(([feature, value]) => (
              <div key={feature} className="slider-container">
                <label>{feature.charAt(0).toUpperCase() + feature.slice(1)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={e => setAudioFeatures(prev => ({
                    ...prev,
                    [feature]: parseFloat(e.target.value)
                  }))}
                />
                <div className="slider-labels">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations Display */}
      <div className="recommendations-grid">
        <RecommendationSection
          title="Mood-Based Tracks"
          icon={<Sparkles size={20} />}
          tracks={moodRecommendations}
          description={`Perfect for your ${moods.find(m => m.id === selectedMood)?.name.toLowerCase()} mood`}
        />

        <RecommendationSection
          title="Regional Hits"
          icon={<MapPin size={20} />}
          tracks={locationRecommendations}
          description={`Popular in ${locations.find(l => l.id === selectedLocation)?.name}`}
        />

        <RecommendationSection
          title="Genre Mix"
          icon={<Music size={20} />}
          tracks={genreRecommendations}
          description={`Blend of ${selectedGenres.slice(0, 3).join(', ')}`}
        />

        <RecommendationSection
          title="Audio Feature Mix"
          icon={<PieChart size={20} />}
          tracks={featureRecommendations}
          description="Custom sound profile based on your preferences"
        />

        <RecommendationSection
          title="Time-Based Picks"
          icon={<Clock size={20} />}
          tracks={timeBasedRecommendations}
          description={`Perfect for this ${getTimeOfDay()} time`}
        />

        <RecommendationSection
          title="Global Chart Toppers"
          icon={<Disc size={20} />}
          tracks={popularNowRecommendations}
          description="What the world is listening to right now"
        />
      </div>
    </div>
  );
};

// Helper function for country flags
const getFlagEmoji = (countryCode) => {
  const codePoints = countryCode.toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

// Helper function to get time of day
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

export default MusicRecommendations;