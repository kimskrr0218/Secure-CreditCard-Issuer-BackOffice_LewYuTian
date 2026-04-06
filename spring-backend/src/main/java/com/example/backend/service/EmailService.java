package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    @Value("${brevo.sender.name}")
    private String senderName;

    private final RestTemplate restTemplate = new RestTemplate();

    // ==================== CORE SEND METHOD ====================

    private void sendEmail(String toEmail, String subject, String textContent) {
        try {
            String jsonBody = """
                    {
                      "sender": { "name": "%s", "email": "%s" },
                      "to": [{ "email": "%s" }],
                      "subject": "%s",
                      "textContent": %s
                    }
                    """.formatted(
                    senderName,
                    senderEmail,
                    toEmail,
                    escapeJson(subject),
                    toJsonString(textContent)
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Email sent to {} — subject: {}", toEmail, subject);
            } else {
                log.error("Brevo API returned {}: {}", response.getStatusCode(), response.getBody());
            }
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    // ==================== PUBLIC METHODS ====================

    @Async
    public void sendTemporaryPassword(String email, String tempPassword) {
        String body = "Hello,\n\n"
                + "Your password reset request has been approved.\n\n"
                + "Temporary Password: " + tempPassword + "\n\n"
                + "Please login and change your password immediately.";
        sendEmail(email, "Password Reset Approved", body);
    }

    @Async
    public void sendAccountActivationEmail(String email, String firstName, String accountNumber) {
        String name = (firstName != null ? firstName : "Valued Customer");
        String body = "Dear " + name + ",\n\n"
                + "Your credit account (Account No: " + accountNumber + ") has been successfully activated.\n\n"
                + "You may now proceed to use your account and request a credit card.\n\n"
                + "If you did not request this, please contact our support team immediately.\n\n"
                + "Thank you for choosing our services.";
        sendEmail(email, "Your Credit Account Has Been Activated", body);
    }

    @Async
    public void sendCardIssuedEmail(String email, String cardHolderName, String maskedCardNumber) {
        String name = (cardHolderName != null ? cardHolderName : "Valued Customer");
        String body = "Dear " + name + ",\n\n"
                + "We are pleased to inform you that your credit card has been successfully issued.\n\n"
                + "Card Number: " + maskedCardNumber + "\n\n"
                + "Your card is now ready for use. Please keep your card details secure at all times.\n\n"
                + "If you did not request this, please contact our support team immediately.\n\n"
                + "Thank you for choosing our services.";
        sendEmail(email, "Your Credit Card Has Been Issued", body);
    }

    // ==================== HELPERS ====================

    private static String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    /** Convert a plain-text string into a valid JSON string literal (with quotes). */
    private static String toJsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

}
