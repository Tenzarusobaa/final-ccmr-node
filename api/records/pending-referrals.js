// src/api/records/pending-referrals.js
const express = require("express");
const router = express.Router();

// Import database connection from centralized config
const { pool } = require("../../config/database");

// Email configuration
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'ccmrnoreply@gmail.com',
    pass: process.env.EMAIL_PASS || 'wajg nkoo umby suku'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Department email mapping
const departmentEmails = {
  'OPD': 'opdadzu@gmail.com',
  'GCO': 'gcoadzu@gmail.com',
  'INF': 'infiadzu@gmail.com'
};

// Function to send email notification
const sendEmailNotification = async (toDepartment, subject, message) => {
  try {
    const toEmail = departmentEmails[toDepartment];
    
    if (!toEmail) {
      console.error(`No email found for department: ${toDepartment}`);
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'ccmrnoreply@gmail.com',
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

// Get all pending referrals (both case records and medical records)
router.get("/pending-referrals", (req, res) => {
  // Query for case record referrals - UPDATED to include cr_school_year_semester
  const caseRecordsQuery = `
    SELECT 
      cr_case_id as record_id,
      cr_student_id,
      cr_student_name,
      cr_student_strand,
      cr_student_grade_level,
      cr_student_section,
      cr_school_year_semester, -- ADDED THIS LINE
      cr_violation_level,
      cr_case_date as record_date,
      cr_general_description as details,
      cr_sender as sender,
      'case_record' as record_type
    FROM tbl_case_records 
    WHERE cr_referred = 'Yes' 
    AND cr_referral_confirmation = 'Pending'
    ORDER BY cr_case_date DESC
  `;

  // Query for medical record referrals - UPDATED to include mr_school_year_semester
  const medicalRecordsQuery = `
    SELECT 
      mr_medical_id as record_id,
      mr_student_id,
      mr_student_name,
      mr_student_strand,
      mr_grade_level as student_grade_level,
      mr_section as student_section,
      mr_school_year_semester, -- ADDED THIS LINE
      NULL as violation_level,
      mr_record_date as record_date,
      mr_medical_details as details,
      mr_sender as sender,
      'medical_record' as record_type
    FROM tbl_medical_records 
    WHERE mr_referred = 'Yes' 
    AND mr_referral_confirmation = 'Pending'
    ORDER BY mr_record_date DESC
  `;

  // Execute both queries
  pool.query(caseRecordsQuery, (err, caseResults) => {
    if (err) {
      console.error("Error fetching case record referrals:", err);
      return res.status(500).json({
        error: "Database query failed",
        message: err.message
      });
    }

    pool.query(medicalRecordsQuery, (err, medicalResults) => {
      if (err) {
        console.error("Error fetching medical record referrals:", err);
        return res.status(500).json({
          error: "Database query failed",
          message: err.message
        });
      }

      // Combine results from both queries
      const allReferrals = [...caseResults, ...medicalResults];
      
      res.json({
        success: true,
        referrals: allReferrals,
        count: allReferrals.length,
        caseRecordCount: caseResults.length,
        medicalRecordCount: medicalResults.length
      });
    });
  });
});

// Update referral confirmation status for case records
router.put("/pending-referrals/case-record/:recordId/confirm", (req, res) => {
  const { recordId } = req.params;
  
  // First, get the case details - UPDATED to include cr_school_year_semester
  const getCaseQuery = `
    SELECT 
      cr_student_id,
      cr_student_name,
      cr_student_strand,
      cr_student_grade_level,
      cr_student_section,
      cr_school_year_semester, -- ADDED THIS LINE
      cr_general_description
    FROM tbl_case_records 
    WHERE cr_case_id = ? 
    AND cr_referred = 'Yes' 
    AND cr_referral_confirmation = 'Pending'
  `;

  pool.query(getCaseQuery, [recordId], (err, caseResults) => {
    if (err) {
      console.error("Error fetching case details:", err);
      return res.status(500).json({
        error: "Database query failed",
        message: err.message
      });
    }

    if (caseResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Case record referral not found or already processed"
      });
    }

    const caseData = caseResults[0];
    
    // Update the referral confirmation status
    const updateQuery = `
      UPDATE tbl_case_records 
      SET cr_referral_confirmation = 'Accepted'
      WHERE cr_case_id = ? 
      AND cr_referred = 'Yes' 
      AND cr_referral_confirmation = 'Pending'
    `;

    pool.query(updateQuery, [recordId], (err, updateResults) => {
      if (err) {
        console.error("Error updating case referral:", err);
        return res.status(500).json({
          error: "Database update failed",
          message: err.message
        });
      }

      if (updateResults.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Case record referral not found or already processed"
        });
      }

      // Create acceptance notification for OPD
      const notificationQuery = `
        INSERT INTO tbl_notifications (
          n_sender,
          n_receiver,
          n_type,
          n_message,
          n_related_record_id,
          n_related_record_type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const notificationMessage = `Case referral for ${caseData.cr_student_name} (${caseData.cr_student_id}) has been accepted by GCO`;
      
      pool.query(notificationQuery, [
        'GCO',
        'OPD',
        'Acceptance',
        notificationMessage,
        recordId,
        'case_record'
      ], (notifErr) => {
        if (notifErr) {
          console.error("Error creating acceptance notification:", notifErr);
          // Continue even if notification fails
        }
      });

      // Send email notification to OPD
      const emailSubject = `Case Referral Accepted - ${caseData.cr_student_name} (${caseData.cr_student_id})`;
      const emailMessage = `
        <h3>Case Referral Acceptance Notification</h3>
        <p><strong>Student:</strong> ${caseData.cr_student_name} (${caseData.cr_student_id})</p>
        <p><strong>Strand/Grade:</strong> ${caseData.cr_student_strand} - Grade ${caseData.cr_student_grade_level} ${caseData.cr_student_section}</p>
        <p><strong>School Year & Semester:</strong> ${caseData.cr_school_year_semester || 'Not specified'}</p>
        <p><strong>Case Description:</strong> ${caseData.cr_general_description}</p>
        <p><strong>Case ID:</strong> ${recordId}</p>
        <p><strong>Status:</strong> Accepted by Guidance Counseling Office (GCO)</p>
        <p>The GCO has accepted this case referral and will proceed with counseling sessions.</p>
      `;

      sendEmailNotification('OPD', emailSubject, emailMessage)
        .then(emailSent => {
          if (emailSent) {
            console.log('Email notification sent successfully to OPD');
          } else {
            console.log('Failed to send email notification to OPD');
          }
        });

      // Create a new counseling record - UPDATED to include schoolYearSemester
      const insertCounselingQuery = `
        INSERT INTO tbl_counseling_records (
          cor_origin_case_id,
          cor_session_number,
          cor_student_id_number,
          cor_student_name,
          cor_student_strand,
          cor_student_grade_level,
          cor_student_section,
          cor_school_year_semester, -- ADDED THIS LINE
          cor_status,
          cor_general_concern,
          cor_is_psychological_condition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const counselingValues = [
        recordId, // cor_origin_case_id
        1, // cor_session_number
        caseData.cr_student_id,
        caseData.cr_student_name,
        caseData.cr_student_strand,
        caseData.cr_student_grade_level,
        caseData.cr_student_section,
        caseData.cr_school_year_semester || null, // ADDED THIS VALUE
        'TO SCHEDULE',
        '',
        'UNCONFIRMED'
      ];

      pool.query(insertCounselingQuery, counselingValues, (err, insertResults) => {
        if (err) {
          console.error("Error creating counseling record:", err);
          // Even if counseling record creation fails, we still confirmed the referral
          return res.json({
            success: true,
            message: "Case referral confirmed successfully, but failed to create counseling record",
            warning: err.message
          });
        }

        res.json({
          success: true,
          message: "Case referral confirmed and counseling record created successfully",
          counselingRecordId: insertResults.insertId
        });
      });
    });
  });
});

// Update referral confirmation status for medical records
router.put("/pending-referrals/medical-record/:recordId/confirm", (req, res) => {
  const { recordId } = req.params;
  
  // First, get the medical record details - UPDATED to include mr_school_year_semester
  const getMedicalQuery = `
    SELECT 
      mr_student_id,
      mr_student_name,
      mr_student_strand,
      mr_grade_level,
      mr_section,
      mr_school_year_semester, -- ADDED THIS LINE
      mr_medical_details,
      mr_is_psychological
    FROM tbl_medical_records 
    WHERE mr_medical_id = ? 
    AND mr_referred = 'Yes' 
    AND mr_referral_confirmation = 'Pending'
  `;

  pool.query(getMedicalQuery, [recordId], (err, medicalResults) => {
    if (err) {
      console.error("Error fetching medical record details:", err);
      return res.status(500).json({
        error: "Database query failed",
        message: err.message
      });
    }

    if (medicalResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Medical record referral not found or already processed"
      });
    }

    const medicalData = medicalResults[0];
    
    // Update the referral confirmation status
    const updateQuery = `
      UPDATE tbl_medical_records 
      SET mr_referral_confirmation = 'Accepted'
      WHERE mr_medical_id = ? 
      AND mr_referred = 'Yes' 
      AND mr_referral_confirmation = 'Pending'
    `;

    pool.query(updateQuery, [recordId], (err, updateResults) => {
      if (err) {
        console.error("Error updating medical referral:", err);
        return res.status(500).json({
          error: "Database update failed",
          message: err.message
        });
      }

      if (updateResults.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Medical record referral not found or already processed"
        });
      }

      // Create acceptance notification for INF
      const notificationQuery = `
        INSERT INTO tbl_notifications (
          n_sender,
          n_receiver,
          n_type,
          n_message,
          n_related_record_id,
          n_related_record_type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const notificationMessage = `Medical referral for ${medicalData.mr_student_name} (${medicalData.mr_student_id}) has been accepted by GCO`;
      
      pool.query(notificationQuery, [
        'GCO',
        'INF',
        'Acceptance',
        notificationMessage,
        recordId,
        'medical_record'
      ], (notifErr) => {
        if (notifErr) {
          console.error("Error creating acceptance notification:", notifErr);
          // Continue even if notification fails
        }
      });

      // Send email notification to INF
      const emailSubject = `Medical Referral Accepted - ${medicalData.mr_student_name} (${medicalData.mr_student_id})`;
      const emailMessage = `
        <h3>Medical Referral Acceptance Notification</h3>
        <p><strong>Student:</strong> ${medicalData.mr_student_name} (${medicalData.mr_student_id})</p>
        <p><strong>Strand/Grade:</strong> ${medicalData.mr_student_strand} - Grade ${medicalData.mr_grade_level} ${medicalData.mr_section}</p>
        <p><strong>School Year & Semester:</strong> ${medicalData.mr_school_year_semester || 'Not specified'}</p>
        <p><strong>Medical Details:</strong> ${medicalData.mr_medical_details}</p>
        <p><strong>Psychological Condition:</strong> ${medicalData.mr_is_psychological}</p>
        <p><strong>Medical Record ID:</strong> ${recordId}</p>
        <p><strong>Status:</strong> Accepted by Guidance Counseling Office (GCO)</p>
        <p>The GCO has accepted this medical referral and will proceed with counseling sessions.</p>
      `;

      sendEmailNotification('INF', emailSubject, emailMessage)
        .then(emailSent => {
          if (emailSent) {
            console.log('Email notification sent successfully to INF');
          } else {
            console.log('Failed to send email notification to INF');
          }
        });

      // Create a new counseling record - UPDATED to include schoolYearSemester
      const insertCounselingQuery = `
        INSERT INTO tbl_counseling_records (
          cor_origin_medical_id,
          cor_session_number,
          cor_student_id_number,
          cor_student_name,
          cor_student_strand,
          cor_student_grade_level,
          cor_student_section,
          cor_school_year_semester, -- ADDED THIS LINE
          cor_status,
          cor_general_concern,
          cor_is_psychological_condition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const counselingValues = [
        recordId, // cor_origin_medical_id
        1,
        medicalData.mr_student_id,
        medicalData.mr_student_name,
        medicalData.mr_student_strand,
        medicalData.mr_grade_level,
        medicalData.mr_section,
        medicalData.mr_school_year_semester || null, // ADDED THIS VALUE
        'TO SCHEDULE',
        '',
        medicalData.mr_is_psychological === 'Yes' ? 'YES' : 'NO'
      ];

      pool.query(insertCounselingQuery, counselingValues, (err, insertResults) => {
        if (err) {
          console.error("Error creating counseling record:", err);
          // Even if counseling record creation fails, we still confirmed the referral
          return res.json({
            success: true,
            message: "Medical referral confirmed successfully, but failed to create counseling record",
            warning: err.message
          });
        }

        res.json({
          success: true,
          message: "Medical referral confirmed and counseling record created successfully",
          counselingRecordId: insertResults.insertId
        });
      });
    });
  });
});

module.exports = router;