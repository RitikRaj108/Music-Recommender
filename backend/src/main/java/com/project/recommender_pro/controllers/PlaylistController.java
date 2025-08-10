package com.project.recommender_pro.controllers;

import com.project.recommender_pro.model.Playlist;
import com.project.recommender_pro.model.PlaylistTrack;
import com.project.recommender_pro.service.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional; // Import if needed

@RestController
@RequestMapping("/api/playlists")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Ensure CORS is configured correctly
public class PlaylistController {
    private final PlaylistService playlistService;

    // --- createPlaylist --- (No change needed from your version)
    @PostMapping("/create")
    public ResponseEntity<Playlist> createPlaylist(
            @RequestBody Map<String, String> request) {
        // Assuming service handles validation/errors
        return ResponseEntity.ok(
                playlistService.createPlaylist(request.get("userId"), request.get("name"), request.get("spotifyId"))
        );
    }

    // --- getMusicHubPlaylist --- (No change needed from your version, added null check)
    @GetMapping("/user/{userId}/musichub-playlist")
    public ResponseEntity<Playlist> getMusicHubPlaylist(@PathVariable String userId) {
        Playlist playlist = playlistService.getMusicHubPlaylist(userId);
        return (playlist != null) ? ResponseEntity.ok(playlist) : ResponseEntity.notFound().build();
    }

    // --- addTrack --- (Your previous version was correct, adding minor improvements)
    @PostMapping("/{playlistId}/tracks")
    public ResponseEntity<?> addTrack( // Return ResponseEntity<?> for better error flexibility
                                       @PathVariable String playlistId,
                                       @RequestBody Map<String, String> trackData) { // Body is {uri, name, artist, userId}

        String spotifyUri = trackData.get("uri");
        String trackName = trackData.get("name");
        String artist = trackData.get("artist");
        String userId = trackData.get("userId"); // Extract userId

        // Use defaults from service layer or validate here
        if (userId == null || userId.trim().isEmpty() ||
                spotifyUri == null || spotifyUri.trim().isEmpty() ||
                playlistId == null || playlistId.trim().isEmpty()) {
            System.err.println("[PlaylistController] addTrack failed: Missing required fields (userId, uri, or path playlistId). Body: " + trackData);
            return ResponseEntity.badRequest().body("Missing required fields: userId, uri, playlistId.");
        }

        try {
            PlaylistTrack addedTrack = playlistService.addTrack(
                    playlistId,
                    userId, // Pass userId
                    spotifyUri,
                    trackName, // Service might handle defaults
                    artist    // Service might handle defaults
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(addedTrack); // 201 Created is better for POST success
        } catch (IllegalArgumentException e) {
            System.err.println("[PlaylistController] addTrack failed (Bad Request): " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) { // Catch other potential service errors
            System.err.println("[PlaylistController] addTrack failed (Server Error): " + e.getMessage());
            e.printStackTrace(); // Log stack trace
            return ResponseEntity.internalServerError().body("Error adding track: " + e.getMessage());
        }
    }

    // --- MODIFIED removeTrack ---
    @DeleteMapping("/{playlistId}/tracks")
    public ResponseEntity<Void> removeTrack( // Changed return type to ResponseEntity<Void>
                                             @PathVariable String playlistId,
                                             // *** CHANGED RequestBody type to handle mixed types ***
                                             @RequestBody Map<String, Object> requestBody) {

        // --- 1. Validate Path Variable ---
        if (playlistId == null || playlistId.trim().isEmpty()) {
            System.err.println("[PlaylistController] removeTrack failed: Missing or empty playlistId path variable.");
            return ResponseEntity.badRequest().build();
        }

        // --- 2. Extract and Validate from Body ---
        String userId = null;
        String trackUri = null;

        try {
            // Extract userId (expecting String)
            Object userIdObj = requestBody.get("userId");
            if (userIdObj instanceof String && !((String) userIdObj).trim().isEmpty()) {
                userId = ((String) userIdObj).trim();
            } else {
                System.err.println("[PlaylistController] removeTrack failed: 'userId' missing, empty, or not a String in request body.");
                return ResponseEntity.badRequest().build(); // Return 400 Bad Request
            }

            // Extract track URI from nested structure
            Object tracksObj = requestBody.get("tracks");
            // Check if 'tracks' is a List
            if (tracksObj instanceof List) {
                List<?> tracksList = (List<?>) tracksObj;
                // Check if the list is not empty and the first item is a Map
                if (!tracksList.isEmpty() && tracksList.get(0) instanceof Map) {
                    // Cast the first item to a Map (use wildcard ? for unknown value types)
                    Map<?, ?> firstTrackMap = (Map<?, ?>) tracksList.get(0);
                    Object uriObj = firstTrackMap.get("uri");
                    // Check if 'uri' is a non-empty String
                    if (uriObj instanceof String && !((String) uriObj).trim().isEmpty()) {
                        trackUri = ((String) uriObj).trim();
                    }
                }
            }

            // Final check if trackUri was extracted
            if (trackUri == null) {
                System.err.println("[PlaylistController] removeTrack failed: Track 'uri' missing or invalid within 'tracks' array in request body.");
                return ResponseEntity.badRequest().build(); // Return 400 Bad Request
            }

        } catch (ClassCastException | NullPointerException e) { // Catch specific parsing errors
            System.err.println("[PlaylistController] removeTrack failed: Error parsing request body structure. " + e.getMessage());
            e.printStackTrace(); // Log stack trace for debugging
            return ResponseEntity.badRequest().build(); // Body format error
        } catch (Exception e) { // Catch any other unexpected error during extraction
            System.err.println("[PlaylistController] removeTrack failed: Unexpected error processing request body. " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }


        System.out.println("[PlaylistController] Attempting to remove track URI: " + trackUri + " from playlist ID: " + playlistId + " for user ID: " + userId);

        // --- 3. Call Service Layer ---
        try {
            boolean removed = playlistService.removeTrack(playlistId, userId, trackUri); // Pass correct userId

            if (removed) {
                System.out.println("[PlaylistController] Successfully removed track.");
                return ResponseEntity.noContent().build(); // 204 No Content (Success)
            } else {
                System.out.println("[PlaylistController] removeTrack failed: Playlist/User/Track combination not found by service.");
                return ResponseEntity.notFound().build(); // 404 Not Found
            }
        } catch (IllegalArgumentException e) { // Catch potential validation errors from service
            System.err.println("[PlaylistController] removeTrack failed: Invalid argument passed to service. " + e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) { // Catch other unexpected service errors
            System.err.println("[PlaylistController] removeTrack failed: An unexpected error occurred in the service layer.");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // 500 Internal Server Error
        }
    }

    // --- getTracks --- (No change needed from your version)
    @GetMapping("/{playlistId}/tracks")
    public ResponseEntity<List<PlaylistTrack>> getTracks(
            @PathVariable String playlistId) {
        return ResponseEntity.ok(playlistService.getTracks(playlistId));
    }

    // --- getUserPlaylists --- (No change needed from your version)
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Playlist>> getUserPlaylists(@PathVariable String userId) {
        return ResponseEntity.ok(playlistService.getUserPlaylists(userId));
    }
}