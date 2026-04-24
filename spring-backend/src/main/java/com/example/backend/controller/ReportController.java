package com.example.backend.controller;

import com.example.backend.entity.Account;
import com.example.backend.entity.Card;
import com.example.backend.entity.Customer;
import com.example.backend.repository.AccountRepository;
import com.example.backend.repository.CardRepository;
import com.example.backend.repository.CustomerRepository;
import com.example.backend.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "http://localhost:4200")
public class ReportController {

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final ReportService reportService;

    public ReportController(CustomerRepository customerRepository,
                            AccountRepository accountRepository,
                            CardRepository cardRepository,
                            ReportService reportService) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.reportService = reportService;
    }

    // ─── CUSTOMER REPORT ────────────────────────────────────
    @GetMapping("/customers")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<byte[]> customerReport(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Customer> all = customerRepository.findAll();

        List<Customer> filtered = all.stream()
                .filter(c -> status == null || status.isBlank() || status.equalsIgnoreCase(String.valueOf(c.getStatus())))
                .filter(c -> {
                    if (fromDate == null && toDate == null) return true;
                    LocalDateTime created = c.getCreatedAt();
                    if (created == null) return true;
                    if (fromDate != null && created.isBefore(fromDate.atStartOfDay())) return false;
                    if (toDate != null && created.isAfter(toDate.atTime(LocalTime.MAX))) return false;
                    return true;
                })
                .collect(Collectors.toList());

        String[] headers = {"No.", "Cust No", "Name", "Email", "Nationality", "Gender", "Status", "Created At"};
        String[][] rows = new String[filtered.size()][];
        for (int i = 0; i < filtered.size(); i++) {
            Customer c = filtered.get(i);
            rows[i] = new String[]{
                    String.valueOf(i + 1),
                    c.getCustomerNo() != null ? c.getCustomerNo() : "-",
                    c.getName() != null ? c.getName() : "-",
                    c.getEmail() != null ? c.getEmail() : "-",
                    c.getNationality() != null ? c.getNationality() : "-",
                    c.getGender() != null ? c.getGender() : "-",
                    c.getStatus() != null ? c.getStatus().name() : "-",
                    c.getCreatedAt() != null ? c.getCreatedAt().toLocalDate().toString() : "-"
            };
        }

        byte[] pdf = reportService.generatePdf("Customer Report", headers, rows, filtered.size(), status, fromDate, toDate);
        return buildPdfResponse(pdf, "Customer_Report.pdf");
    }

    // ─── ACCOUNT REPORT ─────────────────────────────────────
    @GetMapping("/accounts")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<byte[]> accountReport(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Account> all = accountRepository.findAll();

        List<Account> filtered = all.stream()
                .filter(a -> status == null || status.isBlank() || status.equalsIgnoreCase(a.getStatus()))
                .filter(a -> {
                    if (fromDate == null && toDate == null) return true;
                    LocalDateTime created = a.getCreatedAt();
                    if (created == null) return true;
                    if (fromDate != null && created.isBefore(fromDate.atStartOfDay())) return false;
                    if (toDate != null && created.isAfter(toDate.atTime(LocalTime.MAX))) return false;
                    return true;
                })
                .collect(Collectors.toList());

        String[] headers = {"No.", "Account No", "Customer", "Type", "Currency", "Credit Limit", "Status", "Created At"};
        String[][] rows = new String[filtered.size()][];
        for (int i = 0; i < filtered.size(); i++) {
            Account a = filtered.get(i);
            rows[i] = new String[]{
                    String.valueOf(i + 1),
                    a.getAccountNumber() != null ? a.getAccountNumber() : "-",
                    a.getCustomer() != null ? a.getCustomer().getName() : "-",
                    a.getAccountType() != null ? a.getAccountType() : "-",
                    a.getCurrency() != null ? a.getCurrency() : "-",
                    a.getMaskedCreditLimit() != null ? a.getMaskedCreditLimit() : "-",
                    a.getStatus() != null ? a.getStatus() : "-",
                    a.getCreatedAt() != null ? a.getCreatedAt().toLocalDate().toString() : "-"
            };
        }

        byte[] pdf = reportService.generatePdf("Account Report", headers, rows, filtered.size(), status, fromDate, toDate);
        return buildPdfResponse(pdf, "Account_Report.pdf");
    }

    // ─── CARD REPORT ────────────────────────────────────────
    @GetMapping("/cards")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<byte[]> cardReport(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Card> all = cardRepository.findAll();

        List<Card> filtered = all.stream()
                .filter(c -> status == null || status.isBlank() || status.equalsIgnoreCase(c.getStatus()))
                .filter(c -> {
                    if (fromDate == null && toDate == null) return true;
                    LocalDateTime created = c.getCreatedDate();
                    if (created == null) return true;
                    if (fromDate != null && created.isBefore(fromDate.atStartOfDay())) return false;
                    if (toDate != null && created.isAfter(toDate.atTime(LocalTime.MAX))) return false;
                    return true;
                })
                .collect(Collectors.toList());

        String[] headers = {"No.", "Card Holder", "Card Type", "Brand", "Mode", "Status", "Issued", "Created At"};
        String[][] rows = new String[filtered.size()][];
        for (int i = 0; i < filtered.size(); i++) {
            Card c = filtered.get(i);
            rows[i] = new String[]{
                    String.valueOf(i + 1),
                    c.getCardHolderName() != null ? c.getCardHolderName() : "-",
                    c.getCardType() != null ? c.getCardType() : "-",
                    c.getCardBrand() != null ? c.getCardBrand() : "-",
                    c.getCardMode() != null ? c.getCardMode() : "-",
                    c.getStatus() != null ? c.getStatus() : "-",
                    c.isIssued() ? "Yes" : "No",
                    c.getCreatedDate() != null ? c.getCreatedDate().toLocalDate().toString() : "-"
            };
        }

        byte[] pdf = reportService.generatePdf("Card Report", headers, rows, filtered.size(), status, fromDate, toDate);
        return buildPdfResponse(pdf, "Card_Report.pdf");
    }

    // ─── PREVIEW ENDPOINTS (return JSON for in-page preview) ────

    @GetMapping("/preview/customers")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<Map<String, Object>> previewCustomers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Customer> filtered = customerRepository.findAll().stream()
                .filter(c -> status == null || status.isBlank() || status.equalsIgnoreCase(String.valueOf(c.getStatus())))
                .filter(c -> dateFilter(c.getCreatedAt(), fromDate, toDate))
                .collect(Collectors.toList());

        String[] headers = {"No.", "Cust No", "Name", "Email", "Nationality", "Gender", "Status", "Created At"};
        List<String[]> rows = new ArrayList<>();
        for (int i = 0; i < filtered.size(); i++) {
            Customer c = filtered.get(i);
            rows.add(new String[]{
                    String.valueOf(i + 1),
                    c.getCustomerNo() != null ? c.getCustomerNo() : "-",
                    c.getName() != null ? c.getName() : "-",
                    c.getEmail() != null ? c.getEmail() : "-",
                    c.getNationality() != null ? c.getNationality() : "-",
                    c.getGender() != null ? c.getGender() : "-",
                    c.getStatus() != null ? c.getStatus().name() : "-",
                    c.getCreatedAt() != null ? c.getCreatedAt().toLocalDate().toString() : "-"
            });
        }
        return ResponseEntity.ok(buildPreviewMap("Customer Report", headers, rows));
    }

    @GetMapping("/preview/accounts")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<Map<String, Object>> previewAccounts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Account> filtered = accountRepository.findAll().stream()
                .filter(a -> status == null || status.isBlank() || status.equalsIgnoreCase(a.getStatus()))
                .filter(a -> dateFilter(a.getCreatedAt(), fromDate, toDate))
                .collect(Collectors.toList());

        String[] headers = {"No.", "Account No", "Customer", "Type", "Currency", "Credit Limit", "Status", "Created At"};
        List<String[]> rows = new ArrayList<>();
        for (int i = 0; i < filtered.size(); i++) {
            Account a = filtered.get(i);
            rows.add(new String[]{
                    String.valueOf(i + 1),
                    a.getAccountNumber() != null ? a.getAccountNumber() : "-",
                    a.getCustomer() != null ? a.getCustomer().getName() : "-",
                    a.getAccountType() != null ? a.getAccountType() : "-",
                    a.getCurrency() != null ? a.getCurrency() : "-",
                    a.getMaskedCreditLimit() != null ? a.getMaskedCreditLimit() : "-",
                    a.getStatus() != null ? a.getStatus() : "-",
                    a.getCreatedAt() != null ? a.getCreatedAt().toLocalDate().toString() : "-"
            });
        }
        return ResponseEntity.ok(buildPreviewMap("Account Report", headers, rows));
    }

    @GetMapping("/preview/cards")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER')")
    public ResponseEntity<Map<String, Object>> previewCards(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Card> filtered = cardRepository.findAll().stream()
                .filter(c -> status == null || status.isBlank() || status.equalsIgnoreCase(c.getStatus()))
                .filter(c -> dateFilter(c.getCreatedDate(), fromDate, toDate))
                .collect(Collectors.toList());

        String[] headers = {"No.", "Card Holder", "Card Type", "Brand", "Mode", "Status", "Issued", "Created At"};
        List<String[]> rows = new ArrayList<>();
        for (int i = 0; i < filtered.size(); i++) {
            Card c = filtered.get(i);
            rows.add(new String[]{
                    String.valueOf(i + 1),
                    c.getCardHolderName() != null ? c.getCardHolderName() : "-",
                    c.getCardType() != null ? c.getCardType() : "-",
                    c.getCardBrand() != null ? c.getCardBrand() : "-",
                    c.getCardMode() != null ? c.getCardMode() : "-",
                    c.getStatus() != null ? c.getStatus() : "-",
                    c.isIssued() ? "Yes" : "No",
                    c.getCreatedDate() != null ? c.getCreatedDate().toLocalDate().toString() : "-"
            });
        }
        return ResponseEntity.ok(buildPreviewMap("Card Report", headers, rows));
    }

    // ─── HELPERS ────────────────────────────────────────────

    private boolean dateFilter(LocalDateTime created, LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null && toDate == null) return true;
        if (created == null) return true;
        if (fromDate != null && created.isBefore(fromDate.atStartOfDay())) return false;
        if (toDate != null && created.isAfter(toDate.atTime(LocalTime.MAX))) return false;
        return true;
    }

    private Map<String, Object> buildPreviewMap(String title, String[] headers, List<String[]> rows) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("title", title);
        map.put("headers", headers);
        map.put("rows", rows);
        map.put("totalRecords", rows.size());
        return map;
    }

    // ─── HELPER ─────────────────────────────────────────────
    private ResponseEntity<byte[]> buildPdfResponse(byte[] pdf, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
