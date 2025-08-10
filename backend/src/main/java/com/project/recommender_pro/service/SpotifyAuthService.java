package com.project.recommender_pro.service;

import com.project.recommender_pro.dto.MusicUserDTO;
import com.project.recommender_pro.model.MusicUser;
import com.project.recommender_pro.repository.MusicUserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

// SpotifyAuthService.java
@Service
@RequiredArgsConstructor
public class SpotifyAuthService {

    private static final Logger log = LoggerFactory.getLogger(SpotifyApiClient.class);
    private final MusicUserRepository userRepository;
    private final SpotifyApiClient spotifyClient;

    public String processUser(MusicUserDTO request) {
        Optional<MusicUser> existingUser = userRepository.findByUsername(request.getUsername());

        if (existingUser.isPresent()) {
            // Existing user flow
            MusicUser user = existingUser.get();
            if (needsTokenRefresh(user)) {
                refreshTokens(user);
            }
            return user.getSpotifyAccessToken();
        } else {
            // New user flow - generate tokens FIRST
            Map<String, String> tokens = spotifyClient.getSpotifyAccessToken(request.getCode());
            return createNewUserWithTokens(request, tokens).getSpotifyAccessToken();
        }
    }

    private MusicUser createNewUserWithTokens(MusicUserDTO request, Map<String, String> tokens) {
        MusicUser newUser = MusicUser.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .spotifyAccessToken(tokens.get("access_token"))
                .spotifyRefreshToken(tokens.get("refresh_token")) // Spotify returns refresh_token on initial auth
                .spotifyExpiresAt(Instant.now().plusSeconds(
                        Long.parseLong(tokens.get("expires_in"))
                ))
                .build();

        return userRepository.save(newUser);
    }

    private boolean needsTokenRefresh(MusicUser user) {
        // Added null check for access token
        return user.getSpotifyAccessToken() == null ||
                user.getSpotifyExpiresAt() == null ||
                Instant.now().isAfter(user.getSpotifyExpiresAt().minusSeconds(30));
    }

    private void refreshTokens(MusicUser user) {
        Map<String, String> tokens = spotifyClient.refreshSpotifyAccessToken(
                user.getSpotifyRefreshToken()
        );
        updateUserTokens(user, tokens);
    }

    private void updateUserTokens(MusicUser user, Map<String, String> tokens) {
        // Update the access token and expiry time
        user.setSpotifyAccessToken(tokens.get("access_token"));
        user.setSpotifyExpiresAt(Instant.now().plusSeconds(
                Long.parseLong(tokens.get("expires_in"))));

        // Only update the refresh token if a new one is provided
        if (tokens.containsKey("refresh_token")) {
            user.setSpotifyRefreshToken(tokens.get("refresh_token"));
        } else {
            // Retain the existing refresh token if no new one is provided
            log.info("No new refresh token provided. Retaining existing refresh token for user: {}", user.getUsername());
        }

        // Save the updated user entity
        userRepository.save(user);
    }
}