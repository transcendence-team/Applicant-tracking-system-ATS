package com.ats.auth.service;

import com.ats.auth.dto.RegisterRequest;
import com.ats.auth.entity.Role;
import com.ats.auth.entity.User;
import com.ats.auth.exception.EmailAlreadyExistsException;
import com.ats.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        // 1. Check if email already registered
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email is already registered: " + request.getEmail());
        }

        // 2. Hash password and build User entity
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_APPLICANT) // Default rule: public registrations are APPLICANT
                .build();

        // 3. Save to PostgreSQL
        userRepository.save(user);
    }
}
