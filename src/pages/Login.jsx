import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { loginUser } from '../utils/auth';
import { ROLES } from '../utils/permissions';

// 1. ADDED: Import the image from your assets folder. 
// Adjust the relative path ('../assets/office-bg.jpg') based on your folder structure and exact file name.
import bgImage from '../assets/crm_Banner-01.jpg.jpeg'; 

// ─── NETWORK CONFIGURATION ───────────────────────────────────────────────────
// Unified API base URL to prevent IP/Port mismatches across devices
const API_BASE_URL = "https://crm-backend3-1y9k.onrender.com/api";

// Helper function to map database designations to frontend app roles.
// Covers all six roles defined in ../utils/permissions (ADMIN, DIRECTOR,
// SALES, OPERATION, ACCOUNTS, MARKETING). Previously this only recognized
// Admin/Sales/Operation and silently fell back to a now-removed
// ROLES.EMPLOYEE for everyone else (Marketing, Accounts, Director),
// which would break menu rendering for those users.
const getRoleFromDesignation = (designation) => {
    const desc = (designation || '').toLowerCase();
    if (desc.includes('admin')) return ROLES.ADMIN;
    if (desc.includes('director')) return ROLES.DIRECTOR;
    if (desc.includes('sales')) return ROLES.SALES;
    if (desc.includes('operation') || desc.includes('ops')) return ROLES.OPERATION;
    if (desc.includes('account')) return ROLES.ACCOUNTS;
    if (desc.includes('marketing')) return ROLES.MARKETING;
    // Fallback: with no matching designation, default to the most
    // restrictive role rather than the most permissive one.
    return ROLES.MARKETING;
};

// Injects the two premium display/body faces used only on this screen so the
// rest of the app's font stack is untouched.
const useLoginFonts = () => {
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);
};

const Login = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useLoginFonts();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const id = employeeId.trim();
        try {
            // 1. Authenticate with the unified backend endpoint
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: id, password: password })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'Invalid ID or password credentials.' }));
                setError(data.error || 'Failed to login.');
                setIsLoading(false);
                return;
            }

            const data = await response.json();

            // 2. Map runtime database models onto frontend security contexts
            const databaseRole = data.user?.designation || (id.toLowerCase() === 'admin' ? 'Admin' : 'Agent');
            const appMappedRole = getRoleFromDesignation(databaseRole);

            // 3. ULTRA SPEED TRACKER: Register heartbeat instantly for immediate panel visibility
            if (id.toLowerCase() !== 'admin') {
                await fetch(`${API_BASE_URL}/members/ping`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: String(data.user?.employeeId || id),
                        name: data.user?.name || id,
                        designation: databaseRole,
                        status: 'online'
                    })
                }).catch(err => console.error("Immediate tracking allocation bypassed:", err));
            }

            // 4. Update local system permissions inside auth helpers
            loginUser(
                data.user?.employeeId || id, 
                appMappedRole, 
                data.user?.name || (id.toLowerCase() === 'admin' ? 'Super Admin' : 'Agent')
            );
            
            // 5. Fire immediate client redirect down into main workspace shell
            navigate('/dashboard');

        } catch (err) {
            console.error("Login Engine Fault Configuration:", err);
            setError('Server connection timed out. Verify your backend service is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen min-h-[100dvh] flex items-center justify-center sm:justify-end bg-cover bg-center relative px-4 sm:px-6 md:px-16 lg:px-24 xl:pr-32 py-8"
            style={{ backgroundImage: `url(${bgImage})`, backgroundPosition: '25% center', fontFamily: "'Inter', sans-serif" }}
        >
            {/* Light overall tint so the banner stays visible behind the glass */}
            <div className="absolute inset-0 " />

            <div
                className="login-card relative z-10 w-full max-w-[22rem] sm:max-w-md md:max-w-lg p-7 sm:p-9 md:p-11 lg:p-12 rounded-2xl sm:rounded-[1.75rem] bg-white/10 backdrop-blur-2xl"
            >
                {/* Eyebrow */}
                {/* <p className="text-center text-[10px] sm:text-xs tracking-[0.35em] text-[#C9A227] font-medium uppercase mb-3 sm:mb-4">
                    iTour &middot; Workforce Operations
                </p> */}

                {/* Wordmark */}
                <h2
                    className="text-center text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] leading-none mb-3 select-none"
                    style={{ fontFamily: "'Fraunces', serif", letterSpacing: '-0.02em' }}
                >
                    <span className="text-black" style={{ fontWeight: 800 }}>Work</span>
                    <span className="text-black" style={{ fontWeight: 800 }}>Flow</span>
                </h2>

                {/* Signature accent rule, draws in on load */}
                <div className="flex justify-center mb-7 sm:mb-9 md:mb-10">
                    {/* <span className="gold-rule h-px w-16 bg-gradient-to-r from-transparent via-[#000000] to-transparent" /> */}
                </div>

                {error && (
                    <div className="bg-[#3A1418]/80 backdrop-blur-sm text-[#F5D9D5] p-2.5 sm:p-3 rounded-md text-sm sm:text-base mb-5 sm:mb-6 border border-[#8C3B3B]/60 text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6 md:space-y-7">

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

                    <div className="field-group relative">
                        <label className="block text-[10px] sm:text-xs tracking-[0.2em] uppercase text-[#000000] mb-2">
                            Password
                        </label>
                        <div className="flex items-center gap-3 border-b-2 border-[#000000]/30 focus-within:border-[#000000] transition-colors py-2 sm:py-2.5">
                            <Lock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#000000]/70 shrink-0" strokeWidth={1.75} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder=" "
                                className="w-full bg-transparent border-0 text-[#000000] placeholder-[#5C6478] focus:outline-none focus:ring-0 text-base sm:text-lg tracking-wide"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="pt-2 sm:pt-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full overflow-hidden bg-gradient-to-r from-[#d02525] to-[#d02525] text-[#ffffff] font-semibold py-3 sm:py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                                    Verifying
                                </>
                            ) : (
                                'Log In'
                            )}
                        </button>
                    </div>
                </form>

                {/* <div className="flex items-center justify-center gap-1.5 mt-6 sm:mt-8 text-[#5C6478] text-[10px] sm:text-xs tracking-wide">
                    <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Encrypted, role-based access
                </div> */}
            </div>

            <style>{`
                @keyframes goldDraw {
                    from { width: 0; opacity: 0; }
                    to { width: 4rem; opacity: 1; }
                }
                @keyframes cardRise {
                    from { opacity: 0; transform: translateY(14px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .login-card { animation: cardRise 0.55s ease-out both; }
                .gold-rule { animation: goldDraw 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .login-card, .gold-rule { animation: none; }
                }
            `}</style>
        </div>
    );
};

export default Login;