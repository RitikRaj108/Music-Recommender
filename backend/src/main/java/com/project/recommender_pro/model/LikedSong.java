package com.project.recommender_pro.model;


import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.List;
import java.util.Collections; // Import Collections
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document(collection = "likedSongs")
@CompoundIndex(name = "user_track_unique", def = "{'userId' : 1, 'trackUri' : 1}", unique = true)
public class LikedSong {

    @Id
    private String id;

    private String userId;       // Clerk User ID
    private String trackUri;     // Spotify URI
    private String trackName;
    private String artistName;
    private Integer year;       // Release Year (Nullable)
    private List<String> tags; // Tags fetched by frontend from Last.fm
    private Instant likedAt;    // Timestamp when liked
    private Instant tagsLastFetched; // Timestamp when these tags were stored

    // Constructor used by the service
    public LikedSong(String userId, String trackUri, String trackName, String artistName, List<String> tags, Integer year) {
        this.userId = userId;
        this.trackUri = trackUri;
        this.trackName = trackName;
        this.artistName = artistName;
        this.year = year;
        this.tags = (tags != null) ? tags : Collections.emptyList(); // Handle null tags
        this.likedAt = Instant.now();
        // If tags are provided, mark them as fetched now
        if (this.tags != null && !this.tags.isEmpty()) {
            this.tagsLastFetched = Instant.now();
        }
    }
}