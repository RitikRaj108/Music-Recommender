package com.project.recommender_pro.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;

@Getter
@Configuration
public class ClerkConfig {

    @Value("${clerk.api.key}")
    private String clerkApiKey;

    @Value("${clerk.signing.secret}")
    private String webhookId;
}

