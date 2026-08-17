import mysql from "mysql2/promise";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function getConnection() {
  const conn = await pool.getConnection();
  conn.end = async () => {
    conn.release();
  };
  return conn;
}
