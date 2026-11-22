package com.ats.auth;

import com.ats.auth.AuthServiceApplication.ApiException;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.PublicKey;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AccountManagement {

    private final UserRepository userRepository;
    private final PublicKey jwtPublicKey;

    public record AdminUpdateUserRequest(
            @Pattern(
                regexp = "ROLE_APPLICANT|ROLE_HR|ROLE_ADMIN",
                message = "Role must be ROLE_APPLICANT, ROLE_HR, or ROLE_ADMIN"
            )
            String role,
            Boolean active,
            String department,
            String jobTitle
    ) {}

    private void requireAdmin(String authHeader) {
        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtPublicKey);
        String role = claims.get("role", String.class);
        if (!"ROLE_ADMIN".equals(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Admin privileges required");
        }
    }

    @GetMapping("/api/auth/users")
    public List<User> listUsers(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        requireAdmin(authHeader);
        return userRepository.findAll();
    }

    @GetMapping("/api/auth/users/{id}")
    public User getUserById(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable UUID id) {
        Claims claims = AuthServiceApplication.verifyToken(authHeader, jwtPublicKey);
        String callerRole = claims.get("role", String.class);
        String callerSub = claims.getSubject();

        if (!"ROLE_ADMIN".equals(callerRole) && !"ROLE_HR".equals(callerRole) && !id.toString().equals(callerSub)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Insufficient permissions to view this user");
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
        }

        return user;
    }

    @PatchMapping("/api/auth/users/{id}")
    public User updateUserAccount(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateUserRequest req) {
        requireAdmin(authHeader);

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
        }

        if (req.role() != null) user.setRole(req.role());
        if (req.active() != null) user.setActive(req.active());
        if (req.department() != null) user.setDepartment(req.department().trim());
        if (req.jobTitle() != null) user.setJobTitle(req.jobTitle().trim());

        return userRepository.save(user);
    }

    @DeleteMapping("/api/auth/users/{id}")
    public String deleteUserAccount(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable UUID id) {
        requireAdmin(authHeader);

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
        }

        userRepository.delete(user);
        return "User deleted successfully";
    }
}
