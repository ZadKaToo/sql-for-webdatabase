# Use a lightweight Node image
FROM node:18-alpine

# Create a directory for our app
WORKDIR /usr/src/app

# Install dependencies (Express is a great web framework)
# แก้บรรทัดนี้ใน Dockerfile
RUN npm init -y && npm install express mysql2 ejs express-session

# Copy our web code into the container
COPY . .

# Start the web server
CMD ["node", "server.js"]