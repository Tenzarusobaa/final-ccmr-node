// root/api/index.js
require('dotenv').config(); // Add this at the top
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Import database connection
const { pool } = require("../config/database");

// Import routes
const loginRoutes = require("./login/loginauth");
const analyticsRoutes = require("./analytics/analytics");
const caseRecordsRoutes = require("./records/case-records");
const counselingRecordsRoutes = require("./records/counseling-records");
const medicalRecordsRoutes = require("./records/medical-records");
const pendingReferralsRoutes = require('./records/pending-referrals');
const studentDataRoutes = require("./records/student-records");
const notificationsRoutes = require("./records/notifications"); // Add this line

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Test endpoint to check database connection and view login data
app.get("/test/login-data", (req, res) => {
  pool.query("SELECT * FROM users", (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      return res.status(500).json({ 
        error: "Database query failed",
        message: err.message 
      });
    }

    res.json({
      message: "Database connection successful!",
      userCount: results.length,
      users: results
    });
  });
});

app.get("/api/students/search", (req, res) => {
  const { id } = req.query;
  
  if (!id || id.length < 3) {
    return res.json({
      success: true,
      students: [],
      count: 0
    });
  }

  const searchQuery = `
    SELECT 
      sd_id_number,
      sd_student_name,
      sd_strand,
      sd_grade_level,
      sd_section
    FROM tbl_student_data 
    WHERE sd_id_number LIKE ?
    ORDER BY sd_id_number
    LIMIT 10
  `;

  const searchTerm = `${id}%`;
  
  pool.query(searchQuery, [searchTerm], (err, results) => {
    if (err) {
      console.error("Error searching students:", err);
      return res.status(500).json({ 
        error: "Search query failed",
        message: err.message 
      });
    }

    res.json({
      success: true,
      students: results,
      count: results.length
    });
  });
});

// Use routes
app.use("/api", loginRoutes);
app.use("/api", caseRecordsRoutes);
app.use("/api", counselingRecordsRoutes);
app.use("/api", medicalRecordsRoutes);
app.use("/api", analyticsRoutes);
app.use('/api', pendingReferralsRoutes);
app.use("/api", studentDataRoutes);
app.use("/api/notifications", notificationsRoutes);

app.listen(PORT, () => {
  console.log(`Port: http://localhost:${PORT}`);
  console.log(`Test values for login: http://localhost:${PORT}/test/login-data`);
  console.log(`Case records endpoint: http://localhost:${PORT}/api/case-records`);
  console.log(`Notifications endpoint: http://localhost:${PORT}/api/notifications`);
});