# Use lightweight Node.js base image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy only production files
COPY dist ./dist

# Expose the port
EXPOSE 3000

# Run the compiled app
CMD ["node", "dist/index.js"]
