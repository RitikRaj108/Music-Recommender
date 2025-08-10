package com.project.recommender_pro.controllers;

import com.project.recommender_pro.service.ClerkService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.beans.factory.annotation.*;
import com.fasterxml.jackson.databind.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.nio.charset.*;
import java.util.*;
import java.security.*;
import java.io.*;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/clerk/handler")
public class ClerkWebhookController {
    private static final Logger logger = LoggerFactory.getLogger(ClerkWebhookController.class);

    private static final long SIGNATURE_TOLERANCE_MINUTES = 5;
    private static final String CLERK_SECRET_PREFIX = "whsec_";
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    // Hardcoded development mode flag - set to true for testing
    private static final boolean DEVELOPMENT_MODE = true;

    @Autowired
    private ClerkService clerkService;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${clerk.signing.secret}")
    private String clerkWebhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhookEvent(
            @RequestBody byte[] payloadBytes,
            @RequestHeader(value = "Clerk-Signature", required = false) String signatureHeader) {

        boolean skipAuthentication = DEVELOPMENT_MODE && (signatureHeader == null || signatureHeader.isEmpty());

        // Log development mode usage
        if (skipAuthentication) {
            logger.warn("⚠️ DEVELOPMENT MODE: Skipping signature verification. DO NOT USE IN PRODUCTION!");
        }
        // In production mode, require signature
        else if (signatureHeader == null || signatureHeader.isEmpty()) {
            logger.warn("Missing Clerk-Signature header in request");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Missing required signature header");
        }
        // Verify signature if provided
        else if (!skipAuthentication && !verifySignature(payloadBytes, signatureHeader)) {
            logger.warn("Webhook signature verification failed");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        try {
            JsonNode payload = parsePayload(payloadBytes);
            String eventType = getEventType(payload);
            JsonNode userData = payload.path("data");

            logger.info("Processing webhook event: {}", eventType);

            switch (eventType) {
                case "user.created":
                    return processUserCreation(userData);
                case "user.updated":
                    return processUserUpdate(userData);
                case "user.deleted":
                    return processUserDeletion(userData);
                default:
                    logger.info("Unhandled event type: {}", eventType);
                    return ResponseEntity.ok("Event received but not handled");
            }
        } catch (InvalidPayloadException e) {
            logger.error("Payload processing error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error handling webhook: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Server error");
        }
    }

    private ResponseEntity<String> processUserCreation(JsonNode userData) throws InvalidPayloadException {
        try {
            UserInfo userInfo = extractUserInfo(userData);
            clerkService.createUser(
                    userInfo.clerkId(),
                    userInfo.email(),
                    userInfo.username()
            );
            logger.info("User created: {}", userInfo.clerkId());
            return ResponseEntity.ok("User created successfully");
        } catch (Exception e) {
            throw new InvalidPayloadException("User creation failed: " + e.getMessage());
        }
    }

    private ResponseEntity<String> processUserUpdate(JsonNode userData) throws InvalidPayloadException {
        try {
            UserInfo userInfo = extractUserInfo(userData);
            clerkService.updateUser(
                    userInfo.clerkId(),
                    userInfo.email(),
                    userInfo.username()
            );
            logger.info("User updated: {}", userInfo.clerkId());
            return ResponseEntity.ok("User updated successfully");
        } catch (Exception e) {
            throw new InvalidPayloadException("User update failed: " + e.getMessage());
        }
    }

    private ResponseEntity<String> processUserDeletion(JsonNode userData) throws InvalidPayloadException {
        String clerkId = userData.path("id").asText();
        if (clerkId.isEmpty()) {
            throw new InvalidPayloadException("Missing user ID in deletion payload");
        }

        try {
            clerkService.deleteUserByClerkId(clerkId);
            logger.info("User deleted: {}", clerkId);
            return ResponseEntity.ok("User deleted successfully");
        } catch (Exception e) {
            throw new InvalidPayloadException("User deletion failed: " + e.getMessage());
        }
    }

    private UserInfo extractUserInfo(JsonNode userData) throws InvalidPayloadException {
        String clerkId = userData.path("id").asText();
        if (clerkId.isEmpty()) {
            throw new InvalidPayloadException("Missing user ID");
        }

        String email = extractPrimaryEmail(userData);
        String username = userData.path("username").asText();

        return new UserInfo(clerkId, email, username);
    }

    private String extractPrimaryEmail(JsonNode userData) throws InvalidPayloadException {
        String primaryEmailId = userData.path("primary_email_address_id").asText();
        if (primaryEmailId.isEmpty()) {
            throw new InvalidPayloadException("No primary email ID found");
        }

        for (JsonNode emailNode : userData.path("email_addresses")) {
            if (primaryEmailId.equals(emailNode.path("id").asText())) {
                return emailNode.path("email_address").asText();
            }
        }

        throw new InvalidPayloadException("Primary email address not found in list");
    }

    private JsonNode parsePayload(byte[] payloadBytes) throws InvalidPayloadException {
        try {
            return objectMapper.readTree(payloadBytes);
        } catch (IOException e) {
            throw new InvalidPayloadException("Invalid JSON payload");
        }
    }

    private String getEventType(JsonNode payload) throws InvalidPayloadException {
        String eventType = payload.path("type").asText();
        if (eventType.isEmpty()) {
            throw new InvalidPayloadException("Missing event type");
        }
        return eventType;
    }

    public boolean verifySignature(byte[] payloadBytes, String signatureHeader) {
        try {
            Map<String, String> signatureParts = parseSignatureHeader(signatureHeader);
            String timestamp = signatureParts.get("t");
            String receivedSignature = signatureParts.get("v1");

            if (timestamp == null || receivedSignature == null) {
                logger.error("Missing required signature components");
                return false;
            }

            validateTimestamp(timestamp);
            byte[] signedPayload = constructSignedPayload(timestamp, payloadBytes);
            String computedSignature = computeSignature(signedPayload);

            return secureCompare(computedSignature, receivedSignature);
        } catch (Exception e) {
            logger.error("Signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    private Map<String, String> parseSignatureHeader(String signatureHeader) {
        Map<String, String> parts = new HashMap<>();
        for (String part : signatureHeader.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2) {
                parts.put(kv[0], kv[1]);
            }
        }
        return parts;
    }

    private void validateTimestamp(String timestamp) {
        long time = Long.parseLong(timestamp) * 1000;
        long currentTime = System.currentTimeMillis();
        long tolerance = TimeUnit.MINUTES.toMillis(SIGNATURE_TOLERANCE_MINUTES);

        if (Math.abs(currentTime - time) > tolerance) {
            throw new SecurityException("Expired webhook signature");
        }
    }

    private byte[] constructSignedPayload(String timestamp, byte[] payload) throws IOException {
        ByteArrayOutputStream data = new ByteArrayOutputStream();
        data.write(timestamp.getBytes(StandardCharsets.UTF_8));
        data.write('.');
        data.write(payload);
        return data.toByteArray();
    }

    private String computeSignature(byte[] signedPayload) throws NoSuchAlgorithmException, InvalidKeyException {
        byte[] secretKeyBytes = getWebhookSecret();
        SecretKeySpec secretKey = new SecretKeySpec(secretKeyBytes, HMAC_ALGORITHM);

        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(secretKey);
        byte[] digest = mac.doFinal(signedPayload);
        return bytesToHex(digest);
    }

    private byte[] getWebhookSecret() {
        String secret = clerkWebhookSecret.startsWith(CLERK_SECRET_PREFIX)
                ? clerkWebhookSecret.substring(CLERK_SECRET_PREFIX.length())
                : clerkWebhookSecret;
        return Base64.getDecoder().decode(secret);
    }

    private boolean secureCompare(String a, String b) {
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }

    private record UserInfo(String clerkId, String email, String username) {}
    private static class InvalidPayloadException extends Exception {
        public InvalidPayloadException(String message) {
            super(message);
        }
    }
}