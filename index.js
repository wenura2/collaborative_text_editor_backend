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

// ====== ENVIRONMENT VARIABLE VALIDATION ======
// Check for required environment variables
const requiredEnvVars = ['MONGO_URI', 'ACCESS_TOKEN_SECRET_KEY', 'REFRESH_TOKEN_SECRET_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`\n❌ STARTUP ERROR: Missing required environment variables:`);
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.error(`\n📋 Please set these variables in your environment or .env file\n`);
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// Environment-based CORS configuration - Support multiple frontend ports
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGO_URI = process.env.MONGO_URI;

// Build CORS allowed origins based on environment
let ALLOWED_ORIGINS = [FRONTEND_URL];

if (NODE_ENV === "development") {
  // Add local development URLs in dev mode
  ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175"
  ];
}

console.log(`🌐 Environment: ${NODE_ENV}`);
console.log(`🌐 CORS Allowed Origins: ${ALLOWED_ORIGINS.length} origin(s)`);
console.log(`🌐 Primary Frontend URL: ${FRONTEND_URL}`);
if (MONGO_URI) {
  try {
    const masked = MONGO_URI.includes('@') ? MONGO_URI.split('@')[0] + '@...' : 'set';
    console.log(`🗄️  MongoDB URI: ${masked}`);
  } catch (e) {
    console.log('🗄️  MongoDB URI: (unable to mask)');
  }
}

// ====== HEALTH CHECK ENDPOINT FOR RENDER ======
app.get('/_health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    environment: NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
})

// ====== PRODUCTION-READY CORS CONFIGURATION ======
app.use(cors({ 
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (NODE_ENV === "development") {
      // Allow all origins in development
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600 // 1 hour
}));

app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/project", projectRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/git', gitRoutes);

// ====== SOCKET.IO CONFIGURATION FOR RENDER ======
const io = new Server(server, {
  cors: { 
    origin: NODE_ENV === "production" ? ALLOWED_ORIGINS : true,
    methods: ["GET", "POST"],
    credentials: true,
    maxAge: 3600
  },
  transports: ['websocket', 'polling']
});

// ====== MONGODB CONNECTION ======
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log("✅ MongoDB connected successfully");
})
.catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
  console.error("⚠️  Backend will continue but database operations will fail");
  // Don't exit - let the app start so Render health checks work
});

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.warn("⚠️  MongoDB disconnected");
});

mongoose.connection.on('error', (err) => {
  console.error("❌ MongoDB error:", err.message);
});

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

// ====== SERVER STARTUP ======
const PORT = process.env.PORT || 5000;

const startServer = (port) => {
  server
    .listen(port, "0.0.0.0", () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
      console.log(`${'='.repeat(50)}\n`);
    })
    .once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.warn(`⚠️  Port ${port} is already in use, trying port ${port + 1}...`);
        startServer(port + 1);
        return;
      }
      console.error("❌ Server startup error:", error);
      process.exit(1);
    });
};

startServer(PORT);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📭 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});