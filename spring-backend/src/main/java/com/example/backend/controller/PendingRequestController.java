package com.example.backend.controller;

import com.example.backend.entity.*;
import com.example.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/pending")
@CrossOrigin(origins = "http://localhost:4200")
public class PendingRequestController {

    private final PendingRequestRepository repository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PendingRequestController(
            PendingRequestRepository repository,
            CustomerRepository customerRepository,
            AccountRepository accountRepository,
            CardRepository cardRepository,
            UserRepository userRepository
    ) {
        this.repository = repository;
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.userRepository = userRepository;
    }

    // --- MANAGER FETCH ---
    @GetMapping
    public ResponseEntity<?> getAllRequests(@RequestParam String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || !"MANAGER".equals(userOpt.get().getRole().getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Only MANAGER can view requests.");
        }
        return ResponseEntity.ok(repository.findAll());
    }

    // --- STAFF CREATE PENDING ---
    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody PendingRequest request) {
        request.setStatus("PENDING");
        request.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repository.save(request));
    }

    // --- MANAGER APPROVE ---
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id, @RequestParam String username) throws Exception {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || !"MANAGER".equals(userOpt.get().getRole().getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Only MANAGER can approve.");
        }

        PendingRequest req = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        switch (req.getEntityType().toUpperCase()) {
            case "CUSTOMER" -> handleCustomer(req);
            case "ACCOUNT" -> handleAccount(req);
            case "CARD" -> handleCard(req);
            default -> throw new RuntimeException("Unsupported entity type: " + req.getEntityType());
        }

        req.setStatus("APPROVED");
        req.setApprovedBy(userOpt.get().getUsername());
        req.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repository.save(req));
    }

    // --- MANAGER REJECT ---
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestParam String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || !"MANAGER".equals(userOpt.get().getRole().getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Only MANAGER can reject.");
        }

        PendingRequest req = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        req.setStatus("REJECTED");
        req.setApprovedBy(userOpt.get().getUsername());
        req.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repository.save(req));
    }

    // --- HANDLERS ---

    private void handleCustomer(PendingRequest req) throws Exception {
        if ("CREATE".equalsIgnoreCase(req.getOperation())) {
            Customer c = objectMapper.readValue(req.getPayload(), Customer.class);
            customerRepository.save(c);
        } else if ("UPDATE".equalsIgnoreCase(req.getOperation())) {
            Customer updated = objectMapper.readValue(req.getPayload(), Customer.class);
            customerRepository.findById(updated.getId()).ifPresent(c -> {
                c.setName(updated.getName());
                c.setEmail(updated.getEmail());
                customerRepository.save(c);
            });
        } else if ("DELETE".equalsIgnoreCase(req.getOperation())) {
            JsonNode node = objectMapper.readTree(req.getPayload());
            customerRepository.deleteById(node.get("id").asLong());
        }
    }

    private void handleAccount(PendingRequest req) throws Exception {
        if ("CREATE".equalsIgnoreCase(req.getOperation())) {
            Account acc = objectMapper.readValue(req.getPayload(), Account.class);

            Customer customer = customerRepository.findById(acc.getCustomer().getId())
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            String accNum = String.format("ACC-%06d", accountRepository.count() + 1);
            acc.setAccountNumber(accNum);
            acc.setCustomer(customer);
            acc.setStatus("ACTIVE");

            accountRepository.save(acc);
        } else if ("UPDATE".equalsIgnoreCase(req.getOperation())) {
            Account updated = objectMapper.readValue(req.getPayload(), Account.class);
            accountRepository.findById(updated.getId()).ifPresent(acc -> {
                acc.setAccountType(updated.getAccountType());
                acc.setBalance(updated.getBalance());
                acc.setStatus(updated.getStatus());
                accountRepository.save(acc);
            });
        } else if ("DELETE".equalsIgnoreCase(req.getOperation())) {
            JsonNode node = objectMapper.readTree(req.getPayload());
            accountRepository.deleteById(node.get("id").asLong());
        }
    }

    private void handleCard(PendingRequest req) throws Exception {
        JsonNode node = objectMapper.readTree(req.getPayload());

        if ("CREATE".equalsIgnoreCase(req.getOperation())) {
            Long accountId = node.get("account").get("id").asLong();
            String cardType = node.get("cardType").asText();

            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Account not found"));

            String cardNum = String.format("CARD-%06d", cardRepository.count() + 1);

            Card card = new Card();
            card.setAccount(account);
            card.setCardType(cardType);
            card.setCardNumber(cardNum);
            card.setStatus("ACTIVE");

            cardRepository.save(card);

        } else if ("UPDATE".equalsIgnoreCase(req.getOperation())) {
            Long cardId = node.get("id").asLong();
            String newType = node.has("cardType") ? node.get("cardType").asText() : null;
            String newStatus = node.has("status") ? node.get("status").asText() : null;

            cardRepository.findById(cardId).ifPresent(c -> {
                if (newType != null) c.setCardType(newType);
                if (newStatus != null) c.setStatus(newStatus);
                cardRepository.save(c);
            });

        } else if ("DELETE".equalsIgnoreCase(req.getOperation())) {
            Long cardId = node.get("id").asLong();
            if (cardRepository.existsById(cardId)) {
                cardRepository.deleteById(cardId);
            } else {
                throw new RuntimeException("Card not found for deletion");
            }
        }
    }

}
