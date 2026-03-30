package com.example.backend.entity;

import com.example.backend.enums.CustomerStatus;
import com.example.backend.enums.CustomerType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

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
    private String idNumber;
    private String phoneNumber;
    private String homeAddress;
    private Double annualIncome;
    private String employerName;

    private String email;

    private String organization;   // Retail Banking / Private Banking

    private String currency;       // SGD, USD

    @Enumerated(EnumType.STRING)
    private CustomerType type;

    @Enumerated(EnumType.STRING)
    private CustomerStatus status;
}