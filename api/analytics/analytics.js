// src/api/analytics/analytics.js
const express = require("express");
const router = express.Router();

// Import database connection from centralized config
const { pool } = require("../../config/database");

// Analytics endpoint
router.get("/analytics", (req, res) => {
  const query = `
    SELECT 
      SUM(CASE WHEN cr_violation_level = 'Minor' THEN 1 ELSE 0 END) AS minor,
      SUM(CASE WHEN cr_violation_level = 'Major' THEN 1 ELSE 0 END) AS major,
      SUM(CASE WHEN cr_violation_level = 'Serious' THEN 1 ELSE 0 END) AS serious,
      SUM(CASE WHEN cr_status = 'Ongoing' THEN 1 ELSE 0 END) AS ongoing,
      SUM(CASE WHEN cr_status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
    FROM tbl_case_records;
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Analytics query failed:", err);
      return res.status(500).json({ error: "Query failed" });
    }

    const row = results[0];
    res.json({
      minor: row.minor || 0,
      major: row.major || 0,
      serious: row.serious || 0,
      ongoing: row.ongoing || 0,
      resolved: row.resolved || 0,
    });
  });
});

// GCO Analytics endpoint
router.get("/gco-analytics", (req, res) => {
  const query = `
    SELECT 
      SUM(CASE WHEN cor_status = 'SCHEDULED' THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN cor_status = 'TO SCHEDULE' THEN 1 ELSE 0 END) AS to_schedule,
      SUM(CASE WHEN cor_status = 'DONE' THEN 1 ELSE 0 END) AS done
    FROM tbl_counseling_records;
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("GCO Analytics query failed:", err);
      return res.status(500).json({ error: "Query failed" });
    }

    const row = results[0];
    res.json({
      scheduled: row.scheduled || 0,
      to_schedule: row.to_schedule || 0,
      done: row.done || 0,
    });
  });
});

// INF Analytics endpoint
router.get("/inf-analytics", (req, res) => {
  const query = `
    SELECT 
      SUM(CASE WHEN mr_is_medical = 'YES' THEN 1 ELSE 0 END) AS medical,
      SUM(CASE WHEN mr_is_psychological = 'YES' THEN 1 ELSE 0 END) AS psychological,
      SUM(CASE WHEN mr_status = 'Ongoing' THEN 1 ELSE 0 END) AS ongoing,
      SUM(CASE WHEN mr_status = 'Treated' THEN 1 ELSE 0 END) AS treated,
      SUM(CASE WHEN mr_status = 'For Treatment' THEN 1 ELSE 0 END) AS for_treatment
    FROM tbl_medical_records;
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("INF Analytics query failed:", err);
      return res.status(500).json({ error: "Query failed" });
    }

    const row = results[0];
    res.json({
      medical: row.medical || 0,
      psychological: row.psychological || 0,
      ongoing: row.ongoing || 0,
      treated: row.treated || 0,
      for_treatment: row.for_treatment || 0,
    });
  });
});

// INF Certificate Data endpoint
router.get("/inf-certificate-data", (req, res) => {
  const query = `
    SELECT 
      -- WITH medical certificate (any file has isMedical = true)
      SUM(CASE 
            WHEN mr_attachments IS NOT NULL 
              AND mr_attachments != '' 
              AND mr_attachments != '[]'
              AND JSON_CONTAINS(mr_attachments, '{"isMedical": true}', '$') 
              AND mr_grade_level = '11' 
            THEN 1 ELSE 0 END
          ) AS with_certificates_grade_11,

      SUM(CASE 
            WHEN mr_attachments IS NOT NULL 
              AND mr_attachments != '' 
              AND mr_attachments != '[]'
              AND JSON_CONTAINS(mr_attachments, '{"isMedical": true}', '$') 
              AND mr_grade_level = '12' 
            THEN 1 ELSE 0 END
          ) AS with_certificates_grade_12,

      -- WITHOUT medical certificate (either empty or files exist but none have isMedical)
      SUM(CASE 
            WHEN (
                  mr_attachments IS NULL 
                  OR mr_attachments = '' 
                  OR mr_attachments = '[]'
                  OR NOT JSON_CONTAINS(mr_attachments, '{"isMedical": true}', '$')
                )
              AND mr_grade_level = '11'
            THEN 1 ELSE 0 END
          ) AS without_certificates_grade_11,

      SUM(CASE 
            WHEN (
                  mr_attachments IS NULL 
                  OR mr_attachments = '' 
                  OR mr_attachments = '[]'
                  OR NOT JSON_CONTAINS(mr_attachments, '{"isMedical": true}', '$')
                )
              AND mr_grade_level = '12'
            THEN 1 ELSE 0 END
          ) AS without_certificates_grade_12

    FROM tbl_medical_records;
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("INF Certificate data query failed:", err);
      return res.status(500).json({ error: "Query failed" });
    }

    const row = results[0];
    res.json({
      with_certificates_grade_11: row.with_certificates_grade_11 || 0,
      with_certificates_grade_12: row.with_certificates_grade_12 || 0,
      without_certificates_grade_11: row.without_certificates_grade_11 || 0,
      without_certificates_grade_12: row.without_certificates_grade_12 || 0,
    });
  });
});


// Monthly OPD Cases by Grade Level endpoint
router.get("/monthly-opd-cases", (req, res) => {
  const query = `
    SELECT 
      DATE_FORMAT(cr_case_date, '%Y-%m') as month,
      SUM(CASE WHEN cr_student_grade_level = '11' THEN 1 ELSE 0 END) as grade_11,
      SUM(CASE WHEN cr_student_grade_level = '12' THEN 1 ELSE 0 END) as grade_12
    FROM tbl_case_records
    WHERE cr_case_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(cr_case_date, '%Y-%m')
    ORDER BY month DESC
    LIMIT 6;
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Monthly OPD cases query failed:", err);
      return res.status(500).json({ error: "Query failed" });
    }

    // Format month names for better display
    const formattedResults = results.map(item => {
      const date = new Date(item.month + '-01');
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return {
        month: monthName,
        grade_11: item.grade_11 || 0,
        grade_12: item.grade_12 || 0
      };
    });

    res.json(formattedResults);
  });
});

// Monthly GCO Cases by Grade Level endpoint
router.get("/monthly-gco-cases", (req, res) => {
  const query = `
    SELECT 
      DATE_FORMAT(cor_date, '%Y-%m') as month,
      SUM(CASE WHEN cor_student_grade_level = '11' THEN 1 ELSE 0 END) as grade_11,
      SUM(CASE WHEN cor_student_grade_level = '12' THEN 1 ELSE 0 END) as grade_12
    FROM tbl_counseling_records
    WHERE cor_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(cor_date, '%Y-%m')
    ORDER BY month DESC
    LIMIT 6;
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Monthly GCO cases query failed:", err);
      return res.status(500).json({ error: "Query failed" });
    }

    // Format month names for better display
    const formattedResults = results.map(item => {
      const date = new Date(item.month + '-01');
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return {
        month: monthName,
        grade_11: item.grade_11 || 0,
        grade_12: item.grade_12 || 0
      };
    });

    res.json(formattedResults);
  });
});

module.exports = router;