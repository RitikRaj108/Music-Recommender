package com.project.recommender_pro.repository;

import com.project.recommender_pro.model.MusicUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MusicUserRepository extends JpaRepository<MusicUser,Long> {
    Optional<MusicUser> findByUsername(String username);
}
