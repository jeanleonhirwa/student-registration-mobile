# Student Registration Backend

## Prerequisites

- **Node.js** (v18 or later)
- **PostgreSQL** (v18 installed locally)

## Setup

### 1. Start PostgreSQL Service

Open a terminal **as Administrator** and run:

```powershell
net start postgresql-x64-18
```

### 2. Create the Database

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE student_registration;"
```

> Enter your PostgreSQL password when prompted.

### 3. Configure Environment Variables

Edit the `.env` file and set your PostgreSQL password:

```env
DB_PASSWORD=your_actual_postgres_password
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Server

```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

The server runs at `http://localhost:5000`

## API Endpoints

| Method   | Endpoint              | Description              |
|----------|-----------------------|--------------------------|
| `GET`    | `/`                   | Health check             |
| `POST`   | `/api/students`       | Register a new student   |
| `GET`    | `/api/students`       | Get all students         |
| `GET`    | `/api/students/:id`   | Get student by ID        |
| `PUT`    | `/api/students/:id`   | Update a student         |
| `DELETE` | `/api/students/:id`   | Delete a student         |

### Example Request – Register Student

```json
POST /api/students
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "course": "Computer Science"
}
```

### Example Response

```json
{
  "success": true,
  "message": "Student registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "course": "Computer Science",
    "created_at": "2026-10-09T13:30:00.000Z",
    "updated_at": "2026-10-09T13:30:00.000Z"
  }
}
```

## Project Structure

```
Backend/
├── config/
│   ├── db.js          # PostgreSQL connection pool
│   └── init.js        # Database table initialization
├── controllers/
│   └── studentController.js   # CRUD logic
├── routes/
│   └── studentRoutes.js       # Express route definitions
├── .env               # Environment variables
├── index.js           # Server entry point
├── package.json
└── README.md
```
