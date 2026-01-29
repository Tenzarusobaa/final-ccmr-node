// root/api/records/counseling-records.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import database connection from centralized config
const { pool } = require("../../config/database");

// Reusable functions from case-records (can be moved to shared utils)
const processFiles = (files) => {
  return files && files.length > 0 ? JSON.stringify(files.map(file => ({
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path
  }))) : null;
};

const cleanUpFiles = (files) => {
  if (files) {
    files.forEach(file => {
      fs.unlink(file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    });
  }
};

const handleDatabaseError = (err, req, res) => {
  console.error("Database error:", err);
  cleanUpFiles(req.files);
  return res.status(500).json({
    error: "Database operation failed",
    message: err.message
  });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/counseling-records');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const fileNameWithoutExt = path.basename(file.originalname, fileExtension);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${fileNameWithoutExt}-${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  cb(allowedMimeTypes.includes(file.mimetype) ? null : new Error('Only PDF and DOCX files are allowed'), allowedMimeTypes.includes(file.mimetype));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Common query fields - UPDATED to include schoolYearSemester
const counselingFields = `
  cor_record_id as recordId,
  cor_origin_medical_id as originMedicalId,
  cor_origin_case_id as originCaseId,
  cor_session_number as sessionNumber,
  cor_student_id_number as id,
  cor_student_name as name,
  cor_student_strand as strand,
  cor_student_grade_level as gradeLevel,
  cor_student_section as section,
  cor_school_year_semester as schoolYearSemester,
  cor_status as status,
  DATE_FORMAT(cor_date, '%m/%d/%Y') as date,
  -- FORMAT TIME AS HH:MM (remove seconds and milliseconds)
  TIME_FORMAT(cor_time, '%H:%i') as time,
  cor_general_concern as concern,
  cor_additional_remarks as remarks,
  cor_attachments as attachments,
  cor_is_psychological_condition as psychologicalCondition
`;

// Common response handler
const handleCounselingResponse = (res, err, results, successMessage = '') => {
  if (err) {
    console.error("Database query failed:", err);
    return res.status(500).json({
      error: "Database query failed",
      message: err.message
    });
  }

  const recordsWithAttachments = results.map(record => ({
    ...record,
    attachments: record.attachments ? JSON.parse(record.attachments) : []
  }));

  const response = { success: true, records: recordsWithAttachments, count: results.length };
  if (successMessage) response.message = successMessage;
  res.json(response);
};

// Routes
router.get("/counseling-records", (req, res) => {
  const filter = req.query.filter || null;
  
  let query = `SELECT ${counselingFields} FROM tbl_counseling_records`;
  
  if (filter) {
    switch(filter.toUpperCase()) {
      case 'TO_SCHEDULE':
        query += " WHERE cor_status = 'TO SCHEDULE'";
        break;
      case 'SCHEDULED':
        query += " WHERE cor_status = 'SCHEDULED'";
        break;
      case 'DONE':
        query += " WHERE cor_status = 'DONE'";
        break;
      // Add other filters as needed
    }
  }
  
  query += " ORDER BY CAST(cor_record_id AS UNSIGNED) DESC";
  
  pool.query(query, (err, results) => {
    handleCounselingResponse(res, err, results);
  });
});

router.get("/counseling-records/search", (req, res) => {
  const { query } = req.query;
  const searchTerm = `%${query}%`;
  // UPDATED query to include schoolYearSemester in search
  const searchQuery = `
    SELECT ${counselingFields} 
    FROM tbl_counseling_records 
    WHERE cor_student_name LIKE ? OR cor_student_id_number LIKE ? OR cor_student_strand LIKE ? OR cor_status LIKE ? OR cor_origin_medical_id LIKE ? OR cor_school_year_semester LIKE ?
    ORDER BY CAST(cor_record_id AS UNSIGNED) DESC
  `;

  pool.query(searchQuery, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm], (err, results) => {
    handleCounselingResponse(res, err, results);
  });
});

router.get("/counseling-records/:id", (req, res) => {
  const recordId = req.params.id;
  const query = `SELECT ${counselingFields.replace('%m/%d/%Y', '%Y-%m-%d')} FROM tbl_counseling_records WHERE cor_record_id = ?`;

  pool.query(query, [recordId], (err, results) => {
    if (err) {
      console.error("Error fetching counseling record:", err);
      return res.status(500).json({ error: "Database query failed", message: err.message });
    }

    if (results.length === 0) return res.status(404).json({ success: false, message: "Counseling record not found" });

    const record = results[0];
    record.attachments = record.attachments ? JSON.parse(record.attachments) : [];
    res.json({ success: true, record });
  });
});

router.post("/counseling-records", upload.array('attachments', 5), (req, res) => {
  const {
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester, sessionNumber, // ADDED schoolYearSemester
    status, date, time, concern, remarks, psychologicalCondition,
    originMedicalId, originCaseId
  } = req.body;

  if (!studentId || !studentName || !strand || !gradeLevel || !section || !sessionNumber || !status || !concern) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const attachments = processFiles(req.files);
  
  // UPDATED query to include schoolYearSemester
  const query = `
    INSERT INTO tbl_counseling_records (
      cor_origin_medical_id, cor_origin_case_id, cor_student_id_number, cor_student_name,
      cor_student_strand, cor_student_grade_level, cor_student_section, cor_school_year_semester,
      cor_session_number, cor_status, cor_date, cor_time, cor_general_concern, cor_additional_remarks,
      cor_attachments, cor_is_psychological_condition
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // UPDATED values array to include schoolYearSemester
  const values = [
    originMedicalId || null, originCaseId || null, studentId, studentName,
    strand, gradeLevel, section, schoolYearSemester || null, sessionNumber, status, // ADDED schoolYearSemester
    date || null, time || null, concern, remarks || "", attachments, psychologicalCondition || "NO"
  ];

  pool.query(query, values, (err, results) => {
    if (err) return handleDatabaseError(err, req, res);
    res.json({ success: true, message: "Counseling record added successfully", recordId: results.insertId });
  });
});

router.put("/counseling-records/:id", upload.array('attachments', 5), (req, res) => {
  const recordId = req.params.id;
  const {
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester, sessionNumber,
    status, date, time, concern, remarks, psychologicalCondition,
    originMedicalId, originCaseId, existingAttachments, filesToDelete
  } = req.body;

  console.log('PUT request for record:', recordId);
  console.log('Request body:', req.body);
  console.log('Files:', req.files);

  if (!studentId || !studentName || !strand || !gradeLevel || !section || !sessionNumber || !status || !concern) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  let finalAttachments = [];
  
  // Parse existing attachments if provided
  if (existingAttachments) {
    try {
      const existingFiles = JSON.parse(existingAttachments);
      const filesToDeleteArray = Array.isArray(filesToDelete) ? filesToDelete : (filesToDelete ? [filesToDelete] : []);
      finalAttachments = existingFiles.filter(file => !filesToDeleteArray.includes(file.filename));
    } catch (e) {
      console.error('Error parsing existing attachments:', e);
    }
  }

  // Add new files
  if (req.files && req.files.length > 0) {
    const newFiles = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));
    finalAttachments = [...finalAttachments, ...newFiles];
  }

  const attachmentsJson = finalAttachments.length > 0 ? JSON.stringify(finalAttachments) : null;
  
  const query = `
    UPDATE tbl_counseling_records 
    SET 
      cor_origin_medical_id = ?, cor_origin_case_id = ?, cor_student_id_number = ?,
      cor_student_name = ?, cor_student_strand = ?, cor_student_grade_level = ?,
      cor_student_section = ?, cor_school_year_semester = ?, cor_session_number = ?, cor_status = ?,
      cor_date = ?, cor_time = ?, cor_general_concern = ?, cor_additional_remarks = ?,
      cor_attachments = ?, cor_is_psychological_condition = ?
    WHERE cor_record_id = ?
  `;

  const values = [
    originMedicalId || null, originCaseId || null, studentId, studentName,
    strand, gradeLevel, section, schoolYearSemester || null, sessionNumber, status,
    date || null, time || null, concern, remarks || "", attachmentsJson, psychologicalCondition || "NO", recordId
  ];

  console.log('Update values:', values);

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error('Database update error:', err);
      return handleDatabaseError(err, req, res);
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Counseling record not found" });
    }

    // Delete files marked for removal
    if (filesToDelete) {
      const filesToDeleteArray = Array.isArray(filesToDelete) ? filesToDelete : [filesToDelete];
      filesToDeleteArray.forEach(filename => {
        if (filename) {
          const filePath = path.join(__dirname, '../../uploads/counseling-records', filename);
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting old file:', unlinkErr);
            });
          }
        }
      });
    }

    res.json({ success: true, message: "Counseling record updated successfully" });
  });
});

// File handling routes
const handleFileOperation = (req, res, operation) => {
  const { id: recordId, filename } = req.params;

  pool.query(`SELECT cor_attachments FROM tbl_counseling_records WHERE cor_record_id = ?`, [recordId], (err, results) => {
    if (err) {
      console.error("Error fetching counseling record:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (results.length === 0) return res.status(404).json({ error: "Counseling record not found" });

    const attachments = results[0].cor_attachments;
    if (!attachments) return res.status(404).json({ error: "No attachments found" });

    try {
      const attachmentsArray = JSON.parse(attachments);
      const file = attachmentsArray.find(att => att.filename === filename);
      if (!file) return res.status(404).json({ error: "File not found" });

      operation(req, res, file, attachmentsArray);
    } catch (parseError) {
      console.error("Error parsing attachments:", parseError);
      return res.status(500).json({ error: "Error processing attachments" });
    }
  });
};

router.get("/counseling-records/:id/files/:filename", (req, res) => {
  handleFileOperation(req, res, (req, res, file) => {
    if (!fs.existsSync(file.path)) return res.status(404).json({ error: "File not found on server" });
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    fs.createReadStream(file.path).pipe(res);
  });
}); 

router.delete("/counseling-records/:id/files/:filename", (req, res) => {
  handleFileOperation(req, res, (req, res, file, attachmentsArray) => {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    const updatedAttachments = attachmentsArray.filter(att => att.filename !== file.filename);
    const updatedAttachmentsJson = updatedAttachments.length > 0 ? JSON.stringify(updatedAttachments) : null;

    pool.query(`UPDATE tbl_counseling_records SET cor_attachments = ? WHERE cor_record_id = ?`, [updatedAttachmentsJson, req.params.id], (updateErr) => {
      if (updateErr) {
        console.error("Error updating counseling record:", updateErr);
        return res.status(500).json({ error: "Database update failed" });
      }
      res.json({ success: true, message: "File deleted successfully" });
    });
  });
});

router.get("/infirmary/counseling-records", (req, res) => {
  pool.query(`SELECT ${counselingFields} FROM tbl_counseling_records WHERE cor_is_psychological_condition = 'YES' ORDER BY CAST(cor_record_id AS UNSIGNED) DESC`, (err, results) => {
    handleCounselingResponse(res, err, results);
  });
});

router.get("/counseling-records/student/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  
  const query = `
    SELECT ${counselingFields}
    FROM tbl_counseling_records 
    WHERE cor_student_id_number = ?
    ORDER BY CAST(cor_record_id AS UNSIGNED) DESC
  `;

  pool.query(query, [studentId], (err, results) => {
    handleCounselingResponse(res, err, results);
  });
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const errors = {
      LIMIT_FILE_SIZE: { error: 'File too large', message: 'File size must be less than 10MB' },
      LIMIT_FILE_COUNT: { error: 'Too many files', message: 'Maximum 5 files allowed' }
    };
    return res.status(400).json(errors[error.code] || { error: 'File upload failed', message: error.message });
  }

  if (error) {
    return res.status(400).json({ error: 'File upload failed', message: error.message });
  }

  next();
});

router.get("/counseling-records/student/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  const isPsychological = req.query.psychological === 'true';
  
  let query = `
    SELECT ${counselingFields}
    FROM tbl_counseling_records 
    WHERE cor_student_id_number = ?
  `;
  
  if (isPsychological) {
    query += " AND cor_is_psychological_condition = 'YES'";
  }
  
  query += " ORDER BY CAST(cor_record_id AS UNSIGNED) DESC";
  
  pool.query(query, [studentId], (err, results) => {
    handleCounselingResponse(res, err, results);
  });
});

module.exports = router;