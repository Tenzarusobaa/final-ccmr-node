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

module.exports = router;