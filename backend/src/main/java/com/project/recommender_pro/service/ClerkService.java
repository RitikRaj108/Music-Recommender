package com.project.recommender_pro.service;

import com.project.recommender_pro.exception.DuplicateResourceException;
import com.project.recommender_pro.model.User;
import com.project.recommender_pro.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClerkService {

    private final UserRepository userRepository;

    @Autowired
    public ClerkService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // CREATE USER
    @Transactional
    public void createUser(String clerkUserId, String email, String username) {
        // Existing create logic
        if (userRepository.existsByClerkId(clerkUserId)) {
            throw new DuplicateResourceException("User with Clerk ID " + clerkUserId + " already exists");
        }

        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email " + email + " is already registered");
        }

        if (username != null && userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username " + username + " is already taken");
        }

        User user = new User();
        user.setClerkId(clerkUserId);
        user.setEmail(email);
        user.setUsername(username);
        userRepository.save(user);
    }

    // DELETE USER - ADD THIS METHOD
    @Transactional
    public void deleteUserByClerkId(String clerkUserId) {
        if (!userRepository.existsByClerkId(clerkUserId)) {
            throw new IllegalArgumentException("User with Clerk ID " + clerkUserId + " not found");
        }
        userRepository.deleteByClerkId(clerkUserId);
    }

    public void updateUser(String clerkUserId, String email, String username) {
        // Find the user by Clerk ID
        User user = userRepository.findByClerkId(clerkUserId)
                .orElseThrow(() -> new IllegalArgumentException("User with Clerk ID " + clerkUserId + " not found"));

    }}