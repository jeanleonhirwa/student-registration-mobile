const pool = require('./db');

/**
 * Initialize the database by creating required tables if they don't exist.
 * Called once on server startup.
 */
async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      course VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Students table is ready');
  } catch (error) {
    console.error('❌ Error creating students table:', error.message);
    throw error;
  }
}

module.exports = { initializeDatabase };
