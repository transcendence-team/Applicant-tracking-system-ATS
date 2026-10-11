# -------------------------------------------------
# Build stage – uses Maven to compile the jar
# -------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Package the application (skipping tests for speed)
RUN mvn -B clean package -DskipTests

# -------------------------------------------------
# Runtime stage – minimal JRE + the packaged jar
# -------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

# Create a non‑root user (optional but good practice)
ARG USER=appuser
RUN addgroup -S $USER && adduser -S $USER -G $USER
USER $USER

WORKDIR /app

# Copy the fat‑jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port Spring Boot uses (default 8080)
EXPOSE 8080

# Use the environment variables from .env (Spring Boot reads them automatically)
ENTRYPOINT ["java","-jar","app.jar"]
