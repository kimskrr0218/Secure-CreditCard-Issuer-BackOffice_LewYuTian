package com.example.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.backend.entity.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {
}
