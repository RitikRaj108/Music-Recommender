Recommender-pro is a full-stack music exploration platform that leverages machine learning to provide personalized song recommendations. By integrating with the Spotify API, it allows users to discover new music based on their existing library and preferences.

🚀 Tech Stack
Frontend
React (v19): Built with the latest React features for a responsive UI.

Clerk: Used for secure user authentication and identity management.

Lucide React & React Icons: For a modern, intuitive iconography system.

React Router DOM (v6): For seamless client-side navigation.

Backend
Spring Boot (v3.4.2): High-performance Java framework for the REST API.

Spring Security: Protects API endpoints and manages session security.

Data Persistence: Uses MySQL for relational data (via JPA) and MongoDB for flexible document storage.

Python (ML Engine): A dedicated Python script handles the recommendation logic using data science libraries.

📁 Project Structure
/frontend: React application containing the dashboard, player components, and recommendation carousels.

/backend: Spring Boot project containing the API controllers, services, and repository layers.

🛠 Major Functions & Features
1. Advanced Spotify API Integration
The platform serves as a sophisticated bridge to the Spotify ecosystem, managing complex authentication flows.

OAuth 2.0 Authentication: Implements a secure "Authorization Code" flow, allowing users to grant the app specific permissions to interact with their Spotify data.

Automated Token Lifecycle: The SpotifyApiClient service automatically handles the initial exchange of authorization codes for access tokens.

Seamless Refresh Mechanism: To prevent session interruptions, the backend includes a dedicated refreshSpotifyAccessToken function that uses refresh tokens to generate new access tokens without requiring user re-login.

Centralized Configuration: All API credentials (Client ID, Secret, and Redirect URIs) are managed via Spring @Value annotations for secure and flexible deployment.

2. User Library & Personalized Content Management
Users have full control over their musical data through a dedicated management layer.

Dynamic Seed Generation: The RecommendationController features a random-seed endpoint that pulls a random track from the user's existing history to act as a "seed" for new discovery sessions.

Liked Songs Service: A specialized service layer facilitates the tracking and retrieval of a user's favorite tracks, which the recommendation engine then uses to build a personal taste profile.

Playlist Interaction: Users can create and manage playlists, with the backend handling the association between users, playlists, and specific track URIs.

3. Security and User Sync
The application prioritizes data integrity and secure access through modern authentication providers.

Clerk Identity Management: Uses Clerk for frontend authentication, providing a secure and polished login/signup experience.

Real-time Data Synchronization: A ClerkWebhookController in the backend acts as a listener for Clerk events, ensuring that when a user updates their profile or signs up, the project's internal database stays perfectly in sync.

Protected API Endpoints: Spring Security is utilized to ensure that sensitive recommendation and library data are only accessible to authenticated users.
