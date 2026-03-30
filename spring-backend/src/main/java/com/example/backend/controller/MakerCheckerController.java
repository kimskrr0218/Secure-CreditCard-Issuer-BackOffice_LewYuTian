package com.example.backend.controller;

import com.example.backend.entity.PendingRequest;
import com.example.backend.enums.RequestStatus;
import com.example.backend.repository.PendingRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/maker-checker")
@CrossOrigin(origins = "http://localhost:4200")
public class MakerCheckerController {

    @Autowired
    private PendingRequestRepository pendingRequestRepository;

    @Autowired
    private com.example.backend.repository.UserRepository userRepository;

    @PostMapping("/requests")
    public ResponseEntity<?> createRequest(@RequestBody PendingRequest request) {
        request.setStatus(RequestStatus.PENDING);
        request.setCreatedAt(LocalDateTime.now());
        
        if ("RESET_PASSWORD".equalsIgnoreCase(request.getRequestType()) && request.getUsername() != null) {
            com.example.backend.entity.User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + request.getUsername()));
            request.setEmail(user.getEmail());
            request.setRole(user.getRole() != null ? user.getRole().getName() : null);
        }
        
        PendingRequest saved = pendingRequestRepository.save(request);
        
        return ResponseEntity.ok(saved);
    }
}
