package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.model.LoginRequest;
import com.example.backend.model.LoginResponse;
import com.example.backend.repository.UserRepository;
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

import java.util.Optional;

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

            Authentication authentication = new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword());
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
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(request.getUsername(), null, "Invalid username or password"));
        }
    }
}
