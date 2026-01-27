// root/api/records/users.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// User field definitions
const userFields = `
  u_email as email,
  u_username as username,
  u_name as name,
  u_department as department,
  u_type as userType,
  DATE_FORMAT(created_at, '%m/%d/%Y %h:%i %p') as createdAt
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

// Add new user
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
    INSERT INTO users (u_email, u_username, u_name, u_department, u_type, u_password)
    VALUES (?, ?, ?, ?, ?, ?)
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

// Delete user
router.delete("/users/:email", (req, res) => {
  const email = req.params.email;

  // Prevent deleting the last admin user
  pool.query("SELECT COUNT(*) as adminCount FROM users WHERE u_type = 'Administrator'", (countErr, countResults) => {
    if (countErr) {
      console.error("Error checking admin count:", countErr);
      return res.status(500).json({ error: "Database query failed" });
    }

    pool.query("SELECT u_type FROM users WHERE u_email = ?", [email], (typeErr, typeResults) => {
      if (typeErr) {
        console.error("Error checking user type:", typeErr);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (typeResults.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const userType = typeResults[0].u_type;
      const adminCount = countResults[0].adminCount;

      if (userType === 'Administrator' && adminCount <= 1) {
        return res.status(400).json({ 
          success: false, 
          error: "Cannot delete the last administrator user" 
        });
      }

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
          message: "User deleted successfully"
        });
      });
    });
  });
});

module.exports = router;