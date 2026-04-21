package com.example.backend.service;

import com.example.backend.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CustomerValidationService {

    private final CustomerRepository customerRepository;

    public CustomerValidationService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    /**
     * Validate customer fields for both CREATE and UPDATE operations.
     * @param fields      map of field name → value
     * @param isCreate    true for CREATE, false for UPDATE
     * @param existingId  the customer ID being updated (null for create)
     * @return list of validation error messages (empty = valid)
     */
    public List<String> validate(Map<String, Object> fields, boolean isCreate, Long existingId) {
        List<String> errors = new ArrayList<>();

        // --- firstName ---
        String firstName = str(fields.get("firstName"));
        if (isEmpty(firstName)) {
            errors.add("First name is required");
        } else {
            if (firstName.length() < 2) errors.add("First name must be at least 2 characters");
            if (!firstName.matches("^[a-zA-Z]+$")) errors.add("First name must contain letters only");
        }

        // --- lastName ---
        String lastName = str(fields.get("lastName"));
        if (isEmpty(lastName)) {
            errors.add("Last name is required");
        } else {
            if (lastName.length() < 2) errors.add("Last name must be at least 2 characters");
            if (!lastName.matches("^[a-zA-Z]+$")) errors.add("Last name must contain letters only");
        }

        // --- gender ---
        if (isEmpty(str(fields.get("gender")))) {
            errors.add("Gender is required");
        }

        // --- nationality ---
        if (isEmpty(str(fields.get("nationality")))) {
            errors.add("Nationality is required");
        }

        // --- dob ---
        String dobStr = str(fields.get("dob"));
        if (isEmpty(dobStr)) {
            errors.add("Date of birth is required");
        } else {
            try {
                LocalDate dob = LocalDate.parse(dobStr);
                if (Period.between(dob, LocalDate.now()).getYears() < 18) {
                    errors.add("Customer must be at least 18 years old");
                }
            } catch (Exception e) {
                errors.add("Invalid date of birth format");
            }
        }

        // --- idNumber ---
        String idNumber = str(fields.get("idNumber"));
        // On update, idNumber may be omitted (masked); only validate if provided
        if (isCreate) {
            if (isEmpty(idNumber)) {
                errors.add("Identification number is required");
            } else {
                if (idNumber.length() <= 8) errors.add("Identification number must be more than 8 characters");
                // Uniqueness check
                if (customerRepository.existsByIdNumber(idNumber)) {
                    errors.add("Identification number already exists in the system");
                }
            }
        } else if (!isEmpty(idNumber) && !idNumber.contains("*")) {
            if (idNumber.length() <= 8) errors.add("Identification number must be more than 8 characters");
            // Uniqueness check excluding current customer
            if (existingId != null && customerRepository.existsByIdNumberAndIdNot(idNumber, existingId)) {
                errors.add("Identification number already exists in the system");
            } else if (existingId == null && customerRepository.existsByIdNumber(idNumber)) {
                errors.add("Identification number already exists in the system");
            }
        }

        // --- email ---
        String email = str(fields.get("email"));
        if (isEmpty(email)) {
            errors.add("Email is required");
        } else if (!email.matches("^[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
            errors.add("Email must be a valid email address");
        }

        // --- phoneNumber ---
        String phone = str(fields.get("phoneNumber"));
        if (isCreate || (!isEmpty(phone) && !phone.contains("*"))) {
            if (isEmpty(phone)) {
                errors.add("Phone number is required");
            } else {
                if (!phone.matches("^\\d+$")) errors.add("Phone number must contain numbers only");
                if (phone.length() < 10 || phone.length() > 12) errors.add("Phone number must be between 10 and 12 digits");
            }
        }

        // --- homeAddress ---
        String address = str(fields.get("homeAddress"));
        if (isEmpty(address)) {
            errors.add("Address is required");
        } else if (address.length() < 10) {
            errors.add("Address must be at least 10 characters");
        }

        // --- employmentStatus ---
        String empStatus = str(fields.get("employmentStatus"));
        if (isEmpty(empStatus)) {
            errors.add("Employment status is required");
        }

        // --- annualIncome ---
        Object incomeObj = fields.get("annualIncome");
        if (incomeObj == null || str(incomeObj).isEmpty()) {
            errors.add("Gross annual income is required");
        } else {
            try {
                double income = Double.parseDouble(str(incomeObj));
                if (income <= 0) errors.add("Gross annual income must be greater than 0");
            } catch (NumberFormatException e) {
                errors.add("Gross annual income must be a valid number");
            }
        }

        // --- employerName (required only if employed) ---
        String employerName = str(fields.get("employerName"));
        if (!isEmpty(empStatus) && isEmployed(empStatus) && isEmpty(employerName)) {
            errors.add("Employer name is required when employment status is Employed");
        }

        return errors;
    }

    private boolean isEmployed(String status) {
        // "Employed" covers Full-time, Part-time, Self-employed
        return status != null && !status.equalsIgnoreCase("Unemployed");
    }

    private String str(Object obj) {
        return obj == null ? "" : obj.toString().trim();
    }

    private boolean isEmpty(String s) {
        return s == null || s.isBlank();
    }
}
