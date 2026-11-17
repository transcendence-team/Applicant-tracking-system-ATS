package com.ats.auth;

import com.ats.auth.AuthServiceApplication.ApiException;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.PublicKey;

@RestController
@RequiredArgsConstructor
public class CreateUser {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PublicKey jwtPublicKey;

    public record CreateUserRequest(
            @NotBlank(message = "First name is required")
            @Size(max = 100, message = "First name must be at most 100 characters")
            String firstName,

            @NotBlank(message = "Last name is required")
            @Size(max = 100, message = "Last name must be at most 100 characters")
            String lastName,

            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String password,

            @NotBlank(message = "Role is required")
            @Pattern(
                regexp = "ROLE_APPLICANT|ROLE_HR|ROLE_ADMIN",
                message = "Role must be ROLE_APPLICANT, ROLE_HR, or ROLE_ADMIN"
            )
            String role
    ) {}

    @PostMapping("/api/auth/create-user")
    @ResponseStatus(HttpStatus.CREATED)
    public String createUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody CreateUserRequest req) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtPublicKey);

        String callerRole = claims.get("role", String.class);
        if (!"ROLE_ADMIN".equals(callerRole)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Only admins can create users with specific roles"
            );
        }

        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    "Email is already registered: " + email
            );
        }

        String hash = passwordEncoder.encode(req.password());
        String firstName = req.firstName().trim();
        String lastName = req.lastName().trim();
        userRepository.save(new User(email, hash, req.role(), firstName, lastName));

        return "User created successfully with role: " + req.role();
    }
}
