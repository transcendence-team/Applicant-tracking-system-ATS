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

import java.security.PublicKey;

@RestController
@RequiredArgsConstructor
public class Me {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PublicKey jwtPublicKey;

    public record UpdateAccountRequest(
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
    public User getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtPublicKey);
        String email = claims.get("email", String.class);

        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
        }

        return user;
    }

    @PatchMapping("/api/auth/me")
    public User updateCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody UpdateAccountRequest req) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtPublicKey);
        String email = claims.get("email", String.class);

        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
        }

        if (req.email() != null && !req.email().isBlank()) {
            String newEmail = req.email().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail())) {
                if (req.password() == null || req.password().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Current password is required to change email");
                }
                if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
                    throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Current password is incorrect");
                }
                if (userRepository.existsByEmail(newEmail)) {
                    throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email is already registered: " + newEmail);
                }
                user.setEmail(newEmail);
            }
        }

        if (req.firstName() != null) user.setFirstName(req.firstName().trim());
        if (req.lastName() != null) user.setLastName(req.lastName().trim());
        if (req.phone() != null) user.setPhone(req.phone().trim());
        if (req.location() != null) user.setLocation(req.location().trim());
        if (req.linkedinUrl() != null) user.setLinkedinUrl(req.linkedinUrl().trim());
        if (req.githubUrl() != null) user.setGithubUrl(req.githubUrl().trim());
        if (req.portfolioUrl() != null) user.setPortfolioUrl(req.portfolioUrl().trim());
        if (req.bio() != null) user.setBio(req.bio().trim());
        if (req.department() != null) user.setDepartment(req.department().trim());
        if (req.jobTitle() != null) user.setJobTitle(req.jobTitle().trim());

        return userRepository.save(user);
    }

    @DeleteMapping("/api/auth/me")
    public String deleteCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody DeleteAccountRequest req) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtPublicKey);
        String email = claims.get("email", String.class);

        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Current password is incorrect");
        }

        userRepository.delete(user);
        return "User deleted successfully";
    }
}
