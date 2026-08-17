const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Ramyakutty@2004",
    database: "attendance_dashboard"
  });
  const [rows] = await conn.query("DESCRIBE faculty");
  console.log(rows);
  await conn.end();
})();
