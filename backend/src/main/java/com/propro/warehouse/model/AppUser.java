package com.propro.warehouse.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * A user profile mirrored from Supabase Auth.
 *
 * Authentication stays with Supabase - this table exists so the backend can
 * list and join on users without calling the auth API. supabaseUserId is the
 * link between the two, and the natural key for upserts: the row is written
 * whenever the client's profile changes, so a second signup or a name edit
 * updates the same record rather than creating another.
 *
 * No password or token is stored here.
 */
@Entity
@Table(name = "app_users")
public class AppUser {

    public static final String ROLE_PICKER = "picker";
    public static final String ROLE_ADMIN = "admin";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Supabase's auth.users UUID. Unique because one auth account is one
    // profile; the constraint is what makes the upsert safe under a race.
    @Column(name = "supabase_user_id", nullable = false, unique = true)
    private String supabaseUserId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    // Nullable: assigned by the warehouse, and not known at signup.
    @Column(name = "employee_id")
    private String employeeId;

    @Column(nullable = false)
    private String role = ROLE_PICKER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Set on every save, so the admin list can show when a profile last changed.
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public AppUser() {}

    public AppUser(String supabaseUserId, String name, String email, String employeeId, String role) {
        this.supabaseUserId = supabaseUserId;
        this.name = name;
        this.email = email;
        this.employeeId = employeeId;
        this.role = role;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = createdAt;
    }

    /**
     * Applies incoming profile fields to an existing row.
     *
     * Kept on the entity so create and upsert cannot drift in which fields they
     * write. supabaseUserId is deliberately not settable here - it identifies
     * the row being updated, so changing it would repoint the profile at a
     * different auth account.
     */
    public void applyProfile(String name, String email, String employeeId, String role) {
        this.name = name;
        this.email = email;
        this.employeeId = employeeId;
        this.role = role;
        this.updatedAt = LocalDateTime.now();
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
