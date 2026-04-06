package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.util.TotpUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "http://localhost:4200")
public class ProfileController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ─── GET current user profile ───────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getProfile(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Build a safe response — never expose password or secret
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("username", user.getUsername());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole() != null ? user.getRole().getName() : null);
        profile.put("status", user.getStatus());
        profile.put("twoFactorEnabled", user.getTwoFactorEnabled());
        profile.put("forcePasswordChange", user.getForcePasswordChange());

        return ResponseEntity.ok(profile);
    }

    // ─── UPDATE email ───────────────────────────────────────────────
    @PutMapping("/email")
    public ResponseEntity<?> updateEmail(@RequestBody Map<String, String> body, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        String newEmail = body.get("email");
        if (newEmail == null || newEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email cannot be empty"));
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if email is already taken by another user
        userRepository.findByEmail(newEmail).ifPresent(existing -> {
            if (!existing.getId().equals(user.getId())) {
                throw new RuntimeException("Email already in use");
            }
        });

        user.setEmail(newEmail);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Email updated successfully"));
    }

    // ─── CHANGE password ────────────────────────────────────────────
    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (oldPassword == null || oldPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Current password is required"));
        }
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password is required"));
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password must be at least 6 characters"));
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate old password
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Current password is incorrect"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setForcePasswordChange(false);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    // ─── SETUP 2FA: generate secret + QR code URL ──────────────────
    @PostMapping("/2fa/setup")
    public ResponseEntity<?> setup2FA(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            return ResponseEntity.badRequest().body(Map.of("message", "2FA is already enabled"));
        }

        // Generate a new secret and save it (not yet enabled)
        String secret = TotpUtil.generateSecret();
        user.setTwoFactorSecret(secret);
        userRepository.save(user);

        String otpAuthUrl = TotpUtil.buildOtpAuthUrl(secret, user.getUsername());

        return ResponseEntity.ok(Map.of(
                "secret", secret,
                "qrUrl", otpAuthUrl,
                "message", "Scan the QR code with Google Authenticator, then verify with a code"
        ));
    }

    // ─── VERIFY 2FA: confirm setup with a valid code ────────────────
    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FASetup(@RequestBody Map<String, String> body, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Verification code is required"));
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getTwoFactorSecret() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please initiate 2FA setup first"));
        }

        if (!TotpUtil.verifyCode(user.getTwoFactorSecret(), code)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid verification code. Please try again."));
        }

        // Code is valid — enable 2FA
        user.setTwoFactorEnabled(true);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Two-Factor Authentication enabled successfully!",
                "twoFactorEnabled", true
        ));
    }

    // ─── DISABLE 2FA ────────────────────────────────────────────────
    @PostMapping("/2fa/disable")
    public ResponseEntity<?> disable2FA(@RequestBody Map<String, String> body, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }

        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Verification code is required to disable 2FA"));
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            return ResponseEntity.badRequest().body(Map.of("message", "2FA is not currently enabled"));
        }

        if (!TotpUtil.verifyCode(user.getTwoFactorSecret(), code)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid verification code"));
        }

        // Disable 2FA and clear secret
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Two-Factor Authentication disabled",
                "twoFactorEnabled", false
        ));
    }
}
