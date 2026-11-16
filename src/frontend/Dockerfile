# Use a lightweight Node.js image specifically built for web apps
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the package files first (to cache dependencies)
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy all the Next.js source code into the container
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Start the Next.js development server
CMD ["npm", "run", "dev"]