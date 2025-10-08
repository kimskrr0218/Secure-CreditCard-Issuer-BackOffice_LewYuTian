package com.example.backend.controller;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.example.backend.entity.Customer;
import com.example.backend.repository.CustomerRepository;

@RestController
@RequestMapping("/api/customers") // Endpoint for handling all Customer-related requests
public class CustomerController {

    private final CustomerRepository repository; // ✅ Repository to interact with the Customer table

    public CustomerController(CustomerRepository repository) {
        this.repository = repository;
    }

    // Retrieve all customers from the database
    @GetMapping
    public List<Customer> getAllCustomers() {
        return repository.findAll();
    }

    // Create a new customer record (normally triggered by Staff through Maker-Checker flow)
    @PostMapping
    public Customer createCustomer(@RequestBody Customer customer) {
        return repository.save(customer);
    }

    // Update existing customer details such as name or email
    @PutMapping("/{id}")
    public Customer updateCustomer(@PathVariable Long id, @RequestBody Customer updated) {
        return repository.findById(id).map(c -> {
            c.setName(updated.getName());
            c.setEmail(updated.getEmail());
            return repository.save(c);
        }).orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    // Delete a customer record by ID
    @DeleteMapping("/{id}")
    public void deleteCustomer(@PathVariable Long id) {
        repository.deleteById(id);
    }
}

