package com.project.recommender_pro.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "music_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MusicUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    // Spotify Authentication Fields
    @Column(columnDefinition = "TEXT", nullable = true)  // Changed
    private String spotifyAccessToken;

    @Column(columnDefinition = "TEXT", nullable = true)  // Changed
    private String spotifyRefreshToken;

    @Column(nullable = true)
    private Instant spotifyExpiresAt; // When token expires

    // YouTube Music Authentication Fields
    @Column(columnDefinition = "TEXT", nullable = true)
    private String ytCookies; // Stores YouTube cookies

    @Column(columnDefinition = "TEXT", nullable = true)
    private String ytHeaders; // Stores YouTube headers
}

