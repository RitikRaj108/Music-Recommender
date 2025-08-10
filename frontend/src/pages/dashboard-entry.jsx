import React, { useEffect } from "react";
import "../Components/dashboard-entry.css";
import { FaSpotify, FaYoutube, FaLink, FaWaveSquare, FaSyncAlt } from "react-icons/fa";
import { useUser } from "@clerk/clerk-react";

const HomePage = () => {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      fetch("https://recommender-pro.onrender.com/auth/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress.emailAddress,
          username: user.username,
        }),
      })
      .then(response => response.json())
      .catch(error => console.error("Error storing user:", error));
    }
  }, [user]);

  const SPOTIFY_AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${process.env.REACT_APP_SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${process.env.REACT_APP_SPOTIFY_REDIRECT_URI}&scope=user-library-read user-library-modify user-read-recently-played playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-private user-follow-read user-follow-modify user-read-email 
  user-top-read
  user-read-playback-position
  user-read-playback-state
  user-read-private
  streaming`;

  const handleSpotifyLogin = () => {
    window.location.href = SPOTIFY_AUTH_URL;
  };


  return (
    <div className="homepage">
      {/* Animated Background Elements */}
      <div className="animated-bg-elements">
        <div className="music-note note-1">🎵</div>
        <div className="music-note note-2">🎶</div>
        <div className="music-note note-3">🎧</div>
      </div>

      {/* Navbar */}
      <header className="navbar">
        <h1 className="logo animate-pop">🎵 Meloraa</h1>
        <nav className="nav-profile">
          <ul>
            <li>
              <a href="/profile" className="nav-link animate-underline">
                Profile
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="content">
        <section className="hero animate-slide-up">
          <div className="hero-content">
            <h2 className="hero-title">
              <span className="gradient-text">Elevate Your</span>
              <br />
              <span className="gradient-text">Music Experience</span>
            </h2>
            <p className="hero-subtitle">
              Seamlessly connect and manage your music services in one place
            </p>

            {/* Connection Buttons */}
            <div className="music-links">
              <button 
                className="spotify-btn animate-btn-pop"
                onClick={handleSpotifyLogin}
              >
                <FaSpotify className="icon pulse" />
                Connect Spotify Premium
                <div className="shine"></div>
              </button>
              
              <button 
                className="youtube-btn animate-btn-pop"
                style={{ animationDelay: "0.2s" }}
              >
                <FaYoutube className="icon pulse" />
                Connect YouTube Music
                <div className="shine"></div>
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="feature-grid">
              <div className="feature-card">
                <FaSyncAlt className="feature-icon" />
                <h3>Bi-Directional Sync</h3>
                <p>Changes made here automatically update on Spotify</p>
              </div>
              <div className="feature-card">
                <FaLink className="feature-icon" />
                <h3>Dual Platform Link</h3>
                <p>Manage playlists across both web and mobile platforms</p>
              </div>
              <div className="feature-card">
                <FaWaveSquare className="feature-icon" />
                <h3>Advanced Analytics</h3>
                <p>Detailed listening stats and trend analysis</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};


export default HomePage;
