package com.ats.auth; //package declaration and folder structure

import org.springframework.boot.SpringApplication; //spring boot class
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * springboot looks for a class with the notation @SpringBootApplication
 * and runs its main method
 * the annotation turns on component scanning,  autoconfiguration and other
 * conveniences, when the app starts, an embedded tomcat server is launched on port 8080 by default
 */

@SpringBootApplication
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
