package com.example.backend.model;

public class LoginResponse {
    private String username;
    private String role;
    private String message;

    public LoginResponse(String username, String role, String message) {
        this.username = username;
        this.role = role;
        this.message = message;
    }

    // getters only (no need for setters here)
    public String getUsername() { return username; }
    public String getRole() { return role; }
    public String getMessage() { return message; }
}