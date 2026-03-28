"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { EmailAuthProvider, linkWithCredential, deleteUser, updateProfile } from "firebase/auth";
import {
  loginUser,
  googleLogin,
  createRecaptcha,
  sendOtp,
  confirmOtp,
} from "@/app/lib/firebaseAuth";
import { sendUserToMongo } from "@/app/lib/userSync";
import type { ConfirmationResult } from "firebase/auth";
import {
  isValidE164,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  normalizeOtp,
  normalizePhoneE164,
} from "@/app/lib/validation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Flow = "login_email" | "login_phone" | "signup";
type Step = "form" | "otp";

const AuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [flow, setFlow] = useState<Flow>("login_email");
  const [step, setStep] = useState<Step>("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [pendingSignup, setPendingSignup] = useState<{
    name: string;
    email: string;
    password: string;
    phoneE164: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultCountryCode = "+91";

  const closeAndReset = () => {
    setStep("form");
    setConfirmationResult(null);
    setOtp("");
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setPendingSignup(null);
    setError(null);
    setLoading(false);
    setFlow("login_email");
    onClose();
  };

  const firebaseAuthErrorMessage = (err: any) => {
    const code = err?.code as string | undefined;
    if (code === "auth/email-already-in-use") {
      return "Email already exists. Please login.";
    }
    if (
      code === "auth/credential-already-in-use" ||
      code === "auth/account-exists-with-different-credential"
    ) {
      return "This phone number is already linked to another account. Use a different phone number.";
    }
    if (code === "auth/invalid-phone-number") {
      return "Enter a valid phone number.";
    }
    if (code === "auth/invalid-verification-code") {
      return "Invalid OTP. Please try again.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many attempts. Please wait and try again.";
    }
    return err?.message as string | undefined;
  };

  const checkEmailExistsInDb = async (normalizedEmail: string) => {
    const res = await fetch(
      `/api/users?exists=1&email=${encodeURIComponent(normalizedEmail)}`,
      { method: "GET" }
    );
    const data = await res.json().catch(() => ({}));

    if (res.status === 400) {
      throw new Error((data as any)?.error || "Enter a valid email");
    }
    if (!res.ok) {
      throw new Error("Unable to verify email right now. Try again.");
    }

    return Boolean((data as any)?.exists);
  };

  /* ------------------ EMAIL/PASSWORD LOGIN ------------------ */
  const handleEmailLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) throw new Error("Enter a valid email");
      if (!password.trim()) throw new Error("Password is required");

      const user = await loginUser(normalizedEmail, password);

      await sendUserToMongo({
        uid: user.uid,
        email: user.email,
        phone: user.phoneNumber || null,
        name: user.displayName || "",
        provider: "password",
        photo: user.photoURL || null,
        createdAt: new Date().toISOString(),
      });

      closeAndReset();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ SIGNUP (verify phone OTP first, then link email/password) ------------------ */
  const handleStartSignup = async () => {
    setLoading(true);
    setError(null);

    try {
      const normalizedName = normalizeName(name);
      const normalizedEmail = normalizeEmail(email);
      const phoneDigits = phone.replace(/\D/g, "");
      const normalizedPhone = normalizePhoneE164(phoneDigits, defaultCountryCode);

      if (!normalizedName) throw new Error("Full name is required");
      if (!normalizedEmail) throw new Error("Email is required");
      if (password.trim().length < 8)
        throw new Error("Password must be at least 8 characters");
      if (phoneDigits.length !== 10) throw new Error("Phone number must be 10 digits");
      if (!isValidE164(normalizedPhone)) throw new Error("Enter a valid phone number");

      const emailExists = await checkEmailExistsInDb(normalizedEmail);
      if (emailExists) throw new Error("Email already exists. Please login.");

      const recaptcha = createRecaptcha("recaptcha-container");
      const result = await sendOtp(normalizedPhone, recaptcha);
      setConfirmationResult(result);
      setPendingSignup({
        name: normalizedName,
        email: normalizedEmail,
        password,
        phoneE164: normalizedPhone,
      });
      setStep("otp");
    } catch (err: any) {
      setError(
        firebaseAuthErrorMessage(err) ||
          err?.message ||
          "Failed to send OTP. Refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndFinalizeSignup = async () => {
    if (!confirmationResult) return;
    setLoading(true);
    setError(null);

    try {
      if (!pendingSignup) throw new Error("Signup data missing. Please try again.");
      const normalizedOtp = normalizeOtp(otp);
      if (normalizedOtp.length < 4) throw new Error("Enter a valid OTP");

      // This signs in the user with the verified phone number
      const phoneUser = await confirmOtp(confirmationResult, normalizedOtp);

      try {
        const credential = EmailAuthProvider.credential(
          pendingSignup.email,
          pendingSignup.password
        );
        const res = await linkWithCredential(phoneUser, credential);

        if (!res.user.displayName) {
          await updateProfile(res.user, { displayName: pendingSignup.name });
        }

        await sendUserToMongo({
          uid: res.user.uid,
          name: res.user.displayName || pendingSignup.name,
          email: res.user.email,
          phone: res.user.phoneNumber || pendingSignup.phoneE164,
          provider: "password",
          photo: res.user.photoURL || null,
          createdAt: new Date().toISOString(),
        });

        closeAndReset();
      } catch (err: any) {
        // Best-effort cleanup: avoid leaving a phone-only account around if linking failed
        try {
          await deleteUser(phoneUser);
        } catch {
          // ignore
        }
        throw err;
      }
    } catch (err: any) {
      setError(firebaseAuthErrorMessage(err) || err.message || "OTP verification/signup failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ GOOGLE LOGIN ------------------ */
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = await googleLogin();

      // Only insert/update DB after phone is present.
      // If missing, PhoneRequiredModal will force-link phone and then write to DB.
      if (user.phone) {
        await sendUserToMongo({
          uid: user.uid,
          email: user.email,
          phone: normalizePhoneE164(user.phone, defaultCountryCode),
          name: user.name || "",
          provider: "google",
          photo: user.photo || null,
          createdAt: new Date().toISOString(),
        });
      }

      closeAndReset();
    } catch (err: any) {
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ PHONE LOGIN ------------------ */
  const handleStartPhoneLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10) throw new Error("Phone number must be 10 digits");
      const normalizedPhone = normalizePhoneE164(phoneDigits, defaultCountryCode);
      if (!isValidE164(normalizedPhone))
        throw new Error("Enter a valid phone number");

      const recaptcha = createRecaptcha("recaptcha-container");
      const result = await sendOtp(normalizedPhone, recaptcha);
      setConfirmationResult(result);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneLogin = async () => {
    if (!confirmationResult) return;
    setLoading(true);
    setError(null);

    try {
      const normalizedOtp = normalizeOtp(otp);
      if (normalizedOtp.length < 4) throw new Error("Enter a valid OTP");

      const signedInUser = await confirmOtp(confirmationResult, normalizedOtp);

      await sendUserToMongo({
        uid: signedInUser.uid,
        email: signedInUser.email,
        phone: signedInUser.phoneNumber || normalizePhoneE164(phone, defaultCountryCode),
        name: signedInUser.displayName || "",
        provider: "phone",
        photo: signedInUser.photoURL || null,
        createdAt: new Date().toISOString(),
      });

      closeAndReset();
    } catch (err: any) {
      setError(firebaseAuthErrorMessage(err) || err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 text-gray-700 transition-all max-h-[90vh] overflow-y-auto"
      >
        {/* Close */}
        <button
          onClick={closeAndReset}
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
        >
          <X />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">
          {flow === "signup"
            ? step === "otp"
              ? "Verify Phone OTP"
              : "Sign Up"
            : flow === "login_phone"
              ? step === "otp"
                ? "Phone OTP Login"
                : "Login with Phone"
              : "Login"}
        </h2>

        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

        {/* ------------------ FORM ------------------ */}
        {step === "form" && (
          <>
            {flow === "signup" && (
              <>
                <input
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mb-3 px-4 py-2 border rounded-lg"
                />
                <div className="flex items-center mb-3">
                  <span className="px-3 py-2 bg-gray-200 border rounded-l-lg select-none">
                    {defaultCountryCode}
                  </span>
                  <input
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2 border-t border-b border-r rounded-r-lg"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mb-3 px-4 py-2 border rounded-lg"
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mb-4 px-4 py-2 border rounded-lg"
                  autoComplete="new-password"
                />
                <button
                  onClick={handleStartSignup}
                  disabled={loading}
                  className="w-full py-2 mb-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-lg hover:scale-105 transition"
                >
                  {loading ? "Sending OTP..." : "Send OTP to Verify Phone"}
                </button>
                <button
                  onClick={() => {
                    setStep("form");
                    setFlow("login_email");
                  }}
                  className="w-full py-2 mb-3 border rounded-lg text-center hover:bg-gray-100 transition"
                >
                  Back to Login
                </button>
              </>
            )}

            {flow === "login_email" && (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mb-3 px-4 py-2 border rounded-lg"
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mb-4 px-4 py-2 border rounded-lg"
                  autoComplete="current-password"
                />
                <button
                  onClick={handleEmailLogin}
                  disabled={loading}
                  className="w-full py-2 mb-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition"
                >
                  {loading ? "Please wait..." : "Login"}
                </button>
              </>
            )}

            {flow === "login_phone" && (
              <>
                <div className="flex items-center mb-3">
                  <span className="px-3 py-2 bg-gray-200 border rounded-l-lg select-none">
                    {defaultCountryCode}
                  </span>
                  <input
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2 border-t border-b border-r rounded-r-lg"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                  />
                </div>
                <button
                  onClick={handleStartPhoneLogin}
                  disabled={loading}
                  className="w-full py-2 mb-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-lg hover:scale-105 transition"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
                <button
                  onClick={() => {
                    setFlow("login_email");
                    setStep("form");
                    setError(null);
                  }}
                  className="w-full py-2 mb-3 border rounded-lg text-center hover:bg-gray-100 transition"
                >
                  Back to Email Login
                </button>
              </>
            )}

            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2 mb-3 border rounded-lg flex justify-center items-center gap-2 hover:bg-gray-100 transition"
            >
              Continue with Google
            </button>

            {flow === "login_email" && (
              <button
                onClick={() => {
                  setFlow("login_phone");
                  setStep("form");
                  setError(null);
                }}
                className="w-full py-2 mb-3 border rounded-lg flex justify-center items-center gap-2 hover:bg-gray-100 transition"
              >
                Login with Phone OTP
              </button>
            )}

            <p className="mt-2 text-sm text-center">
              {flow === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setStep("form");
                  setError(null);
                  setConfirmationResult(null);
                  setOtp("");
                  setFlow(flow === "signup" ? "login_email" : "signup");
                }}
                className="text-blue-600 font-medium"
              >
                {flow === "signup" ? "Login" : "Sign up"}
              </button>
            </p>
          </>
        )}

        {/* ------------------ OTP ------------------ */}
        {step === "otp" && (
          <>
            <input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(normalizeOtp(e.target.value))}
              className="w-full mb-3 px-4 py-2 border rounded-lg"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button
              onClick={flow === "login_phone" ? handleVerifyPhoneLogin : handleVerifyOtpAndFinalizeSignup}
              disabled={loading}
              className="w-full py-2 mb-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-lg hover:scale-105 transition"
            >
              {loading ? "Verifying OTP..." : "Verify OTP"}
            </button>
            <button
              onClick={() => {
                setStep("form");
                setConfirmationResult(null);
                setOtp("");
                setError(null);
              }}
              disabled={loading}
              className="w-full py-2 border rounded-lg text-center hover:bg-gray-100 transition"
            >
              Back
            </button>
          </>
        )}

        <div id="recaptcha-container" />
      </div>
    </div>
  );
};

export default AuthModal;
