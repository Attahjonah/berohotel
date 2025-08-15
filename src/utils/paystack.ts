// utils/paystack.ts
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set in environment variables");
}

// Create an Axios instance for Paystack API calls
const paystackAPI = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export const initializePayment = async (email: string, amount: number, metadata: any = {}) => {
  try {
    // Paystack expects amount in kobo (NGN)
    const response = await paystackAPI.post("/transaction/initialize", {
      email,
      amount: amount * 100, // convert to kobo
      metadata,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error initializing Paystack payment:", error?.response?.data || error.message);
    throw new Error("Failed to initialize Paystack payment");
  }
};

export const verifyPayment = async (reference: string) => {
  try {
    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    return response.data;
  } catch (error: any) {
    console.error("Error verifying Paystack payment:", error?.response?.data || error.message);
    throw new Error("Failed to verify Paystack payment");
  }
};
