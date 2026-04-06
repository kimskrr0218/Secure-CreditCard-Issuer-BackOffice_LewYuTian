package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.model.LoginRequest;
import com.example.backend.model.LoginResponse;
import com.example.backend.repository.UserRepository;
import com.example.backend.util.TotpUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepo;
    private final SecurityContextRepository securityContextRepository;
    private final PasswordEncoder passwordEncoder;

    private final SecurityContextHolderStrategy securityContextHolderStrategy =
            SecurityContextHolder.getContextHolderStrategy();

    /**
     * Temporary store for users who passed password verification but still need 2FA.
     * Maps a short-lived token → username. In production, use Redis or a DB table with expiry.
     */
    private final ConcurrentHashMap<String, String> pending2faTokens = new ConcurrentHashMap<>();

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepo,
                          SecurityContextRepository securityContextRepository, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepo = userRepo;
        this.securityContextRepository = securityContextRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Verify current user details
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated");
        }
        return ResponseEntity.ok(authentication);
    }

    // Handles user login authentication
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        try {
            String identifier = request.getUsername();
            User user = userRepo.findByUsernameOrEmail(identifier, identifier)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw new RuntimeException("Invalid username or password");
            }

            // ── If 2FA is enabled, don't complete login yet ─────────────
            if (Boolean.TRUE.equals(user.getTwoFactorEnabled()) && user.getTwoFactorSecret() != null) {
                // Generate a temporary token so we can look up the user for the 2FA step
                String tempToken = java.util.UUID.randomUUID().toString();
                pending2faTokens.put(tempToken, user.getUsername());

                // Schedule cleanup after 5 minutes
                new Thread(() -> {
                    try { Thread.sleep(5 * 60 * 1000); } catch (InterruptedException ignored) {}
                    pending2faTokens.remove(tempToken);
                }).start();

                return ResponseEntity.ok(new LoginResponse(
                        user.getUsername(),
                        user.getRole().getName(),
                        "2FA_REQUIRED",
                        true
                ));
            }

            // ── Normal login (no 2FA) ───────────────────────────────────
            return completeLogin(user, request.getPassword(), httpRequest, httpResponse);

        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(request.getUsername(), null, "Invalid username or password"));
        }
    }

    // ─── Verify 2FA OTP code and complete login ─────────────────────
    @PostMapping("/login/verify-2fa")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, String> body,
                                       HttpServletRequest httpRequest,
                                       HttpServletResponse httpResponse) {
        try {
            String username = body.get("username");
            String code = body.get("code");
            String password = body.get("password");

            if (username == null || code == null || password == null) {
                return ResponseEntity.badRequest()
                        .body(new LoginResponse(null, null, "Username, password, and code are required"));
            }

            User user = userRepo.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Verify the TOTP code
            if (!TotpUtil.verifyCode(user.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new LoginResponse(username, null, "Invalid verification code"));
            }

            // Complete the login
            return completeLogin(user, password, httpRequest, httpResponse);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(null, null, "2FA verification failed"));
        }
    }

    // ─── Server-side logout: invalidate session & clear context ──────
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        jakarta.servlet.http.HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // ─── Helper: finish authentication & create session ─────────────
    private ResponseEntity<?> completeLogin(User user, String rawPassword,
                                            HttpServletRequest httpRequest,
                                            HttpServletResponse httpResponse) {
        Authentication authentication = new UsernamePasswordAuthenticationToken(user.getUsername(), rawPassword);
        authentication = authenticationManager.authenticate(authentication);

        // Create a new context
        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);

        // Force create session to ensure JSESSIONID is generated
        httpRequest.getSession(true);

        // Explicitly save the context to the session (REQUIRED for Spring Security 6)
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        return ResponseEntity.ok(
                new LoginResponse(user.getUsername(), user.getRole().getName(), "Login successful")
        );
    }
}
