import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import "../../Components/spotify-callback.css";

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const { isLoaded, user } = useUser();

  useEffect(() => {
    if (!isLoaded) {
      return; // Wait for Clerk to initialize
    }

    const handleAuthentication = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      // Check for required parameters
      if (!code || !user) {
        navigate("/", { 
          state: { 
            error: "Missing authentication parameters" 
          } 
        });
        return;
      }

      try {
        const response = await fetch("https://recommender-pro.onrender.com/auth/spotify/token", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({
            code: code,
            username: user.username,
            email: user.primaryEmailAddress?.emailAddress
          }),
        });

        const data = await response.json();

        console.log(data);

        if (!response.ok) {
          throw new Error(data.error || "Authentication failed");
        }

        // Store the access token securely
        localStorage.setItem("spotify_access_token", data.access_token);
        
        // Redirect to music dashboard
        navigate(data.redirect || "/music-dashboard");

      } catch (error) {
        console.error("Authentication error:", error);
        
        // Clear any existing token and redirect with error
        localStorage.removeItem("spotify_access_token");
        navigate("/", { 
          state: { 
            error: error.message || "Failed to authenticate with Spotify" 
          } 
        });
      }
    };

    handleAuthentication();
  }, [navigate, user, isLoaded]);

  if (!isLoaded) {
    return <div className="loading-container">Loading user session...</div>;
  }

  return (
    <div className="callback-container">
      <h2>Processing Spotify Login...</h2>
      <div className="spinner"></div>
    </div>
  );
};

export default SpotifyCallback;