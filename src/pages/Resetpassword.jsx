import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import { loginUser } from '../utils/auth';

const MIN_PASSWORD_LENGTH = 8;

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const resetToken = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // No token in the URL at all — nothing to do here.
    useEffect(() => {
        if (!resetToken) {
            setError('This reset link is missing its token. Please use the exact link that was sent to you.');
        }
    }, [resetToken]);

    const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const passwordTooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!resetToken) return;

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetToken, newPassword }),
                cache: 'no-store',
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                if (res.status === 401) {
                    setError('This reset link has expired or already been used. Please contact IT for a new one.');
                } else {
                    setError((data && (data.error || data.message)) || `Request failed (${res.status})`);
                }
                setIsSubmitting(false);
                return;
            }

            // Log the employee straight in with the session token the
            // endpoint returns, so they don't have to re-enter credentials.
            if (data?.token && data?.user) {
                loginUser(data.user.employeeId, data.user.role, data.user.name, data.token);
            }

            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err) {
            setError('Network error. Please check your connection and try again.');
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
                <div className="bg-[#0d233e] border border-slate-700/50 w-full max-w-sm rounded-xl shadow-2xl p-8 text-center">
                    <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
                    <h1 className="text-lg font-bold text-white mb-1">Password updated</h1>
                    <p className="text-sm text-slate-400">Taking you to your dashboard…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="bg-[#0d233e] border border-slate-700/50 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-700/30 bg-[#0f172a]">
                    <h1 className="text-base font-bold text-white flex items-center gap-2">
                        <Lock size={18} className="text-cyan-400" /> Set a new password
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Your previous password was reset for security reasons. Choose a new one to continue.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {error && (
                        <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2.5 text-xs text-rose-300">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">New password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={!resetToken || isSubmitting}
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 outline-none focus:border-cyan-500 disabled:opacity-50"
                                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        {passwordTooShort && (
                            <span className="text-[11px] text-amber-400">Needs at least {MIN_PASSWORD_LENGTH} characters.</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">Confirm new password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={!resetToken || isSubmitting}
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 disabled:opacity-50"
                            placeholder="Re-enter new password"
                        />
                        {passwordsMismatch && (
                            <span className="text-[11px] text-amber-400">Passwords don't match yet.</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!resetToken || isSubmitting || passwordsMismatch}
                        className="mt-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed font-medium py-2.5 rounded-lg transition-colors shadow-md text-sm flex items-center justify-center gap-2 text-white"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Set password & continue'}
                    </button>

                    <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 text-center transition-colors">
                        Back to login
                    </Link>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;