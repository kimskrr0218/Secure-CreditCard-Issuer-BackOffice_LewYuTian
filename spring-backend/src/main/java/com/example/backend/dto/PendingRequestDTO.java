package com.example.backend.dto;

import com.example.backend.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingRequestDTO {
    private Long id;
    private Long requestId; // Alias requested by user
    private String entityType;
    private String operation;
    private String payload;
    private RequestStatus status;
    private String createdBy;
    private String approvedBy;
    private String requestType;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Enriched fields for Customer
    private String customerNo;
    private String name;

    // Enriched fields for Account
    private String accountNumber;
    private Long entityId;

    // Enriched fields for User
    private String username;
    private String email;
    private String role;
}
