package com.project.recommender_pro.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;


@Data
@Document(collection = "playlists")
@CompoundIndex(name = "userIdIndex", def = "{'userId': 1}")
public class Playlist {
    @Id
    private String id;
    private String userId;
    private String username;  // Owner of playlist
    private String name;
    private String spotifyId; // Optional: Link to Spotify
    private Date createdAt = new Date();
}
