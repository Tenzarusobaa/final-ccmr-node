// api/records/notifications.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

router.get("/test", (req, res) => {
  res.json({ message: "Notifications router is working!" });
});

// Get notifications for specific receiver
router.get("/", (req, res) => {
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

// Get OPD Medical Certificate notifications specifically
router.get("/opd-certificates", (req, res) => {
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
    AND n_type = 'OPD Medical Certificate'
    ORDER BY n_created_at DESC
  `;

  pool.query(query, [receiver], (err, results) => {
    if (err) {
      console.error("Error fetching OPD certificate notifications:", err);
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

// Mark notification as read
router.put("/:id/read", (req, res) => {
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

// Mark all notifications as read for a receiver
router.put("/mark-all-read", (req, res) => {
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

// Get unread notification count
router.get("/unread-count", (req, res) => {
  const { receiver } = req.query;

  if (!receiver) {
    return res.status(400).json({
      error: "Receiver parameter is required",
    });
  }

  const query = `
    SELECT 
      COUNT(*) as count,
      n_type,
      COUNT(CASE WHEN n_type = 'OPD Medical Certificate' THEN 1 END) as opd_certificate_count
    FROM tbl_notifications 
    WHERE n_receiver = ? AND n_is_read = 'No'
    GROUP BY n_type
  `;

  pool.query(query, [receiver], (err, results) => {
    if (err) {
      console.error("Error fetching unread count:", err);
      return res.status(500).json({
        error: "Database query failed",
        message: err.message,
      });
    }

    let totalCount = 0;
    let opdCertificateCount = 0;
    
    results.forEach(row => {
      totalCount += row.count;
      if (row.n_type === 'OPD Medical Certificate') {
        opdCertificateCount = row.opd_certificate_count;
      }
    });

    res.json({
      success: true,
      total: totalCount,
      opdCertificates: opdCertificateCount,
      breakdown: results
    });
  });
});

module.exports = router;