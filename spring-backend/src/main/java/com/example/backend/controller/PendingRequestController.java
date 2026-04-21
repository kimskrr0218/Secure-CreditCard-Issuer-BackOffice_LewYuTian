package com.example.backend.controller;

import com.example.backend.entity.*;
import com.example.backend.repository.*;
import com.example.backend.dto.PendingRequestDTO;
import com.example.backend.enums.RequestStatus;
import com.example.backend.enums.CustomerStatus;
import com.example.backend.model.RejectRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pending")
@CrossOrigin(origins = "http://localhost:4200")
public class PendingRequestController {

    private static final Logger log = LoggerFactory.getLogger(PendingRequestController.class);

    private final PendingRequestRepository repository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final com.example.backend.service.EmailService emailService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    
    @org.springframework.beans.factory.annotation.Autowired
    private ObjectMapper objectMapper;

    public PendingRequestController(
            PendingRequestRepository repository,
            CustomerRepository customerRepository,
            AccountRepository accountRepository,
            CardRepository cardRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            com.example.backend.service.EmailService emailService,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder
    ) {
        this.repository = repository;
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= GET REQUESTS =================

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<java.util.List<PendingRequestDTO>> getAllRequests(@AuthenticationPrincipal UserDetails user) {
        boolean isManager = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));

        java.util.List<PendingRequest> requests;
        if (isManager) {
            requests = repository.findAll();
        } else {
            requests = repository.findByCreatedBy(user.getUsername());
        }

        java.util.List<PendingRequestDTO> dtoList = requests.stream()
                .map(this::mapToDTO)
                .toList();

        return ResponseEntity.ok(dtoList);
    }

    private PendingRequestDTO mapToDTO(PendingRequest req) {
        PendingRequestDTO dto = new PendingRequestDTO();
        dto.setId(req.getId());
        dto.setRequestId(req.getId()); // Map requestId to id as requested
        dto.setEntityType(req.getEntityType());
        dto.setOperation(req.getOperation());
        dto.setPayload(req.getPayload());
        dto.setStatus(req.getStatus());
        dto.setCreatedBy(req.getCreatedBy());
        dto.setApprovedBy(req.getApprovedBy());
        dto.setRequestType(req.getRequestType());
        dto.setRejectionReason(req.getRejectionReason());
        dto.setCreatedAt(req.getCreatedAt());
        dto.setUpdatedAt(req.getUpdatedAt());

        // USER fields
        dto.setUsername(req.getUsername());
        dto.setEmail(req.getEmail());
        dto.setRole(req.getRole());

        // CUSTOMER enrichment
        if ("CUSTOMER".equalsIgnoreCase(req.getEntityType())) {
            try {
                JsonNode payloadNode = objectMapper.readTree(req.getPayload());

                // Step 1: Always pull values directly from payload first (works for all operations)
                if (payloadNode.has("name") && !payloadNode.get("name").asText().isBlank())
                    dto.setName(payloadNode.get("name").asText());
                if (payloadNode.has("email") && !payloadNode.get("email").asText().isBlank())
                    dto.setEmail(payloadNode.get("email").asText());
                if (payloadNode.has("customerNo") && !payloadNode.get("customerNo").asText().isBlank())
                    dto.setCustomerNo(payloadNode.get("customerNo").asText());

                // Step 2: If there is a customer ID, look up DB for authoritative live data
                Long customerId = req.getEntityId();
                if (customerId == null && payloadNode.has("id")) {
                    long rawId = payloadNode.get("id").asLong();
                    if (rawId > 0) customerId = rawId;
                }

                if (customerId != null) {
                    dto.setEntityId(customerId);
                    customerRepository.findById(customerId).ifPresent(c -> {
                        // Override with live DB values (more accurate than payload for UPDATE/DEACTIVATE/DELETE)
                        if (c.getCustomerNo() != null) dto.setCustomerNo(c.getCustomerNo());
                        if (c.getName() != null)       dto.setName(c.getName());
                        if (c.getEmail() != null && dto.getEmail() == null) dto.setEmail(c.getEmail());

                        // Also inject into the payload so the frontend parsedPayload mapping works too
                        if (payloadNode.isObject()) {
                            ObjectNode node = (ObjectNode) payloadNode;
                            node.put("customerNo", c.getCustomerNo());
                            node.put("name", c.getName());
                            dto.setPayload(node.toString());
                        }
                    });
                }

                // Step 3: For CREATE requests that are still pending, customerNo is not yet assigned
                // Set a placeholder so the UI shows something meaningful instead of "-"
                if (dto.getCustomerNo() == null && "CREATE".equalsIgnoreCase(req.getOperation())) {
                    dto.setCustomerNo("N/A");
                }

            } catch (Exception e) {
                // Ignore parsing errors â€” fields will remain null/default
            }
        } else if ("ACCOUNT".equalsIgnoreCase(req.getEntityType())) {
            try {
                JsonNode payloadNode = objectMapper.readTree(req.getPayload());

                // Step 1: Try to find the Account ID from payload or entityId
                Long accountId = req.getEntityId();
                if (accountId == null && payloadNode.has("id")) {
                    long rawId = payloadNode.get("id").asLong();
                    if (rawId > 0) accountId = rawId;
                }
                if (accountId == null && payloadNode.has("accountId")) {
                    long rawId = payloadNode.get("accountId").asLong();
                    if (rawId > 0) accountId = rawId;
                }

                // Step 2: Pull accountNumber from payload first (may exist for CREATE requests)
                if (payloadNode.has("accountNumber") && !payloadNode.get("accountNumber").isNull()) {
                    dto.setAccountNumber(payloadNode.get("accountNumber").asText());
                }

                // Step 3: If we have an account ID, look up DB for authoritative live data
                if (accountId != null) {
                    dto.setEntityId(accountId);
                    final Long finalAccountId = accountId;
                    accountRepository.findById(accountId).ifPresent(account -> {
                        // Override with live DB values
                        if (account.getAccountNumber() != null) dto.setAccountNumber(account.getAccountNumber());
                        if (account.getCustomer() != null && account.getCustomer().getCustomerNo() != null) {
                            dto.setCustomerNo(account.getCustomer().getCustomerNo());
                            req.setCustomerNo(account.getCustomer().getCustomerNo());
                        }

                        // Also inject into the payload so the frontend parsedPayload mapping works too
                        if (payloadNode.isObject()) {
                            ObjectNode node = (ObjectNode) payloadNode;
                            node.put("accountNumber", account.getAccountNumber());
                            if (account.getCustomer() != null && account.getCustomer().getCustomerNo() != null) {
                                node.put("customerNo", account.getCustomer().getCustomerNo());
                            }
                            node.put("entityId", finalAccountId);
                            dto.setPayload(node.toString());
                        }
                    });
                }

                // Step 4: Fallback — try customer ID from payload if customerNo still not set
                if (dto.getCustomerNo() == null) {
                    Long customerId = null;
                    if (payloadNode.has("customer") && payloadNode.get("customer").has("id")) {
                        customerId = payloadNode.get("customer").get("id").asLong();
                    } else if (payloadNode.has("customerId")) {
                        customerId = payloadNode.get("customerId").asLong();
                    }
                    if (customerId != null) {
                        customerRepository.findById(customerId).ifPresent(c -> {
                            dto.setCustomerNo(c.getCustomerNo());
                            req.setCustomerNo(c.getCustomerNo());
                        });
                    }
                }

            } catch (Exception e) {
                // Ignore parsing errors
            }
        } else if ("CARD".equalsIgnoreCase(req.getEntityType())) {
            try {
                JsonNode payloadNode = objectMapper.readTree(req.getPayload());

                // Try to enrich from card entity for non-CREATE operations
                Long cardId = req.getEntityId();
                if (cardId == null && payloadNode.has("id")) {
                    long rawId = payloadNode.get("id").asLong();
                    if (rawId > 0) cardId = rawId;
                }
                // For REPLACE, the card ID is stored as oldCardId
                if (cardId == null && payloadNode.has("oldCardId")) {
                    long rawId = payloadNode.get("oldCardId").asLong();
                    if (rawId > 0) cardId = rawId;
                }

                if (cardId != null) {
                    dto.setEntityId(cardId);
                    final Long finalCardId = cardId;
                    cardRepository.findById(cardId).ifPresent(card -> {
                        // Inject card info into payload for frontend display
                        if (payloadNode.isObject()) {
                            ObjectNode node = (ObjectNode) payloadNode;
                            if (card.getCardNumber() != null && !node.has("cardNumber")) {
                                // Mask card number — never expose full number in API responses
                                node.put("cardNumber", card.getMaskedCardNumber());
                            }
                            if (card.getCardHolderName() != null && !node.has("cardHolderName")) {
                                node.put("cardHolderName", card.getCardHolderName());
                            }
                            if (card.getCardType() != null && !node.has("cardType")) {
                                node.put("cardType", card.getCardType());
                            }
                            if (card.getCardBrand() != null && !node.has("cardBrand")) {
                                node.put("cardBrand", card.getCardBrand());
                            }
                            if (card.getCardMode() != null && !node.has("cardMode")) {
                                node.put("cardMode", card.getCardMode());
                            }
                            // Inject account info
                            if (card.getAccount() != null) {
                                node.put("accountId", card.getAccount().getId());
                                if (card.getAccount().getAccountNumber() != null) {
                                    node.put("accountNumber", card.getAccount().getAccountNumber());
                                }
                                if (card.getAccount().getCurrency() != null) {
                                    node.put("accountCurrency", card.getAccount().getCurrency());
                                }
                            }
                            dto.setPayload(node.toString());
                        }
                        // Also set customerNo from card's customer
                        if (card.getCustomer() != null && card.getCustomer().getCustomerNo() != null) {
                            dto.setCustomerNo(card.getCustomer().getCustomerNo());
                            req.setCustomerNo(card.getCustomer().getCustomerNo());
                        }
                    });
                }

                // Fallback: look up account from payload to derive customer and account info
                Long accountIdFromPayload = null;
                if (payloadNode.has("accountId") && !payloadNode.get("accountId").isNull()) {
                    accountIdFromPayload = payloadNode.get("accountId").asLong();
                }

                if (accountIdFromPayload != null && dto.getCustomerNo() == null) {
                    accountRepository.findById(accountIdFromPayload).ifPresent(acct -> {
                        if (acct.getCustomer() != null) {
                            dto.setCustomerNo(acct.getCustomer().getCustomerNo());
                            req.setCustomerNo(acct.getCustomer().getCustomerNo());
                        }
                        // Inject account + customer info into payload
                        if (payloadNode.isObject()) {
                            ObjectNode node = (ObjectNode) payloadNode;
                            if (acct.getAccountNumber() != null && !node.has("accountNumber")) {
                                node.put("accountNumber", acct.getAccountNumber());
                            }
                            if (acct.getCurrency() != null && !node.has("accountCurrency")) {
                                node.put("accountCurrency", acct.getCurrency());
                            }
                            if (acct.getCustomer() != null) {
                                node.put("customerNo", acct.getCustomer().getCustomerNo());
                                node.put("customerName", acct.getCustomer().getName());
                            }
                            dto.setPayload(node.toString());
                        }
                    });
                }
            } catch (Exception e) {
                // ignore
            }
        }
        return dto;
    }

    // ================= GET USER REGISTRATION PENDING REQUESTS =================
    @GetMapping("/user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<java.util.List<PendingRequestDTO>> getUserPendingRequests() {
        java.util.List<PendingRequest> requests = 
                repository.findByEntityTypeAndStatus("USER", RequestStatus.PENDING);
        
        java.util.List<PendingRequestDTO> dtoList = requests.stream()
                .map(this::mapToDTO)
                .toList();

        return ResponseEntity.ok(dtoList);
    }

    // ================= APPROVE =================

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<?> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user
    ) {
        try {
            PendingRequest req = repository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Request not found"));

            if (req.getStatus() != RequestStatus.PENDING) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Only PENDING requests can be approved."));
            }

            if (req.getCreatedBy() != null &&
                    req.getCreatedBy().equals(user.getUsername())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Maker cannot approve own request."));
            }

            switch (req.getEntityType().toUpperCase()) {
                case "USER" -> handleUser(req);
                case "CUSTOMER" -> handleCustomer(req, user.getUsername());
                case "ACCOUNT" -> handleAccount(req, user.getUsername());
                case "CARD" -> handleCard(req, user.getUsername());
                default -> {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Unsupported entity type"));
                }
            }

            req.setStatus(RequestStatus.APPROVED);
            req.setApprovedBy(user.getUsername());
            req.setUpdatedAt(LocalDateTime.now());

            return ResponseEntity.ok(repository.save(req));
        } catch (Exception e) {
            log.error("Error approving request {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    // ================= REJECT =================

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> reject(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user,
            @RequestBody RejectRequest request
    ) {
        try {
            PendingRequest req = repository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Request not found"));

            if (req.getStatus() != RequestStatus.PENDING) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Only PENDING requests can be rejected."));
            }

            if (req.getCreatedBy() != null &&
                    req.getCreatedBy().equals(user.getUsername())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Maker cannot reject own request."));
            }

            if (request.getReason() == null || request.getReason().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Rejection reason is required."));
            }

            req.setStatus(RequestStatus.REJECTED);
            req.setApprovedBy(user.getUsername());
            req.setRejectionReason(request.getReason());
            req.setUpdatedAt(LocalDateTime.now());

            return ResponseEntity.ok(repository.save(req));
        } catch (Exception e) {
            log.error("Error rejecting request {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    // ================= CREATE =================

    @PostMapping
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<?> createRequest(
            @RequestBody PendingRequest request,
            @AuthenticationPrincipal UserDetails user
    ) {

        request.setStatus(RequestStatus.PENDING);
        request.setCreatedBy(user.getUsername());
        request.setCreatedAt(LocalDateTime.now());

        // If this is a resubmission, immediately mark the old rejected request as SUPERSEDED
        try {
            if (request.getPayload() != null) {
                JsonNode payloadNode = objectMapper.readTree(request.getPayload());
                if (payloadNode.has("originalRequestId") && !payloadNode.get("originalRequestId").isNull()) {
                    Long originalId = payloadNode.get("originalRequestId").asLong();
                    repository.findById(originalId).ifPresent(oldReq -> {
                        if (oldReq.getStatus() == RequestStatus.REJECTED) {
                            oldReq.setStatus(RequestStatus.SUPERSEDED);
                            oldReq.setUpdatedAt(LocalDateTime.now());
                            repository.save(oldReq);
                        }
                    });
                }
            }
        } catch (Exception e) {
            // Ignore JSON parsing errors — proceed with saving the new request
        }

        return ResponseEntity.ok(repository.save(request));
    }

    // ================= DELETE REJECTED REQUEST =================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<?> deleteRejectedRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user
    ) {
        PendingRequest req = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Only allow deletion of REJECTED or SUPERSEDED requests
        String status = req.getStatus().name();
        if (!status.equals("REJECTED") && !status.equals("SUPERSEDED")) {
            return ResponseEntity.badRequest()
                    .body("Only REJECTED requests can be removed.");
        }

        // Staff can only delete their own requests
        if (!req.getCreatedBy().equals(user.getUsername())) {
            return ResponseEntity.status(403)
                    .body("You can only remove your own rejected requests.");
        }

        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ================= HANDLERS =================

    private void handleUser(PendingRequest req) throws Exception {
        if ("REGISTER".equalsIgnoreCase(req.getRequestType()) || "CREATE".equalsIgnoreCase(req.getOperation())) {
            
            // 1. Get from payload
            JsonNode node = objectMapper.readTree(req.getPayload());
            String username = node.get("username").asText();
            String encodedPassword = node.get("password").asText();
            
            String email = null;
            if (node.has("email") && !node.get("email").isNull()) {
                 email = node.get("email").asText();
            }

            String roleName = "STAFF";
            if (node.has("role")) {
                roleName = node.get("role").asText();
            } 
            
            // Clean up role prefix if passed from frontend payload
            if (roleName.startsWith("ROLE_")) {
                roleName = roleName.substring(5);
            }

            // 2. Validate Role
            Role role = roleRepository.findByName(roleName.toUpperCase())
                    .orElseGet(() -> roleRepository.findByName("STAFF")
                    .orElseThrow(() -> new RuntimeException("Role not found")));

            // 3. Check existing user again to prevent 500
            if (userRepository.findByUsername(username).isPresent()) {
                 throw new RuntimeException("User with username " + username + " already exists.");
            }

            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(encodedPassword);
            user.setRole(role);
            user.setForcePasswordChange(false);
            
            userRepository.save(user);

        } else if ("RESET_PASSWORD".equalsIgnoreCase(req.getRequestType()) || "PASSWORD_RESET".equalsIgnoreCase(req.getOperation())) {
            
            String targetUsername = req.getUsername();
            
            // Fallback to payload if username is empty
            if (targetUsername == null && req.getPayload() != null && !req.getPayload().isBlank()) {
                try {
                    JsonNode node = objectMapper.readTree(req.getPayload());
                    if (node.has("username")) {
                        targetUsername = node.get("username").asText();
                    }
                } catch (Exception e) {
                    // Ignore JSON parsing errors
                }
            }

            if (targetUsername == null) {
                throw new RuntimeException("User identifier missing");
            }

            final String finalTargetUsername = targetUsername;
            User user = userRepository.findByUsername(finalTargetUsername)
                .orElseThrow(() -> new RuntimeException("User not found: " + finalTargetUsername));
                    
            String tempPassword = UUID.randomUUID().toString().substring(0,8);
            log.info("Temporary password generated and emailed for user: {}", user.getUsername());
            
            user.setPassword(passwordEncoder.encode(tempPassword));
            user.setForcePasswordChange(true);
            
            userRepository.save(user);
            
            String emailAddress = user.getEmail() != null ? user.getEmail() : user.getUsername();
            emailService.sendTemporaryPassword(emailAddress, tempPassword);
        }
    }

    private String generateCustomerNo() {
        long count = customerRepository.count() + 1;
        return "CUST-" + (1000 + count);
    }

    private void handleCustomer(PendingRequest req, String approverUsername) throws Exception {

        if ("CREATE".equalsIgnoreCase(req.getOperation())) {

            Customer c = objectMapper.readValue(req.getPayload(), Customer.class);
            c.setId(null); // Ensure a new record is created, not an update
            c.setCustomerNo(generateCustomerNo());
            c.setStatus(CustomerStatus.ACTIVE);

            // Audit trail
            c.setCreatedBy(req.getCreatedBy());
            c.setCreatedAt(LocalDateTime.now());
            c.setApprovedBy(approverUsername);

            customerRepository.save(c);

            // If this was a resubmission, ensure the old rejected request is marked as SUPERSEDED
            JsonNode node = objectMapper.readTree(req.getPayload());
            if (node.has("originalRequestId") && !node.get("originalRequestId").isNull()) {
                Long originalId = node.get("originalRequestId").asLong();
                repository.findById(originalId).ifPresent(oldReq -> {
                    oldReq.setStatus(RequestStatus.SUPERSEDED);
                    oldReq.setUpdatedAt(LocalDateTime.now());
                    repository.save(oldReq);
                });
            }

        } else if ("UPDATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());

            if (!node.has("id")) {
                throw new RuntimeException("Customer ID missing in update payload");
            }

            Long id = node.get("id").asLong();

            Customer customer = customerRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            // Basic fields
            if (node.has("name")) {
                customer.setName(node.get("name").asText());
            }
            if (node.has("firstName")) {
                customer.setFirstName(node.get("firstName").asText());
            }
            if (node.has("lastName")) {
                customer.setLastName(node.get("lastName").asText());
            }
            if (node.has("gender")) {
                customer.setGender(node.get("gender").asText());
            }
            if (node.has("nationality")) {
                customer.setNationality(node.get("nationality").asText());
            }
            if (node.has("employmentStatus")) {
                customer.setEmploymentStatus(node.get("employmentStatus").asText());
            }

            if (node.has("email")) {
                customer.setEmail(node.get("email").asText());
            }

            // Audit trail
            customer.setUpdatedBy(req.getCreatedBy());
            customer.setUpdatedAt(LocalDateTime.now());
            customer.setApprovedBy(approverUsername);

            customerRepository.save(customer);

        } else if ("DELETE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());

            if (!node.has("id")) {
                throw new RuntimeException("Customer ID missing in delete payload");
            }

            Long customerId = node.get("id").asLong();

            // Block if any accounts or cards are still ACTIVE
            java.util.List<com.example.backend.entity.Account> accounts = accountRepository.findByCustomerId(customerId);
            for (com.example.backend.entity.Account acct : accounts) {
                if ("ACTIVE".equalsIgnoreCase(acct.getStatus())) {
                    throw new RuntimeException("Cannot delete customer: account " + acct.getAccountNumber() + " is still ACTIVE. Please deactivate or close all accounts first.");
                }
                java.util.List<com.example.backend.entity.Card> cards = cardRepository.findByAccountId(acct.getId());
                for (com.example.backend.entity.Card card : cards) {
                    if ("ACTIVE".equalsIgnoreCase(card.getStatus())) {
                        throw new RuntimeException("Cannot delete customer: card ending " + card.getCardNumber().substring(card.getCardNumber().length() - 4) + " is still ACTIVE. Please block or close all cards first.");
                    }
                }
            }

            // Cascade delete: cards → accounts → customer
            for (com.example.backend.entity.Account acct : accounts) {
                java.util.List<com.example.backend.entity.Card> cards = cardRepository.findByAccountId(acct.getId());
                cardRepository.deleteAll(cards);
            }
            accountRepository.deleteAll(accounts);
            customerRepository.deleteById(customerId);

        } else if ("DEACTIVATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());

            if (!node.has("id")) {
                throw new RuntimeException("Customer ID missing in deactivate payload");
            }

            Customer customer = customerRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            customer.setStatus(CustomerStatus.INACTIVE);

            // Audit trail
            customer.setUpdatedBy(req.getCreatedBy());
            customer.setUpdatedAt(LocalDateTime.now());
            customer.setApprovedBy(approverUsername);

            customerRepository.save(customer);

        } else if ("ACTIVATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());

            if (!node.has("id")) {
                throw new RuntimeException("Customer ID missing in activate payload");
            }

            Customer customer = customerRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            customer.setStatus(CustomerStatus.ACTIVE);

            // Audit trail
            customer.setUpdatedBy(req.getCreatedBy());
            customer.setUpdatedAt(LocalDateTime.now());
            customer.setApprovedBy(approverUsername);

            customerRepository.save(customer);
        }
    }

    private void handleAccount(PendingRequest req, String approverUsername) throws Exception {

        if ("CREATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());
            
            if (!node.has("customer") || !node.get("customer").has("id")) {
                throw new RuntimeException("Customer ID missing in account payload");
            }

            Long customerId = node.get("customer").get("id").asLong();
            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            Account acc = new Account();
            acc.setCustomer(customer);
            // Always force CREDIT — ignore incoming accountType
            acc.setAccountType("CREDIT");
            acc.setBalance(node.get("balance").asDouble());
            if (node.has("creditLimit") && !node.get("creditLimit").isNull()) {
                acc.setCreditLimit(node.get("creditLimit").asDouble());
            }
            if (node.has("accountNumber") && !node.get("accountNumber").isNull()) {
                acc.setAccountNumber(node.get("accountNumber").asText());
            } else {
                acc.setAccountNumber("ACC-" + (accountRepository.count() + 1));
            }
            if (node.has("currency") && !node.get("currency").isNull()) {
                acc.setCurrency(node.get("currency").asText());
            }
            if (node.has("billingCycle") && !node.get("billingCycle").isNull()) {
                acc.setBillingCycle(node.get("billingCycle").asText());
            }
            if (node.has("interestRate") && !node.get("interestRate").isNull()) {
                acc.setInterestRate(node.get("interestRate").asDouble());
            }
            if (node.has("openDate") && !node.get("openDate").isNull()) {
                acc.setOpenDate(java.time.LocalDate.parse(node.get("openDate").asText()));
            } else {
                acc.setOpenDate(java.time.LocalDate.now());
            }
            
            // Accounts always start INACTIVE — must be approved/activated by manager
            acc.setStatus("INACTIVE");

            // Audit trail
            acc.setCreatedBy(req.getCreatedBy());
            acc.setCreatedAt(LocalDateTime.now());
            acc.setApprovedBy(approverUsername);

            accountRepository.save(acc);

            // If this was a resubmission, ensure the old rejected request is marked as SUPERSEDED
            if (node.has("originalRequestId") && !node.get("originalRequestId").isNull()) {
                Long originalId = node.get("originalRequestId").asLong();
                repository.findById(originalId).ifPresent(oldReq -> {
                    oldReq.setStatus(RequestStatus.SUPERSEDED);
                    oldReq.setUpdatedAt(LocalDateTime.now());
                    repository.save(oldReq);
                });
            }

        } else if ("UPDATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());
            
            if (!node.has("id")) {
                throw new RuntimeException("Account ID missing in update payload");
            }

            Long accountId = node.get("id").asLong();

            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Account not found"));

            if (node.has("balance") && !node.get("balance").isNull()) {
                account.setBalance(node.get("balance").asDouble());
            }

            if (node.has("creditLimit") && !node.get("creditLimit").isNull()) {
                account.setCreditLimit(node.get("creditLimit").asDouble());
            } else if (node.has("creditLimit") && node.get("creditLimit").isNull()) {
                account.setCreditLimit(null);
            }

            if (node.has("status") && !node.get("status").isNull()) {
                account.setStatus(node.get("status").asText());
            }

            if (node.has("currency") && !node.get("currency").isNull()) {
                account.setCurrency(node.get("currency").asText());
            }

            if (node.has("billingCycle") && !node.get("billingCycle").isNull()) {
                account.setBillingCycle(node.get("billingCycle").asText());
            }

            if (node.has("interestRate") && !node.get("interestRate").isNull()) {
                account.setInterestRate(node.get("interestRate").asDouble());
            }

            // Audit trail
            account.setUpdatedBy(req.getCreatedBy());
            account.setUpdatedAt(LocalDateTime.now());
            account.setApprovedBy(approverUsername);

            accountRepository.save(account);

            // If this was a resubmission, ensure the old rejected request is marked as SUPERSEDED
            if (node.has("originalRequestId") && !node.get("originalRequestId").isNull()) {
                Long originalId = node.get("originalRequestId").asLong();
                repository.findById(originalId).ifPresent(oldReq -> {
                    oldReq.setStatus(RequestStatus.SUPERSEDED);
                    oldReq.setUpdatedAt(LocalDateTime.now());
                    repository.save(oldReq);
                });
            }

        } else if ("ACTIVATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());
            Long accountId = node.has("accountId") ? node.get("accountId").asLong()
                    : (node.has("id") ? node.get("id").asLong() : null);
            if (accountId == null) {
                throw new RuntimeException("Account ID missing in activate payload");
            }
            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Account not found"));
            account.setStatus("ACTIVE");

            // Audit trail
            account.setUpdatedBy(req.getCreatedBy());
            account.setUpdatedAt(LocalDateTime.now());
            account.setApprovedBy(approverUsername);

            accountRepository.save(account);

            // Send activation email to customer (async — won't block the response)
            Customer customer = account.getCustomer();
            log.info("Attempting to send activation email for account {} to customer {}",
                    account.getAccountNumber(),
                    customer != null ? customer.getEmail() : "null");
            if (customer != null && customer.getEmail() != null && !customer.getEmail().isBlank()) {
                emailService.sendAccountActivationEmail(
                        customer.getEmail(),
                        customer.getFirstName(),
                        account.getAccountNumber()
                );
            } else {
                log.warn("Cannot send activation email: customer={}, email={}",
                        customer != null ? customer.getId() : "null",
                        customer != null ? customer.getEmail() : "null");
            }

        } else if ("DEACTIVATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());
            Long accountId = node.has("accountId") ? node.get("accountId").asLong()
                    : (node.has("id") ? node.get("id").asLong() : null);
            if (accountId == null) {
                throw new RuntimeException("Account ID missing in deactivate payload");
            }
            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Account not found"));
            account.setStatus("INACTIVE");

            // Audit trail
            account.setUpdatedBy(req.getCreatedBy());
            account.setUpdatedAt(LocalDateTime.now());
            account.setApprovedBy(approverUsername);

            accountRepository.save(account);
        }
    }

    private void handleCard(PendingRequest req, String approverUsername) throws Exception {

        JsonNode node = objectMapper.readTree(req.getPayload());

        if ("CREATE".equalsIgnoreCase(req.getOperation())) {

            // Account is mandatory — derive customer from account
            Long accountId = null;
            if (node.has("account") && node.get("account").has("id")) {
                accountId = node.get("account").get("id").asLong();
            } else if (node.has("accountId") && !node.get("accountId").isNull()) {
                accountId = node.get("accountId").asLong();
            }

            if (accountId == null) {
                throw new RuntimeException("Account ID is required for card creation");
            }

            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Account not found"));

            // Enforce activation workflow: only ACTIVE accounts may have cards issued
            if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
                throw new RuntimeException("Account must be ACTIVE to issue a card. Current status: " + account.getStatus());
            }

            Customer customer = account.getCustomer();
            if (customer == null) {
                throw new RuntimeException("Account has no linked customer");
            }

            Card card = new Card();
            card.setCustomer(customer);
            card.setAccount(account);

            card.setCardNumber(generateCreditCardNumber());
            card.setCardType(node.has("cardType") ? node.get("cardType").asText() : "CLASSIC");
            card.setCardBrand(node.has("cardBrand") ? node.get("cardBrand").asText() : "VISA");
            card.setCardMode(node.has("cardMode") ? node.get("cardMode").asText() : "PHYSICAL");

            if (node.has("cardHolderName") && !node.get("cardHolderName").isNull()) {
                card.setCardHolderName(node.get("cardHolderName").asText());
            } else {
                card.setCardHolderName(customer.getName());
            }

            card.setExpiryDate(java.time.LocalDate.now().plusYears(4).format(java.time.format.DateTimeFormatter.ofPattern("MM/yy")));
            card.setCvv(String.format("%03d", (int) (Math.random() * 1000)));
            card.setCreatedDate(LocalDateTime.now());
            // Cards always start INACTIVE — must be activated separately by manager
            card.setStatus("INACTIVE");

            // Audit trail
            card.setCreatedBy(req.getCreatedBy());
            card.setApprovedBy(approverUsername);

            cardRepository.save(card);
            
            if (node.has("originalRequestId") && !node.get("originalRequestId").isNull()) {
                Long originalId = node.get("originalRequestId").asLong();
                repository.findById(originalId).ifPresent(oldReq -> {
                    oldReq.setStatus(RequestStatus.SUPERSEDED);
                    oldReq.setUpdatedAt(LocalDateTime.now());
                    repository.save(oldReq);
                });
            }

        } else if ("UPDATE".equalsIgnoreCase(req.getOperation())) {

            cardRepository.findById(node.get("id").asLong()).ifPresent(c -> {
                if (node.has("cardType")) c.setCardType(node.get("cardType").asText());
                if (node.has("cardBrand")) c.setCardBrand(node.get("cardBrand").asText());
                if (node.has("cardMode")) c.setCardMode(node.get("cardMode").asText());
                if (node.has("status")) c.setStatus(node.get("status").asText());
                if (node.has("cardHolderName") && !node.get("cardHolderName").isNull()) {
                    c.setCardHolderName(node.get("cardHolderName").asText());
                }
                // Audit trail
                c.setUpdatedBy(req.getCreatedBy());
                c.setUpdatedAt(LocalDateTime.now());
                c.setApprovedBy(approverUsername);
                cardRepository.save(c);
            });

        } else if ("BLOCK".equalsIgnoreCase(req.getOperation())) {

            Long cardId = node.has("id") ? node.get("id").asLong()
                    : (node.has("cardId") ? node.get("cardId").asLong() : null);
            if (cardId == null) throw new RuntimeException("Card ID missing in block payload");
            Card card = cardRepository.findById(cardId)
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            if (!"ACTIVE".equalsIgnoreCase(card.getStatus())) {
                throw new RuntimeException("Only ACTIVE cards can be blocked. Current status: " + card.getStatus());
            }
            card.setStatus("BLOCKED");
            // Audit trail
            card.setUpdatedBy(req.getCreatedBy());
            card.setUpdatedAt(LocalDateTime.now());
            card.setApprovedBy(approverUsername);
            cardRepository.save(card);

        } else if ("REPLACE".equalsIgnoreCase(req.getOperation())) {

            // Get the old card
            Long oldCardId = node.has("oldCardId") ? node.get("oldCardId").asLong()
                    : (node.has("id") ? node.get("id").asLong() : null);
            if (oldCardId == null) throw new RuntimeException("Old Card ID missing in replace payload");
            Card oldCard = cardRepository.findById(oldCardId)
                    .orElseThrow(() -> new RuntimeException("Old card not found"));
            if (!"BLOCKED".equalsIgnoreCase(oldCard.getStatus())) {
                throw new RuntimeException("Only BLOCKED cards can be replaced. Current status: " + oldCard.getStatus());
            }

            // Create replacement card linked to same account and customer
            Card newCard = new Card();
            newCard.setCustomer(oldCard.getCustomer());
            newCard.setAccount(oldCard.getAccount());
            newCard.setCardNumber(generateCreditCardNumber());
            newCard.setCardType(oldCard.getCardType());
            newCard.setCardBrand(oldCard.getCardBrand());
            newCard.setCardMode(oldCard.getCardMode());

            if (node.has("cardHolderName") && !node.get("cardHolderName").isNull()) {
                newCard.setCardHolderName(node.get("cardHolderName").asText());
            } else {
                newCard.setCardHolderName(oldCard.getCardHolderName());
            }

            newCard.setExpiryDate(java.time.LocalDate.now().plusYears(4)
                    .format(java.time.format.DateTimeFormatter.ofPattern("MM/yy")));
            newCard.setCvv(String.format("%03d", (int) (Math.random() * 1000)));
            newCard.setCreatedDate(LocalDateTime.now());
            newCard.setStatus("INACTIVE"); // Replacement card starts INACTIVE, must be activated separately

            // Audit trail
            newCard.setCreatedBy(req.getCreatedBy());
            newCard.setApprovedBy(approverUsername);

            cardRepository.save(newCard);

            // Old card stays BLOCKED — do not change its status
            // Mark superseded if applicable
            if (node.has("originalRequestId") && !node.get("originalRequestId").isNull()) {
                Long originalId = node.get("originalRequestId").asLong();
                repository.findById(originalId).ifPresent(oldReq -> {
                    oldReq.setStatus(RequestStatus.SUPERSEDED);
                    oldReq.setUpdatedAt(LocalDateTime.now());
                    repository.save(oldReq);
                });
            }

        } else if ("UNBLOCK".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in unblock payload");
            Card card = cardRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            card.setStatus("INACTIVE");
            // Audit trail
            card.setUpdatedBy(req.getCreatedBy());
            card.setUpdatedAt(LocalDateTime.now());
            card.setApprovedBy(approverUsername);
            cardRepository.save(card);

        } else if ("ACTIVATE".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in activate payload");
            Card card = cardRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            if (!"ISSUED".equalsIgnoreCase(card.getStatus())) {
                throw new RuntimeException("Only ISSUED cards can be activated. Current status: " + card.getStatus());
            }

            // Extract email data before modifying the entity
            Customer activateCustomer = card.getCustomer();
            String activateEmail = (activateCustomer != null) ? activateCustomer.getEmail() : null;
            String activateHolderName = card.getCardHolderName();
            String activateCardNum = card.getCardNumber();

            card.setStatus("ACTIVE");
            card.setIssued(true);
            // Audit trail
            card.setUpdatedBy(req.getCreatedBy());
            card.setUpdatedAt(LocalDateTime.now());
            card.setApprovedBy(approverUsername);
            cardRepository.save(card);

            // Send card activation email to customer
            log.info("Attempting to send card activation email for card {} to customer {}",
                    card.getId(),
                    activateCustomer != null ? activateEmail : "null");
            if (activateEmail != null && !activateEmail.isBlank()) {
                String maskedNum = activateCardNum.substring(0, 4) + " **** **** "
                        + activateCardNum.substring(activateCardNum.length() - 4);
                emailService.sendCardActivationEmail(
                        activateEmail,
                        activateHolderName,
                        maskedNum
                );
            } else {
                log.warn("Cannot send card activation email: customer={}, email={}",
                        activateCustomer != null ? activateCustomer.getId() : "null",
                        activateEmail);
            }

        } else if ("ISSUE".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in issue payload");
            Card card = cardRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            if (!"INACTIVE".equalsIgnoreCase(card.getStatus())) {
                throw new RuntimeException("Only INACTIVE cards can be issued. Current status: " + card.getStatus());
            }

            // Extract email data before modifying the entity
            Customer issueCustomer = card.getCustomer();
            String issueEmail = (issueCustomer != null) ? issueCustomer.getEmail() : null;
            String issueHolderName = card.getCardHolderName();
            String issueCardNum = card.getCardNumber();

            card.setStatus("ISSUED");
            // Audit trail
            card.setUpdatedBy(req.getCreatedBy());
            card.setUpdatedAt(LocalDateTime.now());
            card.setApprovedBy(approverUsername);
            cardRepository.save(card);

            // Send card issued email to customer (async — won't block the response)
            log.info("Attempting to send card issued email for card {} to customer {}",
                    card.getId(),
                    issueCustomer != null ? issueEmail : "null");
            if (issueEmail != null && !issueEmail.isBlank()) {
                String masked = issueCardNum.substring(0, 4) + " **** **** "
                        + issueCardNum.substring(issueCardNum.length() - 4);
                emailService.sendCardIssuedEmail(
                        issueEmail,
                        issueHolderName,
                        masked
                );
            } else {
                log.warn("Cannot send card issued email: customer={}, email={}",
                        issueCustomer != null ? issueCustomer.getId() : "null",
                        issueEmail);
            }

        } else if ("DEACTIVATE".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in deactivate payload");
            Card card = cardRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            card.setStatus("DEACTIVATED");
            // Audit trail
            card.setUpdatedBy(req.getCreatedBy());
            card.setUpdatedAt(LocalDateTime.now());
            card.setApprovedBy(approverUsername);
            cardRepository.save(card);

        } else if ("DELETE".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in delete payload");
            cardRepository.deleteById(node.get("id").asLong());
        }
    }

    private String generateCreditCardNumber() {
        StringBuilder sb = new StringBuilder();
        sb.append(Math.random() > 0.5 ? "4" : "5"); // Visa / Mastercard
        for (int i = 0; i < 15; i++) {
            sb.append((int) (Math.random() * 10));
        }
        return sb.toString();
    }
}