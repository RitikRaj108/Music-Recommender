package com.project.recommender_pro.service;

import com.project.recommender_pro.model.User;
import com.project.recommender_pro.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User saveUser(User user) {
        Optional<User> existingUser = userRepository.findByClerkId(user.getClerkId());
        if (existingUser.isPresent()) {
            System.out.println("User already exists");
            return existingUser.get();
            // Return existing user if already present
        }

        Optional<User> existingUserByEmail = userRepository.findByEmail(user.getEmail());
        if (existingUserByEmail.isPresent()) {
            System.out.println("User with Email already exists");
            return existingUserByEmail.get();
        }


        // Save only if the user does not exist
        return userRepository.save(user);
    }


    public User getUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
