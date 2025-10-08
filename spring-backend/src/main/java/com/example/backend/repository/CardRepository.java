package com.example.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.backend.entity.Card;

public interface CardRepository extends JpaRepository<Card, Long> {}
