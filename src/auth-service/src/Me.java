package com.ats.auth;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.SecretKey;

@RestController
@RequiredArgsConstructor
public class Me {

    private final SecretKey jwtKey;

    @GetMapping("/api/auth/me")
    public String getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtKey);
        String email = claims.get("email", String.class);
        String role = claims.get("role", String.class);

        return "Hello! You are authenticated as: " + email + " with role: [" + role + "]";
    }
}
