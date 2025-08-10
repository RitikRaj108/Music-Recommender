import React, { useState, useContext, useCallback, useEffect } from 'react';
import { MusicContext } from '../../App'; // Adjust path
import { ChevronLeft, Play, Heart, Music, User, Tag, Clock, MapPin, Smile, Search, Loader, AlertCircle, List, RefreshCw, Sparkles } from 'lucide-react'; // Added Sparkles
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import '../../Components/recommendationsv2.css'; // Adjust path

// Import API helpers from api.js
import {
  processLastFmTracksToSpotify,
  getLastFmSimilarTracks,
  getArtistTopTracks,
  getSimilarArtists,
  getLastFmTagTopTracks,
  getLastFmGeoTopTracks,
  getLastFmTopTags,
  selectRandomTracksForProcessing
} from '../../api'; // Adjust path

// --- Helper: Shuffle Array ---
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// --- Helper Components ---
const SongCard = ({ song, onPlay, onLike, isLiked, likeDisabled }) => ( // Added likeDisabled prop
  <div className="rec-song-card-v2">
    <div className="rec-song-image-v2">
      <img src={song.cover} alt={song.title} onError={(e) => e.target.src = '/default-cover.jpg'} />
      <div className="rec-song-overlay-v2">
        <button className="rec-play-btn-v2" onClick={() => onPlay(song)} aria-label={`Play ${song.title}`}>
          <Play size={18} fill="currentColor" />
        </button>
      </div>
    </div>
    <div className="rec-song-info-v2">
      <h4 className="rec-song-title-v2" title={song.title}>{song.title}</h4>
      <p className="rec-song-artist-v2" title={song.artist}>{song.artist}</p>
    </div>
    <button
      className={`rec-like-btn-v2 ${isLiked ? 'liked' : ''}`}
      onClick={() => !likeDisabled && onLike(song.uri, !isLiked)} // Check disabled state
      aria-label={isLiked ? `Unlike ${song.title}` : `Like ${song.title}`}
      disabled={likeDisabled} // Apply disabled attribute
      title={likeDisabled ? "Like function initializing..." : (isLiked ? 'Unlike' : 'Like')} // Tooltip
    >
      <Heart size={16} fill={isLiked ? 'var(--primary-color, var(--spotify-green))' : 'none'} />
    </button>
  </div>
);

const RecommendationBox = ({ title, icon, children, results, loading, error, onRetry }) => (
  <div className="rec-box">
    <div className="rec-box-header">
      {React.cloneElement(icon, { 'aria-hidden': true })}
      <h3>{title}</h3>
    </div>
    <div className="rec-box-content">
      {children} {/* Content like inputs or buttons go here */}
    </div>
    {/* Results section only shown if 'results' prop is provided (can be empty array) */}
    {results !== undefined && (
      <div className="rec-box-results" aria-live="polite">
        {loading && <div className="rec-box-loader"><Loader className="spin" size={24} aria-hidden="true" /> Fetching...</div>}
        {error && !loading && (
          <div className="rec-box-error">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
            {onRetry && <button onClick={onRetry} className="rec-retry-btn">Retry</button>}
          </div>
        )}
        {/* Show "No recommendations" only if not loading, no error, and results array is empty */}
        {!loading && !error && Array.isArray(results) && results.length === 0 && <p className="rec-no-results">No recommendations found.</p>}
        {!loading && !error && Array.isArray(results) && results.length > 0 && (
          <div className="rec-tracks-grid">
            {results.map(track => (
              // Pass musichubPlaylistId check result down
              <ConnectedSongCard key={track.id || track.uri} song={track} />
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);


const ConnectedSongCard = React.memo(({ song }) => {
    // Get musichubPlaylistId here to determine if liking is enabled
    const { handlePlayTrack, handleTrackLike, likedTracks, musichubPlaylistId } = useContext(MusicContext);
    if (!song || !song.uri) return null;
    const isLiked = likedTracks?.has(song.uri) ?? false;
    const canLike = !!musichubPlaylistId; // Check if ID is available

    return <SongCard
        song={song}
        onPlay={handlePlayTrack}
        onLike={handleTrackLike}
        isLiked={isLiked}
        likeDisabled={!canLike} // Pass disabled state to SongCard
    />;
});


// --- MAPPINGS ---
const moodTagMappings = {
  happy: ['pop', 'dance', 'upbeat', 'happy', 'summer', '80s', 'party', 'electronic', 'House', 'funk', 'disco', 'seen live'],
  sad: ['sad', 'melancholy', 'acoustic', 'singer-songwriter', 'ambient', 'folk', 'blues', 'slow', 'emo', 'Classical', 'chillout', 'instrumental'],
  chill: ['chillout', 'ambient', 'electronic', 'instrumental', 'jazz', 'soul', 'acoustic', 'relaxing', 'downtempo', 'lo-fi', 'folk', 'post-rock'],
  energetic: ['rock', 'metal', 'punk', 'hard rock', 'dance', 'electronic', 'techno', 'trance', 'energetic', 'workout', 'metalcore', 'thrash metal', 'hardcore', 'alternative rock', 'heavy metal', 'punk rock', 'industrial'],
  focused: ['focus', 'instrumental', 'ambient', 'Classical', 'electronic', 'post-rock', 'studying', 'minimal techno', 'soundtrack', 'experimental', 'german', 'techno'],
  romantic: ['romantic', 'love', 'soul', 'jazz', 'acoustic', 'singer-songwriter', 'pop', 'ballad', 'rnb', 'blues', 'female vocalists', '80s']
};
const timeTagMappings = {
  morning: ['acoustic', 'folk', 'singer-songwriter', 'indie', 'pop', 'upbeat', 'morning', 'ambient', 'chillout', 'easy listening', 'classic rock', 'soul'],
  afternoon: ['focus', 'instrumental', 'electronic', 'indie rock', 'alternative', 'pop', 'rock', 'studying', 'background music', 'jazz', 'House', 'dance', 'hip hop'],
  evening: ['chill', 'relax', 'jazz', 'soul', 'blues', 'ambient', 'downtempo', 'lounge', 'indie', 'acoustic', 'electronic', 'post-rock', 'singer-songwriter', 'seen live'],
  night: ['night', 'ambient', 'electronic', 'chillout', 'instrumental', 'post-rock', 'Classical', 'dark ambient', 'sleep', 'experimental', 'techno', 'trance', 'jazz', 'blues']
};

// --- Main Component ---
const MusicRecommendationsV2 = () => {
  const { handlePlayTrack, handleTrackLike, likedTracks, musichubPlaylistId } = useContext(MusicContext); // Get ID for disabling like buttons if needed
  const navigate = useNavigate(); // Initialize useNavigate

  // --- State ---
  const [similarSongInput, setSimilarSongInput] = useState('');
  const [similarArtistInput, setSimilarArtistInput] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState(getTimeOfDay());
  const [similarSongResults, setSimilarSongResults] = useState([]);
  const [artistResults, setArtistResults] = useState([]);
  const [moodResults, setMoodResults] = useState([]);
  // No historyResults state needed
  const [tagResults, setTagResults] = useState([]);
  const [timeResults, setTimeResults] = useState([]);
  const [countryResults, setCountryResults] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});
  const [errorStates, setErrorStates] = useState({});
  const [topTags, setTopTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [errorTags, setErrorTags] = useState(null);
  const [showTags, setShowTags] = useState(false);
  const [similarArtistList, setSimilarArtistList] = useState([]);
  const [currentSimilarArtistIndex, setCurrentSimilarArtistIndex] = useState(0);


  // --- State Management Helpers ---
  const setComponentLoading = (key, isLoading) => {
      setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
      if (isLoading) setErrorStates(prev => ({ ...prev, [key]: null }));
  }
  const setComponentError = (key, errorMessage) => {
      const message = (errorMessage instanceof Error) ? errorMessage.message : String(errorMessage || "An unknown error occurred.");
      setErrorStates(prev => ({ ...prev, [key]: message }));
      setLoadingStates(prev => ({ ...prev, [key]: false }));
  }

  // --- Helper Functions ---
   const selectRandomTags = (tags, count) => {
      if (!Array.isArray(tags) || tags.length === 0) return [];
      const shuffled = [...tags];
      shuffleArray(shuffled);
      return shuffled.slice(0, Math.min(count, shuffled.length));
   };
   function getTimeOfDay() {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
   };
    const capitalizeFirstLetter = (string) => {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    };


  // --- Fetch Tracks for ONE Similar Artist ---
  const fetchTracksForSimilarArtist = useCallback(async (similarArtistName) => {
    if (!similarArtistName) return;
    setComponentLoading('artist', true); setArtistResults([]);
    try {
      const lastFmTracks = await getArtistTopTracks(similarArtistName);
      if (lastFmTracks.length === 0) { setArtistResults([]); }
      else {
        const tracksToProcess = selectRandomTracksForProcessing(lastFmTracks, 5, 3);
        const spotifyTracks = await processLastFmTracksToSpotify(tracksToProcess, 5);
        setArtistResults(spotifyTracks);
        if (spotifyTracks.length === 0) { console.warn(`Could not find Spotify tracks for similar artist: ${similarArtistName}`); }
      }
    } catch (error) {
      console.error(`Error fetching tracks for ${similarArtistName}:`, error);
      setComponentError('artist', `Could not load tracks for ${similarArtistName}.`); setArtistResults([]);
    } finally { setComponentLoading('artist', false); }
  }, []);

  // --- Main Fetch Handlers ---

  const fetchSimilarSongs = useCallback(async () => {
    const trackName = similarSongInput.trim(); const artistName = similarArtistInput.trim();
    if (!trackName || !artistName) { setComponentError('similarSongs', 'Please enter both track and artist name.'); return; }
    setComponentLoading('similarSongs', true); setSimilarSongResults([]);
    try {
      const lastFmTracks = await getLastFmSimilarTracks(trackName, artistName);
      if (lastFmTracks.length === 0) { setComponentError('similarSongs', 'No similar tracks found on Last.fm.'); }
      else {
        const tracksToProcess = selectRandomTracksForProcessing(lastFmTracks, 5, 3);
        const spotifyTracks = await processLastFmTracksToSpotify(tracksToProcess, 5);
        setSimilarSongResults(spotifyTracks);
        if (spotifyTracks.length === 0) { setComponentError('similarSongs', 'Found similar tracks, but couldn\'t match on Spotify.'); }
      }
    } catch (error) { setComponentError('similarSongs', error); }
    finally { setComponentLoading('similarSongs', false); }
  }, [similarSongInput, similarArtistInput]);


  const fetchArtistRecommendations = useCallback(async () => {
    const searchArtistName = artistInput.trim();
    if (!searchArtistName) { setComponentError('artist', 'Please enter an artist name.'); return; }
    setComponentLoading('artist', true); setArtistResults([]); setSimilarArtistList([]); setCurrentSimilarArtistIndex(0);
    try {
      const similarArtists = await getSimilarArtists(searchArtistName);
      const validSimilarArtists = similarArtists.filter(a => a?.name);
      setSimilarArtistList(validSimilarArtists);
      if (validSimilarArtists.length === 0) {
        setComponentError('artist', `No similar artists found for "${searchArtistName}" on Last.fm.`);
        setComponentLoading('artist', false);
      } else { await fetchTracksForSimilarArtist(validSimilarArtists[0].name); }
    } catch (error) {
      console.error("Error fetching similar artists:", error);
      setComponentError('artist', error); setSimilarArtistList([]);
      setComponentLoading('artist', false);
    }
  }, [artistInput, fetchTracksForSimilarArtist]);

  const fetchRecommendationsByTags = useCallback(async (sourceType, key, relevantTags) => {
    setComponentLoading(prev => ({ ...prev, [sourceType]: true }));
    setComponentError(prev => ({ ...prev, [sourceType]: null }));
    if (sourceType === 'mood') setMoodResults([]); else if (sourceType === 'time') setTimeResults([]);
    try {
        const selectedTags = selectRandomTags(relevantTags, 3);
        if (selectedTags.length === 0) { throw new Error("Could not select any relevant tags."); }
        console.log(`[${sourceType}: ${key}] Selected Tags:`, selectedTags);
        const promises = selectedTags.map(tag => getLastFmTagTopTracks(tag).catch(err => { console.warn(`Failed to fetch tracks for tag "${tag}":`, err); return []; }));
        const tagResults = await Promise.all(promises);
        let combinedLastFmTracks = [];
        const addTracks = (sourceArray, count) => { if (!Array.isArray(sourceArray)) return; const available = sourceArray.filter(t => t?.name && t?.artist?.name); combinedLastFmTracks.push(...available.slice(0, count)); };
        addTracks(tagResults[0], 2); if (tagResults.length > 1) { addTracks(tagResults[1], 2); } if (tagResults.length > 2) { addTracks(tagResults[2], 1); }
        const uniqueLastFmTracks = []; const seenTrackArtist = new Set();
        for (const track of combinedLastFmTracks) { const artistName = track.artist?.name || 'Unknown Artist'; const key = `${track.name?.toLowerCase() || 'unknown track'}|${artistName.toLowerCase()}`; if (!seenTrackArtist.has(key)) { uniqueLastFmTracks.push(track); seenTrackArtist.add(key); } if (uniqueLastFmTracks.length >= 5) break; }
        console.log(`[${sourceType}: ${key}] Combined ${uniqueLastFmTracks.length} unique Last.fm tracks for Spotify processing.`);
        if (uniqueLastFmTracks.length === 0) { setComponentError(prev => ({ ...prev, [sourceType]: `No valid tracks found for the selected tags (${selectedTags.join(', ')}).` })); }
        else {
            const spotifyTracks = await processLastFmTracksToSpotify(uniqueLastFmTracks, 5);
            if (sourceType === 'mood') setMoodResults(spotifyTracks); else if (sourceType === 'time') setTimeResults(spotifyTracks);
            if (spotifyTracks.length === 0) { setComponentError(prev => ({ ...prev, [sourceType]: `Found tracks for ${key}, but couldn't match any on Spotify.` })); }
        }
    } catch (error) { console.error(`Error fetching ${sourceType} recommendations for ${key}:`, error); setComponentError(sourceType, error); }
    finally { setComponentLoading(prev => ({ ...prev, [sourceType]: false })); }
  }, []);

  const fetchMoodRecommendations = useCallback((mood) => {
    setSelectedMood(mood); const tagsForMood = moodTagMappings[mood];
    if (!tagsForMood || tagsForMood.length === 0) { console.warn(`No tags defined in moodTagMappings for mood: ${mood}`); setComponentError('mood', `Tag mapping not found for mood: ${mood}`); setMoodResults([]); return; }
    fetchRecommendationsByTags('mood', mood, tagsForMood);
  }, [fetchRecommendationsByTags]);

  const fetchTimeRecommendations = useCallback(async () => {
    const tod = getTimeOfDay(); setCurrentTimeOfDay(tod); const tagsForTime = timeTagMappings[tod];
    if (!tagsForTime || tagsForTime.length === 0) { console.warn(`No tags defined in timeTagMappings for time: ${tod}`); setComponentError('time', `Tag mapping not found for time: ${tod}`); setTimeResults([]); return; }
    fetchRecommendationsByTags('time', tod, tagsForTime);
  }, [fetchRecommendationsByTags]);


  useEffect(() => { fetchTimeRecommendations(); }, [fetchTimeRecommendations]);


  const fetchTagRecommendations = useCallback(async (searchTag = tagInput) => {
    const tagToSearch = String(searchTag || '').trim(); if (!tagToSearch) { setComponentError('tag', 'Please enter a tag.'); return; }
    const firstTag = tagToSearch.split(',')[0].trim(); if (!firstTag) { setComponentError('tag', 'Please enter a valid tag.'); return; }
    setComponentLoading('tag', true); setTagResults([]);
    try {
      const lastFmTracks = await getLastFmTagTopTracks(firstTag);
      if (lastFmTracks.length === 0) { setComponentError('tag', `No tracks found for tag "${firstTag}" on Last.fm.`); }
      else {
        const tracksToProcess = selectRandomTracksForProcessing(lastFmTracks, 5, 3);
        const spotifyTracks = await processLastFmTracksToSpotify(tracksToProcess, 5);
        setTagResults(spotifyTracks);
        if (spotifyTracks.length === 0) { setComponentError('tag', 'Found tag tracks, but couldn\'t match on Spotify.'); }
      }
    } catch (error) { setComponentError('tag', error); }
    finally { setComponentLoading('tag', false); }
  }, [tagInput]);


  const fetchCountryRecommendations = useCallback(async () => {
     const countryName = countryInput.trim(); if (!countryName) { setComponentError('country', 'Please enter a country name.'); return; }
    setComponentLoading('country', true); setCountryResults([]);
    try {
      const lastFmTracks = await getLastFmGeoTopTracks(countryName);
      if (lastFmTracks.length === 0) { setComponentError('country', `No top tracks found for "${countryName}" on Last.fm.`); }
      else {
        const tracksToProcess = selectRandomTracksForProcessing(lastFmTracks, 5, 3);
        const spotifyTracks = await processLastFmTracksToSpotify(tracksToProcess, 5);
        setCountryResults(spotifyTracks);
         if (spotifyTracks.length === 0) { setComponentError('country', 'Found country tracks, but couldn\'t match on Spotify.'); }
      }
    } catch (error) { setComponentError('country', error); }
    finally { setComponentLoading('country', false); }
  }, [countryInput]);

  // --- Tag Exploration Handlers ---
   const fetchTopTags = useCallback(async () => {
      if (topTags.length > 0) { setShowTags(true); return; } setLoadingTags(true); setErrorTags(null); setShowTags(true);
      try { const tags = await getLastFmTopTags(); setTopTags(tags); }
      catch (error) { setErrorTags(error.message || "Failed to load tags."); setShowTags(false); } finally { setLoadingTags(false); }
  }, [topTags.length]);

  const handleTagChipClick = (tagName) => {
      setTagInput(tagName); setShowTags(false); fetchTagRecommendations(tagName);
  }

  // --- Change Similar Artist Handler ---
  const handleChangeArtist = useCallback(() => {
      if (!similarArtistList || similarArtistList.length <= 1 || loadingStates.artist) { return; }
      const nextIndex = (currentSimilarArtistIndex + 1) % similarArtistList.length; setCurrentSimilarArtistIndex(nextIndex);
      const nextArtistName = similarArtistList[nextIndex]?.name;
      if (nextArtistName) { fetchTracksForSimilarArtist(nextArtistName); }
      else { console.error("Next similar artist name not found at index:", nextIndex); setComponentError('artist', 'Error changing artist.'); }
  }, [currentSimilarArtistIndex, similarArtistList, loadingStates.artist, fetchTracksForSimilarArtist]);

  // --- Mood Definitions ---
  const moods = [
    { id: 'happy', name: 'Happy', icon: '😄' }, { id: 'sad', name: 'Sad', icon: '😢' }, { id: 'chill', name: 'Chill', icon: '😌' },
    { id: 'energetic', name: 'Energetic', icon: '⚡' }, { id: 'focused', name: 'Focused', icon: '🎯' }, { id: 'romantic', name: 'Romantic', icon: '❤️' },
  ];

  // --- Render Logic ---
  return (
    <div className="recommendations-page-v2">
      {/* Header */}
      <div className="rec-header-v2"> <Link to="/music-dashboard" className="rec-back-btn-v2"> <ChevronLeft size={20} aria-hidden="true" /> <span>Back to Dashboard</span> </Link> <h1>Explore Music Recommendations</h1> <p>Discover songs based on various criteria using Last.fm & Spotify</p> </div>

      <div className="rec-boxes-container">

        {/* Similar Songs Box */}
        <RecommendationBox title="Find Similar Songs" icon={<Music size={20} />} results={similarSongResults} loading={loadingStates.similarSongs} error={errorStates.similarSongs} onRetry={fetchSimilarSongs}>
           <div className="rec-input-group"> <input type="text" aria-label="Track Name for Similar Songs" placeholder="Enter Track Name" value={similarSongInput} onChange={(e) => setSimilarSongInput(e.target.value)} className="rec-input" onKeyPress={(e) => e.key === 'Enter' && fetchSimilarSongs()}/> <input type="text" aria-label="Artist Name for Similar Songs" placeholder="Enter Artist Name" value={similarArtistInput} onChange={(e) => setSimilarArtistInput(e.target.value)} className="rec-input" onKeyPress={(e) => e.key === 'Enter' && fetchSimilarSongs()} /> <button onClick={fetchSimilarSongs} className="rec-fetch-button" disabled={loadingStates.similarSongs}> <Search size={16} aria-hidden="true"/> Find </button> </div>
        </RecommendationBox>

        {/* Artist Based Box */}
        <RecommendationBox
          title="Similar Artist Explorer" icon={<User size={20} />} results={artistResults}
          loading={loadingStates.artist} error={errorStates.artist} onRetry={fetchArtistRecommendations} >
           <p className="rec-box-description">Find random tracks from artists similar to:</p>
           <div className="rec-input-group">
             <input type="text" aria-label="Artist Name for Similar Artist Search" placeholder="Enter Artist Name" value={artistInput} onChange={(e) => setArtistInput(e.target.value)} className="rec-input" onKeyPress={(e) => e.key === 'Enter' && fetchArtistRecommendations()} />
             <button onClick={fetchArtistRecommendations} className="rec-fetch-button" disabled={loadingStates.artist}> <Search size={16} aria-hidden="true"/> Find Similar </button>
          </div>
           {similarArtistList.length > 0 && !loadingStates.artist && !errorStates.artist && (
               <div className="rec-similar-artist-controls">
                   <p className="rec-current-similar-artist"> Showing tracks by: <strong>{similarArtistList[currentSimilarArtistIndex]?.name || '...'}</strong> </p>
                   {similarArtistList.length > 1 && (
                       <button onClick={handleChangeArtist} className="rec-change-artist-btn" disabled={loadingStates.artist}> <RefreshCw size={14} aria-hidden="true"/> Next Similar Artist </button>
                   )}
               </div>
           )}
           {/* Display "No results" specifically if tracks were fetched but none found */}
            {!loadingStates.artist && !errorStates.artist && similarArtistList.length > 0 && artistResults.length === 0 && (
                <p className="rec-no-results">No Spotify tracks found for {similarArtistList[currentSimilarArtistIndex]?.name}. Try next artist.</p>
            )}
        </RecommendationBox>

        {/* Mood Based Box */}
        <RecommendationBox title="Mood Matcher" icon={<Smile size={20} />} results={moodResults} loading={loadingStates.mood} error={errorStates.mood}>
          <p className="rec-box-description">Select a mood:</p>
          <div className="rec-mood-buttons"> {moods.map(mood => ( <button key={mood.id} aria-pressed={selectedMood === mood.id} className={`rec-mood-btn ${selectedMood === mood.id ? 'selected' : ''}`} onClick={() => fetchMoodRecommendations(mood.id)} disabled={loadingStates.mood}> <span aria-hidden="true">{mood.icon}</span> {mood.name} </button> ))} </div>
          {!loadingStates.mood && !errorStates.mood && moodResults.length === 0 && selectedMood && ( <p className="rec-no-results">No recommendations found for {selectedMood}.</p> )}
        </RecommendationBox>

        {/* *** UPDATED History Based Box *** */}
        <RecommendationBox title="Personalized For You" icon={<Sparkles size={20} />}>
            {/* Removed results/loading/error props */}
          <p className="rec-box-description">Generate recommendations tailored to your unique taste profile.</p>
          <button
            className="rec-history-btn" // New class name
            onClick={() => navigate('/recommendations-main')} // Navigate on click
          >
            Get Personalized Recommendations
          </button>
        </RecommendationBox>

        {/* Tag Based Box */}
        <RecommendationBox title="Tag Explorer" icon={<Tag size={20} />} results={tagResults} loading={loadingStates.tag} error={errorStates.tag} onRetry={() => fetchTagRecommendations()}>
          <div className="rec-tag-input-section">
              <p className="rec-box-description">Find random tracks by tag.</p>
              <div className="rec-input-group">
                <input type="text" aria-label="Tags for Tag Explorer" placeholder="Enter Tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="rec-input" onKeyPress={(e) => e.key === 'Enter' && fetchTagRecommendations()}/>
                <button onClick={() => fetchTagRecommendations()} className="rec-fetch-button" disabled={loadingStates.tag}> <Search size={16} aria-hidden="true"/> Search </button>
              </div>
               <button onClick={fetchTopTags} className="rec-show-tags-btn" disabled={loadingTags} aria-expanded={showTags}> <List size={16} aria-hidden="true" /> {showTags ? 'Hide Popular Tags' : 'Show Popular Tags'} </button>
          </div>
          {showTags && (
              <div className="rec-tag-list-container">
                  {loadingTags && <div className="rec-tag-list-loader"><Loader size={18} className="spin"/> Loading tags...</div>}
                  {errorTags && <div className="rec-tag-list-error"><AlertCircle size={18}/> {errorTags}</div>}
                  {!loadingTags && !errorTags && topTags.length > 0 && ( <div className="rec-tag-chips"> {topTags.slice(0, 50).map(tag => ( <button key={tag.name} className="rec-tag-chip" onClick={() => handleTagChipClick(tag.name)}> {tag.name} </button> ))} </div> )}
                  {!loadingTags && !errorTags && topTags.length === 0 && <p>No popular tags found.</p>}
              </div>
          )}
        </RecommendationBox>

        {/* Time of Day Box */}
        <RecommendationBox title={`Your ${capitalizeFirstLetter(currentTimeOfDay)} Mix`} icon={<Clock size={20} />} results={timeResults} loading={loadingStates.time} error={errorStates.time} onRetry={fetchTimeRecommendations}>
           <p className="rec-box-description">Random tracks automatically selected for this time of day.</p>
           {!loadingStates.time && !errorStates.time && timeResults.length === 0 && currentTimeOfDay && ( <p className="rec-no-results">No time-based recommendations found.</p> )}
        </RecommendationBox>

        {/* Country Top Tracks Box */}
         <RecommendationBox title="Regional Hits" icon={<MapPin size={20} />} results={countryResults} loading={loadingStates.country} error={errorStates.country} onRetry={fetchCountryRecommendations}>
           <p className="rec-box-description">Enter a country (e.g., "Japan", "Brazil").</p>
           <div className="rec-input-group"> <input type="text" aria-label="Country Name for Regional Hits" placeholder="Enter Country Name" value={countryInput} onChange={(e) => setCountryInput(e.target.value)} className="rec-input" onKeyPress={(e) => e.key === 'Enter' && fetchCountryRecommendations()} /> <button onClick={fetchCountryRecommendations} className="rec-fetch-button" disabled={loadingStates.country}> <Search size={16} aria-hidden="true"/> Get Top Tracks </button> </div>
        </RecommendationBox>

      </div> {/* End rec-boxes-container */}
    </div> // End recommendations-page-v2
  );
};

export default MusicRecommendationsV2;