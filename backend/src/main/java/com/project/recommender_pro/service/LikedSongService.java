package com.project.recommender_pro.service;



import com.project.recommender_pro.model.LikedSong;
import com.project.recommender_pro.repository.LikedSongRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Recommended for delete

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class LikedSongService {

    private final LikedSongRepository likedSongRepository;

    @Autowired
    public LikedSongService(LikedSongRepository likedSongRepository) {
        this.likedSongRepository = likedSongRepository;
    }

    /**
     * Saves a liked song entry provided by the frontend, including pre-fetched tags and year.
     * Checks for duplicates based on userId and trackUri.
     */
    public LikedSong likeSong(String userId, String trackUri, String trackName, String artistName, List<String> tags, Integer year) {
        // Check if the user already liked this specific track URI
        Optional<LikedSong> existingLike = likedSongRepository.findByUserIdAndTrackUri(userId, trackUri);

        if (existingLike.isPresent()) {
            System.out.println("INFO: User [" + userId + "] already liked track [" + trackUri + "]. Returning existing entry.");
            // Optionally: Update existing entry's tags/year if they differ?
            // LikedSong existing = existingLike.get();
            // boolean needsUpdate = false;
            // if (tags != null && !tags.equals(existing.getTags())) { existing.setTags(tags); existing.setTagsLastFetched(Instant.now()); needsUpdate = true; }
            // if (year != null && !year.equals(existing.getYear())) { existing.setYear(year); needsUpdate = true; }
            // if (needsUpdate) return likedSongRepository.save(existing); else return existing;
            return existingLike.get(); // Simplest: just return the existing record
        }

        // Create and save the new liked song document
        LikedSong newLikedSong = new LikedSong(userId, trackUri, trackName, artistName, tags, year);
        System.out.println("INFO: Saving new like for User [" + userId + "] Track [" + trackUri + "]");
        return likedSongRepository.save(newLikedSong);
    }

    /**
     * Deletes a liked song entry for a specific user and track URI.
     * Returns true if deletion was successful (at least one record removed).
     */
    @Transactional // Good practice for delete operations
    public boolean unlikeSong(String userId, String trackUri) {
        System.out.println("INFO: Attempting to delete like for User [" + userId + "] Track [" + trackUri + "]");
        long deleteCount = likedSongRepository.deleteByUserIdAndTrackUri(userId, trackUri);
        if (deleteCount > 0) {
            System.out.println("INFO: Successfully deleted " + deleteCount + " like entry.");
            return true;
        } else {
            System.out.println("WARN: Like entry not found for deletion for User [" + userId + "] Track [" + trackUri + "]");
            return false; // Indicate the like didn't exist to be deleted
        }
    }

    /**
     * Retrieves all liked songs for a specific user, ordered by most recently liked.
     */
    public List<LikedSong> getLikedSongsForUser(String userId) {
        System.out.println("INFO: Fetching liked songs for User [" + userId + "]");
        return likedSongRepository.findByUserIdOrderByLikedAtDesc(userId);
    }
}