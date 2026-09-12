import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Settings, LogOut, Headphones, ArrowUpRight, X, User, Bell, Globe, Menu,
    LayoutDashboard, ChevronsLeft, ChevronsRight, Package, Sun, Moon
} from 'lucide-react';
import { MENU_ITEMS } from '../utils/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, logoutUser } from '../utils/auth';
import { apiFetch } from '../utils/api';

const Sidebar = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();

    // ── UI States ──
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false); 
    
    // ── Preferences States ──
    const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    // ── Initialize Settings & Theme ──
    useEffect(() => {
        const savedPreference = localStorage.getItem('leadEmailAlerts');
        if (savedPreference !== null) {
            setEmailAlertsEnabled(savedPreference === 'true');
        }
    }, []);

    useEffect(() => {
        // Apply Tailwind 'dark' class to the document root based on state
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    // ── Global Heartbeat Ping ──
    useEffect(() => {
        if (!user) return;
        const empId = user.employeeId || user.id || user.username;
        const empName = user.name || user.username || empId;
        const empRole = user.designation || user.role || 'Agent';
        if (!empId) return;

        const sendHeartbeatPing = () => {
            apiFetch('/members/ping', {
                method: 'POST',
                body: JSON.stringify({
                    employeeId: String(empId),
                    name: empName,
                    designation: empRole,
                    status: 'online'
                })
            }).catch((err) => console.error("Heartbeat sync configuration failed:", err));
        };

        sendHeartbeatPing();
        const loopId = setInterval(sendHeartbeatPing, 10000); 
        return () => clearInterval(loopId);
    }, [user]);

    // ── UNIFIED ULTRA-SPEED LOGOUT DISCONNECT BEACON ──
    const handleLogout = () => {
        const empId = user?.employeeId || user?.id || user?.username;
        const empRole = String(user?.role || user?.designation || '').toLowerCase();
        
        setIsMobileOpen(false);
        setIsSettingsOpen(false);

        if (empId && empRole !== 'admin' && String(empId).toLowerCase() !== 'admin') {
            apiFetch('/members/logout-drop', {
                method: 'POST',
                body: JSON.stringify({ employeeId: String(empId) })
            }).catch((err) => {
                console.error("Presence engine drop context exception:", err);
            });
        }

        try {
            logoutUser();
        } catch (authErr) {
            console.warn("Auth utility layout bypass, performing brute storage flush:", authErr);
            localStorage.clear(); 
        }
        
        navigate('/login');
    };

    const handleSaveSettings = () => {
        localStorage.setItem('leadEmailAlerts', emailAlertsEnabled);
        alert("Settings preferences saved!");
        setIsSettingsOpen(false);
    };

    const authorizedMenus = MENU_ITEMS.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    );

    return (
        <>
            {/* ── MOBILE/TABLET HEADER BAR ── */}
            <div className="xl:hidden w-full h-16 bg-slate-100 dark:bg-[#0A132B] flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/50 fixed top-0 left-0 z-40 transition-colors">
                <div className="flex items-center gap-2">
                    {/* <Package className="text-slate-900 dark:text-white" size={26} /> */}
                    <span className="text-slate-900 dark:text-white font-bold tracking-wider text-xl uppercase">
                        CRM
                    </span>
                </div>
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors focus:outline-none"
                >
                    <Menu size={26} />
                </button>
            </div>

            {/* ── SIDEBAR DRAWER OVERLAY ── */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="xl:hidden fixed inset-0 z-50 bg-black/20 dark:bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── PRIMARY SIDEBAR CONTAINER ── */}
            <div className={`
                fixed top-0 bottom-0 left-0 z-50 xl:relative
                h-full xl:h-screen bg-slate-100 dark:bg-[#0A132B] flex flex-col poppins-regular text-base border-r border-slate-200 dark:border-slate-800/50
                transition-all duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full xl:translate-x-0'}
                ${isCollapsed ? 'xl:w-[90px]' : 'xl:w-[280px]'}
            `}>

                {/* ── BRAND LOGO & COLLAPSE TOGGLE ── */}
                <div className="flex items-center justify-between px-4 pt-6 pb-6 border-b border-slate-200 dark:border-slate-800/30 xl:border-none transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="text-slate-900 dark:text-white shrink-0">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                        </div>
                        <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.18 }}
                                className="text-3xl font-extrabold text-slate-900 dark:text-white whitespace-nowrap tracking-wide uppercase overflow-hidden"
                            >
                                CRM
                            </motion.span>
                        )}
                        </AnimatePresence>
                    </div>
                    
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden xl:flex p-1.5 bg-slate-100 dark:bg-slate-800/50 text-black dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                    >
                        {isCollapsed ? <ChevronsRight size={22} /> : <ChevronsLeft size={22} />}
                    </button>

                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="xl:hidden p-1.5 text-black dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* ── SCROLLABLE NAVIGATION LIST ── */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 custom-scrollbar pt-4">
                    
                    {authorizedMenus.map((item, index) => {
                        if (item.type === 'section') {
                            return (
                                <div key={`section-${index}`} className={`pt-4 pb-2 px-2 transition-all ${isCollapsed ? 'text-center' : 'text-left'}`}>
                                    <span className="text-sm font-semibold text-black dark:text-slate-400/70 whitespace-nowrap">
                                        {item.label}
                                    </span>
                                </div>
                            );
                        }

                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileOpen(false)}
                                className={({ isActive }) => {
                                    const isItemActive = isActive || item.active;
                                    return `
                                        group flex items-center justify-between py-3 rounded-xl transition-colors duration-200 relative overflow-hidden
                                        ${isCollapsed ? 'px-0 justify-center' : 'px-3'}
                                        ${isItemActive ? 'text-blue-600 dark:text-white' : 'text-black dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5' }
                                    `;
                                }}
                            >
                                {({ isActive }) => {
                                    const isItemActive = isActive || item.active;
                                    return (
                                        <>
                                            {isItemActive && (
                                                <motion.div
                                                    layoutId="sidebar-active-bg"
                                                    className="absolute inset-0 bg-blue-50 dark:bg-white/10 rounded-xl"
                                                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                                />
                                            )}
                                            <div className={`flex items-center gap-3.5 min-w-0 relative z-10 ${isCollapsed ? 'justify-center' : ''}`}>
                                                <div className={`transition-colors flex-shrink-0 ${isItemActive ? 'text-blue-600 dark:text-white' : 'text-black dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                                                    <Icon size={24} strokeWidth={2} />
                                                </div>
                                                <AnimatePresence>
                                                {!isCollapsed && (
                                                    <motion.span
                                                        initial={{ opacity: 0, width: 0 }}
                                                        animate={{ opacity: 1, width: 'auto' }}
                                                        exit={{ opacity: 0, width: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className={`text-base font-medium truncate overflow-hidden ${isItemActive ? 'text-blue-600 dark:text-white' : ''}`}
                                                    >
                                                        {item.label}
                                                    </motion.span>
                                                )}
                                                </AnimatePresence>
                                            </div>

                                            {item.badge && (
                                                isCollapsed ? (
                                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full z-10"></div>
                                                ) : (
                                                    <span className="text-sm font-bold px-2.5 py-0.5 rounded bg-blue-500 text-white flex-shrink-0 ml-2 relative z-10">
                                                        {item.badge}
                                                    </span>
                                                )
                                            )}
                                        </>
                                    );
                                }}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* ── BOTTOM PROFILE & SETTINGS TRAY ── */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800/50 bg-slate-100 dark:bg-[#0A132B] space-y-2 flex-shrink-0 transition-colors">
                    <div className={`flex items-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#141E38] hover:bg-slate-100 dark:hover:bg-[#1A2645] transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-base shrink-0">
                                {user?.name ? user.name.substring(0, 1).toUpperCase() : "U"}
                            </div>
                            <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="flex flex-col justify-center min-w-0 overflow-hidden"
                                >
                                    <span className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[90px]">
                                        {user?.name || "User Profile"}
                                    </span>
                                    <span className="text-xs font-bold text-blue-600 dark:text-emerald-400 tracking-wider mt-0.5 uppercase truncate">
                                        {user?.role || "AGENT"}
                                    </span>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-0.5 text-black dark:text-slate-400 flex-shrink-0"
                            >
                                {/* THEME TOGGLE BUTTON */}
                                <button onClick={toggleTheme} className="p-1.5 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/50" title="Toggle Theme">
                                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                </button>
                                <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/50" title="Settings">
                                    <Settings size={18} />
                                </button>
                                <button onClick={handleLogout} className="p-1.5 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/50" title="Logout">
                                    <LogOut size={18} />
                                </button>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('open-ai-chat'));
                                setIsMobileOpen(false); 
                            }}
                            className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/60 text-black dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/40 cursor-pointer transition-colors group overflow-hidden"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <Headphones size={18} className="flex-shrink-0" />
                                <span className="text-sm font-medium truncate">Support Desk</span>
                            </div>
                            <ArrowUpRight size={16} className="opacity-50 group-hover:opacity-100" />
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── SETTINGS MODAL ── */}
            <AnimatePresence>
            {isSettingsOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 bg-slate-100 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl w-full max-w-md md:max-w-lg mx-auto overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="flex justify-between items-center px-4 py-4 sm:px-6 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 flex-shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Settings size={24} className="text-blue-600 dark:text-emerald-400" /> Basic Settings
                            </h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-black dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <h4 className="text-sm font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <User size={18} /> Account Profile
                                </h4>
                                <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center gap-4 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-slate-700 border border-transparent dark:border-slate-600 text-white flex items-center justify-center font-bold text-xl uppercase">
                                        {user?.name ? user.name.substring(0, 2) : "US"}
                                    </div>
                                    <div className="min-w-0 w-full">
                                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{user?.name || "User Name"}</p>
                                        <p className="text-sm text-black dark:text-slate-400 truncate">Workspace Session Key Authentication Active</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Globe size={18} /> Preferences
                                </h4>
                                <div className="space-y-3">
                                    {/* LINKED THEME TOGGLE */}
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg p-3 transition-colors">
                                        <span className="text-base text-black dark:text-slate-200 font-medium">Dark System Skin</span>
                                        <div 
                                            onClick={toggleTheme}
                                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${theme === 'dark' ? 'bg-emerald-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-1'}`}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg p-3 transition-colors">
                                        <span className="text-base text-black dark:text-slate-200 font-medium">Timezone Isolation</span>
                                        <select className="bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300 text-base border border-slate-300 dark:border-slate-600 rounded p-1.5 outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Asia/Kolkata (IST)</option>
                                            <option>UTC (GMT)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Bell size={18} /> Notifications
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer transition-colors">
                                        <span className="text-base text-black dark:text-slate-200 font-medium">Email Alerts for New Leads</span>
                                        <input 
                                            type="checkbox" 
                                            checked={emailAlertsEnabled}
                                            onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                                            className="accent-blue-600 dark:accent-emerald-500 w-5 h-5 cursor-pointer" 
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3 flex-shrink-0 transition-colors">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-base font-semibold transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSaveSettings} className="px-4 py-2.5 rounded-lg bg-blue-600 dark:bg-emerald-600 hover:bg-blue-700 dark:hover:bg-emerald-500 text-white text-base font-bold shadow-lg transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;