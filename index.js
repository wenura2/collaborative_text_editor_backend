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

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/project", projectRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/git', gitRoutes);

// Socket.io configuration with proper CORS
const io = new Server(server, {
  cors: { 
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
});

mongoose.connect("mongodb+srv://thilankawijesingham:NPZ8LSJkiYTXvfEq@cluster0.kmv2to4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));