package com.ats.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthServiceApplicationTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    private MockMvc mockMvc;

    private static String authToken;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.context).build();
    }

    @Test
    @Order(1)
    void registerSuccess() throws Exception {
        User existing = userRepository.findByEmail("candidate@example.com");
        if (existing != null) {
            userRepository.delete(existing);
        }

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Jane",
                                  "lastName": "Doe",
                                  "email": "candidate@example.com",
                                  "password": "securePassword123"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(content().string("User registered successfully"));
    }

    @Test
    @Order(2)
    void registerDuplicateEmailReturns409() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Jane",
                                  "lastName": "Doe",
                                  "email": "candidate@example.com",
                                  "password": "securePassword123"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    @Order(3)
    void registerInvalidPasswordReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Jane",
                                  "lastName": "Doe",
                                  "email": "shortpass@example.com",
                                  "password": "123"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    @Order(4)
    void registerInvalidEmailReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Jane",
                                  "lastName": "Doe",
                                  "email": "not-an-email",
                                  "password": "securePassword123"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    @Order(5)
    void loginSuccessAndExtractToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "candidate@example.com",
                                  "password": "securePassword123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        authToken = body.split("\"accessToken\":\"")[1].split("\"")[0];
    }

    @Test
    @Order(6)
    void loginInvalidCredentialsReturns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "candidate@example.com",
                                  "password": "wrongPassword123"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(7)
    void loginMissingFieldReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "candidate@example.com"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    @Order(8)
    void getCurrentUserSuccess() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("candidate@example.com"))
                .andExpect(jsonPath("$.firstName").value("Jane"))
                .andExpect(jsonPath("$.lastName").value("Doe"))
                .andExpect(jsonPath("$.role").value("ROLE_APPLICANT"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @Order(9)
    void updateCurrentUserProfileInfo() throws Exception {
        mockMvc.perform(patch("/api/auth/me")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phone": "+1-555-0199",
                                  "location": "Paris, France",
                                  "linkedinUrl": "https://linkedin.com/in/janedoe",
                                  "githubUrl": "https://github.com/janedoe",
                                  "portfolioUrl": "https://janedoe.dev",
                                  "bio": "Full-stack engineer with 4 years of experience."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("+1-555-0199"))
                .andExpect(jsonPath("$.location").value("Paris, France"))
                .andExpect(jsonPath("$.linkedinUrl").value("https://linkedin.com/in/janedoe"))
                .andExpect(jsonPath("$.githubUrl").value("https://github.com/janedoe"))
                .andExpect(jsonPath("$.portfolioUrl").value("https://janedoe.dev"))
                .andExpect(jsonPath("$.bio").value("Full-stack engineer with 4 years of experience."));
    }

    @Test
    @Order(10)
    void updateEmailAddressWithCurrentPassword() throws Exception {
        mockMvc.perform(patch("/api/auth/me")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "password": "securePassword123",
                                  "email": "candidate@example.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("candidate@example.com"));
    }

    @Test
    @Order(11)
    void getCurrentUserWithoutTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    @Order(12)
    void getCurrentUserWithInvalidTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer invalid.token.payload"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    @Order(13)
    void deleteCurrentUserAccount() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "password": "securePassword123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().string("User deleted successfully"));
    }
}
