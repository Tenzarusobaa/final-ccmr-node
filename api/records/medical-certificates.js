// root/api/records/medical-certificates.js
const express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Import database connection from centralized config
const { pool } = require("../../config/database");

// Get all files from medical records
router.get("/medical-certificates", (req, res) => {
  const query = `
    SELECT 
      mr.mr_medical_id as recordId,
      mr.mr_student_id as studentId,
      mr.mr_student_name as studentName,
      mr.mr_attachments as attachments,
      mr.mr_record_date as recordDate,
      mr.mr_is_medical as isMedical,
      mr.mr_is_psychological as isPsychological
    FROM tbl_medical_records mr
    WHERE mr.mr_attachments IS NOT NULL 
      AND mr.mr_attachments != 'null'
      AND mr.mr_attachments != '[]'
    ORDER BY mr.mr_record_date DESC
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching medical certificates:", err);
      return res.status(500).json({ 
        error: "Database query failed", 
        message: err.message 
      });
    }

    // Flatten all files into individual entries
    const allFiles = [];
    
    results.forEach(record => {
      if (record.attachments) {
        try {
          const attachmentsArray = JSON.parse(record.attachments);
          
          attachmentsArray.forEach((file, index) => {
            // Create a unique ID for each file entry
            const fileId = `${record.recordId}-file-${index}-${Date.parse(record.recordDate)}`;
            
            allFiles.push({
              fileId: fileId,
              recordId: record.recordId,
              studentId: record.studentId,
              studentName: record.studentName,
              fileName: file.originalname || file.filename,
              storedFileName: file.filename,
              fileType: file.mimetype,
              fileSize: file.size,
              uploadDate: file.uploadDate || record.recordDate,
              uploadedBy: file.uploadedBy || 'Unknown',
              isMedical: file.isMedical || record.isMedical === 'Yes',
              isPsychological: file.isPsychological || record.isPsychological === 'Yes',
              filePath: file.path
            });
          });
        } catch (parseError) {
          console.error("Error parsing attachments for record", record.recordId, ":", parseError);
        }
      }
    });

    // Apply filters if provided
    let filteredFiles = [...allFiles];
    
    if (req.query.type) {
      const type = req.query.type.toUpperCase();
      if (type === 'MEDICAL') {
        filteredFiles = filteredFiles.filter(file => file.isMedical === true);
      } else if (type === 'PSYCHOLOGICAL') {
        filteredFiles = filteredFiles.filter(file => file.isPsychological === true);
      }
    }
    
    if (req.query.uploadedBy) {
      filteredFiles = filteredFiles.filter(file => 
        file.uploadedBy.toUpperCase() === req.query.uploadedBy.toUpperCase()
      );
    }

    res.json({
      success: true,
      files: filteredFiles,
      totalCount: allFiles.length,
      filteredCount: filteredFiles.length
    });
  });
});

// Download file endpoint
router.get("/medical-certificates/download/:recordId/:filename", (req, res) => {
  const { recordId, filename } = req.params;
  
  // First get the record to find the file path
  pool.query(
    `SELECT mr_attachments FROM tbl_medical_records WHERE mr_medical_id = ?`,
    [recordId],
    (err, results) => {
      if (err) {
        console.error("Error fetching medical record:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Record not found" });
      }

      try {
        const attachments = JSON.parse(results[0].mr_attachments);
        const file = attachments.find(f => f.filename === filename || f.originalname === filename);
        
        if (!file) {
          return res.status(404).json({ error: "File not found in record" });
        }

        // Check if file exists on disk
        if (!fs.existsSync(file.path)) {
          return res.status(404).json({ error: "File not found on server" });
        }

        // Set headers for download
        res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalname || file.filename)}"`);
        res.setHeader('Content-Length', file.size);
        
        // Stream the file
        const fileStream = fs.createReadStream(file.path);
        fileStream.pipe(res);
        
        fileStream.on('error', (streamErr) => {
          console.error("Error streaming file:", streamErr);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        });
      } catch (parseError) {
        console.error("Error parsing attachments:", parseError);
        return res.status(500).json({ error: "Error processing file data" });
      }
    }
  );
});

// Get file preview/info
router.get("/medical-certificates/:recordId/:filename/info", (req, res) => {
  const { recordId, filename } = req.params;
  
  pool.query(
    `SELECT 
      mr_medical_id as recordId,
      mr_student_id as studentId,
      mr_student_name as studentName,
      mr_attachments as attachments
    FROM tbl_medical_records WHERE mr_medical_id = ?`,
    [recordId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Record not found" });
      }

      try {
        const attachments = JSON.parse(results[0].attachments);
        const file = attachments.find(f => f.filename === filename || f.originalname === filename);
        
        if (!file) {
          return res.status(404).json({ error: "File not found" });
        }

        res.json({
          success: true,
          file: {
            ...file,
            recordId: results[0].recordId,
            studentId: results[0].studentId,
            studentName: results[0].studentName
          }
        });
      } catch (parseError) {
        res.status(500).json({ error: "Error processing file data" });
      }
    }
  );
});

module.exports = router;