package com.example.backend.controller;

import com.example.backend.entity.Account;
import com.example.backend.repository.AccountRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountRepository repository;

    public AccountController(AccountRepository repository) {
        this.repository = repository;
    }

    // 🔍 Both STAFF and MANAGER can view all accounts
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
    public List<Account> getAllAccounts() {
        return repository.findAll();
    }

    // 🔍 Both STAFF and MANAGER can view account details
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
    public Account getAccountById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found"));
    }

    // ✏️ Direct create — MANAGER only (STAFF must go through maker-checker)
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public Account createAccount(@RequestBody Account account) {
        return repository.save(account);
    }

    // ✏️ Direct update — MANAGER only (STAFF must go through maker-checker)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public Account updateAccount(@PathVariable Long id, @RequestBody Account updated) {
        return repository.findById(id).map(acc -> {
            acc.setAccountNumber(updated.getAccountNumber());
            if (updated.getBalance() != null) acc.setBalance(updated.getBalance());
            if (updated.getCreditLimit() != null) acc.setCreditLimit(updated.getCreditLimit());
            acc.setStatus(updated.getStatus());
            return repository.save(acc);
        }).orElseThrow(() -> new RuntimeException("Account not found"));
    }

    // ❌ Direct delete — MANAGER only (STAFF must go through maker-checker)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public void deleteAccount(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
