package com.example.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;   // each card belongs to an account

    @Column(nullable = false, unique = true)
    private String cardNumber; // auto-generated, unique

    @Column(name = "card_type", nullable = false)
    private String cardType;   // CREDIT CARD - GOLD

    @Column(nullable = false)
    private String status = "INACTIVE"; // default: INACTIVE until approved

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }

    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
