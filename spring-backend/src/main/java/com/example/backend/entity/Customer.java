package com.example.backend.entity;

import com.example.backend.enums.CustomerStatus;
import com.example.backend.util.SensitiveFieldConverter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String customerNo;

    private String name;          // kept for backward compat / display
    private String firstName;
    private String lastName;
    private String gender;         // Male, Female, Other
    private String nationality;
    private String employmentStatus; // Full-time, Part-time, Self-employed, Unemployed
    
    // New Fields
    private String companyName;
    private LocalDate dob;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Convert(converter = SensitiveFieldConverter.class)
    @Column(length = 512)
    private String idNumber; // encrypted at rest

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Convert(converter = SensitiveFieldConverter.class)
    @Column(length = 512)
    private String phoneNumber; // encrypted at rest

    /** Masked ID number for read-only display (e.g. "S****567A") */
    @JsonProperty("maskedIdNumber")
    public String getMaskedIdNumber() {
        if (idNumber == null || idNumber.length() < 4) return idNumber;
        int show = Math.min(4, idNumber.length());
        return idNumber.substring(0, 1)
                + "*".repeat(idNumber.length() - show)
                + idNumber.substring(idNumber.length() - (show - 1));
    }

    /** Masked phone number for read-only display (e.g. "****5678") */
    @JsonProperty("maskedPhoneNumber")
    public String getMaskedPhoneNumber() {
        if (phoneNumber == null || phoneNumber.length() < 4) return phoneNumber;
        return "*".repeat(phoneNumber.length() - 4)
                + phoneNumber.substring(phoneNumber.length() - 4);
    }

    private String homeAddress;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Convert(converter = SensitiveFieldConverter.class)
    @Column(length = 512)
    private String annualIncome; // encrypted at rest

    /** Fully masked annual income for read-only display (e.g. "********") */
    @JsonProperty("maskedAnnualIncome")
    public String getMaskedAnnualIncome() {
        if (annualIncome == null || annualIncome.isEmpty()) return null;
        return "*".repeat(annualIncome.length());
    }

    private String employerName;

    private String email;

    @Enumerated(EnumType.STRING)
    private CustomerStatus status;

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
}