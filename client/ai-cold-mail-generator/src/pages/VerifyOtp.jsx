import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const VerifyOtp = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Custom function to safely read email parameters from URL query strings or state variables
  const useQuery = () => new URLSearchParams(useLocation().search);
  const query = useQuery();

  // ✨ FIXED: Removed 'userId' dependency. Using a robust triple-fallback architecture for 'email'
  const email = 
    query.get("email") || 
    location.state?.email || 
    localStorage.getItem("pendingVerifyEmail") || 
    "";

  // ✨ FIXED: Checking for 'email' instead of 'userId'. If no email is present, push back to signup
  useEffect(() => {
    if (!email) {
      toast.error("Please register first to verify OTP");
      navigate("/signup");
    }
  }, [email, navigate]);

  ////////// Back to landing page
  const handleBack = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("pendingVerifyEmail");
    navigate("/");
  };

  ///////////// resend otp fun
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    try {
        const { data } = await api.post('/auth/resend-otp', {
            email
        });

        toast.success(data.message || 'OTP sent again!');
        setResendCooldown(60);

        const timer = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

    } catch (error) {
        toast.error(
            error.response?.data?.message || 'Failed to resend OTP'
        );
    } finally {
        setResendLoading(false);
    }
  };

  ////////////////// Submit Handle Verification
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", {
        email,
        otp,
      });
      
      // Save data locally and clear the temporary pending email string
      login(data);
      localStorage.removeItem("pendingVerifyEmail");
      
      toast.success("Email verified successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We sent a code to{" "}
          <span className="font-medium text-gray-900">{email || "your email"}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 text-center mb-2">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
              />
            </div>

            {/* Resend OTP button mapping configuration */}
            <div className="text-center">
                <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading || resendCooldown > 0}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    {resendLoading
                        ? 'Sending...'
                        : resendCooldown > 0
                            ? `Resend OTP in ${resendCooldown}s`
                            : 'Resend OTP'}
                </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
