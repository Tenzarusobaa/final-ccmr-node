// api/records/notifications.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

router.get("/test", (req, res) => {
  res.json({ message: "Notifications router is working!" });
});

// Get notifications for specific receiver - CHANGE THIS LINE
router.get("/", (req, res) => {  // Remove "/notifications" from here
  const { receiver } = req.query;

  if (!receiver) {
    return res.status(400).json({
      error: "Receiver parameter is required",
    });
  }

  const query = `
    SELECT 
      n_id,
      n_sender,
      n_receiver,
      n_type,
      n_message,
      n_is_read,
      n_created_at,
      n_related_record_id,
      n_related_record_type
    FROM tbl_notifications 
    WHERE n_receiver = ?
    ORDER BY n_created_at DESC
  `;

  pool.query(query, [receiver], (err, results) => {
    if (err) {
      console.error("Error fetching notifications:", err);
      return res.status(500).json({
        error: "Database query failed",
        message: err.message,
      });
    }

    res.json({
      success: true,
      notifications: results,
      count: results.length,
    });
  });
});

// Mark notification as read - CHANGE THIS LINE
router.put("/:id/read", (req, res) => {  // Remove "/notifications" from here
  const { id } = req.params;

  const query = `
    UPDATE tbl_notifications 
    SET n_is_read = 'Yes' 
    WHERE n_id = ?
  `;

  pool.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error updating notification:", err);
      return res.status(500).json({
        error: "Database update failed",
        message: err.message,
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        error: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  });
});

// Mark all notifications as read for a receiver - CHANGE THIS LINE
router.put("/mark-all-read", (req, res) => {  // Remove "/notifications" from here
  const { receiver } = req.body;

  if (!receiver) {
    return res.status(400).json({
      error: "Receiver parameter is required",
    });
  }

  const query = `
    UPDATE tbl_notifications 
    SET n_is_read = 'Yes' 
    WHERE n_receiver = ? AND n_is_read = 'No'
  `;

  pool.query(query, [receiver], (err, results) => {
    if (err) {
      console.error("Error updating notifications:", err);
      return res.status(500).json({
        error: "Database update failed",
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: `${results.affectedRows} notifications marked as read`,
      affectedRows: results.affectedRows,
    });
  });
});

module.exports = router;