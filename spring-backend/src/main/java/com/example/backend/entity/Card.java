package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cards")
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String cardNumber; // auto-generated, unique

    @Column(name = "card_type", nullable = false)
    private String cardType;   // Classic, Gold, Platinum

    private String cardBrand;  // VISA, MASTERCARD, AMEX

    private String cardMode;   // PHYSICAL, VIRTUAL

    private String cardHolderName;

    private String expiryDate;

    private String cvv;

    private LocalDateTime createdDate;

    @Column(nullable = false)
    private String status = "PENDING"; // default: PENDING until approved

    @Column(nullable = false)
    private boolean issued = false; // true after ISSUE approval — card is sent to customer

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;
}
