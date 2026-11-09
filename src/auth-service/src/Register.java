package com.ats.auth;

import com.ats.auth.AuthServiceApplication.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class Register {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public record RegisterRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String password
    ) {}

    @PostMapping("/api/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public String register(@Valid @RequestBody RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    "Email is already registered: " + email
            );
        }

        String hash = passwordEncoder.encode(req.password());
        userRepository.save(new User(email, hash, "ROLE_APPLICANT"));

        return "User registered successfully";
    }
}
