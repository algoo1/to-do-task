import React, { useState } from 'react';
import { Button } from './Button';
import { User, Lock, ArrowRight, Loader2, UserPlus, Mail, AlertTriangle } from 'lucide-react';
import { login, register } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase';

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                // Try to register and auto-login
                const result = await register(email, username, password);
                
                if (result.success && result.autoLogin) {
                    setSuccessMessage('Account created! Entering dashboard...');
                    setTimeout(() => {
                        onLogin();
                    }, 800);
                } else if (!result.success) {
                    setError(result.message || 'Registration failed.');
                }
            } else {
                const result = await login(username, password);
                if (result.success) {
                    onLogin();
                } else {
                    setError(result.message || 'Invalid credentials.');
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setError('');
        setSuccessMessage('');
        setUsername('');
        setPassword('');
        setEmail('');
    };

    // Helper to check if the error is configuration related
    const isConfigError = error.includes('API key') || error.includes('Configuration Error') || !isSupabaseConfigured;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className={`p-8 text-center transition-colors duration-300 ${isRegistering ? 'bg-slate-800' : 'bg-indigo-600'}`}>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white/20 text-white mb-4 backdrop-blur-sm">
                        <span className="text-3xl font-bold">T</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        {isRegistering ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className={`${isRegistering ? 'text-slate-300' : 'text-indigo-100'} mt-2`}>
                        {isRegistering ? 'Get instant access - No email activation required' : 'Sign in to TaskFlow Analytics'}
                    </p>
                </div>

                <div className="p-8">
                    {/* Config Error Alert */}
                    {isConfigError && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                             <div className="flex items-center gap-2 font-bold mb-2 text-amber-900">
                                <AlertTriangle size={16} /> 
                                Setup Required
                             </div>
                             <p className="mb-2">Your Supabase API Key is missing or invalid.</p>
                             <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                                <li>Go to your Vercel Dashboard.</li>
                                <li>Navigate to <strong>Settings</strong> &gt; <strong>Environment Variables</strong>.</li>
                                <li>Add Key: <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_KEY</code></li>
                                <li>Paste your Supabase <strong>anon/public</strong> key.</li>
                                <li>Redeploy your project.</li>
                             </ul>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {successMessage && (
                            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2 border border-green-200 animate-in fade-in slide-in-from-top-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                {successMessage}
                            </div>
                        )}

                        {error && !isConfigError && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                {error}
                            </div>
                        )}

                        {isRegistering && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="Any email address"
                                        required={isRegistering}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {isRegistering ? 'Username' : 'Username or Email'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder={isRegistering ? "Choose a username" : "Enter username or email"}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Enter your password"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className={`w-full h-11 text-base shadow-lg transition-all ${
                                isRegistering 
                                ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-200' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                            }`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <><Loader2 className="animate-spin mr-2" size={20}/> {isRegistering ? 'Setting up...' : 'Signing In...'}</>
                            ) : (
                                <>
                                    <span className="mr-2">{isRegistering ? 'Start Now' : 'Sign In'}</span> 
                                    {isRegistering ? <UserPlus size={18} /> : <ArrowRight size={18}/>}
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-600 mb-3">
                            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                        </p>
                        <button 
                            onClick={toggleMode}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                            disabled={isLoading}
                        >
                            {isRegistering ? 'Log in here' : 'Register for Free'}
                        </button>
                    </div>
                </div>
                
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        Secure Access • TaskFlow Analytics © 2024
                    </p>
                </div>
            </div>
        </div>
    );
};