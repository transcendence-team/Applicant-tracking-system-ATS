# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your Express app runs on (matching your server.ts)
EXPOSE 3000

# Start the server using the dev script you added to package.json
CMD ["npm", "run", "dev"]