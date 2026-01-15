"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import {
  loginUser,
  signupUser,
  googleLogin,
  createRecaptcha,
  sendOtp,
  verifyOtp,
} from "@/app/lib/firebaseAuth";
import { sendUserToMongo } from "@/app/lib/userSync";
import type { ConfirmationResult } from "firebase/auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<"form" | "otp">("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultCountryCode = "+91";

  /* ------------------ EMAIL/PASSWORD LOGIN ------------------ */
  const handleEmailLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = await loginUser(email, password);

      await sendUserToMongo({
        uid: user.uid,
        email: user.email,
        phone: user.phoneNumber || null,
        name: user.displayName || "",
        provider: "password",
        photo: user.photoURL || null,
        createdAt: new Date().toISOString(),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ SIGNUP (with OTP verification) ------------------ */
  const handleSendOtpForSignup = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!name || !email || !password || !phone)
        throw new Error("All fields are required");

      const recaptcha = createRecaptcha("recaptcha-container");
      const result = await sendOtp(`${defaultCountryCode} ${phone}`, recaptcha);
      setConfirmationResult(result);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSignup = async () => {
    if (!confirmationResult) return;
    setLoading(true);
    setError(null);

    try {
      // Verify OTP first
      const otpUser = await verifyOtp(confirmationResult, otp);

      // Create Firebase Auth account
      const user = await signupUser(email, password, { name });

      // Insert into MongoDB
      try { 
        await sendUserToMongo({
          uid: user.uid,
          name: user.displayName || name,
          email: user.email,
          phone: user.phoneNumber || phone || null,
          provider: "password",
          photo: user.photoURL || null,
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error("Failed to insert user:", err);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "OTP verification/signup failed");
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

      await sendUserToMongo({
        uid: user.uid,
        email: user.email,
        phone: user.phone
          ? user.phone.startsWith("+")
            ? user.phone
            : `${defaultCountryCode} ${user.phone}`
          : null,
        name: user.name || "",
        provider: "google",
        photo: user.photo || null,
        createdAt: new Date().toISOString(),
      });

      if (!user.phone) {
        alert(
          "Google account has no linked phone number. Login with phone OTP not available."
        );
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ PHONE LOGIN ------------------ */
  const handlePhoneLogin = async () => {
    setStep("otp");
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 text-gray-700 transition-all"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
        >
          <X />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">
          {isLogin
            ? step === "otp"
              ? "Phone OTP Login"
              : "Login"
            : step === "otp"
              ? "Verify OTP"
              : "Sign Up"}
        </h2>

        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

        {/* ------------------ FORM ------------------ */}
        {step === "form" && (
          <>
            {!isLogin && (
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
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border-t border-b border-r rounded-r-lg"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mb-3 px-4 py-2 border rounded-lg"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mb-4 px-4 py-2 border rounded-lg"
                />
                <button
                  onClick={handleSendOtpForSignup}
                  disabled={loading}
                  className="w-full py-2 mb-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-lg hover:scale-105 transition"
                >
                  {loading ? "Sending OTP..." : "Send OTP to Verify"}
                </button>
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setStep("form");
                  }}
                  className="w-full py-2 mb-3 border rounded-lg text-center hover:bg-gray-100 transition"
                >
                  Back to Login
                </button>
              </>
            )}

            {isLogin && (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mb-3 px-4 py-2 border rounded-lg"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mb-4 px-4 py-2 border rounded-lg"
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

            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2 mb-3 border rounded-lg flex justify-center items-center gap-2 hover:bg-gray-100 transition"
            >
              Continue with Google
            </button>

            {isLogin && (
              <button
                onClick={handlePhoneLogin}
                className="w-full py-2 mb-3 border rounded-lg flex justify-center items-center gap-2 hover:bg-gray-100 transition"
              >
                Login with Phone OTP
              </button>
            )}

            <p className="mt-2 text-sm text-center">
              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setStep("form");
                }}
                className="text-blue-600 font-medium"
              >
                {isLogin ? "Sign up" : "Login"}
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
              onChange={(e) => setOtp(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={isLogin ? handleVerifyOtpAndSignup : handleVerifyOtpAndSignup}
              disabled={loading}
              className="w-full py-2 mb-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-lg hover:scale-105 transition"
            >
              {loading ? "Verifying OTP..." : "Verify OTP"}
            </button>
          </>
        )}

        <div id="recaptcha-container" />
      </div>
    </div>
  );
};

export default AuthModal;
