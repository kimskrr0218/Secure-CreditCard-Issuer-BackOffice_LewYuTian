package com.example.backend.controller;

import com.example.backend.entity.Account;
import com.example.backend.repository.AccountRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")  // ✅ Defines the base API endpoint for all account-related operations
public class AccountController {

    private final AccountRepository repository;  // Repository used to interact with the Account table in the database

    public AccountController(AccountRepository repository) {
        this.repository = repository;
    }

    // Retrieve all accounts from the database
    @GetMapping
    public List<Account> getAllAccounts() {
        return repository.findAll();
    }

    // Retrieve a specific account by its ID
    @GetMapping("/{id}")
    public Account getAccountById(@PathVariable Long id) {
        return repository.findById(id).orElseThrow();
    }

    // Create a new account record in the database
    @PostMapping
    public Account createAccount(@RequestBody Account account) {
        return repository.save(account);
    }

    // Update existing account details such as account number or balance
    @PutMapping("/{id}")
    public Account updateAccount(@PathVariable Long id, @RequestBody Account updated) {
        return repository.findById(id).map(acc -> {
            acc.setAccountNumber(updated.getAccountNumber());
            acc.setBalance(updated.getBalance());
            return repository.save(acc);
        }).orElseThrow();
    }

    // Delete an account from the database using its ID
    @DeleteMapping("/{id}")
    public void deleteAccount(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
