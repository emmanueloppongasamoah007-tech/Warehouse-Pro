package com.propro.warehouse.controller;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.propro.warehouse.dto.AppUserRequest;
import com.propro.warehouse.dto.AppUserResponse;
import com.propro.warehouse.model.AppUser;
import com.propro.warehouse.repository.AppUserRepository;

@RestController
@RequestMapping("/api/users")
public class AppUserController {

    private final AppUserRepository appUserRepository;

    public AppUserController(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    /**
     * GET /api/users
     * GET /api/users?role=picker
     *
     * Sorted by name rather than newest-first: this is a directory to look
     * someone up in, not a feed.
     */
    @GetMapping
    public ResponseEntity<List<AppUserResponse>> list(
            @RequestParam(required = false) String role) {
        List<AppUser> users;
        if (role == null || role.isBlank()) {
            users = appUserRepository.findAllByOrderByNameAsc();
        } else {
            String normalised = normaliseRole(role);
            users = appUserRepository.findByRoleIgnoreCaseOrderByNameAsc(normalised);
        }

        return ResponseEntity.ok(users.stream()
                .map(AppUserResponse::new)
                .collect(Collectors.toList()));
    }

    /**
     * POST /api/users
     * Body: { "supabaseUserId": "...", "name": "...", "email": "...",
     *         "employeeId": "WP-1042", "role": "picker" }
     *
     * Upsert: a profile already holding that supabaseUserId is updated in
     * place. The client calls this whenever profile details change, so a
     * second call for the same account is the normal case, not an error.
     *
     * Returns 201 for a newly created profile and 200 for an update, so the
     * caller can tell which happened.
     */
    @PostMapping
    public ResponseEntity<AppUserResponse> upsert(@RequestBody AppUserRequest request) {
        String supabaseUserId = trimmedOrNull(request.getSupabaseUserId());
        if (supabaseUserId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "supabaseUserId is required");
        }

        String name = trimmedOrNull(request.getName());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }

        String email = trimmedOrNull(request.getEmail());
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        }

        String role = normaliseRole(request.getRole());
        // Blank is treated as absent so an empty field from a form clears the
        // value rather than storing "".
        String employeeId = trimmedOrNull(request.getEmployeeId());

        return appUserRepository.findBySupabaseUserId(supabaseUserId)
                .map(existing -> {
                    existing.applyProfile(name, email, employeeId, role);
                    return ResponseEntity.ok(new AppUserResponse(appUserRepository.save(existing)));
                })
                .orElseGet(() -> {
                    AppUser created = appUserRepository.save(
                            new AppUser(supabaseUserId, name, email, employeeId, role));
                    return ResponseEntity.status(HttpStatus.CREATED)
                            .body(new AppUserResponse(created));
                });
    }

    /**
     * Only the two known roles are accepted. An unrecognised value is rejected
     * rather than stored, so the users table cannot drift out of step with the
     * roles the app actually gates on.
     */
    private String normaliseRole(String role) {
        if (role == null || role.isBlank()) {
            return AppUser.ROLE_PICKER;
        }
        String normalised = role.trim().toLowerCase(Locale.ROOT);
        if (!normalised.equals(AppUser.ROLE_PICKER) && !normalised.equals(AppUser.ROLE_ADMIN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown role: " + role + ". Expected '" + AppUser.ROLE_PICKER
                            + "' or '" + AppUser.ROLE_ADMIN + "'.");
        }
        return normalised;
    }

    private String trimmedOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
