package com.ats.auth.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController // this class handles HTTP; return values become the response body

@RequestMapping("/api/auth") // URL prefix for every method in this class
public class HelloController{

    @GetMapping("/hello") // GET /api/auth/hello → this method
    public String hello() {
        return "Hello from auth-service!";
    }
}