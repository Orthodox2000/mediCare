import crypto from "crypto";
import type { NextRequest } from "next/server";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";
const EXPLICIT_TOKEN_SECRET = (process.env.ADMIN_TOKEN_SECRET || "").trim();
const FALLBACK_TOKEN_SECRET = crypto
  .createHash("sha256")
  .update(`${process.cwd()}|medical-app|admin-token`)
  .digest("hex");
const TOKEN_SECRET = EXPLICIT_TOKEN_SECRET || FALLBACK_TOKEN_SECRET;

export const getDefaultAdminCredentials = () => ({
  username: DEFAULT_ADMIN_USERNAME,
  password: DEFAULT_ADMIN_PASSWORD,
});

const base64UrlEncode = (buf: Buffer) =>
  buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (str: string) => {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const normalized = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
};

export type AdminSettingsDoc = {
  _id: "singleton";
  username: string;
  passwordHash: string;
  salt: string;
  iterations: number;
  updatedAt: Date;
};

export const hashPassword = (password: string, salt?: string) => {
  const usedSalt = salt || crypto.randomBytes(16).toString("hex");
  const iterations = 120_000;
  const derived = crypto.pbkdf2Sync(password, usedSalt, iterations, 32, "sha256");
  return {
    salt: usedSalt,
    iterations,
    passwordHash: derived.toString("hex"),
  };
};

export const verifyPassword = (password: string, doc: Pick<AdminSettingsDoc, "salt" | "iterations" | "passwordHash">) => {
  const derived = crypto.pbkdf2Sync(password, doc.salt, doc.iterations, 32, "sha256");
  const a = Buffer.from(doc.passwordHash, "hex");
  const b = Buffer.from(derived.toString("hex"), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

type AdminTokenPayload = {
  sub: "admin";
  username: string;
  iat: number;
  exp: number;
};

export const signAdminToken = (username: string, ttlSeconds = 60 * 60) => {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    sub: "admin",
    username,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest();
  return `${body}.${base64UrlEncode(sig)}`;
};

export const verifyAdminToken = (token: string): AdminTokenPayload | null => {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest();
  const actual = base64UrlDecode(sig);
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(expected, actual)) return null;
  const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as AdminTokenPayload;
  if (payload?.sub !== "admin") return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
};

export const getAdminAuth = (req: NextRequest) => {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyAdminToken(match[1]);
};
