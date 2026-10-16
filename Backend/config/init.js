const pool = require('./db');

/**
 * Initialize the database by creating required tables if they don't exist
 * and seeding a few sample courses. Called once on server startup.
 */
async function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
      phone VARCHAR(30),
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      instructor VARCHAR(255),
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Teacher's attached material (link and/or document)
    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS link_url TEXT;
    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_path TEXT;
    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_name TEXT;

    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      link_url TEXT,
      file_path TEXT,
      file_name TEXT,
      submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      notes TEXT,
      due_date TIMESTAMPTZ,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(schema);
    console.log('✅ Database tables are ready');
    await seedCourses();
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  }
}

/** Seed sample courses (only when the courses table is empty). */
async function seedCourses() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM courses');
  if (rows[0].count > 0) return;

  // Start dates are relative to today so there are both open and already-started courses.
  const courses = [
    ['CS101', 'Introduction to Programming', 'Learn the fundamentals of programming with JavaScript.', 'Computer Science', 'Dr. Alice Mukamana', 14, 120],
    ['CS201', 'Data Structures', 'Arrays, lists, trees, graphs and their algorithms.', 'Computer Science', 'Prof. Jean Habimana', 30, 150],
    ['IT110', 'Web Development', 'Build modern websites with HTML, CSS and React.', 'Information Technology', 'Ms. Grace Uwase', 7, 100],
    ['IT220', 'Mobile App Development', 'Create cross-platform apps with React Native and Expo.', 'Information Technology', 'Mr. Eric Nshimiye', 21, 130],
    ['MA101', 'Calculus I', 'Limits, derivatives and integrals.', 'Mathematics', 'Dr. Paul Kagame Jr.', -20, 90],
    ['BU105', 'Principles of Management', 'Introduction to planning, organising and leading.', 'Business', 'Mrs. Diane Ingabire', -10, 80],
    ['EN102', 'Technical Writing', 'Write clear reports, documentation and emails.', 'Languages', 'Ms. Sandra Mutesi', 10, 70],
  ];

  for (const [code, title, description, category, instructor, startOffset, endOffset] of courses) {
    await pool.query(
      `INSERT INTO courses (code, title, description, category, instructor, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + $6::int, CURRENT_DATE + $7::int)
       ON CONFLICT (code) DO NOTHING`,
      [code, title, description, category, instructor, startOffset, endOffset]
    );
  }
  console.log('✅ Sample courses seeded');
}

module.exports = { initializeDatabase };
