import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';

import bgImage from '../assets/crm_Banner-01.jpg.jpeg';

const  ResetPassword = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Raw fetch (not apiFetch): no session exists yet at this point,
            // and this route intentionally always returns a generic
            // success shape regardless of whether the ID exists, so there's
            // no 401/error branch worth apiFetch's auto-redirect handling.
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: employeeId.trim() })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setError(data.error || 'Something went wrong. Please try again.');
                setIsLoading(false);
                return;
            }

            setSubmitted(true);
        } catch (err) {
            setError('Server connection failed. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen min-h-[100dvh] flex items-center justify-center sm:justify-end bg-cover bg-center relative px-4 sm:px-6 md:px-16 lg:px-24 xl:pr-32 py-8"
            style={{ backgroundImage: `url(${bgImage})`, backgroundPosition: '25% center', fontFamily: "'Inter', sans-serif" }}
        >
            <div className="absolute inset-0" />

            <div className="login-card relative z-10 w-full max-w-[22rem] sm:max-w-md md:max-w-lg p-7 sm:p-9 md:p-11 lg:p-12 rounded-2xl sm:rounded-[1.75rem] bg-white/10 backdrop-blur-2xl">

                <h2
                    className="text-center text-[2rem] sm:text-[2.25rem] leading-tight mb-2 select-none text-black"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}
                >
                    {submitted ? 'Check with your admin' : 'Forgot password?'}
                </h2>
                <p className="text-center text-sm text-black/70 mb-7 sm:mb-9">
                    {submitted
                        ? "We've sent your request to the admin for approval."
                        : "Enter your Employee ID and we'll send a request to your admin."}
                </p>

                {error && (
                    <div className="bg-[#3A1418]/80 backdrop-blur-sm text-[#F5D9D5] p-2.5 sm:p-3 rounded-md text-sm mb-5 border border-[#8C3B3B]/60 text-center font-medium">
                        {error}
                    </div>
                )}

                {submitted ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <MailCheck className="w-10 h-10 text-black/70" strokeWidth={1.5} />
                        <p className="text-sm text-black/70 leading-relaxed">
                            If that Employee ID exists in our system, your admin has been notified.
                            Once approved, you'll receive an email with a link to set a new password.
                        </p>
                        <Link
                            to="/login"
                            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-black hover:opacity-70"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="field-group relative">
                            <label className="block text-[10px] sm:text-xs tracking-[0.2em] uppercase text-[#000000] mb-2">
                                Employee ID
                            </label>
                            <div className="flex items-center gap-3 border-b-2 border-[#000000]/30 focus-within:border-[#000000] transition-colors py-2 sm:py-2.5">
                                <User className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#000000]/70 shrink-0" strokeWidth={1.75} />
                                <input
                                    type="text"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder=" "
                                    className="w-full bg-transparent border-0 text-[#000000] placeholder-[#5C6478] focus:outline-none focus:ring-0 text-base sm:text-lg tracking-wide"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full overflow-hidden bg-gradient-to-r from-[#d02525] to-[#d02525] text-[#ffffff] font-semibold py-3 sm:py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                                        Sending
                                    </>
                                ) : (
                                    'Send Request'
                                )}
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <Link to="/login" className="inline-flex items-center gap-2 text-xs text-black/70 hover:text-black">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back to login
                            </Link>
                        </div>
                    </form>
                )}
            </div>

            <style>{`
                @keyframes cardRise {
                    from { opacity: 0; transform: translateY(14px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .login-card { animation: cardRise 0.55s ease-out both; }
                @media (prefers-reduced-motion: reduce) {
                    .login-card { animation: none; }
                }
            `}</style>
        </div>
    );
};

export default ResetPassword;