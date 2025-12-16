# Use a lightweight Node.js image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./

RUN npm install

# Copy the rest of the source code
COPY . .

# Build TypeScript (safe even if already built)
RUN npm run build

# Expose app port
EXPOSE 5000

# Start the app
CMD ["npm", "run", "start"]
