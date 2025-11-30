// root/api/upload/file-upload.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../src/uploads/case-files');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: caseId_timestamp_originalname
    const caseId = req.body.caseId || 'temp';
    const timestamp = Date.now();
    const originalName = file.originalname;
    const fileExtension = path.extname(originalName);
    const baseName = path.basename(originalName, fileExtension);
    
    const safeFileName = `${caseId}_${timestamp}_${baseName}${fileExtension}`
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    
    cb(null, safeFileName);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload endpoint for case files
router.post("/case-file", upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded"
      });
    }

    const { caseId, studentId } = req.body;

    // Here you can save file information to database if needed
    // Example: Save to tbl_case_attachments table

    res.json({
      success: true,
      message: "File uploaded successfully",
      fileName: req.file.originalname,
      filePath: `/uploads/case-files/${req.file.filename}`,
      fileSize: req.file.size,
      caseId: caseId,
      studentId: studentId
    });

  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      error: "File upload failed",
      message: error.message
    });
  }
});

// Get files for a specific case
router.get("/case-files/:caseId", (req, res) => {
  const caseId = req.params.caseId;
  const uploadDir = path.join(__dirname, '../../../src/uploads/case-files');
  
  try {
    if (!fs.existsSync(uploadDir)) {
      return res.json({
        success: true,
        files: []
      });
    }

    const files = fs.readdirSync(uploadDir)
      .filter(file => file.startsWith(`${caseId}_`))
      .map(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          fileName: file,
          originalName: file.split('_').slice(2).join('_'), // Remove caseId and timestamp
          filePath: `/uploads/case-files/${file}`,
          fileSize: stats.size,
          uploadDate: stats.mtime
        };
      });

    res.json({
      success: true,
      files: files
    });

  } catch (error) {
    console.error("Error fetching case files:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch files",
      message: error.message
    });
  }
});

// Delete file endpoint
router.delete("/case-file/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, '../../../src/uploads/case-files', fileName);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: "File deleted successfully"
      });
    } else {
      res.status(404).json({
        success: false,
        error: "File not found"
      });
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete file",
      message: error.message
    });
  }
});

module.exports = router;