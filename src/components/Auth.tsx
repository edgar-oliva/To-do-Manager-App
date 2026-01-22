import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, UserPlus, LogIn, Chrome } from 'lucide-react';

interface AuthProps {
    onAuthSuccess: () => void;
    onGuestAccess: () => void;
    darkMode: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onGuestAccess, darkMode }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegistering) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onAuthSuccess();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSignIn = async (provider: 'google' | 'github') => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const cardClass = darkMode
        ? 'bg-zinc-900/50 border-zinc-800 text-white'
        : 'bg-white border-zinc-200 text-black';

    const inputClass = darkMode
        ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500'
        : 'bg-zinc-50 border-zinc-200 text-black placeholder-zinc-400';

    const accentGradient = 'bg-gradient-to-r from-[#6B7280] to-[#374151]';

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className={`max-w-md w-full p-8 rounded-[2rem] border shadow-2xl backdrop-blur-xl ${cardClass} animate-in fade-in zoom-in-95 duration-500`}>
                <div className="text-center mb-10">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${accentGradient} shadow-lg shadow-black/20`}>
                        {isRegistering ? <UserPlus className="text-white w-8 h-8" /> : <LogIn className="text-white w-8 h-8" />}
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">
                        {isRegistering ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {isRegistering ? 'Join My Task Manager today' : 'Sign in to sync your tasks'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="email"
                            placeholder="Email address"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-zinc-500/20 ${inputClass}`}
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-zinc-500/20 ${inputClass}`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl text-white font-bold tracking-widest uppercase text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/20 disabled:opacity-50 ${accentGradient}`}
                    >
                        {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="relative flex items-center gap-4 py-2">
                        <div className="flex-1 h-px bg-zinc-800"></div>
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">OR CONTINUE WITH</span>
                        <div className="flex-1 h-px bg-zinc-800"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleOAuthSignIn('google')}
                            disabled={loading}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${darkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
                        >
                            <Chrome className="w-5 h-5" />
                            <span className="text-xs font-bold">Google</span>
                        </button>
                        <button
                            onClick={onGuestAccess}
                            disabled={loading}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${darkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
                        >
                            <UserPlus className="w-5 h-5" />
                            <span className="text-xs font-bold">Try as Guest</span>
                        </button>
                    </div>
                </div>

                <p className="mt-10 text-center text-sm font-medium">
                    <span className={darkMode ? 'text-zinc-500' : 'text-zinc-400'}>
                        {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                    </span>
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="ml-2 text-zinc-300 hover:text-white transition-colors underline decoration-zinc-700 underline-offset-4"
                    >
                        {isRegistering ? 'Sign In' : 'Create One'}
                    </button>
                </p>
            </div>
        </div>
    );
};
