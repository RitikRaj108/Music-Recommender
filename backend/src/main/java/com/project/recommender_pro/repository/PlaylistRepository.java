package com.project.recommender_pro.repository;


import com.project.recommender_pro.model.Playlist;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlaylistRepository extends MongoRepository<Playlist, String> {
    Query findByUsername(String Username);

    boolean existsByIdAndName(String spotifyid, String name);
}