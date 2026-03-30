package com.example.backend.controller;

import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.entity.PendingRequest;
import com.example.backend.enums.RequestStatus;
import com.example.backend.repository.PendingRequestRepository;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PendingRequestRepository pendingRequestRepository;
    private final ObjectMapper objectMapper;

    public UserController(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, PendingRequestRepository pendingRequestRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.pendingRequestRepository = pendingRequestRepository;
        this.objectMapper = objectMapper;
    }

    // 🔒 ADMIN ONLY — View all users
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // 🔒 PUBLIC — Request user registration
    @PostMapping("/register-request")
    public ResponseEntity<?> registerUserRequest(@RequestBody Map<String, String> requestData) {
        try {
            String username = requestData.get("username");
            String email = requestData.get("email");
            String password = requestData.get("password");
            String roleName = requestData.getOrDefault("role", "MAKER"); // default role

            if (username == null || email == null || password == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Username, email, and password are required"));
            }

            Optional<User> existingUser = userRepository.findByUsername(username);
            if (existingUser.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Username already exists"));
            }
            if (userRepository.findAll().stream().anyMatch(u -> email.equalsIgnoreCase(u.getEmail()))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Email already exists"));
            }

            // Encrypt password immediately before putting it into the payload
            String encryptedPassword = passwordEncoder.encode(password);

            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("username", username);
            payloadMap.put("email", email);
            payloadMap.put("password", encryptedPassword);
            payloadMap.put("role", roleName);

            String payload = objectMapper.writeValueAsString(payloadMap);

            PendingRequest pendingRequest = new PendingRequest();
            pendingRequest.setEntityType("USER");
            pendingRequest.setOperation("CREATE");
            pendingRequest.setRequestType("REGISTER");
            pendingRequest.setStatus(RequestStatus.PENDING);
            pendingRequest.setPayload(payload);
            pendingRequest.setCreatedBy(username);
            pendingRequest.setCreatedAt(LocalDateTime.now());
            
            // Set new fields for easier display
            pendingRequest.setUsername(username);
            pendingRequest.setEmail(email);
            pendingRequest.setRole(roleName);

            pendingRequestRepository.save(pendingRequest);

            return ResponseEntity.ok(Map.of("message", "Registration request sent for admin approval"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error submitting registration request: " + e.getMessage()));
        }
    }

    // 🔒 ADMIN ONLY — Create new user
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            Optional<User> existingUser = userRepository.findByUsername(user.getUsername());
            if (existingUser.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("❌ Username already exists!");
            }

            if (user.getEmail() != null && userRepository.findAll().stream().anyMatch(u -> user.getEmail().equalsIgnoreCase(u.getEmail()))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("❌ Email already exists!");
            }

            Role role = roleRepository.findByName(
                    user.getRole().getName().toUpperCase()
            ).orElseThrow(() -> new RuntimeException("❌ Role not found"));

            user.setRole(role);

            // Password encoding logic
            if (user.getPassword() == null || user.getPassword().isEmpty()) {
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Password cannot be empty");
            }
            user.setPassword(passwordEncoder.encode(user.getPassword()));

            userRepository.save(user);

            return ResponseEntity.ok("✅ User '" + user.getUsername() + "' created successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("⚠️ Error creating user: " + e.getMessage());
        }
    }

    // 🔒 ADMIN ONLY — Update user role
    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Role newRole) {
        try {
            User user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Role role = roleRepository.findByName(
                    newRole.getName().toUpperCase()
            ).orElseThrow(() -> new RuntimeException("Role not found"));

            user.setRole(role);
            userRepository.save(user);

            return ResponseEntity.ok("✅ User role updated successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("⚠️ Error updating role: " + e.getMessage());
        }
    }
}
