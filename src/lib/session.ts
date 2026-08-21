import { SessionOptions } from "iron-session";

export interface SessionData {
  dek?: string; // base64-encoded unwrapped data-encryption key
  role?: "admin" | "respondent";
}

const SESSION_MAX_AGE = 60 * 60 * 2; // 2 hours, in seconds
// const SESSION_MAX_AGE = 10; // 10 seconds for testing

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "pq_session",
  ttl: SESSION_MAX_AGE,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  },
};
