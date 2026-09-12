import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        console.log("Sending login payload for:", email);

        // API Request mapping
        const { data } = await api.post("/auth/login", { 
            email: email.trim().toLowerCase(), 
            password: password 
        });

        console.log("Login API success response:", data);

        // 1. Manually token aur user info browser memory me safe kar dena
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("userInfo", JSON.stringify(data.user));

        // 2. AuthContext login callback execute karna
        if (login) {
            login(data); 
        }

        toast.success(data.message || "Welcome back! Login Successful.");
        
        // 3. ✨ FORCE BYPASS: React router loop ko todne ke liye location use karenge
        setTimeout(() => {
            window.location.href = "/dashboard";
        }, 600);

    } catch (error) {
        console.error("LOGIN FRONTEND SYSTEM ERROR:", error);
        const errorMsg = error.response?.data?.message || "Invalid Email or Password";
        toast.error(errorMsg);
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
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
                            <label className="block text-sm font-medium text-gray-700">Password</label>
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
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-600">Don't have an account? </span>
                        <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;