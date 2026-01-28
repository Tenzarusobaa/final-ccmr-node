// root/api/records/medical-records.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import database connection from centralized config
const { pool } = require("../../config/database");

// Email configuration (same as case-records)
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

// Department email mapping (including INF)
const departmentEmails = {
  'OPD': 'opdadzu@gmail.com',
  'GCO': 'gcoadzu@gmail.com',
  'INF': 'infiadzu@gmail.com'
};

// Reusable utility functions
const processFiles = (files, fileClassifications = []) => {
  return files && files.length > 0 ? JSON.stringify(files.map((file, index) => {
    // Find classification for this file
    const classificationData = fileClassifications.find(classification => {
      try {
        const parsed = JSON.parse(classification);
        return parsed.filename === file.originalname;
      } catch (e) {
        return false;
      }
    });

    let classification = { isMedical: false, isPsychological: false };
    if (classificationData) {
      try {
        classification = JSON.parse(classificationData);
      } catch (e) {
        console.error('Error parsing file classification:', e);
      }
    }

    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      isMedical: classification.isMedical || false,
      isPsychological: classification.isPsychological || false
    };
  })) : null;
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

const escapeLike = (value) => value.replace(/%/g, '\\%').replace(/_/g, '\\_');

// Email notification function (same as case-records)
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

// Create notification function (same as case-records)
const createNotification = (studentName, studentId, conditionType, recordId, sender = 'INF', receiver = 'GCO') => {
  const notificationMessage = `New ${conditionType.toLowerCase()} referral for ${studentName} (${studentId})`;

  pool.query(`
    INSERT INTO tbl_notifications (n_sender, n_receiver, n_type, n_message, n_related_record_id, n_related_record_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [sender, receiver, 'Referral', notificationMessage, recordId, 'medical_record'], (notifErr) => {
    if (notifErr) console.error("Error creating notification:", notifErr);
  });
};

// Send referral email function (similar to case-records but for medical)
const sendReferralEmail = (studentName, studentId, conditionType, strand, gradeLevel, section, schoolYearSemester, medicalDetails, recordId, isUpdate = false) => {
  const emailSubject = isUpdate ? `Medical Case Update - ${studentName} (${studentId})` : `New Medical Case Referral - ${studentName} (${studentId})`;
  const actionText = isUpdate ? 'updated and referred' : 'referred';

  const emailMessage = `
    <h3>${isUpdate ? 'Medical Case Update' : 'New Medical Case Referral'} Notification</h3>
    <p><strong>Student:</strong> ${studentName} (${studentId})</p>
    <p><strong>Condition Type:</strong> ${conditionType}</p>
    ${isUpdate ? `<p><strong>Status:</strong> ${medicalDetails}</p>` : ''}
    <p><strong>Strand/Grade:</strong> ${strand} - Grade ${gradeLevel} ${section}</p>
    <p><strong>School Year & Semester:</strong> ${schoolYearSemester}</p>
    <p><strong>Medical Details:</strong> ${medicalDetails}</p>
    <p><strong>Record ID:</strong> ${recordId}</p>
    <p>This medical case has been ${actionText} to GCO for further action.</p>
  `;

  sendEmailNotification('GCO', emailSubject, emailMessage)
    .then(emailSent => {
      console.log(emailSent ? `Email notification sent successfully to GCO for medical case ${isUpdate ? 'update' : 'referral'}` : `Failed to send email notification to GCO for medical case ${isUpdate ? 'update' : 'referral'}`);
    });
};

// NEW: OPD File Notification Function
const sendOPDFileNotification = async (studentName, studentId, fileName, recordId, fileClassification = {}) => {
  try {
    const toEmail = departmentEmails['OPD'];
    if (!toEmail) {
      console.error('No email found for OPD department');
      return false;
    }

    const classificationText = [];
    if (fileClassification.isMedical) classificationText.push('Medical');
    if (fileClassification.isPsychological) classificationText.push('Psychological');
    const classificationDisplay = classificationText.length > 0 ? classificationText.join(' & ') : 'Unclassified';

    const mailOptions = {
      from: process.env.EMAIL_USER || 'shadewalker0050@gmail.com',
      to: toEmail,
      subject: `OPD Added Certificate - ${studentName} (${studentId})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            OPD Certificate Upload Notification
          </h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #003A6C; margin-top: 0;">OPD Added Certificate</h3>
            <p><strong>Student:</strong> ${studentName} (${studentId})</p>
            <p><strong>File Name:</strong> ${fileName}</p>
            <p><strong>File Classification:</strong> ${classificationDisplay}</p>
            <p><strong>Record ID:</strong> ${recordId}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p>A new certificate/file has been uploaded to the medical record system.</p>
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d;">
            <p>This is an automated notification from the CCMR System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`OPD file notification sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending OPD file notification:', error);
    return false;
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/medical-records');
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

// Common field definitions
const medicalFields = `
  mr_medical_id as recordId,
  mr_student_id as id,
  mr_student_name as name,
  mr_student_strand as strand,
  mr_subject as subject,
  mr_status as status,
  mr_grade_level as gradeLevel,
  mr_section as section,
  mr_school_year_semester as schoolYearSemester,
  mr_medical_details as medicalDetails,
  mr_additional_remarks as remarks,
  mr_attachments as attachments,
  mr_referred as referred,
  mr_referral_confirmation as referralConfirmation,
  mr_is_psychological as isPsychological,
  mr_is_medical as isMedical,
  DATE_FORMAT(mr_record_date, '%m/%d/%Y') as date
`;

const infirmaryFields = `
  mr_medical_id as recordId,
  mr_student_id as id,
  mr_student_name as name,
  mr_student_strand as strand,
  mr_grade_level as gradeLevel,   
  mr_section as section,         
  mr_school_year_semester as schoolYearSemester,
  mr_subject as subject,
  mr_status as status,
  mr_medical_details as medicalDetails,
  mr_additional_remarks as remarks,
  mr_attachments as attachments,
  mr_is_psychological as isPsychological,
  mr_is_medical as isMedical,
  DATE_FORMAT(mr_record_date, '%m/%d/%Y') as date
`;

// Common response handler
const handleMedicalResponse = (res, err, results, successMessage = '') => {
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

// Validation helpers
const validateRequiredFields = (studentId, studentName) => {
  if (!studentId || !studentName) {
    return { error: "Validation failed", message: "Student ID and Name are required" };
  }
  return null;
};

const validateSearchQuery = (query) => {
  if (!query || query.trim() === '') {
    return { error: "Validation failed", message: "Search query is required" };
  }
  return null;
};

const validateRecordId = (id) => {
  if (isNaN(id)) {
    return { error: "Validation failed", message: "Record ID must be a number" };
  }
  return null;
};

// Helper function to build WHERE clause for filters - FIXED
const buildFilterClause = (filter, includeWhere = true) => {
  let whereClause = includeWhere ? 'WHERE ' : '';
  const conditions = [];

  if (filter !== 'ALL') {
    if (filter === 'MEDICALPSYCHOLOGICAL') {
      // Both Medical AND Psychological (strictly both)
      conditions.push("mr_is_medical = 'Yes' AND mr_is_psychological = 'Yes'");
    } else if (filter === 'MEDICAL') {
      // Medical only (Medical = Yes, Psychological = No)
      conditions.push("mr_is_medical = 'Yes' AND mr_is_psychological = 'No'");
    } else if (filter === 'PSYCHOLOGICAL') {
      // Psychological only (Medical = No, Psychological = Yes)
      conditions.push("mr_is_medical = 'No' AND mr_is_psychological = 'Yes'");
    }
  }

  if (conditions.length > 0) {
    whereClause += conditions.join(' AND ');
  } else if (includeWhere) {
    whereClause = '';
  }

  return whereClause;
};

// Routes
router.post("/medical-records", upload.array('attachments', 5), (req, res) => {
  const {
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester, medicalDetails,
    remarks, referredToGCO, isPsychological, isMedical, subject, status
  } = req.body;

  const validationError = validateRequiredFields(studentId, studentName);
  if (validationError) return res.status(400).json(validationError);

  // Extract file classifications from request body
  const fileClassifications = [];
  if (req.body.fileClassifications) {
    if (Array.isArray(req.body.fileClassifications)) {
      fileClassifications.push(...req.body.fileClassifications);
    } else {
      fileClassifications.push(req.body.fileClassifications);
    }
  }

  const attachments = processFiles(req.files, fileClassifications);
  const referralConfirmation = referredToGCO === "Yes" ? "Pending" : null;

  const query = `
    INSERT INTO tbl_medical_records (
      mr_student_id, mr_student_name, mr_student_strand, mr_grade_level, mr_section,
      mr_school_year_semester, mr_subject, mr_status, mr_medical_details, mr_additional_remarks, mr_referred,
      mr_referral_confirmation, mr_is_psychological, mr_is_medical, mr_attachments, mr_record_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
  `;

  const values = [
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester, subject, status,
    medicalDetails, remarks, referredToGCO, referralConfirmation,
    isPsychological, isMedical, attachments
  ];

  pool.query(query, values, (err, results) => {
    if (err) return handleDatabaseError(err, req, res);

    // Send OPD notification for each uploaded file with classification
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        // Find classification for this file
        const fileClassification = fileClassifications.find(classification => {
          try {
            const parsed = JSON.parse(classification);
            return parsed.filename === file.originalname;
          } catch (e) {
            return false;
          }
        }) || '{}';

        let classification = { isMedical: false, isPsychological: false };
        try {
          classification = JSON.parse(fileClassification);
        } catch (e) {
          console.error('Error parsing file classification for notification:', e);
        }

        sendOPDFileNotification(studentName, studentId, file.originalname, results.insertId, classification)
          .then(emailSent => {
            console.log(emailSent ?
              `OPD file notification sent for ${file.originalname}` :
              `Failed to send OPD file notification for ${file.originalname}`
            );
          });
      });
    }

    if (referredToGCO === "Yes") {
      const conditionType = isPsychological === "Yes" ? "Psychological" : "Medical";

      // Create notification in database
      createNotification(studentName, studentId, conditionType, results.insertId);

      // Send email notification
      sendReferralEmail(studentName, studentId, conditionType, strand, gradeLevel, section, schoolYearSemester, medicalDetails, results.insertId, false);
    }

    res.json({
      success: true,
      message: "Medical record added successfully",
      recordId: results.insertId,
      affectedRows: results.affectedRows,
      fileCount: req.files ? req.files.length : 0
    });
  });
});

// GET routes - FIXED filter logic
router.get("/infirmary/medical-records", (req, res) => {
  const filter = req.query.filter || 'ALL';
  const filterClause = buildFilterClause(filter, true);

  let query = `SELECT ${infirmaryFields} FROM tbl_medical_records`;
  if (filterClause) {
    query += ` ${filterClause}`;
  }
  query += ` ORDER BY mr_record_date DESC`;

  console.log('Executing query with filter:', filter, 'Query:', query);

  pool.query(query, (err, results) => {
    handleMedicalResponse(res, err, results);
  });
});

router.get("/medical-records/referred", (req, res) => {
  const filter = req.query.filter || 'ALL';

  let query = `SELECT ${medicalFields} FROM tbl_medical_records WHERE mr_referred = 'Yes'`;

  // Add filter if specified
  if (filter !== 'ALL') {
    if (filter === 'MEDICALPSYCHOLOGICAL') {
      query += " AND mr_is_medical = 'Yes' AND mr_is_psychological = 'Yes'";
    } else if (filter === 'MEDICAL') {
      query += " AND mr_is_medical = 'Yes' AND mr_is_psychological = 'No'";
    } else if (filter === 'PSYCHOLOGICAL') {
      query += " AND mr_is_medical = 'No' AND mr_is_psychological = 'Yes'";
    }
  }

  query += ` ORDER BY mr_record_date DESC`;

  console.log('Executing referred query with filter:', filter, 'Query:', query);

  pool.query(query, (err, results) => {
    handleMedicalResponse(res, err, results);
  });
});

router.get("/medical-records", (req, res) => {
  const filter = req.query.filter || 'ALL';
  const filterClause = buildFilterClause(filter, true);

  let query = `SELECT ${medicalFields} FROM tbl_medical_records`;
  if (filterClause) {
    query += ` ${filterClause}`;
  }
  query += ` ORDER BY mr_record_date DESC`;

  console.log('Executing all medical records query with filter:', filter, 'Query:', query);

  pool.query(query, (err, results) => {
    handleMedicalResponse(res, err, results);
  });
});

const handleSearch = (req, res, baseQuery, searchTerms, isReferred = false, filter = 'ALL') => {
  const searchError = validateSearchQuery(req.query.query);
  if (searchError) return res.status(400).json(searchError);

  const searchTerm = `%${escapeLike(req.query.query)}%`;

  let query = baseQuery;

  // Add filter conditions
  if (filter !== 'ALL') {
    const baseWhereIndex = query.indexOf('WHERE');
    if (baseWhereIndex !== -1) {
      if (filter === 'MEDICALPSYCHOLOGICAL') {
        query = query.replace('WHERE', "WHERE (mr_is_medical = 'Yes' AND mr_is_psychological = 'Yes') AND");
      } else if (filter === 'MEDICAL') {
        query = query.replace('WHERE', "WHERE (mr_is_medical = 'Yes' AND mr_is_psychological = 'No') AND");
      } else if (filter === 'PSYCHOLOGICAL') {
        query = query.replace('WHERE', "WHERE (mr_is_medical = 'No' AND mr_is_psychological = 'Yes') AND");
      }
    }
  }

  console.log('Executing search query with filter:', filter, 'Query:', query);

  pool.query(query, searchTerms.map(() => searchTerm), (err, results) => {
    handleMedicalResponse(res, err, results);
  });
};

router.get("/medical-records/search", (req, res) => {
  const filter = req.query.filter || 'ALL';
  // Base query for search
  const baseQuery = `SELECT ${medicalFields} FROM tbl_medical_records WHERE (mr_student_name LIKE ? OR mr_student_id LIKE ? OR mr_medical_id LIKE ? OR mr_school_year_semester LIKE ?) ORDER BY mr_record_date DESC`;
  handleSearch(req, res, baseQuery, [1, 1, 1, 1], false, filter);
});

router.get("/medical-records/referred/search", (req, res) => {
  const filter = req.query.filter || 'ALL';
  // Base query for referred search
  const baseQuery = `SELECT ${medicalFields} FROM tbl_medical_records WHERE mr_referred = 'Yes' AND (mr_student_name LIKE ? OR mr_student_id LIKE ? OR mr_medical_id LIKE ? OR mr_medical_details LIKE ? OR mr_school_year_semester LIKE ?) ORDER BY mr_record_date DESC`;
  handleSearch(req, res, baseQuery, [1, 1, 1, 1, 1], true, filter);
});


router.get("/medical-records/:id", (req, res) => {
  const recordId = req.params.id;
  const validationError = validateRecordId(recordId);
  if (validationError) return res.status(400).json(validationError);

  pool.query(`SELECT ${medicalFields} FROM tbl_medical_records WHERE mr_medical_id = ?`, [recordId], (err, results) => {
    if (err) {
      console.error("Error fetching medical record:", err);
      return res.status(500).json({ error: "Database query failed", message: err.message });
    }

    if (results.length === 0) return res.status(404).json({ success: false, error: "Medical record not found" });

    const record = results[0];
    record.attachments = record.attachments ? JSON.parse(record.attachments) : [];
    res.json({ success: true, record });
  });
});

// PUT endpoint
router.put("/medical-records/:id", upload.array('attachments', 5), (req, res) => {
  const recordId = req.params.id;
  const {
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester, subject,
    status, medicalDetails, remarks, referredToGCO, isPsychological, isMedical,
    existingAttachments, filesToDelete, fileClassifications
  } = req.body;

  console.log('PUT request for medical record:', recordId);

  // Validate required fields
  if (!studentId || !studentName || !subject || !status || !medicalDetails || !isPsychological || !isMedical) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  // Validate that at least one is "Yes"
  if (isPsychological === 'No' && isMedical === 'No') {
    return res.status(400).json({
      success: false,
      message: "Record cannot be neither medical nor psychological"
    });
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
    let classifications = [];
    try {
      if (fileClassifications) {
        classifications = JSON.parse(fileClassifications);
      }
    } catch (e) {
      console.error('Error parsing file classifications:', e);
    }

    const newFiles = req.files.map(file => {
      const classification = classifications.find(c => c.filename === file.originalname) || {};
      return {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        isMedical: classification.isMedical || false,
        isPsychological: classification.isPsychological || false
      };
    });

    finalAttachments = [...finalAttachments, ...newFiles];
  }

  const attachmentsJson = finalAttachments.length > 0 ? JSON.stringify(finalAttachments) : null;

  const query = `
    UPDATE tbl_medical_records 
    SET 
      mr_student_id = ?,
      mr_student_name = ?,
      mr_student_strand = ?,
      mr_grade_level = ?,
      mr_section = ?,
      mr_school_year_semester = ?,
      mr_subject = ?,
      mr_status = ?,
      mr_medical_details = ?,
      mr_additional_remarks = ?,
      mr_referred = ?,
      mr_is_psychological = ?,
      mr_is_medical = ?,
      mr_attachments = ?
    WHERE mr_medical_id = ?
  `;

  const values = [
    studentId, studentName, strand, gradeLevel, section, schoolYearSemester || null,
    subject, status, medicalDetails, remarks || "", referredToGCO || "No",
    isPsychological, isMedical, attachmentsJson, recordId
  ];

  console.log('Executing update query with values:', values);

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error('Database update error:', err);
      return res.status(500).json({
        success: false,
        error: "Database operation failed",
        message: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found"
      });
    }

    // Delete files marked for removal
    if (filesToDelete) {
      const filesToDeleteArray = Array.isArray(filesToDelete) ? filesToDelete : [filesToDelete];
      filesToDeleteArray.forEach(filename => {
        if (filename) {
          const filePath = path.join(__dirname, '../../uploads/medical-records', filename);
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting old file:', unlinkErr);
            });
          }
        }
      });
    }

    res.json({
      success: true,
      message: "Medical record updated successfully",
      recordId: recordId
    });
  });
});

// File handling routes
const handleFileOperation = (req, res, operation) => {
  const { id: recordId, filename } = req.params;

  pool.query(`SELECT mr_attachments FROM tbl_medical_records WHERE mr_medical_id = ?`, [recordId], (err, results) => {
    if (err) {
      console.error("Error fetching medical record:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (results.length === 0) return res.status(404).json({ error: "Medical record not found" });

    const attachments = results[0].mr_attachments;
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

router.get("/medical-records/:id/files/:filename", (req, res) => {
  handleFileOperation(req, res, (req, res, file) => {
    if (!fs.existsSync(file.path)) return res.status(404).json({ error: "File not found on server" });
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    fs.createReadStream(file.path).pipe(res);
  });
});

router.get("/medical-records/student/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  const filter = req.query.filter || 'ALL';

  let query = `
    SELECT ${medicalFields}
    FROM tbl_medical_records 
    WHERE mr_student_id = ?
  `;

  // Add filter if specified
  if (filter !== 'ALL') {
    if (filter === 'MEDICALPSYCHOLOGICAL') {
      query += " AND mr_is_medical = 'Yes' AND mr_is_psychological = 'Yes'";
    } else if (filter === 'MEDICAL') {
      query += " AND mr_is_medical = 'Yes' AND mr_is_psychological = 'No'";
    } else if (filter === 'PSYCHOLOGICAL') {
      query += " AND mr_is_medical = 'No' AND mr_is_psychological = 'Yes'";
    }
  }

  query += " ORDER BY mr_record_date DESC";

  pool.query(query, [studentId], (err, results) => {
    handleMedicalResponse(res, err, results);
  });
});

router.delete("/medical-records/:id/files/:filename", (req, res) => {
  handleFileOperation(req, res, (req, res, file, attachmentsArray) => {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    const updatedAttachments = attachmentsArray.filter(att => att.filename !== file.filename);
    const updatedAttachmentsJson = updatedAttachments.length > 0 ? JSON.stringify(updatedAttachments) : null;

    pool.query(`UPDATE tbl_medical_records SET mr_attachments = ? WHERE mr_medical_id = ?`, [updatedAttachmentsJson, req.params.id], (updateErr) => {
      if (updateErr) {
        console.error("Error updating medical record:", updateErr);
        return res.status(500).json({ error: "Database update failed" });
      }
      res.json({ success: true, message: "File deleted successfully" });
    });
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

router.get("/medical-records/student/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  const isReferred = req.query.referred === 'true';

  let query = `
    SELECT ${medicalFields}
    FROM tbl_medical_records 
    WHERE mr_student_id = ?
  `;

  if (isReferred) {
    query += " AND mr_referred = 'Yes'";
  }

  query += " ORDER BY mr_record_date DESC";

  pool.query(query, [studentId], (err, results) => {
    handleMedicalResponse(res, err, results);
  });
});

module.exports = router;