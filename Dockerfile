# Use a lightweight Node image
FROM node:18-alpine

# Create a directory for our app
WORKDIR /usr/src/app

# Install dependencies
# 🌟 ไฮไลท์: เติม socket.io ต่อท้ายเข้าไปครับ
RUN npm init -y && npm install express mysql2 ejs express-session socket.io

# Copy our web code into the container
COPY . .

# 🌟 เพิ่มเข้ามา: ประกาศเปิด Port ให้ตรงกับที่เขียนไว้ใน server.listen (สมมติว่าเป็น 80)
EXPOSE 80

# Start the web server
CMD ["node", "server.js"]