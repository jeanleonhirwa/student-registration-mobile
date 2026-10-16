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

## Authentication

Passwords are hashed with **bcrypt** and sessions use **JWT**. Send the token on every protected request:

```
Authorization: Bearer <token>
```

Add to `.env` (a random `JWT_SECRET` is required, the server refuses to start without it):

```env
JWT_SECRET=a_long_random_string
JWT_EXPIRES_IN=7d
```

Roles: `student` (default) and `teacher`. Every response has the shape
`{ "success": true|false, "message"?, "data"?, "errors"? }`; validation failures return `400` with a per-field `errors` object.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | – | Register (`name`, `email`, `password`, `role?`) |
| `POST` | `/api/auth/login` | – | Log in, returns `{ user, token }` |
| `GET` | `/api/auth/me` | any | Current user |
| `GET` | `/api/dashboard` | any | Role-aware summary (courses, pending work, tasks, upcoming deadlines) |
| `GET` / `PUT` | `/api/profile` | any | Read / update profile (`name`, `email`, `phone`, `bio`) |
| `PUT` | `/api/profile/password` | any | Change password (`currentPassword`, `newPassword`) |
| `GET` | `/api/courses?search=&category=&status=all\|enrolled\|available` | any | List/search/filter courses |
| `GET` | `/api/courses/categories` | any | Course categories |
| `GET` | `/api/courses/:id` | any | Course details (+ assignments if enrolled) |
| `POST` / `DELETE` | `/api/courses/:id/enroll` | student | Enroll / unenroll (unenroll only before the course starts) |
| `GET` | `/api/assignments?status=all\|pending\|overdue\|submitted` | any | Student: enrolled courses' work. Teacher: own assignments |
| `GET` | `/api/assignments/upcoming?days=7` | student | Not-yet-submitted work due soon |
| `GET` | `/api/assignments/:id` | any | Details (student: own submission; teacher: all submissions) |
| `POST` | `/api/assignments` | teacher | Create, `multipart/form-data`: `course_id`, `title`, `description?`, `due_date`, plus optional `link_url` and/or `file` as material for students |
| `PUT` / `DELETE` | `/api/assignments/:id` | teacher (owner) | Update (same fields; `remove_file=true` drops the document) / delete |
| `POST` | `/api/assignments/:id/submit` | student | `multipart/form-data`: `link_url` and/or `file` (max 10 MB) |
| `GET` `POST` | `/api/todos` | any | List (`?status=`) / create personal tasks |
| `PUT` `PATCH` `DELETE` | `/api/todos/:id` | owner | Edit, complete, delete a task |

Sample courses are seeded on first start.

## Project Structure

```
Backend/
├── config/
│   ├── db.js          # PostgreSQL connection pool
│   └── init.js        # Database table initialization
├── controllers/       # auth, profile, dashboard, courses, assignments, todos
├── middleware/        # JWT auth + role checks, file upload (multer)
├── routes/            # Express route definitions
├── utils/             # response helpers, validators
├── uploads/           # submitted documents (git-ignored)
├── .env               # Environment variables
├── index.js           # Server entry point
├── package.json
└── README.md
```
