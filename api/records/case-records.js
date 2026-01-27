// root/api/records/case-records.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import database connection from centralized config
const { pool } = require("../../config/database");

// Email configuration
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'shadewalker0050@gmail.com',
    pass: process.env.EMAIL_PASS || 'dbai xvib tmgg lldf'
  },
  tls: { rejectUnauthorized: false }
});

// Department email mapping
const departmentEmails = {
  'OPD': 'opdadzu@gmail.com',
  'GCO': 'gcoadzu@gmail.com',
  'INF': 'infiadzu@gmail.com'
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/case-records');
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

// Reusable functions
const sendEmailNotification = async (toDepartment, subject, message) => {
  try {
    const toEmail = departmentEmails[toDepartment];
    if (!toEmail) {
      console.error(`No email found for department: ${toDepartment}`);
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'shadewalker0050@gmail.com',
      to: toEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            CCMR System Notification
          </h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${message}
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d;">
            <p>This is an automated notification from the CCMR.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email notification sent to ${toDepartment} (${toEmail}): ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

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

const createNotification = (studentName, studentId, violationLevel, caseId) => {
  const notificationMessage = `New case referral for ${studentName} (${studentId}) - ${violationLevel} violation`;
  
  pool.query(`
    INSERT INTO tbl_notifications (n_sender, n_receiver, n_type, n_message, n_related_record_id, n_related_record_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `, ['OPD', 'GCO', 'Referral', notificationMessage, caseId, 'case_record'], (notifErr) => {
    if (notifErr) console.error("Error creating notification:", notifErr);
  });
};

const sendReferralEmail = (studentName, studentId, violationLevel, strand, gradeLevel, section, schoolYearSemester, description, caseId, isUpdate = false) => {
  const emailSubject = isUpdate ? `Case Update - ${studentName} (${studentId})` : `New Case Referral - ${studentName} (${studentId})`;
  const actionText = isUpdate ? 'updated and referred' : 'referred';
  
  const emailMessage = `
    <h3>${isUpdate ? 'Case Update' : 'New Case Referral'} Notification</h3>
    <p><strong>Student:</strong> ${studentName} (${studentId})</p>
    <p><strong>Violation Level:</strong> ${violationLevel}</p>
    ${isUpdate ? `<p><strong>Status:</strong> ${description}</p>` : ''}
    <p><strong>Strand/Grade:</strong> ${strand} - Grade ${gradeLevel} ${section}</p>
    <p><strong>School Year & Semester:</strong> ${schoolYearSemester}</p>
    <p><strong>Description:</strong> ${description}</p>
    <p><strong>Case ID:</strong> ${caseId}</p>
    <p>This case has been ${actionText} to GCO for further action.</p>
  `;

  sendEmailNotification('GCO', emailSubject, emailMessage)
    .then(emailSent => {
      console.log(emailSent ? `Email notification sent successfully to GCO for case ${isUpdate ? 'update' : 'referral'}` : `Failed to send email notification to GCO for case ${isUpdate ? 'update' : 'referral'}`);
    });
};

// Common field definitions - UPDATED to include schoolYearSemester
const caseFields = `
  cr_case_id as caseNo,
  cr_student_id as id,
  cr_student_name as name,
  cr_student_strand as strand,
  cr_student_grade_level as gradeLevel,
  cr_student_section as section,
  cr_school_year_semester as schoolYearSemester,
  cr_violation_level as violationLevel,
  cr_status as status,
  DATE_FORMAT(cr_case_date, '%m/%d/%Y') as date,
  cr_referred as referred,
  cr_referral_confirmation as referralConfirmation,
  cr_general_description as description,
  cr_additional_remarks as remarks,
  cr_attachments as attachments
`;

// Common response handler
const handleCaseResponse = (res, err, results, successMessage = '') => {
  if (err) {
    console.error("Database query failed:", err);
    return res.status(500).json({ error: "Database query failed", message: err.message });
  }

  const recordsWithAttachments = results.map(record => ({
    ...record,
    attachments: record.attachments ? JSON.parse(record.attachments) : []
  }));

  const response = { success: true, records: recordsWithAttachments, count: results.length };
  if (successMessage) response.message = successMessage;
  res.json(response);
};

// File handling helper
const handleFileOperation = (req, res, operation) => {
  const { id: caseId, filename } = req.params;

  pool.query(`SELECT cr_attachments FROM tbl_case_records WHERE cr_case_id = ?`, [caseId], (err, results) => {
    if (err) {
      console.error("Error fetching case record:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (results.length === 0) return res.status(404).json({ error: "Case record not found" });
    
    const attachments = results[0].cr_attachments;
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

// Common case record handler - UPDATED to handle schoolYearSemester
const handleCaseRecord = (req, res, isUpdate = false) => {
  const caseId = isUpdate ? req.params.id : null;
  const {
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester,
    violationLevel, status, description, remarks, referredToGCO,
    existingAttachments, filesToDelete
  } = req.body;

  let finalAttachments = [];
  if (existingAttachments) {
    try {
      const existingFiles = JSON.parse(existingAttachments);
      const filesToDeleteArray = Array.isArray(filesToDelete) ? filesToDelete : (filesToDelete ? [filesToDelete] : []);
      finalAttachments = existingFiles.filter(file => !filesToDeleteArray.includes(file.filename));
    } catch (e) {
      console.error('Error parsing existing attachments:', e);
    }
  }

  if (req.files && req.files.length > 0) {
    const newFiles = isUpdate && req.files.length === 1 ? [req.files[0]] : req.files;
    finalAttachments = isUpdate ? newFiles.map(file => ({
      filename: file.filename, originalname: file.originalname,
      mimetype: file.mimetype, size: file.size, path: file.path
    })) : [...finalAttachments, ...newFiles.map(file => ({
      filename: file.filename, originalname: file.originalname,
      mimetype: file.mimetype, size: file.size, path: file.path
    }))];
  }

  const attachmentsJson = finalAttachments.length > 0 ? JSON.stringify(finalAttachments) : null;
  const referralConfirmation = referredToGCO === "Yes" ? "Pending" : null;

  // UPDATED queries to include schoolYearSemester
  const query = isUpdate ? `
    UPDATE tbl_case_records 
    SET 
      cr_student_id = ?, cr_student_name = ?, cr_student_strand = ?, 
      cr_student_grade_level = ?, cr_student_section = ?, cr_school_year_semester = ?,
      cr_violation_level = ?, cr_status = ?, cr_referred = ?, cr_referral_confirmation = ?,
      cr_general_description = ?, cr_additional_remarks = ?, cr_attachments = ?
    WHERE cr_case_id = ?
  ` : `
    INSERT INTO tbl_case_records (
      cr_student_id, cr_student_name, cr_student_strand, cr_student_grade_level, 
      cr_student_section, cr_school_year_semester, cr_violation_level, cr_status, cr_referred, 
      cr_referral_confirmation, cr_general_description, cr_additional_remarks,
      cr_attachments, cr_case_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  // UPDATED values arrays to include schoolYearSemester
  const values = isUpdate ? [
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester,
    violationLevel, status, referredToGCO, referralConfirmation,
    description, remarks, attachmentsJson, caseId
  ] : [
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester,
    violationLevel, status, referredToGCO, referralConfirmation,
    description, remarks, attachmentsJson
  ];

  pool.query(query, values, (err, results) => {
    if (err) return handleDatabaseError(err, req, res);

    const recordId = isUpdate ? caseId : results.insertId;

    if (filesToDelete && isUpdate) {
      const filesToDeleteArray = Array.isArray(filesToDelete) ? filesToDelete : [filesToDelete];
      filesToDeleteArray.forEach(filename => {
        const filePath = path.join(__dirname, '../../uploads/case-records', filename);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting old file:', unlinkErr);
          });
        }
      });
    }

    if (referredToGCO === "Yes") {
      createNotification(studentName, studentId, violationLevel, recordId);
      sendReferralEmail(studentName, studentId, violationLevel, strand, gradeLevel, section, schoolYearSemester, description, recordId, isUpdate);
    }

    res.json({
      success: true,
      message: `Case record ${isUpdate ? 'updated' : 'added'} successfully`,
      caseId: isUpdate ? caseId : results.insertId,
      affectedRows: results.affectedRows,
      fileCount: req.files ? req.files.length : 0
    });
  });
};

// Routes
router.post("/case-records", upload.array('attachments', 5), (req, res) => handleCaseRecord(req, res, false));
router.put("/case-records/:id", upload.array('attachments', 1), (req, res) => handleCaseRecord(req, res, true));

// File routes
router.get("/case-records/:id/files/:filename", (req, res) => {
  handleFileOperation(req, res, (req, res, file) => {
    if (!fs.existsSync(file.path)) return res.status(404).json({ error: "File not found on server" });
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    fs.createReadStream(file.path).pipe(res);
  });
});

router.delete("/case-records/:id/files/:filename", (req, res) => {
  handleFileOperation(req, res, (req, res, file, attachmentsArray) => {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    const updatedAttachments = attachmentsArray.filter(att => att.filename !== file.filename);
    const updatedAttachmentsJson = updatedAttachments.length > 0 ? JSON.stringify(updatedAttachments) : null;

    pool.query(`UPDATE tbl_case_records SET cr_attachments = ? WHERE cr_case_id = ?`, [updatedAttachmentsJson, req.params.id], (updateErr) => {
      if (updateErr) {
        console.error("Error updating case record:", updateErr);
        return res.status(500).json({ error: "Database update failed" });
      }
      res.json({ success: true, message: "File deleted successfully" });
    });
  });
});

// GET routes with search
const handleSearch = (req, res, isReferred = false) => {
  const searchQuery = req.query.query;
  
  if (!searchQuery) {
    return res.status(400).json({ success: false, error: "Search query is required" });
  }

  const referredClause = isReferred ? "WHERE cr_referred = 'Yes' AND" : "WHERE";
  const query = `
    SELECT ${caseFields}
    FROM tbl_case_records 
    ${referredClause} (
      cr_student_id LIKE ? OR 
      cr_student_name LIKE ? OR 
      cr_student_strand LIKE ? OR
      cr_violation_level LIKE ? OR
      cr_status LIKE ? OR
      cr_school_year_semester LIKE ?
    )
    ORDER BY CAST(cr_case_id AS UNSIGNED) DESC
  `;

  const searchPattern = `%${searchQuery}%`;
  const searchTerms = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
  
  pool.query(query, searchTerms, (err, results) => {
    handleCaseResponse(res, err, results);
  });
};

router.get("/case-records", (req, res) => {
  pool.query(`SELECT ${caseFields} FROM tbl_case_records ORDER BY CAST(cr_case_id AS UNSIGNED) DESC`, (err, results) => {
    handleCaseResponse(res, err, results);
  });
});

router.get("/case-records/referred", (req, res) => {
  pool.query(`SELECT ${caseFields} FROM tbl_case_records WHERE cr_referred = 'Yes' ORDER BY CAST(cr_case_id AS UNSIGNED) DESC`, (err, results) => {
    handleCaseResponse(res, err, results);
  });
});

router.get("/case-records/search", (req, res) => handleSearch(req, res, false));
router.get("/case-records/referred/search", (req, res) => handleSearch(req, res, true));

router.get("/case-records/:id", (req, res) => {
  const caseId = req.params.id;

  pool.query(`SELECT ${caseFields} FROM tbl_case_records WHERE cr_case_id = ?`, [caseId], (err, results) => {
    if (err) {
      console.error("Error fetching case record:", err);
      return res.status(500).json({ error: "Database query failed", message: err.message });
    }

    if (results.length === 0) return res.status(404).json({ success: false, error: "Case record not found" });

    const record = results[0];
    record.attachments = record.attachments ? JSON.parse(record.attachments) : [];
    res.json({ success: true, record });
  });
});

router.get("/case-records/student/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  
  const query = `
    SELECT ${caseFields}
    FROM tbl_case_records 
    WHERE cr_student_id = ?
    ORDER BY CAST(cr_case_id AS UNSIGNED) DESC
  `;

  pool.query(query, [studentId], (err, results) => {
    handleCaseResponse(res, err, results);
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

router.get("/case-records/student/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  const isReferred = req.query.referred === 'true';
  
  let query = `
    SELECT ${caseFields}
    FROM tbl_case_records 
    WHERE cr_student_id = ?
  `;
  
  if (isReferred) {
    query += " AND cr_referred = 'Yes'";
  }
  
  query += " ORDER BY CAST(cr_case_id AS UNSIGNED) DESC";
  
  pool.query(query, [studentId], (err, results) => {
    handleCaseResponse(res, err, results);
  });
});

module.exports = router;