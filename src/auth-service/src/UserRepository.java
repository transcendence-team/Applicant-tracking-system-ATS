package com.ats.auth;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.UUID;

// Spring Data MongoDB automatically generates queries from these method names
public interface UserRepository extends MongoRepository<User, UUID> {
    User findByEmail(String email);
    boolean existsByEmail(String email);
}

