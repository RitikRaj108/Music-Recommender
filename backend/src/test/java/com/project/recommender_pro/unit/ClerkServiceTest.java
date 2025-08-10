package com.project.recommender_pro.unit;

import com.project.recommender_pro.exception.DuplicateResourceException;
import com.project.recommender_pro.model.User;
import com.project.recommender_pro.repository.UserRepository;
import com.project.recommender_pro.service.ClerkService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClerkServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ClerkService clerkService;

    @Test
    void createUser_NewUser_Success() {
        // Arrange
        when(userRepository.existsByClerkId("clerk123")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        clerkService.createUser("clerk123", "test@example.com", "testuser");

        // Assert
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createUser_ExistingUser_ThrowsException() {
        // Arrange
        when(userRepository.existsByClerkId("clerk123")).thenReturn(true);

        // Act & Assert
        assertThrows(DuplicateResourceException.class, () ->
                clerkService.createUser("clerk123", "test@example.com", "testuser"));
    }
}