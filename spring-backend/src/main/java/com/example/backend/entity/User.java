package com.example.backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = true, unique = true)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) // Accept password in requests, never expose in responses
    @Column(nullable = false)
    private String password;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    @Column(name = "force_password_change")
    private Boolean forcePasswordChange = false;

    @Column(name = "two_factor_enabled", nullable = false)
    private Boolean twoFactorEnabled = false;

    @JsonIgnore
    @Column(name = "two_factor_secret")
    private String twoFactorSecret;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Boolean getForcePasswordChange() { return forcePasswordChange; }
    public void setForcePasswordChange(Boolean forcePasswordChange) { this.forcePasswordChange = forcePasswordChange; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(Boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public String getTwoFactorSecret() { return twoFactorSecret; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }
}
