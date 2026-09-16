const express = require("express");
require("dotenv").config();

const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const connectDB = require("./config/db");

const app = express();

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://ai-cold-mail-generator-a9go.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);


const path = require('path');

app.use(express.static(path.join(__dirname, '../client/ai-cold-mail-generator/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/ai-cold-mail-generator/dist', 'index.html'));
});


// Database
connectDB();

// Health check
app.get("/", (req, res) => {
  res.status(200).send("AI Cold Mail Generator API is running");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    error: "Something went wrong",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});