package com.ats.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

// Spring automatically generates the SQL queries from these method names
public interface UserRepository extends JpaRepository<User, UUID> {
    User findByEmail(String email);
    boolean existsByEmail(String email);
}

