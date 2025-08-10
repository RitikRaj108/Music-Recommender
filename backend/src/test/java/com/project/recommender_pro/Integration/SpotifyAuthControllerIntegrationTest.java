package com.project.recommender_pro.Integration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.recommender_pro.config.ClerkConfig;
import com.project.recommender_pro.controllers.SpotifyAuthController;
import com.project.recommender_pro.dto.MusicUserDTO;
import com.project.recommender_pro.repository.MusicUserRepository;
import com.project.recommender_pro.repository.UserRepository;
import com.project.recommender_pro.service.SpotifyAuthService;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(SpringExtension.class)
@WebMvcTest(
        controllers = SpotifyAuthController.class,
        excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
                org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
                org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration.class,
                org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration.class
        },
        properties = "spring.data.jpa.repositories.enabled=false"
)
@Import(SpotifyAuthControllerIntegrationTest.MockDependencies.class)
public class SpotifyAuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SpotifyAuthService spotifyAuthService;

    @Autowired
    private ClerkConfig clerkConfig;

    @BeforeEach
    void setup() {
        Mockito.reset(spotifyAuthService);
        when(spotifyAuthService.processUser(any(MusicUserDTO.class)))
                .thenReturn("valid_access_token");
    }
    void handleSpotifyCallback_ValidCode_ReturnsTokens() throws Exception {
        MusicUserDTO request = new MusicUserDTO("valid_code", "user1", "user1@example.com");

        mockMvc.perform(post("/auth/spotify/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(asJsonString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").value("valid_access_token"));
    }

    private static String asJsonString(Object obj) throws JsonProcessingException {
        return new ObjectMapper().writeValueAsString(obj);
    }

    @TestConfiguration
    static class MockDependencies {
        @Bean
        public SpotifyAuthService spotifyAuthService() {
            return Mockito.mock(SpotifyAuthService.class);
        }

        @Bean
        public ClerkConfig clerkConfig() {
            return Mockito.mock(ClerkConfig.class);
        }

        @Bean
        public EntityManagerFactory entityManagerFactory() {
            return Mockito.mock(EntityManagerFactory.class);
        }

        @Bean
        public UserRepository userRepository() {
            return Mockito.mock(UserRepository.class);
        }

        @Bean
        public MusicUserRepository musicUserRepository() {
            return Mockito.mock(MusicUserRepository.class);
        }


    }
}