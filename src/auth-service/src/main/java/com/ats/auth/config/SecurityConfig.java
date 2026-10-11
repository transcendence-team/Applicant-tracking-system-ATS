package com.ats.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration                  // sets up setup code for spring
public class SecurityConfig {

    @Bean                       // Spring calls this once at startup and keeps the result
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())    // CSRF protects cookie-based browser forms; not needed for a JWT API
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // no JSESSIONID cookie
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()  // public: login, register, hello
                .anyRequest().authenticated()                 // everything else still locked
            );
        return http.build();
    }
}
