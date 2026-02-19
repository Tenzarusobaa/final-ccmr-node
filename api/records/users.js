// root/api/records/users.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// User field definitions with status and deactivation
const userFields = `
  u_email as email,
  u_username as username,
  u_name as name,
  u_department as department,
  u_type as userType,
  u_status as status,
  DATE_FORMAT(created_at, '%m/%d/%Y %h:%i %p') as createdAt,
  DATE_FORMAT(deactivated_at, '%m/%d/%Y %h:%i %p') as deactivatedAt
`;

// Common response handler
const handleUserResponse = (res, err, results, successMessage = '') => {
  if (err) {
    console.error("Database query failed:", err);
    return res.status(500).json({ error: "Database query failed", message: err.message });
  }

  const response = { success: true, users: results, count: results.length };
  if (successMessage) response.message = successMessage;
  res.json(response);
};

// GET all users
router.get("/users", (req, res) => {
  pool.query(`SELECT ${userFields} FROM users ORDER BY created_at DESC`, (err, results) => {
    handleUserResponse(res, err, results);
  });
});

// GET all active users only
router.get("/users/active", (req, res) => {
  pool.query(
    `SELECT ${userFields} FROM users WHERE u_status = 'Active' ORDER BY created_at DESC`,
    (err, results) => {
      handleUserResponse(res, err, results);
    }
  );
});

// GET single user by email
router.get("/users/:email", (req, res) => {
  const email = req.params.email;

  pool.query(`SELECT ${userFields} FROM users WHERE u_email = ?`, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ error: "Database query failed", message: err.message });
    }

    if (results.length === 0) return res.status(404).json({ success: false, error: "User not found" });

    res.json({ success: true, user: results[0] });
  });
});

// Search users
router.get("/users/search", (req, res) => {
  const searchQuery = req.query.query;
  
  if (!searchQuery) {
    return res.status(400).json({ success: false, error: "Search query is required" });
  }

  const query = `
    SELECT ${userFields}
    FROM users 
    WHERE (
      u_email LIKE ? OR 
      u_username LIKE ? OR 
      u_name LIKE ? OR
      u_department LIKE ? OR
      u_type LIKE ?
    )
    ORDER BY created_at DESC
  `;

  const searchPattern = `%${searchQuery}%`;
  const searchTerms = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
  
  pool.query(query, searchTerms, (err, results) => {
    handleUserResponse(res, err, results);
  });
});

// Add new user (default status = Active)
router.post("/users", (req, res) => {
  const { email, username, name, department, userType, password } = req.body;

  // Validate required fields
  if (!email || !username || !name || !userType || !password) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields" 
    });
  }

  const query = `
    INSERT INTO users (u_email, u_username, u_name, u_department, u_type, u_password, u_status)
    VALUES (?, ?, ?, ?, ?, ?, 'Active')
  `;

  pool.query(query, [email, username, name, department, userType, password], (err, results) => {
    if (err) {
      console.error("Error adding user:", err);
      
      // Handle duplicate entry error
      if (err.code === 'ER_DUP_ENTRY') {
        const field = err.message.includes('u_email') ? 'email' : 'username';
        return res.status(409).json({ 
          success: false, 
          error: `User with this ${field} already exists` 
        });
      }
      
      return res.status(500).json({ error: "Database operation failed", message: err.message });
    }

    res.json({
      success: true,
      message: "User added successfully",
      userId: results.insertId
    });
  });
});

// Update user
router.put("/users/:email", (req, res) => {
  const email = req.params.email;
  const { username, name, department, userType, password } = req.body;

  // Build dynamic query based on provided fields
  const updates = [];
  const values = [];

  if (username !== undefined) {
    updates.push("u_username = ?");
    values.push(username);
  }
  
  if (name !== undefined) {
    updates.push("u_name = ?");
    values.push(name);
  }
  
  if (department !== undefined) {
    updates.push("u_department = ?");
    values.push(department);
  }
  
  if (userType !== undefined) {
    updates.push("u_type = ?");
    values.push(userType);
  }
  
  if (password !== undefined) {
    updates.push("u_password = ?");
    values.push(password);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, error: "No fields to update" });
  }

  values.push(email);

  const query = `
    UPDATE users 
    SET ${updates.join(", ")}
    WHERE u_email = ?
  `;

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error("Error updating user:", err);
      
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ 
          success: false, 
          error: "Username already exists" 
        });
      }
      
      return res.status(500).json({ error: "Database operation failed", message: err.message });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      affectedRows: results.affectedRows
    });
  });
});

// Deactivate user (soft delete)
router.put("/users/:email/deactivate", (req, res) => {
  const email = req.params.email;

  // Check if user exists and get their type
  pool.query("SELECT u_type FROM users WHERE u_email = ?", [email], (typeErr, typeResults) => {
    if (typeErr) {
      console.error("Error checking user:", typeErr);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (typeResults.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userType = typeResults[0].u_type;

    // If deactivating an admin, check if it's the last one
    if (userType === 'Administrator') {
      pool.query(
        "SELECT COUNT(*) as adminCount FROM users WHERE u_type = 'Administrator' AND u_status = 'Active'",
        (countErr, countResults) => {
          if (countErr) {
            console.error("Error checking admin count:", countErr);
            return res.status(500).json({ error: "Database query failed" });
          }

          const adminCount = countResults[0].adminCount;

          if (adminCount <= 1) {
            return res.status(400).json({ 
              success: false, 
              error: "Cannot deactivate the last active administrator" 
            });
          }

          // Proceed with deactivation
          deactivateUser(email, res);
        }
      );
    } else {
      // Deactivate non-admin user
      deactivateUser(email, res);
    }
  });
});

// Helper function to deactivate user
const deactivateUser = (email, res) => {
  const query = `
    UPDATE users 
    SET u_status = 'Inactive', deactivated_at = CURRENT_TIMESTAMP
    WHERE u_email = ? AND u_status = 'Active'
  `;

  pool.query(query, [email], (err, results) => {
    if (err) {
      console.error("Error deactivating user:", err);
      return res.status(500).json({ error: "Database operation failed", message: err.message });
    }

    if (results.affectedRows === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "User is already inactive or not found" 
      });
    }

    res.json({
      success: true,
      message: "User deactivated successfully"
    });
  });
};

// Activate user
router.put("/users/:email/activate", (req, res) => {
  const email = req.params.email;

  const query = `
    UPDATE users 
    SET u_status = 'Active', deactivated_at = NULL
    WHERE u_email = ? AND u_status = 'Inactive'
  `;

  pool.query(query, [email], (err, results) => {
    if (err) {
      console.error("Error activating user:", err);
      return res.status(500).json({ error: "Database operation failed", message: err.message });
    }

    if (results.affectedRows === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "User is already active or not found" 
      });
    }

    res.json({
      success: true,
      message: "User activated successfully"
    });
  });
});

// Hard delete user (only for inactive users, with admin checks)
router.delete("/users/:email", (req, res) => {
  const email = req.params.email;

  // First check if user exists and is inactive
  pool.query(
    "SELECT u_type, u_status FROM users WHERE u_email = ?", 
    [email], 
    (checkErr, checkResults) => {
      if (checkErr) {
        console.error("Error checking user:", checkErr);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (checkResults.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const user = checkResults[0];

      // Prevent deleting active users
      if (user.u_status === 'Active') {
        return res.status(400).json({ 
          success: false, 
          error: "Cannot delete active users. Deactivate them first." 
        });
      }

      // For admin users, check if it's the last one even when inactive
      if (user.u_type === 'Administrator') {
        pool.query(
          "SELECT COUNT(*) as adminCount FROM users WHERE u_type = 'Administrator'",
          (countErr, countResults) => {
            if (countErr) {
              console.error("Error checking admin count:", countErr);
              return res.status(500).json({ error: "Database query failed" });
            }

            const adminCount = countResults[0].adminCount;

            if (adminCount <= 1) {
              return res.status(400).json({ 
                success: false, 
                error: "Cannot delete the last administrator user" 
              });
            }

            // Proceed with deletion
            deleteUser(email, res);
          }
        );
      } else {
        // Delete non-admin inactive user
        deleteUser(email, res);
      }
    }
  );
});

// Helper function to delete user
const deleteUser = (email, res) => {
  pool.query("DELETE FROM users WHERE u_email = ?", [email], (err, results) => {
    if (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ error: "Database operation failed", message: err.message });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      message: "User permanently deleted successfully"
    });
  });
};

// Get user statistics
router.get("/users/stats/summary", (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as totalUsers,
      SUM(CASE WHEN u_status = 'Active' THEN 1 ELSE 0 END) as activeUsers,
      SUM(CASE WHEN u_status = 'Inactive' THEN 1 ELSE 0 END) as inactiveUsers,
      SUM(CASE WHEN u_type = 'Administrator' AND u_status = 'Active' THEN 1 ELSE 0 END) as activeAdmins,
      SUM(CASE WHEN u_department = 'OPD' AND u_status = 'Active' THEN 1 ELSE 0 END) as activeOPD,
      SUM(CASE WHEN u_department = 'GCO' AND u_status = 'Active' THEN 1 ELSE 0 END) as activeGCO,
      SUM(CASE WHEN u_department = 'INF' AND u_status = 'Active' THEN 1 ELSE 0 END) as activeINF
    FROM users
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error getting user stats:", err);
      return res.status(500).json({ error: "Database query failed", message: err.message });
    }

    res.json({
      success: true,
      stats: results[0]
    });
  });
});

module.exports = router;