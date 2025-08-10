package com.project.recommender_pro.controllers;

import com.project.recommender_pro.dto.MusicUserDTO;
import com.project.recommender_pro.exception.SpotifyAuthException;
import com.project.recommender_pro.service.SpotifyAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth/spotify")
public class SpotifyAuthController {

    private final SpotifyAuthService spotifyAuthService;

    public SpotifyAuthController(SpotifyAuthService spotifyAuthService) {
        this.spotifyAuthService = spotifyAuthService;
    }

    @PostMapping("/token")
    public ResponseEntity<?> handleSpotifyCallback(@RequestBody MusicUserDTO request) {
        try {
            String accessToken = spotifyAuthService.processUser(request);
            return ResponseEntity.ok().body(Map.of(
                    "access_token", accessToken,
                    "redirect", "/music-dashboard"  // Changed here
            ));
        } catch (SpotifyAuthException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", e.getMessage(),
                    "redirect", "/"  // Keep error redirect to home
            ));
        }
    }
}
