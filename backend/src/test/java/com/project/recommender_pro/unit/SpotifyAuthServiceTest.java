package com.project.recommender_pro.unit;

import com.project.recommender_pro.dto.MusicUserDTO;
import com.project.recommender_pro.model.MusicUser;
import com.project.recommender_pro.repository.MusicUserRepository;
import com.project.recommender_pro.service.SpotifyApiClient;
import com.project.recommender_pro.service.SpotifyAuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpotifyAuthServiceTest {

    @Mock
    private MusicUserRepository userRepository;
    @Mock
    private SpotifyApiClient spotifyClient;

    @InjectMocks
    private SpotifyAuthService spotifyAuthService;

    @Test
    void processUser_NewUser_CreatesUserWithTokens() {
        // Arrange
        MusicUserDTO request = new MusicUserDTO("code123", "user1", "user1@example.com");
        Map<String, String> tokens = Map.of(
                "access_token", "token123",
                "refresh_token", "refresh123",
                "expires_in", "3600"
        );

        when(userRepository.findByUsername("user1")).thenReturn(Optional.empty());
        when(spotifyClient.getSpotifyAccessToken("code123")).thenReturn(tokens);
        when(userRepository.save(any(MusicUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        String accessToken = spotifyAuthService.processUser(request);

        // Assert
        assertEquals("token123", accessToken);
        verify(userRepository).save(any(MusicUser.class));
    }
}