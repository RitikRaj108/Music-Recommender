package com.project.recommender_pro.repository;

import com.project.recommender_pro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);// Find user by Clerk ID
    Optional<User> deleteByClerkId(String clerkId);
    boolean existsByClerkId(String clerkId);
    boolean existsByEmail(String email); // Add this
    boolean existsByUsername(String username); // Add this
    Optional<User> findByClerkId(String clerkId);

}

