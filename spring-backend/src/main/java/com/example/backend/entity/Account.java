package com.example.backend.entity;

import jakarta.persistence.*;

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

    @Column(nullable = false)
    private Double balance = 0.0;
    
    @Column(nullable = true)
    private Double creditLimit;

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

    public Double getBalance() { return balance; }
    public void setBalance(Double balance) { this.balance = balance; }
    
    public Double getCreditLimit() { return creditLimit; }
    public void setCreditLimit(Double creditLimit) { this.creditLimit = creditLimit; }

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
}
