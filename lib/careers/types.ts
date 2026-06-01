/** Shared types for the careers / hiring feature. */

export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship";

export type JobStatus = "open" | "closed" | "draft";

/** A job posting (managed in the admin panel, shown on /career). */
export interface JobOpening {
  id: string;
  slug: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  experience_level: string | null;
  description_md: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  salary_range: string | null;
  positions: number;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus =
  | "new"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "rejected"
  | "hired";

export type ParseStatus = "pending" | "done" | "error";

/** Structured profile extracted from a resume by Gemini. */
export interface ParsedResume {
  plain_text: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_title: string | null;
  total_experience_years: number | null;
  skills: string[];
  education: string[];
  summary: string | null;
}

/** Row inserted by the public /api/careers/apply route. */
export interface JobApplicationInsert {
  job_id: string | null;
  job_title: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  years_experience: number | null;
  cover_note: string | null;
  resume_path: string;
  resume_filename: string | null;
  resume_mime: string | null;
  consent_given: boolean;
  consent_at: string | null;
}
