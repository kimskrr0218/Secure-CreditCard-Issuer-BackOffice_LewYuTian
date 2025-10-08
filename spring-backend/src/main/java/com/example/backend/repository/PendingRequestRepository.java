package com.example.backend.repository;

import com.example.backend.entity.PendingRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PendingRequestRepository extends JpaRepository<PendingRequest, Long> {
}
