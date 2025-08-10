package com.project.recommender_pro.Integration;

import com.project.recommender_pro.config.ClerkConfig;
import com.project.recommender_pro.model.User;
import com.project.recommender_pro.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
public class UserRepositoryIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @TestConfiguration
    static class MockConfig {
        @Bean
        public ClerkConfig clerkConfig() {
            return Mockito.mock(ClerkConfig.class);
        }
    }

    @Test
    void saveUser_ValidUser_SavesToDatabase() {
        // Create a valid user with all required fields
        User user = new User();
        user.setClerkId("test_clerk_id"); // Add this line
        user.setEmail("test@example.com");
        user.setUsername("testuser");

        // Save to database
        User savedUser = userRepository.save(user);

        // Assertions
        assertNotNull(savedUser.getId());
        assertEquals("test@example.com", savedUser.getEmail());
        assertEquals("test_clerk_id", savedUser.getClerkId()); // Verify clerk_id
    }
}