package com.example.backend.controller;

import com.example.backend.entity.Customer;
import com.example.backend.repository.CustomerRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository repository;

    public CustomerController(CustomerRepository repository) {
        this.repository = repository;
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

    // ✏️ Direct create — MANAGER/ADMIN only (STAFF must go through maker-checker)
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public Customer createCustomer(@RequestBody Customer customer) {
        long count = repository.count() + 1;
        customer.setCustomerNo("CUST-" + (1000 + count));
        return repository.save(customer);
    }

    // ✏️ Direct update — MANAGER/ADMIN only (STAFF must go through maker-checker)
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public Customer updateCustomer(@PathVariable Long id, @RequestBody Customer updated) {
        return repository.findById(id).map(c -> {
            c.setName(updated.getName());
            c.setEmail(updated.getEmail());
            return repository.save(c);
        }).orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    // ❌ Direct delete — MANAGER/ADMIN only (STAFF must go through maker-checker)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public void deleteCustomer(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
