package com.ats.auth.service;

import com.ats.auth.dto.RegisterRequest;


public interface AuthService {
    void register(RegisterRequest request);
}