package com.example.backend.repository;

import com.example.backend.entity.PendingRequest;
import com.example.backend.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PendingRequestRepository extends JpaRepository<PendingRequest, Long> {

    List<PendingRequest> findByCreatedBy(String createdBy);

    List<PendingRequest> findByEntityTypeAndStatus(String entityType, RequestStatus status);

    long countByStatus(RequestStatus status);

    long countByStatusAndCreatedBy(RequestStatus status, String createdBy);
}