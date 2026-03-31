import { RecaptchaVerifier } from "firebase/auth";

declare global {
  interface RazorpayCheckoutResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }

  interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string };
    modal?: { ondismiss?: () => void };
    handler: (response: RazorpayCheckoutResponse) => void;
  }

  interface RazorpayInstance {
    on: (event: string, callback: (response: any) => void) => void;
    open: () => void;
  }

  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

export {};
