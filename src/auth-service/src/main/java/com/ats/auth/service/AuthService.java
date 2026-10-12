package com.ats.auth.service;

import com.ats.auth.dto.AuthResponse;
import com.ats.auth.dto.LoginRequest;
import com.ats.auth.dto.RegisterRequest;


public interface AuthService {
    void register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
}