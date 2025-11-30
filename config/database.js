// root/config/database.js
const mysql = require("mysql2");

const dbConfig = {
  host: process.env.CCMRHOST || "localhost",
  port: process.env.CCMRPORT || 3306,
  user: process.env.CCMRUSER || "root",
  password: process.env.CCMRPASSWORD || "",
  database: process.env.CCMRDATABASE || "db_ccmr",
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

/*const dbConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database:"db_ccmr",
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};*/



const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("✅ Database connected successfully");
  connection.release();
});

module.exports = {
  pool,
  promisePool
};