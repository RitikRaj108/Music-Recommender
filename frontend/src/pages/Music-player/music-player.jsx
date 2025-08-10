import React, { useState, useRef } from 'react';
import '../../Components/music-player.css';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef(null);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    audioRef.current.currentTime = e.target.value;
    setCurrentTime(e.target.value);
  };

  const handleVolumeChange = (e) => {
    audioRef.current.volume = e.target.value;
    setVolume(e.target.value);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
      />
      
      <div className="album-art">
        <img src="https://source.unsplash.com/random/300x300" alt="Album Art" />
      </div>
      
      <div className="song-info">
        <h3>Summer Vibes</h3>
        <p>Chill Hits</p>
      </div>

      <div className="progress-container">
        <input
          type="range"
          className="progress-bar"
          min="0"
          max={duration}
          value={currentTime}
          onChange={handleSeek}
        />
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="controls">
        <div className="controls-left">
          <button className="control-btn">
            <i className="fas fa-step-backward"></i>
          </button>
          <button className="control-btn play-btn" onClick={togglePlayPause}>
            {isPlaying ? (
              <i className="fas fa-pause"></i>
            ) : (
              <i className="fas fa-play"></i>
            )}
          </button>
          <button className="control-btn">
            <i className="fas fa-step-forward"></i>
          </button>
        </div>

        <div className="controls-right">
          <i className="fas fa-volume-up volume-icon"></i>
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;