import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../utils/api";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("Sending direct registration payload for:", email);

      // 1. Backend ko call kiya
      const response = await api.post("/auth/register", {
        username: name, // Ensure aapka name state ka variable yahan 'name' hi ho
        email: email.trim().toLowerCase(),
        password,
      });

      // Debugging: Frontend console me check karne ke liye ki kya response aaya
      console.log("SUCCESS RESPONSE FROM BACKEND:", response.data);

      const data = response.data;

      // 2. ✨ FIXED: Pehle direct localStorage me token aur user data safe kar dete hain
      if (data && data.token) {
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("userInfo", JSON.stringify(data.user));
        
        // 3. AuthContext ka login method execute karein (Safe check ke sath)
        if (typeof login === 'function') {
            login(data); 
        }
        
        // Success notification
        toast.success(data.message || "Registration Successful!");

        // 4. ✨ FORCE BYPASS: React loops ko todne ke liye location use karenge
        setTimeout(() => {
            window.location.href = "/dashboard";
        }, 800);
      } else {
        // Agar response me token hi nahi aaya kisi vajah se
        throw new Error("Token missing in response");
      }

    } catch (error) {
      console.error("REGISTER FRONTEND SYSTEM CRASH:", error);
      console.log("Error Response object from backend:", error.response?.data);
      
      // ✨ FIXED: Agar backend response success (201) de raha hai par catch me aa gaya, toh user ko batayein
      const backendMessage = error.response?.data?.message;
      toast.error(backendMessage || "Registration failed. Please check inputs or try again.");
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;