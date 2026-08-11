package com.propro.warehouse.dto;

public class AppUserRequest {

    // Supabase auth.users UUID - identifies which profile to create or update
    private String supabaseUserId;

    private String name;

    private String email;

    // Optional: assigned by the warehouse, often set after signup
    private String employeeId;

    // "picker" or "admin"
    private String role;

    public AppUserRequest() {}

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
}
