package com.ats.auth;

import com.ats.auth.AuthServiceApplication.ApiException;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class Me {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecretKey jwtKey;

    public record AccountProfileResponse(
            UUID id,
            String email,
            String role,
            String firstName,
            String lastName,
            String phone,
            String location,
            String linkedinUrl,
            String githubUrl,
            String portfolioUrl,
            String bio,
            String department,
            String jobTitle,
            boolean active,
            LocalDateTime lastLoginAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static AccountProfileResponse from(User user) {
            return new AccountProfileResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getRole(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getPhone(),
                    user.getLocation(),
                    user.getLinkedinUrl(),
                    user.getGithubUrl(),
                    user.getPortfolioUrl(),
                    user.getBio(),
                    user.getDepartment(),
                    user.getJobTitle(),
                    user.isActive(),
                    user.getLastLoginAt(),
                    user.getCreatedAt(),
                    user.getUpdatedAt()
            );
        }
    }

    public record UpdateAccountRequest(
            @NotBlank(message = "Password is required")
            String password,

            @Email(message = "Invalid email format")
            String email,

            @Size(max = 100, message = "First name must be at most 100 characters")
            String firstName,

            @Size(max = 100, message = "Last name must be at most 100 characters")
            String lastName,

            @Size(max = 50, message = "Phone must be at most 50 characters")
            String phone,

            @Size(max = 150, message = "Location must be at most 150 characters")
            String location,

            @Size(max = 255, message = "LinkedIn URL must be at most 255 characters")
            String linkedinUrl,

            @Size(max = 255, message = "GitHub URL must be at most 255 characters")
            String githubUrl,

            @Size(max = 255, message = "Portfolio URL must be at most 255 characters")
            String portfolioUrl,

            String bio,

            @Size(max = 100, message = "Department must be at most 100 characters")
            String department,

            @Size(max = 100, message = "Job title must be at most 100 characters")
            String jobTitle
    ) {}

    public record DeleteAccountRequest(
            @NotBlank(message = "Password is required")
            String password
    ) {}

    @GetMapping("/api/auth/me")
    public AccountProfileResponse getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtKey);
        UUID userId = UUID.fromString(claims.getSubject());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User account not found"));

        return AccountProfileResponse.from(user);
    }

    @PatchMapping("/api/auth/me")
    public AccountProfileResponse updateCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody UpdateAccountRequest req) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtKey);
        UUID userId = UUID.fromString(claims.getSubject());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User account not found"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_CREDENTIALS",
                    "Current password is incorrect"
            );
        }

        if (req.email() != null && !req.email().isBlank()) {
            String newEmail = req.email().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email is already registered: " + newEmail);
            }
            user.setEmail(newEmail);
        }

        if (req.firstName() != null) {
            user.setFirstName(req.firstName().trim());
        }

        if (req.lastName() != null) {
            user.setLastName(req.lastName().trim());
        }

        if (req.phone() != null) {
            user.setPhone(req.phone().trim());
        }

        if (req.location() != null) {
            user.setLocation(req.location().trim());
        }

        if (req.linkedinUrl() != null) {
            user.setLinkedinUrl(req.linkedinUrl().trim());
        }

        if (req.githubUrl() != null) {
            user.setGithubUrl(req.githubUrl().trim());
        }

        if (req.portfolioUrl() != null) {
            user.setPortfolioUrl(req.portfolioUrl().trim());
        }

        if (req.bio() != null) {
            user.setBio(req.bio().trim());
        }

        if (req.department() != null) {
            user.setDepartment(req.department().trim());
        }

        if (req.jobTitle() != null) {
            user.setJobTitle(req.jobTitle().trim());
        }

        return AccountProfileResponse.from(userRepository.save(user));
    }

    @DeleteMapping("/api/auth/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody DeleteAccountRequest req) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtKey);
        UUID userId = UUID.fromString(claims.getSubject());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User account not found"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_CREDENTIALS",
                    "Current password is incorrect"
            );
        }

        userRepository.delete(user);
    }
}
