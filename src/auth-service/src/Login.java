package com.ats.auth;

import com.ats.auth.AuthServiceApplication.ApiException;
import io.jsonwebtoken.Jwts;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.SecretKey;
import java.util.Date;

@RestController
@RequiredArgsConstructor
public class Login {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecretKey jwtKey;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    public record LoginRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record LoginResponse(String accessToken, String tokenType, long expiresIn) {}

    @PostMapping("/api/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email);

        if (user == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_CREDENTIALS",
                    "Invalid email or password"
            );
        }

        long now = System.currentTimeMillis();
        String token = Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole())
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(jwtKey)
                .compact();

        return new LoginResponse(token, "Bearer", expirationMs / 1000);
    }
}
