import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the backend lives. Order of preference:
 * 1. EXPO_PUBLIC_API_URL (set it if the backend runs on another machine)
 * 2. The computer running `expo start` — its address is read from the Expo dev server, so it
 *    keeps working when your Wi-Fi IP changes (phones/emulators on the same network)
 * 3. Web: localhost
 */
const API_PORT = 5000;

function devServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  return typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
}

export const BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web'
    ? `http://localhost:${API_PORT}`
    : `http://${devServerHost() ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')}:${API_PORT}`);

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};
/** Called when the server rejects the token (expired/invalid) so the app can log out. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not connect to the server. Make sure the backend is running.', 0);
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {}

  if (!response.ok || !json?.success) {
    if (response.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(json?.message ?? 'Something went wrong', response.status, json?.errors);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

// ─── Types ───────────────────────────────────────────────────
export type Role = 'student' | 'teacher';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  bio: string | null;
  created_at: string;
};

export type AuthResult = { user: User; token: string };

export type Course = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  category: string;
  instructor: string | null;
  teacher_id: number | null;
  /** The logged-in teacher teaches this course */
  mine: boolean;
  start_date: string;
  end_date: string | null;
  started: boolean;
  ended: boolean;
  enrolled: boolean;
  enrolled_count: number;
  assignment_count: number;
};

export type CourseDetail = Course & {
  can_unenroll: boolean;
  assignments: { id: number; title: string; due_date: string; is_overdue: boolean; submitted: boolean }[];
};

export type Submission = {
  id: number;
  link_url: string | null;
  file_name: string | null;
  file_url: string | null;
  submitted_at: string;
  is_late: boolean;
  student_id?: number;
  student_name?: string;
};

export type Assignment = {
  id: number;
  course_id: number;
  course_title: string;
  course_code: string;
  title: string;
  description: string | null;
  due_date: string;
  is_overdue: boolean;
  submitted: boolean | null;
  submission_count: number;
};

export type AssignmentDetail = Omit<Assignment, 'submitted' | 'submission_count'> & {
  /** Material attached by the teacher */
  link_url: string | null;
  file_name: string | null;
  file_url: string | null;
  submission?: Submission | null;
  submissions?: Submission[];
};

export type UpcomingAssignment = {
  id: number;
  title: string;
  due_date: string;
  course_title: string;
  course_code: string;
  submission_count?: number;
};

export type Todo = {
  id: number;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed: boolean;
};

export type Dashboard =
  | {
      role: 'student';
      profile: User;
      stats: {
        enrolled_courses: number;
        pending_assignments: number;
        overdue_assignments: number;
        submitted_assignments: number;
        completed_tasks: number;
        open_tasks: number;
      };
      upcoming_assignments: UpcomingAssignment[];
      my_courses: { id: number; code: string; title: string; start_date: string; started: boolean }[];
    }
  | {
      role: 'teacher';
      profile: User;
      stats: { courses_taught: number; assignments_created: number; submissions_received: number };
      upcoming_assignments: UpcomingAssignment[];
    };
