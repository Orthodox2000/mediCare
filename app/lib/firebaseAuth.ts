import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User,
  updateProfile,
  linkWithPhoneNumber,
} from "firebase/auth";
import { auth } from "./firebase";

/* ───────────────────────── EMAIL ───────────────────────── */

/** LOGIN */
export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  const res = await signInWithEmailAndPassword(auth, email, password);
  return res.user;
};

/** SIGNUP (with optional name) */
export const signupUser = async (
  email: string,
  password: string,
  extra?: { name: string }
): Promise<User> => {
  const res = await createUserWithEmailAndPassword(auth, email, password);

  if (extra?.name) {
    await updateProfile(res.user, { displayName: extra.name });
  }

  return res.user;
};

/* ───────────────────────── GOOGLE ───────────────────────── */
export const googleLogin = async (): Promise<{
  uid: string;
  email: string | null;
  name: string;
  photo: string | null;
  phone: string | null;
  provider: "google";
}> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const res = await signInWithPopup(auth, provider);
  const user = res.user;

  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName ?? "Google User",
    photo: user.photoURL ?? null,
    phone: user.phoneNumber ?? null, // only linked phones
    provider: "google",
  };
};

/* ───────────────────────── PHONE (OTP) ───────────────────────── */

/** Create Recaptcha */
export const createRecaptcha = (containerId: string): RecaptchaVerifier => {
  if (typeof window !== "undefined" && window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    window.recaptchaVerifier = undefined;
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });

  if (typeof window !== "undefined") {
    window.recaptchaVerifier = verifier;
  }

  return verifier;
};

/** Send OTP */
export const sendOtp = async (
  phoneNumber: string,
  recaptcha: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  return await signInWithPhoneNumber(auth, phoneNumber, recaptcha);
};

/** Send OTP to LINK a phone to an existing signed-in user */
export const sendOtpToLinkPhone = async (
  user: User,
  phoneNumber: string,
  recaptcha: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  return await linkWithPhoneNumber(user, phoneNumber, recaptcha);
};

/** Confirm OTP (sign-in OR link) */
export const confirmOtp = async (
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<User> => {
  const res = await confirmationResult.confirm(otp);
  return res.user;
};

/* ───────────────────────── LOGOUT ───────────────────────── */
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};
