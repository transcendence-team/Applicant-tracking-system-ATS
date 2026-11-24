package com.ats.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.domain.Persistable;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
public class User implements Persistable<UUID> {

    @Id
    private UUID id = UUID.randomUUID();

    @Indexed(unique = true)
    private String email;

    @JsonIgnore
    private String passwordHash;

    private String role;

    private String firstName;

    private String lastName;

    // Optional profile fields (populated later via PATCH /api/auth/me before applying)
    private String phone;

    private String location;

    private String linkedinUrl;

    private String githubUrl;

    private String portfolioUrl;

    private String bio;

    private String department;

    private String jobTitle;

    private boolean active = true;

    private LocalDateTime lastLoginAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public User(String email, String passwordHash, String role, String firstName, String lastName) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.firstName = firstName;
        this.lastName = lastName;
        this.active = true;
    }

    @Override
    @JsonIgnore
    public boolean isNew() {
        return this.createdAt == null;
    }
}
