package com.example.backend.controller;

import com.example.backend.entity.User;
import com.example.backend.model.LoginRequest;
import com.example.backend.model.LoginResponse;
import com.example.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:4200") // ✅ Allows Angular frontend (port 4200) to access backend APIs
public class AuthController {

    private final UserRepository userRepo; // ✅ Repository to handle user authentication and role data

    public AuthController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    // Handles user login authentication
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Check if username exists in the database
        Optional<User> userOpt = userRepo.findByUsername(request.getUsername());

        // If user not found, return unauthorized response
        if (userOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(null, null, "User not found"));
        }

        User user = userOpt.get();

        // If password is incorrect, return unauthorized response
        if (!user.getPassword().equals(request.getPassword())) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(user.getUsername(), null, "Invalid password"));
        }

        // If authentication successful, return username, role, and message
        return ResponseEntity.ok(
                new LoginResponse(user.getUsername(), user.getRole().getName(), "Login successful")
        );
    }
}
