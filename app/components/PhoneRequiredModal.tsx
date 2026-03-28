"use client";

import React, { useMemo, useState } from "react";
import type { ConfirmationResult } from "firebase/auth";
import {
  confirmOtp,
  createRecaptcha,
  logoutUser,
  sendOtpToLinkPhone,
} from "@/app/lib/firebaseAuth";
import { useAuth } from "@/app/lib/AuthContext";
import { sendUserToMongo } from "@/app/lib/userSync";
import { isValidE164, normalizeOtp, normalizePhoneE164 } from "@/app/lib/validation";

const DEFAULT_COUNTRY_CODE = "+91";

const needsPhone = (user: any) => {
  const providers: string[] =
    user?.providerData?.map((p: any) => p?.providerId).filter(Boolean) ?? [];
  return providers.includes("google.com") && !user?.phoneNumber;
};

export default function PhoneRequiredModal() {
  const { user, loading } = useAuth();
  const isOpen = useMemo(() => {
    if (loading) return false;
    if (!user) return false;
    return needsPhone(user);
  }, [user, loading]);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const firebaseAuthErrorMessage = (err: any) => {
    const code = err?.code as string | undefined;
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

  const sendLinkOtp = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10) throw new Error("Phone number must be 10 digits");
      const normalizedPhone = normalizePhoneE164(phoneDigits, DEFAULT_COUNTRY_CODE);
      if (!isValidE164(normalizedPhone)) throw new Error("Enter a valid phone number");

      const recaptcha = createRecaptcha("phone-required-recaptcha");
      const result = await sendOtpToLinkPhone(user, normalizedPhone, recaptcha);
      setConfirmationResult(result);
      setStep("otp");
    } catch (err: any) {
      setError(
        firebaseAuthErrorMessage(err) || err?.message || "Failed to send OTP. Try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyLinkOtp = async () => {
    if (!confirmationResult) return;
    setBusy(true);
    setError(null);
    try {
      const normalizedOtp = normalizeOtp(otp);
      if (normalizedOtp.length < 4) throw new Error("Enter a valid OTP");

      const linkedUser = await confirmOtp(confirmationResult, normalizedOtp);

      await sendUserToMongo({
        uid: linkedUser.uid,
        email: linkedUser.email,
        phone:
          linkedUser.phoneNumber || normalizePhoneE164(phone, DEFAULT_COUNTRY_CODE),
        name: linkedUser.displayName || "User",
        provider: "google",
        photo: linkedUser.photoURL || null,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(
        firebaseAuthErrorMessage(err) || err?.message || "OTP verification failed"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 text-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2 text-center">Verify Phone Number</h2>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Your Google sign-in did not include a phone number. Add and verify it to
          continue.
        </p>

        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

        {step === "form" && (
          <>
            <div className="flex items-center mb-3">
              <span className="px-3 py-2 bg-gray-200 border rounded-l-lg select-none">
                {DEFAULT_COUNTRY_CODE}
              </span>
              <input
                inputMode="numeric"
                autoComplete="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-2 border-t border-b border-r rounded-r-lg"
                maxLength={10}
              />
            </div>
            <button
              onClick={sendLinkOtp}
              disabled={busy}
              className="w-full py-2 mb-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-lg hover:scale-105 transition"
            >
              {busy ? "Sending OTP..." : "Send OTP"}
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await logoutUser();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="w-full py-2 border rounded-lg text-center hover:bg-gray-100 transition"
            >
              Logout
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(normalizeOtp(e.target.value))}
              className="w-full mb-3 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={verifyLinkOtp}
              disabled={busy}
              className="w-full py-2 mb-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-lg hover:scale-105 transition"
            >
              {busy ? "Verifying..." : "Verify & Continue"}
            </button>
            <button
              onClick={() => {
                setStep("form");
                setOtp("");
                setConfirmationResult(null);
              }}
              disabled={busy}
              className="w-full py-2 border rounded-lg text-center hover:bg-gray-100 transition"
            >
              Change phone number
            </button>
          </>
        )}

        <div id="phone-required-recaptcha" />
      </div>
    </div>
  );
}
