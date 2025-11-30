// src/api/login/loginauth.js
const express = require("express");
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();

// Import database connection from centralized config
const { pool } = require("../../config/database");

// Initialize Google OAuth client
const CLIENT_ID = '299249406096-hav2dfea6lmr6uavth4ufuslll1o1sl4.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

// Regular email/password login route
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  pool.query(
    "SELECT * FROM users WHERE u_email = ? AND u_password = ?",
    [email, password],
    (err, results) => {
      if (err) {
        console.error("Error querying database:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length > 0) {
        const user = results[0];
        
        const departmentMap = {
          'GCO': 'Guidance Counseling Office',
          'INF': 'Infirmary',
          'OPD': 'Office of the Prefect of Discipline'
        };
        
        return res.json({ 
          message: "User found",
          user: {
            id: user.id,
            email: user.u_email,
            name: user.u_name,
            type: user.u_type,
            department: departmentMap[user.u_type] || user.u_department
          }
        });
      } else {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }
  );
});

// Google OAuth login route
router.post("/google-login", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Missing Google token" });
  }

  try {
    console.log("Verifying Google token...");
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    console.log("Google login attempt for:", email);

    // Check if user exists in database
    pool.query(
      "SELECT * FROM users WHERE u_email = ?",
      [email],
      (err, results) => {
        if (err) {
          console.error("Error querying database:", err);
          return res.status(500).json({ message: "Database error" });
        }

        if (results.length > 0) {
          // User exists, log them in
          const user = results[0];
          const departmentMap = {
            'GCO': 'Guidance Counseling Office',
            'INF': 'Infirmary',
            'OPD': 'Office of the Prefect of Discipline'
          };
          
          console.log("Google login successful for:", email);
          
          return res.json({ 
            message: "Google login successful",
            user: {
              id: user.id,
              email: user.u_email,
              name: user.u_name,
              type: user.u_type,
              department: departmentMap[user.u_type] || user.u_department,
              picture: picture
            }
          });
        } else {
          console.log("No account found for Google email:", email);
          return res.status(404).json({ 
            message: "No account found with this Google email. Please contact administrator." 
          });
        }
      }
    );

  } catch (error) {
    console.error("Google authentication error:", error);
    return res.status(401).json({ message: "Invalid Google token" });
  }
});

// Test route to verify Google OAuth setup
router.get("/google-config", (req, res) => {
  res.json({
    clientId: CLIENT_ID,
    status: "Google OAuth configured",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;