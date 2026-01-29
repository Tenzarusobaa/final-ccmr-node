// src/api/records/student-data.js
const express = require("express");
const router = express.Router();

// Import database connection from centralized config
const { pool } = require("../../config/database");

// GET all student data
router.get("/student-data", (req, res) => {
  const query = `
    SELECT DISTINCT
      sd_id_number as id,
      sd_student_name as name,
      sd_strand as strand,
      sd_grade_level as gradeLevel,
      sd_section as section,
      sd_gender as gender,
      sd_religion as religion,
      sd_previous_school as previousSchool,
      sd_status as status,
      sd_birthdate as birthdate,
      sd_school_year_sem as schoolYearSem,
      sd_school_year_semesterr as schoolYearSemesterr
    FROM tbl_student_data 
    ORDER BY sd_id_number
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching student data:", err);
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        message: err.message
      });
    }

    res.json({
      success: true,
      students: results,
      count: results.length
    });
  });
});

// SEARCH student data
router.get("/student-data/search", (req, res) => {
  const searchQuery = req.query.query;

  if (!searchQuery) {
    return res.status(400).json({
      success: false,
      error: "Search query is required"
    });
  }

  const query = `
    SELECT 
      sd_id_number as id,
      sd_student_name as name,
      sd_strand as strand,
      sd_grade_level as gradeLevel,
      sd_section as section,
      sd_gender as gender,
      sd_religion as religion,
      sd_previous_school as previousSchool,
      sd_status as status,
      sd_birthdate as birthdate,
      sd_school_year_sem as schoolYearSem,
      sd_school_year_semesterr as schoolYearSemesterr
    FROM tbl_student_data 
    WHERE (
      sd_id_number LIKE ? OR 
      sd_student_name LIKE ? OR 
      sd_strand LIKE ? OR
      sd_grade_level LIKE ? OR
      sd_section LIKE ? OR
      sd_gender LIKE ?
    )
    ORDER BY sd_id_number
  `;

  const searchPattern = `%${searchQuery}%`;
  const searchTerms = [
    searchPattern, // id
    searchPattern, // name
    searchPattern, // strand
    searchPattern, // gradeLevel
    searchPattern, // section
    searchPattern  // gender
  ];

  pool.query(query, searchTerms, (err, results) => {
    if (err) {
      console.error("Error searching student data:", err);
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        message: err.message
      });
    }

    res.json({
      success: true,
      students: results,
      count: results.length
    });
  });
});

// GET student data by ID
router.get("/student-data/:id", (req, res) => {
  const studentId = req.params.id;

  const query = `
    SELECT 
      sd_id_number as id,
      sd_student_name as name,
      sd_strand as strand,
      sd_grade_level as gradeLevel,
      sd_section as section,
      sd_gender as gender,
      sd_religion as religion,
      sd_previous_school as previousSchool,
      sd_status as status,
      sd_birthdate as birthdate,
      sd_school_year_sem as schoolYearSem,
      sd_school_year_semesterr as schoolYearSemesterr
    FROM tbl_student_data 
    WHERE sd_id_number = ?
  `;

  pool.query(query, [studentId], (err, results) => {
    if (err) {
      console.error("Error fetching student data:", err);
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        message: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }

    res.json({
      success: true,
      student: results[0]
    });
  });
});

// POST - Add new student data
router.post("/student-data", (req, res) => {
  const {
    id,
    name,
    strand,
    gradeLevel,
    section,
    gender,
    religion,
    previousSchool,
    status,
    birthdate,
    schoolYearSem,
    schoolYearSemesterr
  } = req.body;

  const query = `
    INSERT INTO tbl_student_data (
      sd_id_number,
      sd_student_name,
      sd_strand,
      sd_grade_level,
      sd_section,
      sd_gender,
      sd_religion,
      sd_previous_school,
      sd_status,
      sd_birthdate,
      sd_school_year_sem,
      sd_school_year_semesterr
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    name,
    strand,
    gradeLevel,
    section,
    gender,
    religion,
    previousSchool,
    status,
    birthdate,
    schoolYearSem,
    schoolYearSemesterr
  ];

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error("Error adding student data:", err);
      return res.status(500).json({
        success: false,
        error: "Database insert failed",
        message: err.message
      });
    }

    res.json({
      success: true,
      message: "Student data added successfully",
      studentId: id
    });
  });
});

// PUT - Update student data
router.put("/student-data/:id", (req, res) => {
  const studentId = req.params.id;
  const {
    name,
    strand,
    gradeLevel,
    section,
    gender,
    religion,
    previousSchool,
    status,
    birthdate,
    schoolYearSem,
    schoolYearSemesterr
  } = req.body;

  const query = `
    UPDATE tbl_student_data 
    SET 
      sd_student_name = ?,
      sd_strand = ?,
      sd_grade_level = ?,
      sd_section = ?,
      sd_gender = ?,
      sd_religion = ?,
      sd_previous_school = ?,
      sd_status = ?,
      sd_birthdate = ?,
      sd_school_year_sem = ?,
      sd_school_year_semesterr = ?
    WHERE sd_id_number = ?
  `;

  const values = [
    name,
    strand,
    gradeLevel,
    section,
    gender,
    religion,
    previousSchool,
    status,
    birthdate,
    schoolYearSem,
    schoolYearSemesterr,
    studentId
  ];

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error("Error updating student data:", err);
      return res.status(500).json({
        success: false,
        error: "Database update failed",
        message: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student data updated successfully"
    });
  });
});

// DELETE - Remove student data
router.delete("/student-data/:id", (req, res) => {
  const studentId = req.params.id;

  const query = "DELETE FROM tbl_student_data WHERE sd_id_number = ?";

  pool.query(query, [studentId], (err, results) => {
    if (err) {
      console.error("Error deleting student data:", err);
      return res.status(500).json({
        success: false,
        error: "Database delete failed",
        message: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student data deleted successfully"
    });
  });
});

// For file upload handling
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const csv = require('csv-parser');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed.'));
    }
  }
});

// POST - Import student data from Excel/CSV
router.post("/student-data/import", upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded"
    });
  }

  try {
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let studentsData = [];

    console.log(`Processing file: ${filePath}, Extension: ${fileExt}`);

    // Parse file based on extension
    if (fileExt === '.csv') {
      // Parse CSV file
      studentsData = await parseCSV(filePath);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      // Parse Excel file
      studentsData = await parseExcel(filePath);
    } else {
      fs.unlinkSync(filePath); // Clean up file
      return res.status(400).json({
        success: false,
        error: "Unsupported file format. Please upload .csv, .xlsx, or .xls files."
      });
    }

    if (studentsData.length === 0) {
      fs.unlinkSync(filePath); // Clean up file
      return res.status(400).json({
        success: false,
        error: "No valid student data found in the file."
      });
    }

    console.log(`Found ${studentsData.length} records to import`);

    // Import data to database
    const importResult = await importStudentsToDB(studentsData);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Import completed successfully`,
      summary: {
        total_records: studentsData.length,
        successful_imports: importResult.successCount,
        failed_imports: importResult.failedCount,
        duplicates_found: importResult.duplicateCount
      },
      errors: importResult.errors.length > 0 ? importResult.errors.slice(0, 10) : [] // Show first 10 errors
    });

  } catch (error) {
    console.error("Error during import:", error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: "Import failed",
      message: error.message
    });
  }
});

// Helper function to parse Excel files
async function parseExcel(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    });

    if (data.length < 2) return []; // Header row + at least one data row

    const headers = data[0].map(h => h ? h.toString().trim().toLowerCase() : '');
    const students = [];

    // Map Excel columns to database fields
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(cell => cell === '' || cell === null)) continue;

      const student = mapExcelRowToStudent(row, headers);
      if (student) {
        students.push(student);
      }
    }

    return students;
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error.message}`);
  }
}

// Helper function to parse CSV files
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const students = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const student = mapCSVRowToStudent(row);
        if (student) {
          students.push(student);
        }
      })
      .on('end', () => {
        resolve(students);
      })
      .on('error', (error) => {
        reject(new Error(`Error parsing CSV file: ${error.message}`));
      });
  });
}

// Map Excel row to student object
function mapExcelRowToStudent(row, headers) {
  try {
    const student = {};
    
    // Find column indices based on header names
    const idIndex = headers.findIndex(h => h.includes('id') || h.includes('number'));
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('student'));
    const strandIndex = headers.findIndex(h => h.includes('strand'));
    const gradeIndex = headers.findIndex(h => h.includes('grade') || h.includes('level'));
    const sectionIndex = headers.findIndex(h => h.includes('section'));
    const religionIndex = headers.findIndex(h => h.includes('religion'));
    const schoolIndex = headers.findIndex(h => h.includes('previous') || h.includes('school'));
    const genderIndex = headers.findIndex(h => h.includes('gender'));
    const statusIndex = headers.findIndex(h => h.includes('status'));
    const birthdateIndex = headers.findIndex(h => h.includes('birth') || h.includes('date'));
    const semesterIndex = headers.findIndex(h => h.includes('semester') || h.includes('year'));
    
    // Get values with fallbacks
    student.id = idIndex >= 0 ? cleanValue(row[idIndex]) : '';
    student.name = nameIndex >= 0 ? cleanValue(row[nameIndex]) : '';
    student.strand = strandIndex >= 0 ? cleanValue(row[strandIndex]) : '';
    student.gradeLevel = gradeIndex >= 0 ? cleanValue(row[gradeIndex]) : '';
    student.section = sectionIndex >= 0 ? cleanValue(row[sectionIndex]) : '';
    student.religion = religionIndex >= 0 ? cleanValue(row[religionIndex]) : '';
    student.previousSchool = schoolIndex >= 0 ? cleanValue(row[schoolIndex]) : '';
    student.gender = genderIndex >= 0 ? cleanValue(row[genderIndex]) : '';
    student.status = statusIndex >= 0 ? cleanValue(row[statusIndex]) : 'Active';
    student.birthdate = birthdateIndex >= 0 ? parseDate(row[birthdateIndex]) : null;
    student.schoolYearSem = 0; // Default value
    student.schoolYearSemesterr = semesterIndex >= 0 ? cleanValue(row[semesterIndex]) : '2025-2026-1';

    // Validate required fields
    if (!student.id || !student.name) {
      console.warn(`Skipping row: Missing required fields (ID: ${student.id}, Name: ${student.name})`);
      return null;
    }

    return student;
  } catch (error) {
    console.error("Error mapping Excel row:", error);
    return null;
  }
}

// Map CSV row to student object
function mapCSVRowToStudent(row) {
  try {
    const student = {};
    
    // Clean row keys (case-insensitive matching)
    const cleanRow = {};
    Object.keys(row).forEach(key => {
      cleanRow[key.toLowerCase().trim()] = row[key];
    });

    // Map fields with fallbacks
    student.id = cleanValue(cleanRow['id number'] || cleanRow['id'] || '');
    student.name = cleanValue(cleanRow['student name'] || cleanRow['name'] || '');
    student.strand = cleanValue(cleanRow['strand'] || '');
    student.gradeLevel = cleanValue(cleanRow['grade level'] || cleanRow['grade'] || '');
    student.section = cleanValue(cleanRow['section'] || '');
    student.religion = cleanValue(cleanRow['religion'] || '');
    student.previousSchool = cleanValue(cleanRow['previous school'] || cleanRow['school'] || '');
    student.gender = cleanValue(cleanRow['gender'] || '');
    student.status = cleanValue(cleanRow['status'] || 'Active');
    student.birthdate = parseDate(cleanRow['birthdate'] || '');
    student.schoolYearSem = 0; // Default value
    student.schoolYearSemesterr = cleanValue(cleanRow['school year and semester'] || 
                                            cleanRow['school year'] || 
                                            cleanRow['semester'] || 
                                            '2025-2026-1');

    // Validate required fields
    if (!student.id || !student.name) {
      console.warn(`Skipping row: Missing required fields (ID: ${student.id}, Name: ${student.name})`);
      return null;
    }

    return student;
  } catch (error) {
    console.error("Error mapping CSV row:", error);
    return null;
  }
}

// Helper function to clean values
function cleanValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return value.toString().trim();
}

// Helper function to parse dates
function parseDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    // Handle Excel serial date numbers
    if (typeof dateValue === 'number') {
      // Excel dates are numbers where 1 = Jan 1, 1900
      const excelEpoch = new Date(1899, 11, 30);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const date = new Date(excelEpoch.getTime() + dateValue * millisecondsPerDay);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    const dateStr = dateValue.toString().trim();
    
    // Try parsing various date formats
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    
    // Try parsing YYYY-MM-DD
    const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})/;
    const match = dateStr.match(yyyymmdd);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to parse date: ${dateValue}`, error);
    return null;
  }
}

// Import students to database
async function importStudentsToDB(students) {
  const results = {
    successCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    errors: []
  };

  // Process students in batches to avoid overwhelming the database
  const batchSize = 50;
  
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    
    for (const student of batch) {
      try {
        // Check for duplicate (same ID and semester)
        const duplicateCheckQuery = `
          SELECT sd_id_number 
          FROM tbl_student_data 
          WHERE sd_id_number = ? AND sd_school_year_semesterr = ?
        `;
        
        const duplicateResult = await new Promise((resolve, reject) => {
          pool.query(duplicateCheckQuery, [student.id, student.schoolYearSemesterr], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (duplicateResult.length > 0) {
          results.duplicateCount++;
          results.errors.push(`Duplicate: ${student.id} for semester ${student.schoolYearSemesterr}`);
          continue; // Skip duplicate
        }

        // Insert student
        const insertQuery = `
          INSERT INTO tbl_student_data (
            sd_id_number,
            sd_student_name,
            sd_strand,
            sd_grade_level,
            sd_section,
            sd_religion,
            sd_previous_school,
            sd_gender,
            sd_status,
            sd_birthdate,
            sd_school_year_sem,
            sd_school_year_semesterr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          student.id,
          student.name,
          student.strand,
          student.gradeLevel,
          student.section,
          student.religion,
          student.previousSchool,
          student.gender,
          student.status || 'Active',
          student.birthdate,
          student.schoolYearSem || 0,
          student.schoolYearSemesterr
        ];

        await new Promise((resolve, reject) => {
          pool.query(insertQuery, values, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        results.successCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push(`Error importing ${student.id}: ${error.message}`);
        console.error(`Error importing student ${student.id}:`, error);
      }
    }
  }

  return results;
}

module.exports = router;