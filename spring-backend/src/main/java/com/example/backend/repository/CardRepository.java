package com.example.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.backend.entity.Card;

public interface CardRepository extends JpaRepository<Card, Long> {
    long countByStatus(String status);
    long countByCardType(String cardType);
    long countByCardBrand(String cardBrand);
    long countByCardMode(String cardMode);
    java.util.List<Card> findByAccountId(Long accountId);
}
