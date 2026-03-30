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

import com.example.backend.enums.CustomerType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/pending")
@CrossOrigin(origins = "http://localhost:4200")
public class PendingRequestController {

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
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<java.util.List<PendingRequestDTO>> getAllRequests(@AuthenticationPrincipal UserDetails user) {
        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isManager = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));

        java.util.List<PendingRequest> requests;
        if (isAdmin || isManager) {
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
                if (payloadNode.has("organization") && !payloadNode.get("organization").asText().isBlank())
                    dto.setOrganization(payloadNode.get("organization").asText());
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
                    customerRepository.findById(customerId).ifPresent(c -> {
                        // Override with live DB values (more accurate than payload for UPDATE/DEACTIVATE/DELETE)
                        if (c.getCustomerNo() != null) dto.setCustomerNo(c.getCustomerNo());
                        if (c.getName() != null)       dto.setName(c.getName());
                        if (c.getOrganization() != null) dto.setOrganization(c.getOrganization());
                        if (c.getEmail() != null && dto.getEmail() == null) dto.setEmail(c.getEmail());

                        // Also inject into the payload so the frontend parsedPayload mapping works too
                        if (payloadNode.isObject()) {
                            ObjectNode node = (ObjectNode) payloadNode;
                            node.put("customerNo", c.getCustomerNo());
                            node.put("name", c.getName());
                            node.put("organization", c.getOrganization());
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
                    final Long finalCardId = cardId;
                    cardRepository.findById(cardId).ifPresent(card -> {
                        // Inject card info into payload for frontend display
                        if (payloadNode.isObject()) {
                            ObjectNode node = (ObjectNode) payloadNode;
                            if (card.getCardNumber() != null && !node.has("cardNumber")) {
                                node.put("cardNumber", card.getCardNumber());
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
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user
    ) throws Exception {

        PendingRequest req = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (req.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Only PENDING requests can be approved.");
        }

        if (req.getCreatedBy() != null &&
                req.getCreatedBy().equals(user.getUsername())) {
            throw new RuntimeException("Maker cannot approve own request.");
        }

        switch (req.getEntityType().toUpperCase()) {
            case "USER" -> handleUser(req);
            case "CUSTOMER" -> handleCustomer(req);
            case "ACCOUNT" -> handleAccount(req);
            case "CARD" -> handleCard(req);
            default -> throw new RuntimeException("Unsupported entity type");
        }

        req.setStatus(RequestStatus.APPROVED);
        req.setApprovedBy(user.getUsername());
        req.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(repository.save(req));
    }

    // ================= REJECT =================

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> reject(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user,
            @RequestBody RejectRequest request
    ) {

        PendingRequest req = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (req.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Only PENDING requests can be rejected.");
        }

        if (req.getCreatedBy() != null &&
                req.getCreatedBy().equals(user.getUsername())) {
            throw new RuntimeException("Maker cannot reject own request.");
        }

        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new RuntimeException("Rejection reason is required.");
        }

        req.setStatus(RequestStatus.REJECTED);
        req.setApprovedBy(user.getUsername());
        req.setRejectionReason(request.getReason());
        req.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(repository.save(req));
    }

    // ================= CREATE =================

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
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
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
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
        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !req.getCreatedBy().equals(user.getUsername())) {
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
            System.out.println("Temporary password for " + user.getUsername() + ": " + tempPassword);
            
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

    private void handleCustomer(PendingRequest req) throws Exception {

        if ("CREATE".equalsIgnoreCase(req.getOperation())) {

            Customer c = objectMapper.readValue(req.getPayload(), Customer.class);
            c.setId(null); // Ensure a new record is created, not an update
            c.setCustomerNo(generateCustomerNo());
            c.setStatus(CustomerStatus.ACTIVE);
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

            // ✅ Add these fields
            if (node.has("organization")) {
                customer.setOrganization(node.get("organization").asText());
            }

            if (node.has("currency")) {
                customer.setCurrency(node.get("currency").asText());
            }

            if (node.has("type")) {
                customer.setType(CustomerType.valueOf(node.get("type").asText()));
            }

            customerRepository.save(customer);

        } else if ("DELETE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());

            if (!node.has("id")) {
                throw new RuntimeException("Customer ID missing in delete payload");
            }

            customerRepository.deleteById(node.get("id").asLong());

        } else if ("DEACTIVATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());

            if (!node.has("id")) {
                throw new RuntimeException("Customer ID missing in deactivate payload");
            }

            Customer customer = customerRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            customer.setStatus(CustomerStatus.INACTIVE);
            customerRepository.save(customer);

        } else if ("ACTIVATE".equalsIgnoreCase(req.getOperation())) {

            JsonNode node = objectMapper.readTree(req.getPayload());

            if (!node.has("id")) {
                throw new RuntimeException("Customer ID missing in activate payload");
            }

            Customer customer = customerRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            customer.setStatus(CustomerStatus.ACTIVE);
            customerRepository.save(customer);
        }
    }

    private void handleAccount(PendingRequest req) throws Exception {

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
            accountRepository.save(account);

            // Send activation email to customer
            try {
                Customer customer = account.getCustomer();
                if (customer != null && customer.getEmail() != null && !customer.getEmail().isBlank()) {
                    emailService.sendAccountActivationEmail(
                            customer.getEmail(),
                            customer.getFirstName(),
                            account.getAccountNumber()
                    );
                }
            } catch (Exception emailEx) {
                // Email failure must NOT rollback account activation
                System.err.println("Failed to send account activation email: " + emailEx.getMessage());
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
            accountRepository.save(account);
        }
    }

    private void handleCard(PendingRequest req) throws Exception {

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
            cardRepository.save(card);

        } else if ("ACTIVATE".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in activate payload");
            Card card = cardRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            if (!"INACTIVE".equalsIgnoreCase(card.getStatus())) {
                throw new RuntimeException("Only INACTIVE cards can be activated. Current status: " + card.getStatus());
            }
            card.setStatus("ACTIVE");
            cardRepository.save(card);

        } else if ("ISSUE".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in issue payload");
            Card card = cardRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            if (!"ACTIVE".equalsIgnoreCase(card.getStatus())) {
                throw new RuntimeException("Only ACTIVE cards can be issued. Current status: " + card.getStatus());
            }
            if (card.isIssued()) {
                throw new RuntimeException("Card has already been issued.");
            }
            card.setIssued(true);
            cardRepository.save(card);

            // Send card issued email to customer
            try {
                Customer customer = card.getCustomer();
                if (customer != null && customer.getEmail() != null && !customer.getEmail().isBlank()) {
                    String masked = card.getCardNumber().substring(0, 4) + " **** **** "
                            + card.getCardNumber().substring(card.getCardNumber().length() - 4);
                    emailService.sendCardIssuedEmail(
                            customer.getEmail(),
                            card.getCardHolderName(),
                            masked
                    );
                }
            } catch (Exception emailEx) {
                // Email failure must NOT rollback card issuing
                System.err.println("Failed to send card issued email: " + emailEx.getMessage());
            }

        } else if ("DEACTIVATE".equalsIgnoreCase(req.getOperation())) {

            if (!node.has("id")) throw new RuntimeException("Card ID missing in deactivate payload");
            Card card = cardRepository.findById(node.get("id").asLong())
                    .orElseThrow(() -> new RuntimeException("Card not found"));
            card.setStatus("DEACTIVATED");
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