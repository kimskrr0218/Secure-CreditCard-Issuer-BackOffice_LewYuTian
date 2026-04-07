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
    public Customer updateCustomer(@PathVariable Long id, @RequestBody java.util.Map<String, Object> updates) {
        return repository.findById(id).map(c -> {
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
        }).orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    // ❌ Direct delete — MANAGER/ADMIN only (STAFF must go through maker-checker)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public void deleteCustomer(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
