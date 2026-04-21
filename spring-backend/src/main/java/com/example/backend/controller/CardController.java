package com.example.backend.controller;

import com.example.backend.entity.Card;
import com.example.backend.repository.CardRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cards")
@CrossOrigin(origins = "http://localhost:4200")
public class CardController {

    private final CardRepository repository;

    public CardController(CardRepository repository) {
        this.repository = repository;
    }

    // 🔍 MANAGER can view all cards
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public List<Card> getAllCards() {
        return repository.findAll();
    }

    // 🔍 MANAGER can view card details
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public Card getCardById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
    }

    // ✏️ Direct create — MANAGER only (STAFF must go through maker-checker)
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public Card createCard(@RequestBody Card card) {
        return repository.save(card);
    }

    // ✏️ Direct update — MANAGER only (STAFF must go through maker-checker)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public Card updateCard(@PathVariable Long id, @RequestBody Card updated) {
        return repository.findById(id).map(c -> {
            c.setCardType(updated.getCardType());
            c.setStatus(updated.getStatus());
            return repository.save(c);
        }).orElseThrow(() -> new RuntimeException("Card not found"));
    }

    // ❌ Direct delete — MANAGER only (STAFF must go through maker-checker)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public void deleteCard(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
