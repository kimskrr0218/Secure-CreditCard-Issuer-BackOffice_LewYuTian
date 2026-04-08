package com.example.backend.controller;

import com.example.backend.entity.PendingRequest;
import com.example.backend.repository.AccountRepository;
import com.example.backend.repository.CardRepository;
import com.example.backend.repository.CustomerRepository;
import com.example.backend.repository.PendingRequestRepository;
import com.example.backend.enums.CustomerStatus;
import com.example.backend.enums.RequestStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

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
    public Map<String, Object> getSummary(@AuthenticationPrincipal UserDetails user) {
        Map<String, Object> summary = new LinkedHashMap<>();
        String username = user.getUsername();

        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isManager = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        boolean isPrivileged = isAdmin || isManager;

        // ===== PRIMARY STATS =====
        summary.put("totalCustomers", customerRepository.count());
        summary.put("activeAccounts", accountRepository.countByStatus("ACTIVE"));
        summary.put("activeCards", cardRepository.countByStatus("ACTIVE"));

        if (isPrivileged) {
            summary.put("pendingRequests", pendingRequestRepository.countByStatus(RequestStatus.PENDING));
        } else {
            summary.put("pendingRequests", pendingRequestRepository.countByStatusAndCreatedBy(RequestStatus.PENDING, username));
        }

        // ===== SECONDARY STATS =====
        summary.put("blockedCards", cardRepository.countByStatus("BLOCKED"));
        summary.put("rejectedRequests", pendingRequestRepository.countByStatus(RequestStatus.REJECTED));
        summary.put("inactiveAccounts", accountRepository.countByStatus("INACTIVE"));
        summary.put("issuedCards", cardRepository.countByStatus("ISSUED"));
        summary.put("inactiveCards", cardRepository.countByStatus("INACTIVE"));
        summary.put("deactivatedCards", cardRepository.countByStatus("DEACTIVATED"));

        // ===== CUSTOMER STATUS BREAKDOWN =====
        Map<String, Long> customerStatus = new LinkedHashMap<>();
        customerStatus.put("ACTIVE", customerRepository.countByStatus(CustomerStatus.ACTIVE));
        customerStatus.put("INACTIVE", customerRepository.countByStatus(CustomerStatus.INACTIVE));
        summary.put("customerStatusBreakdown", customerStatus);

        // ===== ACCOUNT STATUS BREAKDOWN =====
        Map<String, Long> accountStatus = new LinkedHashMap<>();
        accountStatus.put("ACTIVE", accountRepository.countByStatus("ACTIVE"));
        accountStatus.put("INACTIVE", accountRepository.countByStatus("INACTIVE"));
        summary.put("accountStatusBreakdown", accountStatus);

        // ===== CARD STATUS BREAKDOWN =====
        Map<String, Long> cardStatus = new LinkedHashMap<>();
        cardStatus.put("ACTIVE", cardRepository.countByStatus("ACTIVE"));
        cardStatus.put("ISSUED", cardRepository.countByStatus("ISSUED"));
        cardStatus.put("INACTIVE", cardRepository.countByStatus("INACTIVE"));
        cardStatus.put("BLOCKED", cardRepository.countByStatus("BLOCKED"));
        cardStatus.put("DEACTIVATED", cardRepository.countByStatus("DEACTIVATED"));
        summary.put("cardStatusBreakdown", cardStatus);

        // ===== CARD BRAND BREAKDOWN =====
        Map<String, Long> cardBrand = new LinkedHashMap<>();
        cardBrand.put("VISA", cardRepository.countByCardBrand("VISA"));
        cardBrand.put("MASTERCARD", cardRepository.countByCardBrand("MASTERCARD"));
        cardBrand.put("AMEX", cardRepository.countByCardBrand("AMEX"));
        summary.put("cardBrandBreakdown", cardBrand);

        // ===== CARD TYPE BREAKDOWN =====
        Map<String, Long> cardType = new LinkedHashMap<>();
        cardType.put("Classic", cardRepository.countByCardType("Classic"));
        cardType.put("Gold", cardRepository.countByCardType("Gold"));
        cardType.put("Platinum", cardRepository.countByCardType("Platinum"));
        summary.put("cardTypeBreakdown", cardType);

        // ===== TASKS BY ENTITY TYPE =====
        Map<String, Long> tasksByEntity = new LinkedHashMap<>();
        if (isPrivileged) {
            tasksByEntity.put("CUSTOMER", pendingRequestRepository.countByEntityType("CUSTOMER"));
            tasksByEntity.put("ACCOUNT", pendingRequestRepository.countByEntityType("ACCOUNT"));
            tasksByEntity.put("CARD", pendingRequestRepository.countByEntityType("CARD"));
        } else {
            tasksByEntity.put("CUSTOMER", pendingRequestRepository.countByEntityTypeAndCreatedBy("CUSTOMER", username));
            tasksByEntity.put("ACCOUNT", pendingRequestRepository.countByEntityTypeAndCreatedBy("ACCOUNT", username));
            tasksByEntity.put("CARD", pendingRequestRepository.countByEntityTypeAndCreatedBy("CARD", username));
        }
        summary.put("tasksByEntity", tasksByEntity);

        // ===== TASK STATUS BREAKDOWN =====
        Map<String, Long> taskStatus = new LinkedHashMap<>();
        if (isPrivileged) {
            taskStatus.put("PENDING", pendingRequestRepository.countByStatus(RequestStatus.PENDING));
            taskStatus.put("APPROVED", pendingRequestRepository.countByStatus(RequestStatus.APPROVED));
            taskStatus.put("REJECTED", pendingRequestRepository.countByStatus(RequestStatus.REJECTED));
        } else {
            taskStatus.put("PENDING", pendingRequestRepository.countByStatusAndCreatedBy(RequestStatus.PENDING, username));
            taskStatus.put("APPROVED", pendingRequestRepository.countByStatusAndCreatedBy(RequestStatus.APPROVED, username));
            taskStatus.put("REJECTED", pendingRequestRepository.countByStatusAndCreatedBy(RequestStatus.REJECTED, username));
        }
        summary.put("taskStatusBreakdown", taskStatus);

        // ===== RECENT ACTIVITY (last 10 tasks) =====
        List<PendingRequest> recentList;
        if (isPrivileged) {
            recentList = pendingRequestRepository.findTop10ByOrderByCreatedAtDesc();
        } else {
            recentList = pendingRequestRepository.findTop10ByCreatedByOrderByCreatedAtDesc(username);
        }
        List<Map<String, Object>> recentActivity = recentList.stream().map(req -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", req.getId());
            item.put("entityType", req.getEntityType());
            item.put("operation", req.getOperation());
            item.put("status", req.getStatus());
            item.put("createdBy", req.getCreatedBy());
            item.put("createdAt", req.getCreatedAt());
            return item;
        }).collect(Collectors.toList());
        summary.put("recentActivity", recentActivity);

        return summary;
    }
}
