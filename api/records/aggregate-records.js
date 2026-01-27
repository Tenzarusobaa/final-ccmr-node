// root/api/records/student-records.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// Helper function to get unique students with case records
const getStudentsWithCaseRecords = async (isReferred = false) => {
  const referredClause = isReferred ? "WHERE cr.cr_referred = 'Yes'" : "";
  
  const query = `
    SELECT DISTINCT
      sd.sd_id_number as id,
      sd.sd_student_name as name,
      sd.sd_strand as strand,
      sd.sd_grade_level as gradeLevel,
      sd.sd_section as section,
      COUNT(DISTINCT cr.cr_case_id) as caseCount,
      MAX(cr.cr_case_date) as latestCaseDate,
      GROUP_CONCAT(DISTINCT cr.cr_status ORDER BY cr.cr_case_date DESC) as statuses,
      GROUP_CONCAT(DISTINCT cr.cr_school_year_semester) as allSemesters
    FROM tbl_student_data sd
    INNER JOIN tbl_case_records cr ON sd.sd_id_number = cr.cr_student_id
    ${referredClause}
    GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
             sd.sd_grade_level, sd.sd_section
    ORDER BY sd.sd_student_name
  `;
  
  return new Promise((resolve, reject) => {
    pool.query(query, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Helper function to get unique students with counseling records
const getStudentsWithCounselingRecords = async (isPsychological = false) => {
  const psychologicalClause = isPsychological ? "WHERE cor.cor_is_psychological_condition = 'YES'" : "";
  
  const query = `
    SELECT DISTINCT
      sd.sd_id_number as id,
      sd.sd_student_name as name,
      sd.sd_strand as strand,
      sd.sd_grade_level as gradeLevel,
      sd.sd_section as section,
      COUNT(DISTINCT cor.cor_record_id) as counselingCount,
      MAX(cor.cor_date) as latestCounselingDate,
      GROUP_CONCAT(DISTINCT cor.cor_status ORDER BY cor.cor_date DESC) as statuses,
      GROUP_CONCAT(DISTINCT cor.cor_school_year_semester) as allSemesters
    FROM tbl_student_data sd
    INNER JOIN tbl_counseling_records cor ON sd.sd_id_number = cor.cor_student_id_number
    ${psychologicalClause}
    GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
             sd.sd_grade_level, sd.sd_section
    ORDER BY sd.sd_student_name
  `;
  
  return new Promise((resolve, reject) => {
    pool.query(query, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Helper function to get unique students with medical records
const getStudentsWithMedicalRecords = async (isReferred = false, filterType = 'ALL') => {
  let filterClause = "";
  if (isReferred) {
    filterClause = "WHERE mr.mr_referred = 'Yes'";
  } else if (filterType !== 'ALL') {
    if (filterType === 'MEDICAL') {
      filterClause = "WHERE mr.mr_is_medical = 'Yes' AND mr.mr_is_psychological = 'No'";
    } else if (filterType === 'PSYCHOLOGICAL') {
      filterClause = "WHERE mr.mr_is_psychological = 'Yes' AND mr.mr_is_medical = 'No'";
    } else if (filterType === 'MEDICALPSYCHOLOGICAL') {
      filterClause = "WHERE mr.mr_is_medical = 'Yes' AND mr.mr_is_psychological = 'Yes'";
    }
  }
  
  const query = `
    SELECT DISTINCT
      sd.sd_id_number as id,
      sd.sd_student_name as name,
      sd.sd_strand as strand,
      sd.sd_grade_level as gradeLevel,
      sd.sd_section as section,
      COUNT(DISTINCT mr.mr_medical_id) as medicalCount,
      MAX(mr.mr_record_date) as latestMedicalDate,
      GROUP_CONCAT(DISTINCT mr.mr_status ORDER BY mr.mr_record_date DESC) as statuses,
      GROUP_CONCAT(DISTINCT mr.mr_is_medical) as hasMedical,
      GROUP_CONCAT(DISTINCT mr.mr_is_psychological) as hasPsychological,
      GROUP_CONCAT(DISTINCT mr.mr_school_year_semester) as allSemesters
    FROM tbl_student_data sd
    INNER JOIN tbl_medical_records mr ON sd.sd_id_number = mr.mr_student_id
    ${filterClause}
    GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
             sd.sd_grade_level, sd.sd_section
    ORDER BY sd.sd_student_name
  `;
  
  return new Promise((resolve, reject) => {
    pool.query(query, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Routes for OPD (Case Records)
router.get("/student-case-records", async (req, res) => {
  try {
    const students = await getStudentsWithCaseRecords(false);
    // Get latest status for each student
    const processedStudents = students.map(student => ({
      ...student,
      latestStatus: student.statuses ? student.statuses.split(',')[0] : null
    }));
    res.json({ success: true, students: processedStudents, count: processedStudents.length });
  } catch (error) {
    console.error("Error fetching student case records:", error);
    res.status(500).json({ error: "Database query failed", message: error.message });
  }
});

router.get("/student-case-records/referred", async (req, res) => {
  try {
    const students = await getStudentsWithCaseRecords(true);
    const processedStudents = students.map(student => ({
      ...student,
      latestStatus: student.statuses ? student.statuses.split(',')[0] : null
    }));
    res.json({ success: true, students: processedStudents, count: processedStudents.length });
  } catch (error) {
    console.error("Error fetching referred student case records:", error);
    res.status(500).json({ error: "Database query failed", message: error.message });
  }
});

// Routes for GCO (Counseling Records)
router.get("/student-counseling-records", async (req, res) => {
  try {
    const students = await getStudentsWithCounselingRecords(false);
    const processedStudents = students.map(student => ({
      ...student,
      latestStatus: student.statuses ? student.statuses.split(',')[0] : null
    }));
    res.json({ success: true, students: processedStudents, count: processedStudents.length });
  } catch (error) {
    console.error("Error fetching student counseling records:", error);
    res.status(500).json({ error: "Database query failed", message: error.message });
  }
});

router.get("/student-counseling-records/psychological", async (req, res) => {
  try {
    const students = await getStudentsWithCounselingRecords(true);
    const processedStudents = students.map(student => ({
      ...student,
      latestStatus: student.statuses ? student.statuses.split(',')[0] : null
    }));
    res.json({ success: true, students: processedStudents, count: processedStudents.length });
  } catch (error) {
    console.error("Error fetching student psychological records:", error);
    res.status(500).json({ error: "Database query failed", message: error.message });
  }
});

// Routes for INF (Medical Records)
router.get("/student-medical-records", async (req, res) => {
  try {
    const filterType = req.query.filter || 'ALL';
    const students = await getStudentsWithMedicalRecords(false, filterType);
    const processedStudents = students.map(student => ({
      ...student,
      latestStatus: student.statuses ? student.statuses.split(',')[0] : null
    }));
    res.json({ success: true, students: processedStudents, count: processedStudents.length });
  } catch (error) {
    console.error("Error fetching student medical records:", error);
    res.status(500).json({ error: "Database query failed", message: error.message });
  }
});

router.get("/student-medical-records/referred", async (req, res) => {
  try {
    const students = await getStudentsWithMedicalRecords(true);
    const processedStudents = students.map(student => ({
      ...student,
      latestStatus: student.statuses ? student.statuses.split(',')[0] : null
    }));
    res.json({ success: true, students: processedStudents, count: processedStudents.length });
  } catch (error) {
    console.error("Error fetching referred student medical records:", error);
    res.status(500).json({ error: "Database query failed", message: error.message });
  }
});

// Search endpoints
router.get("/student-case-records/search", async (req, res) => {
  try {
    const { query } = req.query;
    const searchTerm = `%${query}%`;
    
    const searchQuery = `
      SELECT DISTINCT
        sd.sd_id_number as id,
        sd.sd_student_name as name,
        sd.sd_strand as strand,
        sd.sd_grade_level as gradeLevel,
        sd.sd_section as section,
        COUNT(DISTINCT cr.cr_case_id) as caseCount,
        GROUP_CONCAT(DISTINCT cr.cr_status ORDER BY cr.cr_case_date DESC) as statuses
      FROM tbl_student_data sd
      INNER JOIN tbl_case_records cr ON sd.sd_id_number = cr.cr_student_id
      WHERE (sd.sd_id_number LIKE ? OR sd.sd_student_name LIKE ? OR sd.sd_strand LIKE ?)
        AND cr.cr_student_id = sd.sd_id_number  -- Ensure matching student IDs
      GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
               sd.sd_grade_level, sd.sd_section
      ORDER BY sd.sd_student_name
      LIMIT 50
    `;
    
    pool.query(searchQuery, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Error searching student case records:", err);
        return res.status(500).json({ error: "Search failed", message: err.message });
      }
      const processedResults = results.map(student => ({
        ...student,
        latestStatus: student.statuses ? student.statuses.split(',')[0] : null
      }));
      res.json({ success: true, students: processedResults, count: processedResults.length });
    });
  } catch (error) {
    res.status(500).json({ error: "Search failed", message: error.message });
  }
});

// NEW: Search endpoint for referred case records
router.get("/student-case-records/referred/search", async (req, res) => {
  try {
    const { query } = req.query;
    const searchTerm = `%${query}%`;
    
    const searchQuery = `
      SELECT DISTINCT
        sd.sd_id_number as id,
        sd.sd_student_name as name,
        sd.sd_strand as strand,
        sd.sd_grade_level as gradeLevel,
        sd.sd_section as section,
        COUNT(DISTINCT cr.cr_case_id) as caseCount,
        GROUP_CONCAT(DISTINCT cr.cr_status ORDER BY cr.cr_case_date DESC) as statuses
      FROM tbl_student_data sd
      INNER JOIN tbl_case_records cr ON sd.sd_id_number = cr.cr_student_id
      WHERE (sd.sd_id_number LIKE ? OR sd.sd_student_name LIKE ? OR sd.sd_strand LIKE ?)
        AND cr.cr_student_id = sd.sd_id_number
        AND cr.cr_referred = 'Yes'  -- Only referred cases for GCO
      GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
               sd.sd_grade_level, sd.sd_section
      ORDER BY sd.sd_student_name
      LIMIT 50
    `;
    
    pool.query(searchQuery, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Error searching referred student case records:", err);
        return res.status(500).json({ error: "Search failed", message: err.message });
      }
      const processedResults = results.map(student => ({
        ...student,
        latestStatus: student.statuses ? student.statuses.split(',')[0] : null
      }));
      res.json({ success: true, students: processedResults, count: processedResults.length });
    });
  } catch (error) {
    res.status(500).json({ error: "Search failed", message: error.message });
  }
});

// Search endpoint for counseling records
router.get("/student-counseling-records/search", async (req, res) => {
  try {
    const { query } = req.query;
    const searchTerm = `%${query}%`;
    
    const searchQuery = `
      SELECT DISTINCT
        sd.sd_id_number as id,
        sd.sd_student_name as name,
        sd.sd_strand as strand,
        sd.sd_grade_level as gradeLevel,
        sd.sd_section as section,
        COUNT(DISTINCT cor.cor_record_id) as counselingCount,
        GROUP_CONCAT(DISTINCT cor.cor_status ORDER BY cor.cor_date DESC) as statuses
      FROM tbl_student_data sd
      INNER JOIN tbl_counseling_records cor ON sd.sd_id_number = cor.cor_student_id_number
      WHERE (sd.sd_id_number LIKE ? OR sd.sd_student_name LIKE ? OR sd.sd_strand LIKE ?)
        AND cor.cor_student_id_number = sd.sd_id_number
      GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
               sd.sd_grade_level, sd.sd_section
      ORDER BY sd.sd_student_name
      LIMIT 50
    `;
    
    pool.query(searchQuery, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Error searching student counseling records:", err);
        return res.status(500).json({ error: "Search failed", message: err.message });
      }
      const processedResults = results.map(student => ({
        ...student,
        latestStatus: student.statuses ? student.statuses.split(',')[0] : null
      }));
      res.json({ success: true, students: processedResults, count: processedResults.length });
    });
  } catch (error) {
    res.status(500).json({ error: "Search failed", message: error.message });
  }
});

// NEW: Search endpoint for psychological counseling records
router.get("/student-counseling-records/psychological/search", async (req, res) => {
  try {
    const { query } = req.query;
    const searchTerm = `%${query}%`;
    
    const searchQuery = `
      SELECT DISTINCT
        sd.sd_id_number as id,
        sd.sd_student_name as name,
        sd.sd_strand as strand,
        sd.sd_grade_level as gradeLevel,
        sd.sd_section as section,
        COUNT(DISTINCT cor.cor_record_id) as counselingCount,
        GROUP_CONCAT(DISTINCT cor.cor_status ORDER BY cor.cor_date DESC) as statuses
      FROM tbl_student_data sd
      INNER JOIN tbl_counseling_records cor ON sd.sd_id_number = cor.cor_student_id_number
      WHERE (sd.sd_id_number LIKE ? OR sd.sd_student_name LIKE ? OR sd.sd_strand LIKE ?)
        AND cor.cor_student_id_number = sd.sd_id_number
        AND cor.cor_is_psychological_condition = 'YES'  -- Only psychological records for INF
      GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
               sd.sd_grade_level, sd.sd_section
      ORDER BY sd.sd_student_name
      LIMIT 50
    `;
    
    pool.query(searchQuery, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Error searching student psychological counseling records:", err);
        return res.status(500).json({ error: "Search failed", message: err.message });
      }
      const processedResults = results.map(student => ({
        ...student,
        latestStatus: student.statuses ? student.statuses.split(',')[0] : null
      }));
      res.json({ success: true, students: processedResults, count: processedResults.length });
    });
  } catch (error) {
    res.status(500).json({ error: "Search failed", message: error.message });
  }
});

// Search endpoint for medical records
router.get("/student-medical-records/search", async (req, res) => {
  try {
    const { query, filter = 'ALL' } = req.query;
    const searchTerm = `%${query}%`;
    
    let filterClause = "";
    if (filter === 'MEDICAL') {
      filterClause = "AND mr.mr_is_medical = 'Yes' AND mr.mr_is_psychological = 'No'";
    } else if (filter === 'PSYCHOLOGICAL') {
      filterClause = "AND mr.mr_is_psychological = 'Yes' AND mr.mr_is_medical = 'No'";
    } else if (filter === 'MEDICALPSYCHOLOGICAL') {
      filterClause = "AND mr.mr_is_medical = 'Yes' AND mr.mr_is_psychological = 'Yes'";
    }
    
    const searchQuery = `
      SELECT DISTINCT
        sd.sd_id_number as id,
        sd.sd_student_name as name,
        sd.sd_strand as strand,
        sd.sd_grade_level as gradeLevel,
        sd.sd_section as section,
        COUNT(DISTINCT mr.mr_medical_id) as medicalCount,
        GROUP_CONCAT(DISTINCT mr.mr_status ORDER BY mr.mr_record_date DESC) as statuses,
        GROUP_CONCAT(DISTINCT mr.mr_is_medical) as hasMedical,
        GROUP_CONCAT(DISTINCT mr.mr_is_psychological) as hasPsychological
      FROM tbl_student_data sd
      INNER JOIN tbl_medical_records mr ON sd.sd_id_number = mr.mr_student_id
      WHERE (sd.sd_id_number LIKE ? OR sd.sd_student_name LIKE ? OR sd.sd_strand LIKE ?)
        AND mr.mr_student_id = sd.sd_id_number
        ${filterClause}
      GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
               sd.sd_grade_level, sd.sd_section
      ORDER BY sd.sd_student_name
      LIMIT 50
    `;
    
    pool.query(searchQuery, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Error searching student medical records:", err);
        return res.status(500).json({ error: "Search failed", message: err.message });
      }
      const processedResults = results.map(student => ({
        ...student,
        latestStatus: student.statuses ? student.statuses.split(',')[0] : null
      }));
      res.json({ success: true, students: processedResults, count: processedResults.length });
    });
  } catch (error) {
    res.status(500).json({ error: "Search failed", message: error.message });
  }
});

// Search endpoint for referred medical records
router.get("/student-medical-records/referred/search", async (req, res) => {
  try {
    const { query, filter = 'ALL' } = req.query;
    const searchTerm = `%${query}%`;
    
    let filterClause = "AND mr.mr_referred = 'Yes'";
    if (filter === 'MEDICAL') {
      filterClause += " AND mr.mr_is_medical = 'Yes' AND mr.mr_is_psychological = 'No'";
    } else if (filter === 'PSYCHOLOGICAL') {
      filterClause += " AND mr.mr_is_psychological = 'Yes' AND mr.mr_is_medical = 'No'";
    } else if (filter === 'MEDICALPSYCHOLOGICAL') {
      filterClause += " AND mr.mr_is_medical = 'Yes' AND mr.mr_is_psychological = 'Yes'";
    }
    
    const searchQuery = `
      SELECT DISTINCT
        sd.sd_id_number as id,
        sd.sd_student_name as name,
        sd.sd_strand as strand,
        sd.sd_grade_level as gradeLevel,
        sd.sd_section as section,
        COUNT(DISTINCT mr.mr_medical_id) as medicalCount,
        GROUP_CONCAT(DISTINCT mr.mr_status ORDER BY mr.mr_record_date DESC) as statuses,
        GROUP_CONCAT(DISTINCT mr.mr_is_medical) as hasMedical,
        GROUP_CONCAT(DISTINCT mr.mr_is_psychological) as hasPsychological
      FROM tbl_student_data sd
      INNER JOIN tbl_medical_records mr ON sd.sd_id_number = mr.mr_student_id
      WHERE (sd.sd_id_number LIKE ? OR sd.sd_student_name LIKE ? OR sd.sd_strand LIKE ?)
        AND mr.mr_student_id = sd.sd_id_number
        ${filterClause}
      GROUP BY sd.sd_id_number, sd.sd_student_name, sd.sd_strand, 
               sd.sd_grade_level, sd.sd_section
      ORDER BY sd.sd_student_name
      LIMIT 50
    `;
    
    pool.query(searchQuery, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Error searching referred student medical records:", err);
        return res.status(500).json({ error: "Search failed", message: err.message });
      }
      const processedResults = results.map(student => ({
        ...student,
        latestStatus: student.statuses ? student.statuses.split(',')[0] : null
      }));
      res.json({ success: true, students: processedResults, count: processedResults.length });
    });
  } catch (error) {
    res.status(500).json({ error: "Search failed", message: error.message });
  }
});

module.exports = router;