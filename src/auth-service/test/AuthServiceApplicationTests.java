package com.ats.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${admin.password}")
    private String adminPassword;

    private MockMvc mockMvc;

    private static String authToken;
    private static String adminToken;
    private static String candidateId;
    private static String hrUserId;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.context).build();
    }

    private static String extractJsonField(String json, String field) {
        return json.split("\"" + field + "\":\"")[1].split("\"")[0];
    }

    @Test
    @Order(1)
    void registerSuccess() throws Exception {
        User existingCandidate = userRepository.findByEmail("candidate@example.com");
        if (existingCandidate != null) {
            userRepository.delete(existingCandidate);
        }
        User existingHr = userRepository.findByEmail("hr@example.com");
        if (existingHr != null) {
            userRepository.delete(existingHr);
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

        authToken = extractJsonField(result.getResponse().getContentAsString(), "accessToken");
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
        MvcResult result = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.email").value("candidate@example.com"))
                .andExpect(jsonPath("$.firstName").value("Jane"))
                .andExpect(jsonPath("$.lastName").value("Doe"))
                .andExpect(jsonPath("$.role").value("ROLE_APPLICANT"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();

        candidateId = extractJsonField(result.getResponse().getContentAsString(), "id");
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
    void changePasswordWrongCurrentPasswordReturns401() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "wrongCurrentPassword",
                                  "newPassword": "newSecurePassword456"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(14)
    void changePasswordSuccessAndRestore() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "securePassword123",
                                  "newPassword": "newSecurePassword456"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().string("Password changed successfully"));

        // Verify login works with the new password and restore original password
        mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "newSecurePassword456",
                                  "newPassword": "securePassword123"
                                }
                                """))
                .andExpect(status().isOk());
    }

    @Test
    @Order(15)
    void adminLoginSuccess() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s"
                                }
                                """.formatted(adminEmail, adminPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        adminToken = extractJsonField(result.getResponse().getContentAsString(), "accessToken");
    }

    @Test
    @Order(16)
    void createUserForbiddenForNonAdminReturns403() throws Exception {
        mockMvc.perform(post("/api/auth/create-user")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Bob",
                                  "lastName": "Recruiter",
                                  "email": "hr@example.com",
                                  "password": "hrPassword123",
                                  "role": "ROLE_HR"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    @Test
    @Order(17)
    void createUserByAdminSuccess() throws Exception {
        mockMvc.perform(post("/api/auth/create-user")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Bob",
                                  "lastName": "Recruiter",
                                  "email": "hr@example.com",
                                  "password": "hrPassword123",
                                  "role": "ROLE_HR"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(content().string("User created successfully with role: ROLE_HR"));

        User hrUser = userRepository.findByEmail("hr@example.com");
        hrUserId = hrUser.getId().toString();
    }

    @Test
    @Order(18)
    void listUsersForbiddenForNonAdminReturns403() throws Exception {
        mockMvc.perform(get("/api/auth/users")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    @Test
    @Order(19)
    void listUsersByAdminSuccess() throws Exception {
        mockMvc.perform(get("/api/auth/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").isNotEmpty());
    }

    @Test
    @Order(20)
    void getUserByIdSuccessForAdminAndSelf() throws Exception {
        // Admin can view any user by ID
        mockMvc.perform(get("/api/auth/users/" + hrUserId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("hr@example.com"))
                .andExpect(jsonPath("$.role").value("ROLE_HR"));

        // Applicant can view their own profile by ID
        mockMvc.perform(get("/api/auth/users/" + candidateId)
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("candidate@example.com"));
    }

    @Test
    @Order(21)
    void getUserByIdForbiddenForOtherApplicantReturns403() throws Exception {
        mockMvc.perform(get("/api/auth/users/" + hrUserId)
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    @Test
    @Order(22)
    void getUserByIdNotFoundReturns404() throws Exception {
        mockMvc.perform(get("/api/auth/users/00000000-0000-0000-0000-000000000000")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("USER_NOT_FOUND"));
    }

    @Test
    @Order(23)
    void updateUserAccountByAdminAndDisableCheck() throws Exception {
        mockMvc.perform(patch("/api/auth/users/" + hrUserId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "ROLE_HR",
                                  "active": false,
                                  "department": "Talent Acquisition",
                                  "jobTitle": "Senior Recruiter"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.department").value("Talent Acquisition"))
                .andExpect(jsonPath("$.jobTitle").value("Senior Recruiter"));

        // Verify disabled account cannot log in (403 ACCOUNT_DISABLED)
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "hr@example.com",
                                  "password": "hrPassword123"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCOUNT_DISABLED"));
    }

    @Test
    @Order(24)
    void deleteUserAccountByAdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/auth/users/" + hrUserId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(content().string("User deleted successfully"));
    }

    @Test
    @Order(25)
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
