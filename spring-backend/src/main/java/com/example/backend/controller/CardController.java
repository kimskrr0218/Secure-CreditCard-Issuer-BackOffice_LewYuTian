package com.example.backend.controller;

import com.example.backend.entity.Card;
import com.example.backend.repository.CardRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/cards")
@CrossOrigin(origins = "http://localhost:4200") // Allows Angular frontend access to this API
public class CardController {

    private final CardRepository repository; // Repository for performing CRUD operations on Card entity

    public CardController(CardRepository repository) {
        this.repository = repository;
    }

    // Retrieve all cards from the database
    @GetMapping
    public List<Card> getAllCards() {
        return repository.findAll();
    }

    // Retrieve specific card details by card ID
    @GetMapping("/{id}")
    public Card getCardById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
    }

    // Normally, card creation is done via PendingRequest (Maker–Checker approval flow)
    // This endpoint is only used for direct testing or by system admin
    @PostMapping
    public Card createCard(@RequestBody Card card) {
        return repository.save(card);
    }

    // Update an existing card’s type or status
    @PutMapping("/{id}")
    public Card updateCard(@PathVariable Long id, @RequestBody Card updated) {
        return repository.findById(id).map(c -> {
            c.setCardType(updated.getCardType());
            c.setStatus(updated.getStatus());
            return repository.save(c);
        }).orElseThrow(() -> new RuntimeException("Card not found"));
    }

    // Delete a card record by ID
    @DeleteMapping("/{id}")
    public void deleteCard(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
