# Use a lightweight Node.js image
FROM node:22-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy the rest of the application code
COPY . .

# Expose the port your Express app runs on (matching your server.ts)
EXPOSE 3000

# Start the server using the dev script you added to package.json
CMD ["npm", "run", "dev"]
