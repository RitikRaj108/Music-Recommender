package com.project.recommender_pro.repository;


import com.project.recommender_pro.model.LikedSong; // Adjust import
import com.project.recommender_pro.model.PlaylistTrack;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface LikedSongRepository extends MongoRepository<LikedSong, String> {

    Optional<LikedSong> findByUserIdAndTrackUri(String userId, String trackUri);

    List<LikedSong> findByUserIdOrderByLikedAtDesc(String userId);

    long deleteByUserIdAndTrackUri(String userId, String trackUri);
    List<PlaylistTrack> findByUserId(String playlistId, String userId);

}