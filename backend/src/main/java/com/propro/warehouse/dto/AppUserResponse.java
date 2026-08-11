package com.propro.warehouse.dto;

import com.propro.warehouse.model.AppUser;

import java.time.LocalDateTime;

/**
 * A user profile as the client sees it.
 *
 * supabaseUserId is included so the client can match a listed profile against
 * the signed-in session without a second lookup.
 */
public class AppUserResponse {

    private Long id;
    private String supabaseUserId;
    private String name;
    private String email;
    private String employeeId;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public AppUserResponse() {}

    public AppUserResponse(AppUser user) {
        this.id = user.getId();
        this.supabaseUserId = user.getSupabaseUserId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.employeeId = user.getEmployeeId();
        this.role = user.getRole();
        this.createdAt = user.getCreatedAt();
        this.updatedAt = user.getUpdatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSupabaseUserId() { return supabaseUserId; }
    public void setSupabaseUserId(String supabaseUserId) { this.supabaseUserId = supabaseUserId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
