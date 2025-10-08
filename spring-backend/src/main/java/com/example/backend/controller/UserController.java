package com.example.backend.controller;

import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserController(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    // ✅ Get all users
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // ✅ Create new user (Admin only)
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            // Check if username already exists
            Optional<User> existingUser = userRepository.findByUsername(user.getUsername());
            if (existingUser.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("❌ Username already exists!");
            }

            // Ensure role exists by name (ADMIN / MANAGER / STAFF)
            Role role = roleRepository.findByName(user.getRole().getName().toUpperCase())
                    .orElseThrow(() -> new RuntimeException("❌ Role not found in database"));

            // Assign role and save
            user.setRole(role);
            userRepository.save(user);

            return ResponseEntity.ok("✅ User '" + user.getUsername() + "' created successfully!");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("⚠️ Error creating user: " + e.getMessage());
        }
    }

    // Update user role
    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Role newRole) {
        try {
            User user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Role role = roleRepository.findByName(newRole.getName().toUpperCase())
                    .orElseThrow(() -> new RuntimeException("Role not found"));

            user.setRole(role);
            userRepository.save(user);

            return ResponseEntity.ok("✅ User role updated successfully!");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("⚠️ Error updating role: " + e.getMessage());
        }
    }
}
