package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.example.backend.enums.RequestStatus;

@Entity
@Table(name = "pending_requests")
public class PendingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String entityType;  // CUSTOMER, ACCOUNT, CARD

    @Column(nullable = false)
    private String operation;   // CREATE, UPDATE, DELETE

    @Lob
    @Column(nullable = false)
    private String payload;     // JSON or text data

    @Column(name = "entity_id")
    private Long entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    private String createdBy;
    private String approvedBy;

    // ✅ NEW FIELDS
    @Column(name = "request_type")
    private String requestType;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    private String username;
    private String email;
    private String role;

    @Transient
    private String customerNo;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    // ================= GETTERS & SETTERS =================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    // ✅ NEW GETTER & SETTER
    public String getRequestType() { return requestType; }
    public void setRequestType(String requestType) { this.requestType = requestType; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getCustomerNo() { return customerNo; }
    public void setCustomerNo(String customerNo) { this.customerNo = customerNo; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // ALIASES FOR "entity" so that JS deserialization maps "entity" to "entityType"
    @jakarta.persistence.Transient
    public String getEntity() { return this.entityType; }
    
    @com.fasterxml.jackson.annotation.JsonSetter("entity")
    public void setEntity(String entity) { this.entityType = entity; }
    
    @com.fasterxml.jackson.annotation.JsonSetter("payload")
    public void setPayload(com.fasterxml.jackson.databind.JsonNode payloadNode) {
        if (payloadNode.isTextual()) {
            this.payload = payloadNode.asText();
        } else {
            this.payload = payloadNode.toString();
        }
    }
}