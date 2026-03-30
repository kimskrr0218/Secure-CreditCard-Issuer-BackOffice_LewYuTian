package com.example.backend.controller;

import com.example.backend.repository.AccountRepository;
import com.example.backend.repository.CardRepository;
import com.example.backend.repository.CustomerRepository;
import com.example.backend.repository.PendingRequestRepository;
import com.example.backend.enums.RequestStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "http://localhost:4200")
public class DashboardController {

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final PendingRequestRepository pendingRequestRepository;

    public DashboardController(
            CustomerRepository customerRepository,
            AccountRepository accountRepository,
            CardRepository cardRepository,
            PendingRequestRepository pendingRequestRepository) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.pendingRequestRepository = pendingRequestRepository;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public Map<String, Object> getSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();

        // Primary stats
        summary.put("totalCustomers", customerRepository.count());
        summary.put("activeAccounts", accountRepository.countByStatus("ACTIVE"));
        summary.put("activeCards", cardRepository.countByStatus("ACTIVE"));
        summary.put("pendingRequests", pendingRequestRepository.countByStatus(RequestStatus.PENDING));

        // Bonus stats
        summary.put("blockedCards", cardRepository.countByStatus("BLOCKED"));
        summary.put("rejectedRequests", pendingRequestRepository.countByStatus(RequestStatus.REJECTED));
        summary.put("inactiveAccounts", accountRepository.countByStatus("INACTIVE"));

        return summary;
    }
}
