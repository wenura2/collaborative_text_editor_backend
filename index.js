require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const projectController = require('./controllers/projectController');
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const githubRoutes = require('./routes/githubRoutes');
const gitRoutes = require('./routes/gitRoutes');

const app = express();
const server = http.createServer(app);

// Environment-based CORS configuration
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://thilankawijesingham:NPZ8LSJkiYTXvfEq@cluster0.kmv2to4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

console.log("🌐 CORS Origin:", FRONTEND_ORIGIN);
if (MONGO_URI) {
  try {
    const masked = MONGO_URI.includes('@') ? MONGO_URI.split('@')[0] + '@...' : 'set';
    console.log('🗄️  MongoDB URI:', masked);
  } catch (e) {
    console.log('🗄️  MongoDB URI: (unable to mask)');
  }
} else {
  console.log('🗄️  MongoDB URI: not set');
}

// Health endpoint for Render and quick checks
app.get('/_health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'unknown' }));

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/project", projectRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/git', gitRoutes);

// Socket.io configuration with proper CORS
const io = new Server(server, {
  cors: { 
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  },
});

mongoose.connect(MONGO_URI)
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Track connected users
const userSocketMap = {};
const socketProjectMap = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join", async ({ projectid, username, secretCode }) => {
    console.log(`Join request: ${username} to project ${projectid}`);
    
    // Store user information
    userSocketMap[socket.id] = username;
    socketProjectMap[socket.id] = projectid;
    
    // Join the socket room
    socket.join(projectid);
    
    // Notify all clients in the room that someone joined
    io.to(projectid).emit("joined", {
      clients: Object.entries(userSocketMap)
        .filter(([socketId]) => socketProjectMap[socketId] === projectid)
        .map(([socketId, username]) => ({
          socketId,
          username,
        })),
      username,
    });
    
    // Handle project data retrieval and validation
    await projectController.handleJoin(socket, projectid, username, secretCode);
  });

  socket.on("code_change", ({ projectid, fileId, content }) => {
    console.log(`Code change in project ${projectid}, file ${fileId}`);
    projectController.handleCodeChange(socket, projectid, fileId, content);
  });

  socket.on("create_file", ({ projectid, fileName }, callback) => {
    console.log(`Creating file ${fileName} in project ${projectid}`);
    const newFile = projectController.handleFileCreate(socket, projectid, fileName);
    if (newFile && callback) {
      callback(newFile);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    const projectid = socketProjectMap[socket.id];
    const username = userSocketMap[socket.id];
    
    // Delete user from tracking maps
    delete userSocketMap[socket.id];
    delete socketProjectMap[socket.id];

    if (projectid && username) {
      // Notify remaining clients in the room
      io.to(projectid).emit("user_left", {
        username,
        clients: Object.entries(userSocketMap)
          .filter(([socketId]) => socketProjectMap[socketId] === projectid)
          .map(([socketId, username]) => ({
            socketId,
            username,
          })),
      });
    }
  });
});

const BASE_PORT = Number(process.env.PORT) || 5000;

const startServer = (port) => {
  server
    .listen(port, () => console.log(`Server running on port ${port}`))
    .once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.warn(`Port ${port} is in use, retrying on ${port + 1}...`);
        startServer(port + 1);
        return;
      }
      console.error("Server startup error:", error);
      process.exit(1);
    });
};

startServer(BASE_PORT);