package com.example.backend.entity;

import com.example.backend.util.SensitiveFieldConverter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;   // each account belongs to a customer

    @Column(nullable = false, unique = true)
    private String accountNumber; // unique account number

    @Column(nullable = false)
    private String accountType;  // CREDIT, REVOLVING

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Convert(converter = SensitiveFieldConverter.class)
    @Column(nullable = false, length = 512)
    private String balance = "0.0";

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Convert(converter = SensitiveFieldConverter.class)
    @Column(nullable = true, length = 512)
    private String creditLimit;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, CLOSED, FROZEN

    @Column(nullable = true)
    private String currency;

    @Column(nullable = true)
    private String billingCycle;    // 1st of month, 15th of month, End of month

    @Column(nullable = true)
    private Double interestRate;    // APR e.g. 18.0

    @Column(nullable = true)
    private java.time.LocalDate openDate;

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public String getBalance() { return balance; }
    public void setBalance(String balance) { this.balance = balance; }
    public void setBalance(Double balance) { this.balance = balance != null ? String.valueOf(balance) : null; }

    /** Fully masked balance for read-only display (e.g. "********") */
    @JsonProperty("maskedBalance")
    public String getMaskedBalance() {
        if (balance == null || balance.isEmpty()) return null;
        return "*".repeat(balance.length());
    }

    public String getCreditLimit() { return creditLimit; }
    public void setCreditLimit(String creditLimit) { this.creditLimit = creditLimit; }
    public void setCreditLimit(Double creditLimit) { this.creditLimit = creditLimit != null ? String.valueOf(creditLimit) : null; }

    /** Fully masked credit limit for read-only display (e.g. "********") */
    @JsonProperty("maskedCreditLimit")
    public String getMaskedCreditLimit() {
        if (creditLimit == null || creditLimit.isEmpty()) return null;
        return "*".repeat(creditLimit.length());
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public java.time.LocalDate getOpenDate() { return openDate; }
    public void setOpenDate(java.time.LocalDate openDate) { this.openDate = openDate; }

    public String getBillingCycle() { return billingCycle; }
    public void setBillingCycle(String billingCycle) { this.billingCycle = billingCycle; }

    public Double getInterestRate() { return interestRate; }
    public void setInterestRate(Double interestRate) { this.interestRate = interestRate; }

    // ── Audit Trail Fields ──
    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "rejected_by")
    private String rejectedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getRejectedBy() { return rejectedBy; }
    public void setRejectedBy(String rejectedBy) { this.rejectedBy = rejectedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
