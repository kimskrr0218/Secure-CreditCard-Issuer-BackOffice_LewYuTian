package com.example.backend.controller;

import com.example.backend.entity.Customer;
import com.example.backend.repository.CustomerRepository;
import com.example.backend.repository.AccountRepository;
import com.example.backend.repository.CardRepository;
import com.example.backend.service.CustomerValidationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository repository;
    private final CustomerValidationService validationService;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;

    public CustomerController(CustomerRepository repository, CustomerValidationService validationService,
                              AccountRepository accountRepository, CardRepository cardRepository) {
        this.repository = repository;
        this.validationService = validationService;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
    }

    // 🔍 MANAGER can view customers
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public List<Customer> getAllCustomers() {
        return repository.findAll();
    }

    // 🔍 Fetch a specific customer by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public Customer getCustomerById(@PathVariable Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    // ✏️ Direct create — MANAGER only (STAFF must go through maker-checker)
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createCustomer(@RequestBody Customer customer) {
        // Build a field map for validation
        java.util.Map<String, Object> fields = new java.util.HashMap<>();
        fields.put("firstName", customer.getFirstName());
        fields.put("lastName", customer.getLastName());
        fields.put("gender", customer.getGender());
        fields.put("nationality", customer.getNationality());
        fields.put("dob", customer.getDob() != null ? customer.getDob().toString() : null);
        fields.put("idNumber", customer.getIdNumber());
        fields.put("email", customer.getEmail());
        fields.put("phoneNumber", customer.getPhoneNumber());
        fields.put("homeAddress", customer.getHomeAddress());
        fields.put("employmentStatus", customer.getEmploymentStatus());
        fields.put("annualIncome", customer.getAnnualIncome());
        fields.put("employerName", customer.getEmployerName());

        List<String> errors = validationService.validate(fields, true, null);
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("errors", errors));
        }

        long count = repository.count() + 1;
        customer.setCustomerNo("CUST-" + (1000 + count));
        return ResponseEntity.ok(repository.save(customer));
    }

    // ✏️ Direct update — MANAGER only (STAFF must go through maker-checker)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateCustomer(@PathVariable Long id, @RequestBody java.util.Map<String, Object> updates) {
        Customer existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Merge existing values with updates for validation
        java.util.Map<String, Object> merged = new java.util.HashMap<>();
        merged.put("firstName", updates.getOrDefault("firstName", existing.getFirstName()));
        merged.put("lastName", updates.getOrDefault("lastName", existing.getLastName()));
        merged.put("gender", updates.getOrDefault("gender", existing.getGender()));
        merged.put("nationality", updates.getOrDefault("nationality", existing.getNationality()));
        merged.put("dob", updates.containsKey("dob") ? updates.get("dob") : (existing.getDob() != null ? existing.getDob().toString() : null));
        merged.put("idNumber", updates.getOrDefault("idNumber", existing.getIdNumber()));
        merged.put("email", updates.getOrDefault("email", existing.getEmail()));
        merged.put("phoneNumber", updates.getOrDefault("phoneNumber", existing.getPhoneNumber()));
        merged.put("homeAddress", updates.getOrDefault("homeAddress", existing.getHomeAddress()));
        merged.put("employmentStatus", updates.getOrDefault("employmentStatus", existing.getEmploymentStatus()));
        merged.put("annualIncome", updates.getOrDefault("annualIncome", existing.getAnnualIncome()));
        merged.put("employerName", updates.getOrDefault("employerName", existing.getEmployerName()));

        List<String> errors = validationService.validate(merged, false, id);
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("errors", errors));
        }

        return ResponseEntity.ok(applyUpdatesAndSave(existing, updates));
    }

    private Customer applyUpdatesAndSave(Customer c, java.util.Map<String, Object> updates) {
        {
            if (updates.containsKey("firstName")) c.setFirstName((String) updates.get("firstName"));
            if (updates.containsKey("lastName")) c.setLastName((String) updates.get("lastName"));
            if (updates.containsKey("name")) c.setName((String) updates.get("name"));
            if (updates.containsKey("gender")) c.setGender((String) updates.get("gender"));
            if (updates.containsKey("nationality")) c.setNationality((String) updates.get("nationality"));
            if (updates.containsKey("companyName")) c.setCompanyName((String) updates.get("companyName"));
            if (updates.containsKey("dob") && updates.get("dob") != null) {
                c.setDob(java.time.LocalDate.parse(updates.get("dob").toString()));
            }
            if (updates.containsKey("email")) c.setEmail((String) updates.get("email"));
            if (updates.containsKey("homeAddress")) c.setHomeAddress((String) updates.get("homeAddress"));
            if (updates.containsKey("annualIncome") && updates.get("annualIncome") != null) {
                c.setAnnualIncome(Double.valueOf(updates.get("annualIncome").toString()));
            }
            if (updates.containsKey("employerName")) c.setEmployerName((String) updates.get("employerName"));
            if (updates.containsKey("employmentStatus")) c.setEmploymentStatus((String) updates.get("employmentStatus"));
            // Only update sensitive fields if real (non-masked) values provided
            if (updates.containsKey("idNumber")) {
                String idNum = (String) updates.get("idNumber");
                if (idNum != null && !idNum.contains("*")) c.setIdNumber(idNum);
            }
            if (updates.containsKey("phoneNumber")) {
                String phone = (String) updates.get("phoneNumber");
                if (phone != null && !phone.contains("*")) c.setPhoneNumber(phone);
            }
            // Audit trail
            c.setUpdatedBy(org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication().getName());
            c.setUpdatedAt(java.time.LocalDateTime.now());
            return repository.save(c);
        }
    }

    // ❌ Direct delete — MANAGER only (STAFF must go through maker-checker)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        String blockReason = checkCustomerDeletable(id);
        if (blockReason != null) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", blockReason));
        }
        cascadeDeleteCustomer(id);
        return ResponseEntity.ok().build();
    }

    private String checkCustomerDeletable(Long customerId) {
        java.util.List<com.example.backend.entity.Account> accounts = accountRepository.findByCustomerId(customerId);
        for (com.example.backend.entity.Account acct : accounts) {
            if ("ACTIVE".equalsIgnoreCase(acct.getStatus())) {
                return "Cannot delete customer: account " + acct.getAccountNumber() + " is still ACTIVE. Please deactivate or close all accounts first.";
            }
            java.util.List<com.example.backend.entity.Card> cards = cardRepository.findByAccountId(acct.getId());
            for (com.example.backend.entity.Card card : cards) {
                if ("ACTIVE".equalsIgnoreCase(card.getStatus())) {
                    return "Cannot delete customer: card ending " + card.getCardNumber().substring(card.getCardNumber().length() - 4) + " is still ACTIVE. Please block or close all cards first.";
                }
            }
        }
        return null;
    }

    private void cascadeDeleteCustomer(Long customerId) {
        java.util.List<com.example.backend.entity.Account> accounts = accountRepository.findByCustomerId(customerId);
        for (com.example.backend.entity.Account acct : accounts) {
            java.util.List<com.example.backend.entity.Card> cards = cardRepository.findByAccountId(acct.getId());
            cardRepository.deleteAll(cards);
        }
        accountRepository.deleteAll(accounts);
        repository.deleteById(customerId);
    }
}
