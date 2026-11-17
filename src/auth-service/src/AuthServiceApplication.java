package com.ats.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@SpringBootApplication
@RestControllerAdvice //makes the following class an class catcher for all rest controllers
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }

    public record ErrorResponse(String error, String message) {}


    public static class ApiException extends RuntimeException { //inherits so it can be thrown anywhere without throws 
        private final HttpStatus status;
        private final String code;

        public ApiException(HttpStatus status, String code, String message) {
            super(message); //passes nessage to parent class for it to provide ex.getMessage()
            this.status = status;
            this.code = code;
        }
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static byte[] parseKeyBytes(String keyValue, String header, String footer) {
        String resolved = keyValue.trim();
        // If base64-encoded full PEM, decode it first
        if (!resolved.contains("BEGIN ")) {
            try {
                String decoded = new String(Base64.getDecoder().decode(resolved), StandardCharsets.UTF_8);
                if (decoded.contains("BEGIN ")) {
                    resolved = decoded;
                }
            } catch (IllegalArgumentException ignored) {
            }
        }
        String cleanBase64 = resolved
                .replace(header, "")
                .replace(footer, "")
                .replaceAll("\\s+", "");
        return Base64.getDecoder().decode(cleanBase64);
    }

    @Bean
    public PrivateKey jwtPrivateKey(@Value("${jwt.private-key}") String privateKeyStr) throws Exception {
        byte[] keyBytes = parseKeyBytes(privateKeyStr, "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----");
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
    }

    @Bean
    public PublicKey jwtPublicKey(@Value("${jwt.public-key}") String publicKeyStr) throws Exception {
        byte[] keyBytes = parseKeyBytes(publicKeyStr, "-----BEGIN PUBLIC KEY-----", "-----END PUBLIC KEY-----");
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(keyBytes));
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }

    @Bean
    public CommandLineRunner seedAdminUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${admin.email}") String adminEmail,
            @Value("${admin.password}") String adminPassword) {
        return args -> {
            String email = adminEmail.trim().toLowerCase();
            if (!userRepository.existsByEmail(email)) {
                String hash = passwordEncoder.encode(adminPassword);
                userRepository.save(new User(email, hash, "ROLE_ADMIN", "System", "Admin"));
            }
        };
    }

    public static Claims verifyToken(String authHeader, PublicKey jwtPublicKey) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Missing or invalid token");
        }
        try {
            String token = authHeader.substring(7);
            return Jwts.parser()
                    .verifyWith(jwtPublicKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Missing or invalid token");
        }
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.status).body(new ErrorResponse(ex.code, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().getFirst().getDefaultMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse("VALIDATION_FAILED", message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedJson() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("MALFORMED_JSON", "Request body is invalid or malformed JSON"));
    }
}
