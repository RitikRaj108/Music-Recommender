package com.project.recommender_pro.dto;

import com.project.recommender_pro.model.PlaylistTrack; // Assuming this path
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data // Lombok annotation for getters, setters, toString, etc.
@NoArgsConstructor // Default constructor
@AllArgsConstructor // Constructor with all arguments
public class RecommendationSeedData {
    private List<String> topArtists;
    private Map<String, List<PlaylistTrack>> tracksByTopArtists; // Key is artist name
    private List<String> existingTrackUris;
}