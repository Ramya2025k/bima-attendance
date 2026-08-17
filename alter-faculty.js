const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Ramyakutty@2004",
    database: "attendance_dashboard"
  });
  await conn.query("ALTER TABLE faculty MODIFY email VARCHAR(100) NULL");
  console.log("email column is now nullable.");
  await conn.end();
})();
