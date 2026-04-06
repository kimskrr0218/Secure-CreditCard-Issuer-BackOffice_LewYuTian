package com.example.backend.model;

public class LoginResponse {
    private String username;
    private String role;
    private String message;
    private boolean twoFactorRequired;

    public LoginResponse(String username, String role, String message) {
        this.username = username;
        this.role = role;
        this.message = message;
        this.twoFactorRequired = false;
    }

    public LoginResponse(String username, String role, String message, boolean twoFactorRequired) {
        this.username = username;
        this.role = role;
        this.message = message;
        this.twoFactorRequired = twoFactorRequired;
    }

    // getters only (no need for setters here)
    public String getUsername() { return username; }
    public String getRole() { return role; }
    public String getMessage() { return message; }
    public boolean isTwoFactorRequired() { return twoFactorRequired; }
}