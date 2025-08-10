package com.project.recommender_pro.service;

import com.project.recommender_pro.exception.SpotifyAuthException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class SpotifyApiClient {

    @Value("${spotify.client.id1}")
    private String clientId;

    @Value("${spotify.client.secret1}")
    private String clientSecret;

    @Value("${spotify.redirect.uri1}")
    private String redirectUri;

    private final RestTemplate restTemplate;

    public SpotifyApiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Map<String, String> getSpotifyAccessToken(String code) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        System.out.println(clientId);
        System.out.println(clientSecret);
        System.out.println(redirectUri);
        System.out.println(code);
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", redirectUri);
        return exchangeTokens(body);
    }

    public Map<String, String> refreshSpotifyAccessToken(String refreshToken) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("refresh_token", refreshToken);
        return exchangeTokens(body);
    }

    private Map<String, String> exchangeTokens(MultiValueMap<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(clientId, clientSecret);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<Map> response = restTemplate.exchange(
                "https://accounts.spotify.com/api/token",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        if (response.getStatusCode() == HttpStatus.OK) {
            return convertTokenResponse(response.getBody());
        }
        throw new SpotifyAuthException("Spotify token exchange failed");
    }

    private Map<String, String> convertTokenResponse(Map<String, Object> response) {
        Map<String, String> tokens = new HashMap<>();
        tokens.put("access_token", response.get("access_token").toString());

        // Only include refresh_token if it is present in the response
        if (response.containsKey("refresh_token")) {
            tokens.put("refresh_token", response.get("refresh_token").toString());
        }

        tokens.put("expires_in", response.get("expires_in").toString());
        return tokens;
    }
}