package com.propro.warehouse.repository;

import com.propro.warehouse.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    /** Lookup by the Supabase auth id - the key the upsert matches on. */
    Optional<AppUser> findBySupabaseUserId(String supabaseUserId);

    /** Case-insensitive so a stored "Picker" still matches a "picker" filter. */
    List<AppUser> findByRoleIgnoreCaseOrderByNameAsc(String role);

    List<AppUser> findAllByOrderByNameAsc();
}
