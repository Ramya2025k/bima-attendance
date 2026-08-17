import mysql from "mysql2/promise";

export async function getConnection() {
  return mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: false,
    },
  });
}
