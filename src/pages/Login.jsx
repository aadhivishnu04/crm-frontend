import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/auth';
import { ROLES } from '../utils/permissions';

// 1. ADDED: Import the image from your assets folder. 
// Adjust the relative path ('../assets/office-bg.jpg') based on your folder structure and exact file name.
import bgImage from '../assets/loginpage2.jpg'; 

// ─── NETWORK CONFIGURATION ───────────────────────────────────────────────────
// Unified API base URL to prevent IP/Port mismatches across devices
const API_BASE_URL = "https://crm-backend-l87w.onrender.com/api";

// Helper function to map database designations to frontend app roles
const getRoleFromDesignation = (designation) => {
    const desc = (designation || '').toLowerCase();
    if (desc.includes('admin')) return ROLES.ADMIN;
    if (desc.includes('sales')) return ROLES.SALES;
    if (desc.includes('operation') || desc.includes('ops')) return ROLES.OPERATION;
    return ROLES.EMPLOYEE; 
};

const Login = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

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
            className="min-h-screen flex items-center justify-end bg-cover bg-center relative poppins-regular pr-6 md:pr-24 lg:pr-32"
            // 2. CHANGED: Swapped the external URL for the imported 'bgImage' variable
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <div className="absolute inset-0 bg-black/60"></div>

            <div className="relative z-10 w-full max-w-lg p-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">

                <h2 className="text-4xl font-semibold text-center mb-10 text-white tracking-wide">
                   CRM
                </h2>

                {error && (
                    <div className="bg-red-500/80 backdrop-blur-sm text-white p-3 rounded-md text-base mb-8 border border-red-400 text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-8">

                    <div className="relative">
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Enter your Employee ID"
                            className="w-full bg-transparent border-0 border-b-2 border-white/50 py-3 text-white placeholder-gray-300 focus:outline-none focus:border-white focus:ring-0 transition-colors text-xl"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="relative">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full bg-transparent border-0 border-b-2 border-white/50 py-3 text-white placeholder-gray-300 focus:outline-none focus:border-white focus:ring-0 transition-colors text-xl"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-white text-gray-900 font-bold py-4 px-4 rounded-xl hover:bg-gray-100 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed text-lg uppercase tracking-wider"
                        >
                            {isLoading ? 'Verifying session token...' : 'Log In'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Login;