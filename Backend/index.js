const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./config/init');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors()); // Allow requests from React Native / Expo
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/students', studentRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Student Registration API is running',
  });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server',
  });
});

// ─── Start Server ────────────────────────────────────────────
async function startServer() {
  try {
    // Initialize database (create tables if they don't exist)
    await initializeDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
      console.log(`📱 For physical devices use: http://192.168.1.61:${PORT}`);
      console.log(`📚 API endpoints:`);
      console.log(`   POST   /api/students      - Register a student`);
      console.log(`   GET    /api/students      - Get all students`);
      console.log(`   GET    /api/students/:id  - Get student by ID`);
      console.log(`   PUT    /api/students/:id  - Update a student`);
      console.log(`   DELETE /api/students/:id  - Delete a student`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
