package com.example.backend.controller;

import com.example.backend.entity.Role;
import com.example.backend.repository.RoleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "http://localhost:4200")
public class RoleController {

    private final RoleRepository roleRepository;

    public RoleController(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    // 🔒 ADMIN ONLY — View all roles
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Role>> getAllRoles() {
        return ResponseEntity.ok(roleRepository.findAll());
    }

    // 🔒 ADMIN ONLY — Get role by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getRoleById(@PathVariable Long id) {
        Optional<Role> role = roleRepository.findById(id);
        if (role.isPresent()) {
            return ResponseEntity.ok(role.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("❌ Role not found");
    }

    // 🔒 ADMIN ONLY — Create new role
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createRole(@RequestBody Role role) {
        try {
            // Normalize role name to uppercase
            String roleName = role.getName().toUpperCase().trim();

            // Check if role already exists
            Optional<Role> existingRole = roleRepository.findByName(roleName);
            if (existingRole.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("❌ Role '" + roleName + "' already exists!");
            }

            role.setName(roleName);
            Role savedRole = roleRepository.save(role);

            return ResponseEntity.ok(savedRole);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("⚠️ Error creating role: " + e.getMessage());
        }
    }

    // 🔒 ADMIN ONLY — Update role
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Role roleUpdate) {
        try {
            Role role = roleRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Role not found"));

            String newName = roleUpdate.getName().toUpperCase().trim();

            // Check if another role already has this name
            Optional<Role> existingRole = roleRepository.findByName(newName);
            if (existingRole.isPresent() && !existingRole.get().getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("❌ Role name '" + newName + "' already exists!");
            }

            role.setName(newName);
            Role savedRole = roleRepository.save(role);

            return ResponseEntity.ok(savedRole);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("⚠️ Error updating role: " + e.getMessage());
        }
    }

    // 🔒 ADMIN ONLY — Delete role
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteRole(@PathVariable Long id) {
        try {
            if (!roleRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("❌ Role not found");
            }

            roleRepository.deleteById(id);
            return ResponseEntity.ok("✅ Role deleted successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("⚠️ Error deleting role: " + e.getMessage());
        }
    }
}

