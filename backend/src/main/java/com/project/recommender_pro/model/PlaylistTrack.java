package com.project.recommender_pro.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Data
@Document(collection = "playlist_tracks")
public class PlaylistTrack {
    @Id
    private String id;
    @Indexed // Index for faster lookups by userId
    private String userId;

    private String playlistId; // Reference to playlist
    private String spotifyUri;
    private String trackName;
    private String artist;
    private Date addedAt = new Date();
}