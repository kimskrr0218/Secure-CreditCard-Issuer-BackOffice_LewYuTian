package com.example.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.backend.entity.Customer;
import com.example.backend.enums.CustomerStatus;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    long countByStatus(CustomerStatus status);
    boolean existsByIdNumber(String idNumber);
    boolean existsByIdNumberAndIdNot(String idNumber, Long id);
}
