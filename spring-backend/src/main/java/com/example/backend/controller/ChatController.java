package com.example.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatController {

    @Value("${cerebras.api.key}")
    private String apiKey;

    @Value("${cerebras.api.url:https://api.cerebras.ai/v1/chat/completions}")
    private String apiUrl;

    @Value("${cerebras.model:llama-4-scout-17b-16e-instruct}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<?> chat(@RequestBody ChatRequest request) {
        try {
            // Build the Cerebras API request body
            Map<String, Object> body = Map.of(
                "model", model,
                "messages", request.getMessages(),
                "max_tokens", request.getMaxTokens() != null ? request.getMaxTokens() : 1024,
                "temperature", request.getTemperature() != null ? request.getTemperature() : 0.7
            );

            // Serialize to JSON string so we can set Content-Length
            String jsonBody = objectMapper.writeValueAsString(body);
            byte[] jsonBytes = jsonBody.getBytes(StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            headers.setContentLength(jsonBytes.length);

            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, entity, Map.class
            );

            // Extract the assistant's reply from the Cerebras response
            Map responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map> choices = (List<Map>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map message = (Map) choices.get(0).get("message");
                    return ResponseEntity.ok(Map.of(
                        "reply", message.get("content"),
                        "role", message.get("role")
                    ));
                }
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "No response from AI"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Chat request failed: " + e.getMessage()));
        }
    }

    // --- Request DTO ---
    public static class ChatRequest {
        private List<Map<String, String>> messages;
        private Integer maxTokens;
        private Double temperature;

        public List<Map<String, String>> getMessages() { return messages; }
        public void setMessages(List<Map<String, String>> messages) { this.messages = messages; }
        public Integer getMaxTokens() { return maxTokens; }
        public void setMaxTokens(Integer maxTokens) { this.maxTokens = maxTokens; }
        public Double getTemperature() { return temperature; }
        public void setTemperature(Double temperature) { this.temperature = temperature; }
    }
}
