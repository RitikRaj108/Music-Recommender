package com.project.recommender_pro.service;

import com.project.recommender_pro.dto.RandomSeedData; // Ensure this import exists
import com.project.recommender_pro.model.Playlist;
import com.project.recommender_pro.model.PlaylistTrack;
import com.project.recommender_pro.repository.PlaylistRepository;
import com.project.recommender_pro.repository.PlaylistTrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired; // Keep if using MongoTemplate this way
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Import if used

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Random;
// Remove unused import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaylistService {

    private static final int HARDCODED_PLAYLIST_ID =1234567; // Static final should be uppercase

    // Using @Autowired on fields is generally discouraged, prefer constructor injection (handled by @RequiredArgsConstructor)
    // If you need MongoTemplate, inject it via the constructor too:
    // private final MongoTemplate mongoTemplate; (remove @Autowired)
    @Autowired // If you must keep it, it stays here.
    private MongoTemplate mongoTemplate;

    private final PlaylistRepository playlistRepo;
    private final PlaylistTrackRepository trackRepo;

    // Create new playlist
    public Playlist createPlaylist(String userId, String name, String spotifyId) { // Changed param name for clarity
        // Consider querying based on userId and spotifyId if that combination should be unique
        Query query = new Query(Criteria.where("userId").is(userId).and("spotifyId").is(spotifyId));
        if (mongoTemplate.exists(query, Playlist.class)) {
            System.err.printf("Playlist already exists for user %s with spotifyId %s%n", userId, spotifyId);
            throw new RuntimeException("Playlist already exists with this Spotify ID for the user");
        }

        // Also check if the user is trying to create another 'Musichub_Liked_Songs'
        if ("Musichub_Liked_Songs".equals(name)) {
            Playlist existingMusicHub = getMusicHubPlaylist(userId);
            if (existingMusicHub != null) {
                System.err.printf("MusicHub playlist already exists for user %s%n", userId);
                throw new RuntimeException("Musichub_Liked_Songs playlist already exists for this user.");
            }
        }

        Playlist playlist = new Playlist();
        playlist.setUserId(userId);
        playlist.setName(name);
        playlist.setSpotifyId(spotifyId);
        return playlistRepo.save(playlist);
    }

    public Playlist getMusicHubPlaylist(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("name").is("Musichub_Liked_Songs"));
        return mongoTemplate.findOne(query, Playlist.class);
    }


    // Add track to playlist
    public PlaylistTrack addTrack(String playlistId, String userId, String spotifyUri, String trackName, String artist) {
        // --- Validation ---
        if (playlistId == null || userId == null || spotifyUri == null ||
                playlistId.trim().isEmpty() || userId.trim().isEmpty() || spotifyUri.trim().isEmpty()) {
            System.err.printf("addTrack called with invalid arguments: playlistId='%s', userId='%s', spotifyUri='%s'%n", playlistId, userId, spotifyUri);
            throw new IllegalArgumentException("Missing required arguments for adding track (playlistId, userId, spotifyUri)");
        }
        // Provide defaults if name/artist are optional but preferred
        trackName = (trackName == null || trackName.trim().isEmpty()) ? "Unknown Track" : trackName.trim();
        artist = (artist == null || artist.trim().isEmpty()) ? "Unknown Artist" : artist.trim();

        PlaylistTrack track = new PlaylistTrack();
        track.setPlaylistId(playlistId);
        track.setUserId(userId); // Set the user ID
        track.setSpotifyUri(spotifyUri);
        track.setTrackName(trackName);
        track.setArtist(artist);
        // track.setAddedAt(Instant.now()); // Use Instant if model uses it

        PlaylistTrack savedTrack = trackRepo.save(track);
        System.out.printf("Added track '%s' (URI: %s) to playlist ID %s for user %s%n",
                trackName, spotifyUri, playlistId, userId);
        return savedTrack;
    }

    // Get all tracks for a specific playlist ID (irrespective of user)
    public List<PlaylistTrack> getTracks(String playlistId) {
        return trackRepo.findByPlaylistId(playlistId);
    }

    // Delete playlist and *all* its associated tracks
    @Transactional // Good practice for multi-step operations
    public void deletePlaylist(String playlistId) {
        System.out.printf("Attempting to delete playlist ID: %s and its tracks%n", playlistId);
        long deletedTracksCount = trackRepo.deleteByPlaylistId(playlistId); // Delete tracks first
        playlistRepo.deleteById(playlistId); // Then delete playlist
        System.out.printf("Deleted playlist document for ID: %s and %d associated tracks%n", playlistId, deletedTracksCount);
    }

    // Get all playlists created by a specific user
    public List<Playlist> getUserPlaylists(String userId) {
        Query query = new Query(Criteria.where("userId").is(userId));
        return mongoTemplate.find(query, Playlist.class);
    }


    // Remove a specific track added by a specific user from a playlist
    public boolean removeTrack(String playlistId, String userId, String trackUri) {
        // Basic Input Validation
        if (playlistId == null || playlistId.trim().isEmpty() ||
                userId == null || userId.trim().isEmpty() ||
                trackUri == null || trackUri.trim().isEmpty()) {
            System.err.printf("removeTrack called with invalid arguments: playlistId='%s', userId='%s', trackUri='%s'%n", playlistId, userId, trackUri);
            return false; // Or throw IllegalArgumentException
        }

        System.out.printf("Attempting to remove track URI '%s' from playlist ID '%s' for user '%s'%n", trackUri, playlistId, userId);

        try {
            // Call the repository method that deletes by all three criteria
            long deletedCount = trackRepo.deleteByPlaylistIdAndUserIdAndSpotifyUri(playlistId, userId, trackUri);

            if (deletedCount > 0) {
                System.out.printf("Successfully removed %d track(s) with URI '%s' from playlist ID '%s' for user '%s'%n", deletedCount, trackUri, playlistId, userId);
                return true;
            } else {
                System.out.printf("Track with URI '%s' not found in playlist ID '%s' for user '%s' for removal.%n", trackUri, playlistId, userId);
                return false; // Not found is not an error, just means nothing to delete
            }
        } catch (Exception e) { // Catch potential database or other runtime exceptions
            System.err.printf("Error during track removal for playlist ID '%s', user '%s', track URI '%s': %s%n", playlistId, userId, trackUri, e.getMessage());
            e.printStackTrace(); // Log stack trace
            // Depending on requirements, you might re-throw a custom exception or return false
            return false;
        }
        // *** Method closing brace was missing here in the original problematic code ***
    } // *** End of removeTrack method ***

    // --- MOVED getRandomSeedTrackForUser METHOD TO CLASS LEVEL ---
    /**
     * Gets a single random track added by the specified user from the hardcoded playlist,
     * along with all track URIs added by that user in the same playlist.
     *
     * @param userId The Spotify User ID.
     * @return RandomSeedData containing one random track (or null) and the list of existing URIs.
     */
    public RandomSeedData getRandomSeedTrackForUser(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            System.err.println("getRandomSeedTrackForUser called with invalid userId.");
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }

        System.out.printf("Fetching random seed track for user %s from playlist %s%n", userId, HARDCODED_PLAYLIST_ID);
        // Corrected: Use the constant HARDCODED_PLAYLIST_ID, not the literal number
        List<PlaylistTrack> userTracks = trackRepo.findByUserId(userId);

        PlaylistTrack seedTrack = null;
        List<String> existingUris = Collections.emptyList(); // Default to empty

        if (userTracks != null && !userTracks.isEmpty()) {
            // Extract all URIs first
            existingUris = userTracks.stream()
                    .map(PlaylistTrack::getSpotifyUri)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());

            // Select one random track
            Random random = new Random();
            int randomIndex = random.nextInt(userTracks.size());
            seedTrack = userTracks.get(randomIndex);
            System.out.printf("Selected random seed track: '%s' by %s%n", seedTrack.getTrackName(), seedTrack.getArtist());
        } else {
            System.out.println("No tracks found for user " + userId + " in playlist " + HARDCODED_PLAYLIST_ID + ".");
        }

        return new RandomSeedData(seedTrack, existingUris);
    } // *** End of getRandomSeedTrackForUser method ***

} // *** End of PlaylistService class ***