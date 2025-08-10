package com.project.recommender_pro.dto;

import com.project.recommender_pro.model.PlaylistTrack; // Adjust import
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RandomSeedData {
    private PlaylistTrack seedTrack; // Can be null if user has no tracks
    private List<String> existingTrackUris; // List of all URIs user has in the playlist
}