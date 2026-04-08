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

    long countByEntityType(String entityType);

    long countByEntityTypeAndStatus(String entityType, RequestStatus status);

    long countByEntityTypeAndCreatedBy(String entityType, String createdBy);

    long countByEntityTypeAndStatusAndCreatedBy(String entityType, RequestStatus status, String createdBy);

    List<PendingRequest> findTop10ByOrderByCreatedAtDesc();

    List<PendingRequest> findTop10ByCreatedByOrderByCreatedAtDesc(String createdBy);
}