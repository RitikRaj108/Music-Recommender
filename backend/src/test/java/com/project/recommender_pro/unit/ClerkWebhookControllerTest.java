package com.project.recommender_pro.unit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.project.recommender_pro.controllers.ClerkWebhookController;
import com.project.recommender_pro.service.ClerkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security filters if needed
class ClerkWebhookControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ClerkService clerkService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ClerkWebhookController clerkWebhookController;

    @BeforeEach
    void setup() throws Exception {
        // Create a spy of the controller so we can override its private method.
        clerkWebhookController = Mockito.spy(clerkWebhookController);

        // Stub the private verifySignature method to always return true.
        // This uses Mockito's inline mocking (requires the mockito-inline dependency).
        Mockito.doReturn(true)
                .when(clerkWebhookController)
                .verifySignature(any(byte[].class), any(String.class));


        mockMvc = MockMvcBuilders.standaloneSetup(clerkWebhookController).build();
    }

    @Test
    void handleWebhookEvent_UserCreated_ReturnsSuccess() throws Exception {
        String payload = "{\"type\":\"user.created\",\"data\":{\"id\":\"clerk123\",\"email_addresses\":[{\"id\":\"email1\",\"email_address\":\"test@example.com\"}],\"primary_email_address_id\":\"email1\",\"username\":\"testuser\"}}";

        // Mock the ObjectMapper to parse the payload
        JsonNode payloadNode = new ObjectMapper().readTree(payload);
        Mockito.when(objectMapper.readTree(any(byte[].class)))
                .thenReturn(payloadNode);

        mockMvc.perform(post("/clerk/handler/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("Clerk-Signature", "t=123,v1=abc"))
                .andExpect(status().isOk())
                .andExpect(content().string("User created successfully"));
    }
}
