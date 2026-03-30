package com.example.backend.dto;

import lombok.Data;

@Data
public class CardDTO {
    private Long id;
    private String cardType;
    private String cardHolderName;
    private Double creditLimit;
    private Long customerId;
    private Long accountId;
}