-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 29, 2026 at 11:56 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_ccmr`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_case_records`
--

CREATE TABLE `tbl_case_records` (
  `cr_case_id` int(11) NOT NULL,
  `cr_sender` varchar(10) NOT NULL DEFAULT 'OPD',
  `cr_student_id` varchar(20) NOT NULL,
  `cr_student_name` varchar(255) DEFAULT NULL,
  `cr_student_strand` varchar(100) DEFAULT NULL,
  `cr_student_grade_level` varchar(100) DEFAULT NULL,
  `cr_student_section` varchar(10) DEFAULT NULL,
  `cr_violation_level` varchar(255) DEFAULT NULL,
  `cr_status` enum('Ongoing','Resolved') DEFAULT 'Ongoing',
  `cr_case_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `cr_referred` enum('Yes','No') DEFAULT NULL,
  `cr_referral_confirmation` enum('Pending','Accepted') DEFAULT NULL,
  `cr_general_description` varchar(500) DEFAULT NULL,
  `cr_additional_remarks` varchar(500) DEFAULT NULL,
  `cr_attachments` text DEFAULT NULL,
  `cr_school_year_semester` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_counseling_records`
--

CREATE TABLE `tbl_counseling_records` (
  `cor_record_id` int(11) NOT NULL,
  `cor_origin_medical_id` varchar(50) DEFAULT NULL,
  `cor_origin_case_id` varchar(50) DEFAULT NULL,
  `cor_session_number` int(11) DEFAULT NULL,
  `cor_student_id_number` varchar(50) DEFAULT NULL,
  `cor_student_name` varchar(255) DEFAULT NULL,
  `cor_student_strand` varchar(100) DEFAULT NULL,
  `cor_student_grade_level` varchar(50) DEFAULT NULL,
  `cor_student_section` varchar(50) DEFAULT NULL,
  `cor_status` enum('SCHEDULED','TO SCHEDULE','DONE') DEFAULT NULL,
  `cor_date` date DEFAULT NULL,
  `cor_time` time(6) DEFAULT NULL,
  `cor_general_concern` varchar(500) DEFAULT NULL,
  `cor_additional_remarks` varchar(500) DEFAULT NULL,
  `cor_attachments` text DEFAULT NULL,
  `cor_is_psychological_condition` enum('YES','NO','UNCONFIRMED') DEFAULT NULL,
  `cor_school_year_semester` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medical_records`
--

CREATE TABLE `tbl_medical_records` (
  `mr_medical_id` int(11) NOT NULL,
  `mr_sender` varchar(10) NOT NULL DEFAULT 'INF',
  `mr_student_id` varchar(20) NOT NULL,
  `mr_student_name` varchar(255) DEFAULT NULL,
  `mr_student_strand` varchar(100) DEFAULT NULL,
  `mr_grade_level` varchar(100) DEFAULT NULL,
  `mr_section` varchar(10) DEFAULT NULL,
  `mr_subject` varchar(50) NOT NULL,
  `mr_status` varchar(50) NOT NULL,
  `mr_medical_details` varchar(500) DEFAULT NULL,
  `mr_additional_remarks` varchar(500) DEFAULT NULL,
  `mr_attachments` text DEFAULT NULL,
  `mr_referred` enum('Yes','No') DEFAULT NULL,
  `mr_referral_confirmation` enum('Pending','Accepted') DEFAULT NULL,
  `mr_is_psychological` enum('Yes','No') DEFAULT NULL,
  `mr_is_medical` enum('Yes','No') DEFAULT NULL,
  `mr_record_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `mr_school_year_semester` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_notifications`
--

CREATE TABLE `tbl_notifications` (
  `n_id` int(11) NOT NULL,
  `n_sender` varchar(10) NOT NULL,
  `n_receiver` varchar(10) NOT NULL,
  `n_type` enum('Update','Referral','Acceptance','OPD Medical Certificate') NOT NULL,
  `n_message` varchar(500) NOT NULL,
  `n_is_read` enum('Yes','No') DEFAULT 'No',
  `n_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `n_related_record_id` int(11) DEFAULT NULL,
  `n_related_record_type` enum('case_record','medical_record','counseling_record') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_student_data`
--

CREATE TABLE `tbl_student_data` (
  `sd_id_number` varchar(20) NOT NULL,
  `sd_student_name` varchar(100) NOT NULL,
  `sd_strand` varchar(50) DEFAULT NULL,
  `sd_grade_level` varchar(20) DEFAULT NULL,
  `sd_section` varchar(10) DEFAULT NULL,
  `sd_religion` varchar(50) DEFAULT NULL,
  `sd_previous_school` varchar(100) DEFAULT NULL,
  `sd_gender` varchar(10) DEFAULT NULL,
  `sd_status` varchar(20) DEFAULT NULL,
  `sd_birthdate` date DEFAULT NULL,
  `sd_school_year_sem` int(11) NOT NULL,
  `sd_school_year_semesterr` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_student_data`
--

INSERT INTO `tbl_student_data` (`sd_id_number`, `sd_student_name`, `sd_strand`, `sd_grade_level`, `sd_section`, `sd_religion`, `sd_previous_school`, `sd_gender`, `sd_status`, `sd_birthdate`, `sd_school_year_sem`, `sd_school_year_semesterr`) VALUES
('SH240061', 'Matilda Tuscany', 'STEM', '11', 'A', 'Catholic', 'Ateneo de Zamboanga University', 'Female', 'Active', '2007-03-12', 0, '2025-2026-1'),
('SH24002', 'Ignatius Loyola', 'ABM', '11', 'C', 'Catholic', 'Western Mindanao State University', 'Male', 'Active', '2007-11-07', 0, '2025-2026-1'),
('SH24003', 'Thomas Aquinas', 'STEM', '11', 'E', 'Catholic', 'University of the Philippines', 'Male', 'Active', '2007-08-30', 0, '2025-2026-1'),
('SH24004', 'John Calvin', 'HUMSS', '11', 'G', 'Protestant', 'University of Zamboanga', 'Male', 'Active', '2007-06-18', 0, '2025-2026-1'),
('SH24005', 'Ulrich Zwingli', 'STEM', '11', 'I', 'Protestant', 'De La Salle University', 'Male', 'Active', '2007-12-22', 0, '2025-2026-1'),
('SH24006', 'Aisha bint Abu Bakr', 'TVL', '11', 'K', 'Islam', 'Ateneo de Zamboanga University', 'Female', 'Active', '2007-09-14', 0, '2025-2026-1'),
('SH24007', 'Khadija bint Khuwaylid', 'ABM', '11', 'M', 'Islam', 'Western Mindanao State University', 'Female', 'Active', '2007-10-03', 0, '2025-2026-1'),
('SH24008', 'Fatimah bint Muhammad', 'TVL', '11', 'B', 'Islam', 'University of the Philippines', 'Female', 'Active', '2007-04-16', 0, '2025-2026-1'),
('SH24009', 'Sancho Jimenez', 'ABM', '11', 'D', 'Catholic', 'University of Zamboanga', 'Male', 'Active', '2007-02-28', 0, '2025-2026-1'),
('SH24010', 'Philipp Capet', 'STEM', '11', 'F', 'Catholic', 'De La Salle University', 'Male', 'Active', '2007-07-25', 0, '2025-2026-1'),
('SH24011', 'John Wycliffe', 'HUMSS', '11', 'H', 'Protestant', 'Ateneo de Zamboanga University', 'Male', 'Active', '2007-01-30', 0, '2025-2026-1'),
('SH24012', 'Ibn Sina', 'STEM', '11', 'J', 'Islam', 'Western Mindanao State University', 'Male', 'Active', '2007-05-17', 0, '2025-2026-1'),
('SH23001', 'Francis Assisi', 'HUMSS', '12', 'B', 'Catholic', 'University of Zamboanga', 'Male', 'Active', '2008-05-23', 0, '2025-2026-1'),
('SH23002', 'Teresa Avila', 'GAS', '12', 'D', 'Catholic', 'De La Salle University', 'Female', 'Active', '2008-02-15', 0, '2025-2026-1'),
('SH23003', 'Martin Luther', 'TVL', '12', 'F', 'Protestant', 'Ateneo de Zamboanga University', 'Male', 'Active', '2008-01-10', 0, '2025-2026-1'),
('SH23004', 'Katharina Luther', 'ABM', '12', 'H', 'Protestant', 'Western Mindanao State University', 'Female', 'Active', '2008-04-05', 0, '2025-2026-1'),
('SH23005', 'Anne Askew', 'GAS', '12', 'J', 'Protestant', 'University of the Philippines', 'Female', 'Active', '2008-03-08', 0, '2025-2026-1'),
('SH23006', 'Ali ibn Abi Talib', 'HUMSS', '12', 'L', 'Islam', 'University of Zamboanga', 'Male', 'Active', '2008-07-19', 0, '2025-2026-1'),
('SH23007', 'Umar ibn Khattab', 'STEM', '12', 'A', 'Islam', 'De La Salle University', 'Male', 'Active', '2008-08-27', 0, '2025-2026-1'),
('SH23008', 'William Normandie', 'HUMSS', '12', 'C', 'Catholic', 'Ateneo de Zamboanga University', 'Male', 'Active', '2008-06-11', 0, '2025-2026-1'),
('SH23009', 'Bertha Savoy', 'GAS', '12', 'E', 'Catholic', 'Western Mindanao State University', 'Female', 'Active', '2008-11-09', 0, '2025-2026-1'),
('SH23010', 'Eleanor Aquitaine', 'TVL', '12', 'G', 'Catholic', 'University of the Philippines', 'Female', 'Active', '2008-12-14', 0, '2025-2026-1'),
('SH23011', 'Saladin Ayyubi', 'ABM', '12', 'I', 'Islam', 'University of Zamboanga', 'Male', 'Active', '2008-09-22', 0, '2025-2026-1'),
('SH23012', 'Joan of Arc', 'GAS', '12', 'K', 'Catholic', 'De La Salle University', 'Female', 'Active', '2008-10-08', 0, '2025-2026-1'),
('SH24001', 'Matilda Tuscany', 'STEM', '11', 'A', 'Catholic', 'Ateneo de Zamboanga University', 'Female', 'Active', '2007-03-12', 0, '2025-2026-2'),
('SH24002', 'Ignatius Loyola', 'ABM', '11', 'C', 'Catholic', 'Western Mindanao State University', 'Male', 'Active', '2007-11-07', 0, '2025-2026-2'),
('SH24003', 'Thomas Aquinas', 'STEM', '11', 'E', 'Catholic', 'University of the Philippines', 'Male', 'Active', '2007-08-30', 0, '2025-2026-2'),
('SH24004', 'John Calvin', 'HUMSS', '11', 'G', 'Protestant', 'University of Zamboanga', 'Male', 'Active', '2007-06-18', 0, '2025-2026-2'),
('SH24005', 'Ulrich Zwingli', 'STEM', '11', 'I', 'Protestant', 'De La Salle University', 'Male', 'Active', '2007-12-22', 0, '2025-2026-2'),
('SH24006', 'Aisha bint Abu Bakr', 'TVL', '11', 'K', 'Islam', 'Ateneo de Zamboanga University', 'Female', 'Active', '2007-09-14', 0, '2025-2026-2'),
('SH24007', 'Khadija bint Khuwaylid', 'ABM', '11', 'M', 'Islam', 'Western Mindanao State University', 'Female', 'Active', '2007-10-03', 0, '2025-2026-2'),
('SH24008', 'Fatimah bint Muhammad', 'TVL', '11', 'B', 'Islam', 'University of the Philippines', 'Female', 'Active', '2007-04-16', 0, '2025-2026-2'),
('SH24009', 'Sancho Jimenez', 'ABM', '11', 'D', 'Catholic', 'University of Zamboanga', 'Male', 'Active', '2007-02-28', 0, '2025-2026-2'),
('SH24010', 'Philipp Capet', 'STEM', '11', 'F', 'Catholic', 'De La Salle University', 'Male', 'Active', '2007-07-25', 0, '2025-2026-2'),
('SH24011', 'John Wycliffe', 'HUMSS', '11', 'H', 'Protestant', 'Ateneo de Zamboanga University', 'Male', 'Active', '2007-01-30', 0, '2025-2026-2'),
('SH24012', 'Ibn Sina', 'STEM', '11', 'J', 'Islam', 'Western Mindanao State University', 'Male', 'Active', '2007-05-17', 0, '2025-2026-2'),
('SH23001', 'Francis Assisi', 'HUMSS', '12', 'B', 'Catholic', 'University of Zamboanga', 'Male', 'Active', '2008-05-23', 0, '2025-2026-2'),
('SH23002', 'Teresa Avila', 'GAS', '12', 'D', 'Catholic', 'De La Salle University', 'Female', 'Active', '2008-02-15', 0, '2025-2026-2'),
('SH23003', 'Martin Luther', 'TVL', '12', 'F', 'Protestant', 'Ateneo de Zamboanga University', 'Male', 'Active', '2008-01-10', 0, '2025-2026-2'),
('SH23004', 'Katharina Luther', 'ABM', '12', 'H', 'Protestant', 'Western Mindanao State University', 'Female', 'Active', '2008-04-05', 0, '2025-2026-2'),
('SH23005', 'Anne Askew', 'GAS', '12', 'J', 'Protestant', 'University of the Philippines', 'Female', 'Active', '2008-03-08', 0, '2025-2026-2'),
('SH23006', 'Ali ibn Abi Talib', 'HUMSS', '12', 'L', 'Islam', 'University of Zamboanga', 'Male', 'Active', '2008-07-19', 0, '2025-2026-2'),
('SH23007', 'Umar ibn Khattab', 'STEM', '12', 'A', 'Islam', 'De La Salle University', 'Male', 'Active', '2008-08-27', 0, '2025-2026-2'),
('SH23008', 'William Normandie', 'HUMSS', '12', 'C', 'Catholic', 'Ateneo de Zamboanga University', 'Male', 'Active', '2008-06-11', 0, '2025-2026-2'),
('SH23009', 'Bertha Savoy', 'GAS', '12', 'E', 'Catholic', 'Western Mindanao State University', 'Female', 'Active', '2008-11-09', 0, '2025-2026-2'),
('SH23010', 'Eleanor Aquitaine', 'TVL', '12', 'G', 'Catholic', 'University of the Philippines', 'Female', 'Active', '2008-12-14', 0, '2025-2026-2'),
('SH23011', 'Saladin Ayyubi', 'ABM', '12', 'I', 'Islam', 'University of Zamboanga', 'Male', 'Active', '2008-09-22', 0, '2025-2026-2'),
('SH23012', 'Joan of Arc', 'GAS', '12', 'K', 'Catholic', 'De La Salle University', 'Female', 'Active', '2008-10-08', 0, '2025-2026-2');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `u_email` varchar(255) NOT NULL,
  `u_password` varchar(255) NOT NULL,
  `u_username` varchar(100) NOT NULL,
  `u_name` varchar(255) NOT NULL,
  `u_department` varchar(100) DEFAULT NULL,
  `u_type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`u_email`, `u_password`, `u_username`, `u_name`, `u_department`, `u_type`, `created_at`) VALUES
('admnadzu@gmail.com', 'google_oauth', 'admin', 'Administrator', 'Administrator', 'Administrator', '2025-08-23 18:14:53'),
('gcoadzu@gmail.com', 'google_oauth', 'gcoadzu', 'GCO Handler', 'GCO', 'GCO', '2026-01-23 23:42:38'),
('infiadzu@gmail.com', 'google_oauth', 'infiadzu', 'INF Handler', 'INF', 'INF', '2025-10-24 20:59:14'),
('opdadzu@gmail.com', 'google_oauth', 'opdadzu', 'OPD Handler', 'OPD', 'OPD', '2025-10-24 20:59:14');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_case_records`
--
ALTER TABLE `tbl_case_records`
  ADD PRIMARY KEY (`cr_case_id`);

--
-- Indexes for table `tbl_counseling_records`
--
ALTER TABLE `tbl_counseling_records`
  ADD PRIMARY KEY (`cor_record_id`);

--
-- Indexes for table `tbl_medical_records`
--
ALTER TABLE `tbl_medical_records`
  ADD PRIMARY KEY (`mr_medical_id`);

--
-- Indexes for table `tbl_notifications`
--
ALTER TABLE `tbl_notifications`
  ADD PRIMARY KEY (`n_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`u_email`),
  ADD UNIQUE KEY `u_username` (`u_username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_case_records`
--
ALTER TABLE `tbl_case_records`
  MODIFY `cr_case_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_counseling_records`
--
ALTER TABLE `tbl_counseling_records`
  MODIFY `cor_record_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_medical_records`
--
ALTER TABLE `tbl_medical_records`
  MODIFY `mr_medical_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_notifications`
--
ALTER TABLE `tbl_notifications`
  MODIFY `n_id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
