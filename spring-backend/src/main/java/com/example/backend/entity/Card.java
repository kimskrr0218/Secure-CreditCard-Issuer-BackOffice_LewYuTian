package com.example.backend.entity;

import com.example.backend.util.SensitiveFieldConverter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonIgnore // Never expose full card number in API responses
    @Convert(converter = SensitiveFieldConverter.class)
    @Column(nullable = false, unique = true, length = 512)
    private String cardNumber; // auto-generated, unique — encrypted at rest

    /**
     * Returns a masked card number (first 4 + last 4) for API responses.
     * The full card number is never serialized.
     */
    @JsonProperty("cardNumber")
    public String getMaskedCardNumber() {
        if (cardNumber == null || cardNumber.length() < 8) return cardNumber;
        return cardNumber.substring(0, 4) + "********" + cardNumber.substring(cardNumber.length() - 4);
    }

    @Column(name = "card_type", nullable = false)
    private String cardType;   // Classic, Gold, Platinum

    private String cardBrand;  // VISA, MASTERCARD, AMEX

    private String cardMode;   // PHYSICAL, VIRTUAL

    private String cardHolderName;

    private String expiryDate;

    @JsonIgnore // Never expose CVV in API responses
    @Convert(converter = SensitiveFieldConverter.class)
    @Column(length = 512)
    private String cvv; // encrypted at rest

    /**
     * Returns masked CVV for API responses (allows frontend *ngIf check).
     */
    @JsonProperty("cvv")
    public String getMaskedCvv() {
        return cvv != null ? "***" : null;
    }

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
