package com.project.recommender_pro.controllers;

import com.project.recommender_pro.dto.RandomSeedData; // Import DTO
import com.project.recommender_pro.service.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommendations") // Base path
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecommendationController {

    private final PlaylistService playlistService;

    // Remove or comment out the old /generate endpoint if not needed
    // @GetMapping("/generate/{userId}") ...

    /**
     * Endpoint to get a random seed track and existing URIs for a user.
     */
    @GetMapping("/random-seed/{userId}")
    public ResponseEntity<RandomSeedData> getRandomSeed(@PathVariable String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(null);
        }
        try {
            RandomSeedData seedData = playlistService.getRandomSeedTrackForUser(userId);
            // It's okay to return data even if seedTrack is null (means user has no tracks)
            return ResponseEntity.ok(seedData);
        } catch (IllegalArgumentException e) {
            System.err.println("Error getting random seed (Bad Request) for user " + userId + ": " + e.getMessage());
            return ResponseEntity.badRequest().body(null); // Or return an error object
        } catch (Exception e) {
            System.err.println("Error getting random seed (Server Error) for user " + userId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(null);
        }
    }
}