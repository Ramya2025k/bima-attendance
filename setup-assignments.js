const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Ramyakutty@2004",
    database: "attendance_dashboard"
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subject_id INT NOT NULL,
      faculty_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date DATE,
      pdf_filename VARCHAR(255) NOT NULL,
      pdf_data LONGBLOB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("assignments table created.");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      assignment_id INT NOT NULL,
      student_id INT NOT NULL,
      pdf_filename VARCHAR(255) NOT NULL,
      pdf_data LONGBLOB NOT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_submission (assignment_id, student_id)
    )
  `);
  console.log("submissions table created.");

  await conn.end();
})();
