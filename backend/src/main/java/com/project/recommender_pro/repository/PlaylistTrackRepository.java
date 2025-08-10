package com.project.recommender_pro.repository;

import com.project.recommender_pro.model.PlaylistTrack;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PlaylistTrackRepository extends MongoRepository<PlaylistTrack, String> {
    List<PlaylistTrack> findByPlaylistId(String playlistId);
    long deleteByPlaylistIdAndUserIdAndSpotifyUri(String playlistId, String userId, String spotifyUri);

    long deleteByPlaylistId(String playlistId);

    List<PlaylistTrack> findByPlaylistIdAndUserId(int i, String userId);

    List<PlaylistTrack> findByUserId(String userId);
}