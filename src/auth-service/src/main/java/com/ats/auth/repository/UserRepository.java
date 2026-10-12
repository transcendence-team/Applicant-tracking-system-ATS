package com.ats.auth.repository;

import com.ats.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> { //spring data generates the implementation and database questies for this interface

    // Spring derives the SQL query automatically from the method name!
    // "SELECT * FROM users WHERE email = ?"
    Optional<User> findByEmail(String email);

    // "SELECT COUNT(*) > 0 FROM users WHERE email = ?"
    boolean existsByEmail(String email);
}
