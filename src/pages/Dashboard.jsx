import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Users, 
    ClipboardList, 
    FileText, 
    Check,
    Calendar, 
    ChevronLeft, 
    ChevronRight,
    MessageSquare, 
    Send, 
    X, 
    Bot, 
    Loader2, 
    Clock,
    Target, 
    Trash2, 
    Pencil, 
    Save,
    ChevronDown, 
    Minus, 
    AlertCircle, 
    Sun, 
    Moon, 
    Eye,
    Globe,
    MapPin,
    Plus,
    Wallet,
    ArrowDownRight,
    ArrowUpRight,
    BellRing,
    AlertTriangle,
    BookmarkCheck,
    PlaneTakeoff,
    PackageCheck,
    AlarmClock
} from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { ROLES } from '../utils/permissions';
import logo from '../assets/logo (2).png'; // <-- Added import for the logo based on your folder structure

// ─── NETWORK CONFIGURATION ───────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

// ─── INDIA DESTINATION MATCHER ───────────────────────────────────────────────
const INDIA_KEYWORDS = [
    'india', 'chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi',
    'goa', 'kerala', 'jaipur', 'agra', 'kolkata', 'hyderabad', 'pune', 'ahmedabad',
    'varanasi', 'amritsar', 'shimla', 'manali', 'ooty', 'coorg', 'kodaikanal',
    'andaman', 'lakshadweep', 'pondicherry', 'madurai', 'kochi', 'trivandrum',
    'mysore', 'mysuru', 'coimbatore', 'vijayawada', 'vizag', 'visakhapatnam',
    'udaipur', 'jodhpur', 'pushkar', 'rishikesh', 'haridwar', 'dehradun',
    'darjeeling', 'gangtok', 'sikkim', 'arunachal', 'assam', 'nagaland',
    'leh', 'ladakh', 'kashmir', 'srinagar', 'jammu', 'dharamsala', 'mcleod',
    'gurgaon', 'noida', 'chandigarh', 'ludhiana', 'indore', 'bhopal', 'nagpur',
    'surat', 'baroda', 'vadodara', 'rajasthan', 'maharashtra', 'karnataka',
    'tamilnadu', 'tamil nadu', 'andhra', 'telangana', 'gujarat',
    'uttarakhand', 'himachal', 'west bengal', 'odisha', 'bhubaneswar', 'puri',
    'madhya pradesh', 'chhattisgarh', 'jharkhand', 'bihar', 'patna',
    'lucknow', 'allahabad', 'prayagraj', 'kanpur', 'mathura'
];

const isIndiaDestination = (destination) => {
    if (!destination) return false;
    const dest = destination.toLowerCase().trim();
    return INDIA_KEYWORDS.some(kw => dest.includes(kw));
};

// ─── STYLING CONFIGURATIONS & DICTIONARIES ────────────────────────────────────
const PRIORITIES = ['High', 'Medium', 'Normal', 'Low'];
const PRIORITY_STYLES = {
    High: 'bg-red-500/20 text-red-400 border-red-500/30 dark:text-red-400',
    Medium: 'bg-amber-500/20 text-amber-500 border-amber-500/30 dark:text-amber-400',
    Normal: 'bg-blue-500/20 text-blue-500 border-blue-500/30 dark:text-blue-400',
    Low: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
};
const STATUSES = ['online', 'away', 'busy', 'offline'];
const STATUS_STYLES = {
    online: { dot: 'bg-emerald-500 dark:bg-emerald-400', glow: 'shadow-emerald-400/60', label: 'Online' },
    away: { dot: 'bg-amber-500 dark:bg-amber-400', glow: 'shadow-amber-400/60', label: 'Away' },
    busy: { dot: 'bg-red-500 dark:bg-red-400', glow: 'shadow-red-400/60', label: 'Busy' },
    offline: { dot: 'bg-slate-400 dark:bg-slate-500', glow: 'shadow-slate-500/20', label: 'Offline' },
};
const EVENT_CATEGORIES = ['Meetings', 'Tasks', 'Reminders', 'Deadlines'];

const formatTaskDateTime = (dateString) => {
    if (!dateString || dateString.toLowerCase() === 'today') return 'Today';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; 
        return date.toLocaleString('en-US', { 
            month: 'short', day: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
    } catch (e) {
        return dateString;
    }
};

const PriorityBadge = ({ priority }) => (
    <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap tracking-wide ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.Normal}`}>
        {priority}
    </span>
);

const StatusDot = ({ status, size = 'sm' }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.offline;
    const sz = size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3';
    return <span className={`${sz} rounded-full shadow-[0_0_6px_2px] ${s.dot} ${s.glow} flex-shrink-0`} />;
};

const ProgressBar = ({ value, max, color }) => {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="w-full h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden flex-shrink-0">
            <div className="h-full rounded-full transition-all duration-700 shadow-sm" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
};

const Modal = ({ open, onClose, title, children, maxWidth = "max-w-md" }) => {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    
    if (!open) return null;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
            <div className={`relative z-10 bg-white dark:bg-[#141b2d] border border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full ${maxWidth} p-5 sm:p-6 max-h-[calc(100vh-24px)] sm:max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col`}>
                <div className="flex justify-between items-center mb-5 sticky top-0 bg-white dark:bg-[#141b2d] z-20 pb-3 border-b border-slate-100 dark:border-slate-700/40">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white truncate pr-4 tracking-tight">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex-shrink-0">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

const Field = ({ label, children, className = '' }) => (
    <div className={`mb-4 px-0.5 py-0.5 ${className}`}>
        <label className="block text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
        {children}
    </div>
);

const Input = ({ className = '', ...props }) => (
    <input
        className={`w-full bg-slate-50 dark:bg-[#0d1526] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all ${className}`}
        {...props}
    />
);

const DateInput = ({ value, onChange, className = '' }) => (
    <div className="relative bg-slate-50 dark:bg-[#0d1526] border border-slate-200 dark:border-slate-700/60 rounded-xl focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all overflow-hidden group flex items-center">
        <input
            type="date"
            value={value || ''}
            onChange={onChange}
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            className={`w-full px-3 py-2.5 text-sm bg-transparent text-slate-800 dark:text-slate-200 outline-none cursor-pointer appearance-none relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:top-0 ${className}`}
        />
        <Calendar size={15} className="absolute right-3 text-slate-400 group-hover:text-blue-400 z-0 pointer-events-none transition-colors" />
    </div>
);

const TextArea = ({ className = '', ...props }) => (
    <textarea
        className={`w-full bg-slate-50 dark:bg-[#0d1526] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all custom-scrollbar ${className}`}
        {...props}
    />
);

const Select = ({ options, value, onChange, placeholder = "", className = '', allowCustom = false }) => {
    const isValueCustom = value && !options.includes(value);
    const [showInput, setShowInput] = useState(isValueCustom);

    useEffect(() => {
        if (value && !options.includes(value)) setShowInput(true);
    }, [value, options]);

    if (showInput) {
        return (
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-[#0d1526] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all ${className}`}
                    autoFocus
                />
                <button 
                    type="button"
                    onClick={() => { setShowInput(false); onChange(''); }}
                    className="absolute right-2 text-slate-400 hover:text-red-500 p-1 bg-transparent border-none cursor-pointer"
                    title="Back to predefined options"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <select
                value={value || ""}
                onChange={e => {
                    if (e.target.value === "__CUSTOM__") {
                        setShowInput(true);
                        onChange('');
                    } else {
                        onChange(e.target.value);
                    }
                }}
                className={`w-full appearance-none bg-slate-50 dark:bg-[#0d1526] border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2.5 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer ${className}`}
            >
                {placeholder && <option value="" disabled>{placeholder}</option>}
                {!placeholder && <option value="" disabled></option>}
                {options.map(o => <option key={o} value={o}>{o}</option>)}
                {allowCustom && <option value="__CUSTOM__" className="font-semibold text-blue-600 dark:text-blue-400">Add Custom Entry...</option>}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );
};

// ─── MAIN DASHBOARD COMPONENT ─────────────────────────────────────────────────
const Dashboard = () => {
    const user = getCurrentUser();
    const currentUserIdentifier = String(user?.employeeId || user?.id || user?.username || 'unknown');
    const displayHeaderName = (user?.name || user?.employeeId || 'Team Member').toUpperCase();

    // Layout configuration states
    const [darkMode, setDarkMode] = useState(true);
    const [allMembersExpanded, setAllMembersExpanded] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [stats, setStats] = useState({ todayLeads: 0, pendingLeads: 0, pendingQuotation: 0, tripConfirmation: 0, totalLeads: 0 });
    const [time, setTime] = useState(new Date());

    // Analytics core data sets
    const [tripRegionCounts, setTripRegionCounts] = useState({ india: 0, international: 0 });
    const [unassignedJobsCount, setUnassignedJobsCount] = useState(0); 
    const [closedTrips, setClosedTrips] = useState([]);
    const [allLeads, setAllLeads] = useState([]); 
    const [regionModal, setRegionModal] = useState({ open: false, regionName: '', tripsList: [] });
    
    // Extracted live payment breakdowns & active alerts
    const [payments, setPayments] = useState({ totalIn: 0, totalOut: 0, pending: 0 });
    const [individualPayments, setIndividualPayments] = useState([]);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false); 
    const [fulfillmentAlerts, setFulfillmentAlerts] = useState([]);

    // Modal view states
    const [selectedLeadDetails, setSelectedLeadDetails] = useState(null); 
    const [selectedPaymentLead, setSelectedPaymentLead] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);

    const formattedDate = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    // ─── LEAVE MANAGEMENT STATES ─────────────────────────────────────────────
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [allLeavesModalOpen, setAllLeavesModalOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ 
        leaveType: 'Leave', 
        startDate: '', 
        endDate: '', 
        reason: '',
        handoverTo: '',
        handoverNotes: '',
        workedOnDate: '',
        session: ''
    });
    const [leaves, setLeaves] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]); 

    const isSalesOrOps = user?.role === ROLES.SALES || user?.role === ROLES.OPERATION;
    const isAdmin = user?.role === ROLES.ADMIN;
    
    const calculateDays = (start, end) => {
        if (!start || !end) return '';
        const diff = new Date(end) - new Date(start);
        return diff >= 0 ? (diff / (1000 * 60 * 60 * 24)) + 1 : 0;
    };

    // ─── LEAVE API HANDLERS ──────────────────────────────────────────────────
    const fetchLeaves = async () => {
        try {
            const endpoint = isAdmin ? `${API_BASE_URL}/leaves/all` : `${API_BASE_URL}/leaves?employeeId=${currentUserIdentifier}`;
            const res = await fetch(endpoint);
            if (res.ok) setLeaves(await res.json());
        } catch (err) {
            console.error("Failed to fetch leaves", err);
        }
    };

    useEffect(() => {
        fetchLeaves();
        const leaveTimer = setInterval(fetchLeaves, 5000);
        return () => clearInterval(leaveTimer);
    }, [currentUserIdentifier, isAdmin]);

    const applyLeave = async () => {
        const isLeave = leaveForm.leaveType === 'Leave';
        const isWeekOff = leaveForm.leaveType === 'Week Off';
        const isHalfDay = leaveForm.leaveType === 'Half Day';

        if (isLeave && (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim())) return;
        if (isWeekOff && (!leaveForm.startDate || !leaveForm.workedOnDate || !leaveForm.reason.trim())) return;
        if (isHalfDay && (!leaveForm.startDate || !leaveForm.session || !leaveForm.reason.trim())) return;

        const calculatedDays = isLeave ? calculateDays(leaveForm.startDate, leaveForm.endDate) : (isHalfDay ? 0.5 : 1);

        try {
            const res = await fetch(`${API_BASE_URL}/leaves`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...leaveForm,
                    totalDays: calculatedDays,
                    employeeId: currentUserIdentifier,
                    employeeName: user?.name,
                    status: 'Pending'
                })
            });
            if (res.ok) {
                const savedLeave = await res.json();
                setLeaves(prev => [savedLeave, ...prev]);
                setLeaveModalOpen(false);
                setLeaveForm({ leaveType: 'Leave', startDate: '', endDate: '', reason: '', handoverTo: '', handoverNotes: '', workedOnDate: '', session: '' });
                showToast("Leave application submitted to Admin.", "success");
            }
        } catch (err) {
            showToast("Failed to submit leave.", "error");
        }
    };

    const handleLeaveAction = async (leaveId, action) => {
        try {
            const res = await fetch(`${API_BASE_URL}/leaves/${leaveId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action })
            });
            if (res.ok) {
                setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: action } : l));
                showToast(`Leave request ${action.toLowerCase()}.`, "success");
            }
        } catch (err) {
            showToast("Failed to process leave action.", "error");
        }
    };
    
    // Form handlers
    const [leadModalOpen, setLeadModalOpen] = useState(false);
    const [leadForm, setLeadForm] = useState({
        customerName: '', phone: '', email: '', destination: '',
        travelDates: '', pax: '', childrenPax: '0', packageType: 'Custom / Flexible',
        budget: '', platform: '', campaign: '', leadMessage: '', notes: ''
    });

    const [campaignOptions, setCampaignOptions] = useState([]);
    const PACKAGE_TYPES = ['Custom / Flexible', 'Honeymoon', 'Family Tour', 'Group Tour', 'Corporate Trip', 'Solo Backpacking'];
    const PLATFORM_OPTIONS = ['Facebook', 'Instagram', 'Google Ads', 'Website', 'Referral', 'Walk-in', 'Other'];
    const BUDGET_OPTIONS = ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', '₹1,00,000 - ₹3,00,000', '₹3,00,000 - ₹5,00,000', '₹5,00,000+'];
    const PAX_OPTIONS = ['1', '2', '3', '4', '5', '6+'];
    const CHILDREN_OPTIONS = ['0', '1', '2', '3', '4', '5+'];

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    const saveLead = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadForm)
            });

            if (response.ok) {
                const savedLead = await response.json();
                showToast(`Success! Lead for ${savedLead.customerName || 'Customer'} has been saved.`, 'success');
                
                fetch(`${API_BASE_URL}/notifications/new-lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        leadId: savedLead.id,
                        customerName: savedLead.customerName,
                        destination: savedLead.destination,
                        email: savedLead.email,
                        phone: savedLead.phone
                    })
                })
                .then(res => res.json())
                .then(data => console.log("Email server response:", data))
                .catch(err => console.error("Silently failing email trigger:", err));

                setLeadForm({
                    customerName: '', phone: '', email: '', destination: '',
                    travelDates: '', pax: '', childrenPax: '0', packageType: 'Custom / Flexible',
                    budget: '', platform: '', campaign: '', leadMessage: '', notes: ''
                });
                setLeadModalOpen(false);
            } else {
                showToast("Failed to save lead.", "error");
            }
        } catch (error) {
            showToast("Connection configuration error.", "error");
        }
    };

    const [tasks, setTasks] = useState([]);
    const [taskFilter, setTaskFilter] = useState('all');
    const [taskModal, setTaskModal] = useState({ open: false, mode: 'add', task: null });
    const [taskForm, setTaskForm] = useState({ title: '', due: '', priority: 'Normal' });

    const openAddTask = () => {
        setTaskForm({ title: '', due: '', priority: 'Normal' });
        setTaskModal({ open: true, mode: 'add', task: null });
    };
    
    const openEditTask = (task) => {
        let formattedTime = '';
        if (task.time && task.time.toLowerCase() !== 'today') {
            if (task.time.includes('T')) {
                formattedTime = task.time.substring(0, 16);
            } else {
                try {
                    const d = new Date(task.time);
                    if (!isNaN(d.getTime())) {
                        const offset = d.getTimezoneOffset() * 60000;
                        formattedTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
                    }
                } catch(e) {}
            }
        }
        setTaskForm({ title: task.title, due: formattedTime, priority: task.priority || 'Normal' });
        setTaskModal({ open: true, mode: 'edit', task });
    };

    const closeTaskModal = () => setTaskModal({ open: false, mode: 'add', task: null });

    const saveTask = async () => {
        if (!taskForm.title.trim()) return;
        try {
            if (taskModal.mode === 'add') {
                const res = await fetch(`${API_BASE_URL}/tasks`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        title: taskForm.title.trim(), time: taskForm.due, priority: taskForm.priority, employeeId: currentUserIdentifier 
                    })
                });
                if (res.ok) {
                    const saved = await res.json();
                    setTasks(prev => [saved, ...prev]);
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/tasks/${taskModal.task.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        title: taskForm.title.trim(), time: taskForm.due, priority: taskForm.priority, completed: taskModal.task.completed, employeeId: currentUserIdentifier 
                    })
                });
                if (res.ok) {
                    const updated = await res.json();
                    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
                }
            }
            closeTaskModal();
        } catch (err) { console.error(err); }
    };

    const toggleTask = async (id, cur) => {
        try {
            const taskToUpdate = tasks.find(t => t.id === id);
            const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...taskToUpdate, completed: !cur, employeeId: currentUserIdentifier })
            });
            if (res.ok) {
                const updated = await res.json();
                setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            }
        } catch (err) { console.error(err); }
    };

    const deleteTask = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE' });
            if (res.ok) setTasks(prev => prev.filter(t => t.id !== id));
        } catch (err) { console.error(err); }
    };

    const filteredTasks = tasks.filter(t => taskFilter === 'all' ? true : taskFilter === 'pending' ? !t.completed : t.completed);
    const taskCounts = { all: tasks.length, pending: tasks.filter(t => !t.completed).length, completed: tasks.filter(t => t.completed).length };

    const [members, setMembers] = useState([]);

    const [targets, setTargets] = useState([]);
    const [targetModal, setTargetModal] = useState(false);
    const [editingTarget, setEditingTarget] = useState(null);
    const [targetForm, setTargetForm] = useState({ label: '', value: 0, max: 100, unit: '', isPercent: false, color: '#7c3aed' });

    const formatTargetDisplay = (t) => {
        const valStr = t.unit === '$' ? `$${t.value >= 1000 ? (t.value / 1000).toFixed(1) + 'K' : t.value}` : `${t.value}`;
        const maxStr = t.unit === '$' ? `$${t.max >= 1000 ? (t.max / 1000).toFixed(1) + 'K' : t.max}` : `${t.max}`;
        return `${valStr}${t.isPercent ? '%' : ''} / ${maxStr}${t.isPercent ? '%' : ''}`;
    };

    const nudgeTarget = async (id, direction, currentVal, maxVal, unit) => {
        const step = unit === '$' ? 1000 : 1;
        const newVal = Math.max(0, Math.min(maxVal, currentVal + direction * step));
        setTargets(prev => prev.map(t => t.id === id ? { ...t, value: newVal } : t));
        try {
            const targetToUpdate = targets.find(t => t.id === id);
            await fetch(`${API_BASE_URL}/targets/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...targetToUpdate, value: newVal })
            });
        } catch (err) { console.error(err); }
    };

    const openEditTarget = (t) => {
        setEditingTarget(t);
        setTargetForm({ label: t.label, value: t.value, max: t.max, unit: t.unit, isPercent: t.isPercent, color: t.color });
        setTargetModal(true);
    };

    const saveTarget = async () => {
        const payload = { ...targetForm, value: Number(targetForm.value), max: Number(targetForm.max) };
        try {
            if (editingTarget) {
                const res = await fetch(`${API_BASE_URL}/targets/${editingTarget.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const updated = await res.json();
                    setTargets(prev => prev.map(t => t.id === updated.id ? updated : t));
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/targets`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const saved = await res.json();
                    setTargets(prev => [...prev, saved]);
                }
            }
            setTargetModal(false);
            setEditingTarget(null);
        } catch (err) { console.error(err); }
    };

    const deleteTarget = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/targets/${id}`, { method: 'DELETE' });
            if (res.ok) setTargets(prev => prev.filter(t => t.id !== id));
        } catch (err) { console.error(err); }
    };

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [allRemindersModalOpen, setAllRemindersModalOpen] = useState(false);
    const [eventForm, setEventForm] = useState({ title: '', date: '', time: '09:00', category: 'Reminders' });

    const nextDay = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    const prevDay = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const dateStrip = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 3 + i);
        return d;
    });

    const openAddEvent = (targetDate = currentDate) => {
        const offsetDate = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000));
        const formattedDateString = offsetDate.toISOString().split('T')[0];
        setEventForm({ title: '', date: formattedDateString, time: '09:00', category: 'Reminders' });
        setEventModalOpen(true);
    };

    const saveEvent = async () => {
        if (!eventForm.title.trim() || !eventForm.date) return;
        try {
            const res = await fetch(`${API_BASE_URL}/events`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...eventForm, employeeId: currentUserIdentifier })
            });
            if (res.ok) {
                const saved = await res.json();
                setEvents(prev => [...prev, saved].sort((a, b) => new Date(a.date) - new Date(b.date)));
                setEventModalOpen(false);
                showToast(`Reminder "${saved.title}" successfully added!`);
            }
        } catch (err) { console.error(err); }
    };

    const deleteEvent = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/events/${id}`, { method: 'DELETE' });
            if (res.ok) setEvents(prev => prev.filter(e => e.id !== id));
        } catch (err) { console.error(err); }
    };

    // ─── AUTO-DERIVED REMINDERS (Sales follow-up dates + Operations/Accounts payment due dates + Fulfillment dates) ───
    // Every lead record is shared across Sales, Operations, Fulfillment and Accounts. Instead of manually
    // re-entering dates into the Calendar, we scan allLeads on every refresh and surface each department's
    // follow-up / due dates here automatically as read-only reminders.
    const safeParseList = (raw) => {
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') return [parsed];
        } catch (e) { /* ignore malformed JSON */ }
        return [];
    };

    const crmReminders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const derived = [];

        const addReminder = (lead, dateVal, title, type) => {
            if (!dateVal) return;
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return;
            d.setHours(0, 0, 0, 0);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const daysLeft = Math.round((d.getTime() - today.getTime()) / 86400000);
            derived.push({
                id: `auto-${lead.id}-${type}-${dateStr}-${title}`,
                title: `${title} — ${lead.customerName || lead.profileName || 'Customer'}`,
                date: dateStr,
                time: '09:00',
                category: type,
                daysLeft,
                customerName: lead.customerName || lead.profileName || 'Customer',
                destination: lead.destination || '',
                leadId: lead.id,
                auto: true,
            });
        };

        (allLeads || []).forEach(lead => {
            if (!lead) return;

            // Sales — Next Follow-Up date
            addReminder(lead, lead.followupDate || lead.nextFollowUp, 'Follow-Up', 'Follow-Up');

            // Operations & Accounts — Payment Due dates
            safeParseList(lead.paymentRequests).forEach(req => {
                if (req?.paymentDueDate) addReminder(lead, req.paymentDueDate, `Payment Due (${req.providerName || req.serviceType || 'Vendor'})`, 'Due Date');
            });
            safeParseList(lead.domHotels).forEach(h => {
                if (h?.paymentDueDate) addReminder(lead, h.paymentDueDate, `Hotel Payment Due (${h.hotelName || 'Hotel'})`, 'Due Date');
            });
            safeParseList(lead.domLocalTransports).forEach(t => {
                if (t?.paymentDueDate) addReminder(lead, t.paymentDueDate, `Transport Payment Due (${t.serviceProvider || 'Vendor'})`, 'Due Date');
            });

            // Fulfillment — Travel / Briefing dates
            if (lead.travelDate) addReminder(lead, lead.travelDate, 'Trip Travel Date', 'Fulfillment');
            if (lead.briefingDateVal) addReminder(lead, lead.briefingDateVal, 'Guest Briefing Due', 'Fulfillment');
        });

        const seen = new Set();
        return derived
            .filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [allLeads]);

    // Follow-up / due-date items landing within the next 5 days (also surfaces anything already overdue, up to 14 days back)
    const dueSoonAlerts = useMemo(() => (
        crmReminders
            .filter(r => r.daysLeft <= 5 && r.daysLeft >= -14)
            .sort((a, b) => a.daysLeft - b.daysLeft)
    ), [crmReminders]);

    // Combined list (manual reminders + auto-derived ones) used by the "All Reminders" modal
    const allReminderItems = useMemo(() => (
        [...events, ...crmReminders].sort((a, b) => new Date(a.date) - new Date(b.date))
    ), [events, crmReminders]);

    const filteredEvents = [...events, ...crmReminders].filter(e => {
        if (!e.date) return false;
        const eventDate = new Date(e.date + 'T00:00:00');
        return eventDate.toDateString() === currentDate.toDateString();
    });

    const [topDestinations, setTopDestinations] = useState([]);
    const [topDestinationsModalOpen, setTopDestinationsModalOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);

        const fetchDashboardData = async () => {
            try {
                const [statsRes, tasksRes, membersRes, targetsRes, eventsRes, topDestRes, jobsRes, leadsRes, campaignsRes, employeesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/stats`),
                    fetch(`${API_BASE_URL}/tasks?employeeId=${currentUserIdentifier}`),
                    fetch(`${API_BASE_URL}/members`),
                    fetch(`${API_BASE_URL}/targets`),
                    fetch(`${API_BASE_URL}/events?employeeId=${currentUserIdentifier}`), 
                    fetch(`${API_BASE_URL}/top-destinations`),
                    fetch(`${API_BASE_URL}/jobs`),  
                    fetch(`${API_BASE_URL}/leads`), 
                    fetch(`${API_BASE_URL}/campaigns`),
                    fetch(`${API_BASE_URL}/employees`)
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (employeesRes.ok) setAllEmployees(await employeesRes.json());
                
                if (tasksRes.ok) {
                    const allTasks = await tasksRes.json();
                    const myPersonalTasks = allTasks.filter(t => 
                        String(t.employeeId) === currentUserIdentifier || String(t.userId) === currentUserIdentifier || (!t.employeeId && !t.userId) 
                    );
                    setTasks(myPersonalTasks);
                }
                
                if (membersRes.ok) setMembers(await membersRes.json());
                if (targetsRes.ok) setTargets(await targetsRes.json());

                if (eventsRes.ok) {
                    const allEvents = await eventsRes.json();
                    const myPersonalEvents = allEvents.filter(e => 
                        String(e.employeeId) === currentUserIdentifier || String(e.userId) === currentUserIdentifier || (!e.employeeId && !e.userId) 
                    );
                    setEvents(myPersonalEvents);
                }

                if (topDestRes.ok) setTopDestinations(await topDestRes.json());

                if (leadsRes.ok) {
                    const leadsData = await leadsRes.json();
                    if (Array.isArray(leadsData)) {
                        
                        let calcTotalIn = 0;
                        let calcTotalOut = 0;
                        let calcPending = 0;
                        const today = new Date();
                        const alertsCalculated = [];
                        const indPaymentList = [];

                        const processedLeads = leadsData.map(lead => {
                            const parseAmt = (v) => parseFloat(String(v).replace(/[₹,\s]/g, '')) || 0;
                            const packageCost = parseAmt(lead.totalPackageCost || lead.packageCost || lead.budget);
                            
                            let totalReceived = 0;
                            let paymentHistory = [];
                            try { 
                                paymentHistory = typeof lead.paymentHistoryDetails === 'string' 
                                    ? JSON.parse(lead.paymentHistoryDetails) 
                                    : (lead.paymentHistoryList || []); 
                            } catch(e) {}
                            
                            // Money In: mirrors AccountsDashboard's "Customer Payment" ledger —
                            // only leads with an actual paymentHistoryDetails array count toward the total.
                            const hasPaymentHistory = Array.isArray(paymentHistory) && paymentHistory.length > 0;
                            if (hasPaymentHistory) {
                                totalReceived = paymentHistory.reduce((sum, p) => sum + parseAmt(p.amount), 0);
                                calcTotalIn += totalReceived;
                            } else {
                                totalReceived = parseAmt(lead.amountReceived);
                            }

                            const amountReceived = totalReceived;
                            const balancePending = lead.balancePending ? parseAmt(lead.balancePending) : Math.max(0, packageCost - amountReceived);
                            
                            lead.computedTotalReceived = amountReceived;
                            lead.computedBalancePending = balancePending;
                            lead.computedPackageCost = packageCost;

                            calcPending += balancePending;

                            let payReqs = [];
                            try { 
                                const rawPayReqs = typeof lead.paymentRequests === 'string' ? JSON.parse(lead.paymentRequests) : lead.paymentRequests;
                                if (Array.isArray(rawPayReqs)) payReqs = rawPayReqs;
                                else if (rawPayReqs && typeof rawPayReqs === 'object') payReqs = [rawPayReqs]; // legacy single-object shape — wrap instead of dropping
                            } catch(e) {}
                            
                            // Money Out: pulls from every vendor request (same rows AccountsDashboard's
                            // "Vendor Payment" tab lists), but sums outAmountPaid — the amount Operations
                            // has actually paid the vendor — matching the "Paid Ops" figure shown per lead below.
                            let leadVendorTotalPaid = 0;
                            payReqs.forEach(req => {
                                if ((req.providerName || req.service) && req.amountToPay) {
                                    const outAmt = parseAmt(req.outAmountPaid);
                                    leadVendorTotalPaid += outAmt;
                                    calcTotalOut += outAmt;
                                }
                            });

                            if (amountReceived > 0 || balancePending > 0 || leadVendorTotalPaid > 0) {
                                indPaymentList.push({
                                    id: lead.id,
                                    customerName: lead.customerName || lead.profileName || 'N/A',
                                    destination: lead.destination || 'N/A',
                                    received: amountReceived,
                                    vendorPaid: leadVendorTotalPaid,
                                    pending: balancePending,
                                    paymentStatus: lead.paymentStatus || 'Pending',
                                    rawLead: lead
                                });
                            }

                            if (lead.status === 'Confirmed Bookings' || lead.status === 'Upcoming Departure') {
                                const tDate = lead.travelDates || lead.travelDate || lead.tourStartDate;
                                if (tDate) {
                                    const tripDate = new Date(tDate);
                                    const diffDays = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    if (diffDays >= 0 && diffDays <= 7) {
                                        alertsCalculated.push({
                                            id: lead.id,
                                            customerName: lead.customerName || lead.profileName || 'Customer',
                                            destination: lead.destination || 'TBD',
                                            date: tDate,
                                            daysLeft: diffDays
                                        });
                                    }
                                }
                            }
                            
                            return lead;
                        });

                        setAllLeads(processedLeads); 
                        const unassignedCount = processedLeads.filter(l => !l.status || l.status === 'Jobs').length;
                        setUnassignedJobsCount(unassignedCount);
                        
                        setPayments({ totalIn: calcTotalIn, totalOut: calcTotalOut, pending: calcPending });
                        setIndividualPayments(indPaymentList.sort((a, b) => b.pending - a.pending));
                        setFulfillmentAlerts(alertsCalculated.sort((a,b) => a.daysLeft - b.daysLeft));
                    }
                }

                if (jobsRes.ok) {
                    const jobsData = await jobsRes.json();
                    if (Array.isArray(jobsData)) {
                        const closedLeads = allLeads
                            .filter(l => l?.status === 'Trip Closed')
                            .map(lead => ({ ...lead, jobId: `LMN${lead.id}`, customerName: lead.customerName || 'N/A' })); 
                        
                        const closedLeadIds = new Set(closedLeads.map(l => l.jobId));
                        const distinctJobs = jobsData
                            .map(j => ({ ...j, jobId: j.jobId || `LMN${j.id}`, customerName: j.profileName || j.customerName || 'N/A' }))
                            .filter(j => !closedLeadIds.has(j.jobId));

                        const combinedClosedTrips = [...closedLeads, ...distinctJobs];
                        const indiaCount = combinedClosedTrips.filter(j => isIndiaDestination(j.destination)).length;
                        
                        setTripRegionCounts({ india: indiaCount, international: combinedClosedTrips.length - indiaCount });
                        setClosedTrips(combinedClosedTrips);
                    }
                }

            } catch (err) { console.error("Telemetry context syncing failure:", err); }
        };

        fetchDashboardData();
        const intervalId = setInterval(fetchDashboardData, 2000); 
        return () => { clearInterval(intervalId); clearInterval(timer); };
    }, [allLeads.length]);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'Hi! I am your ITOUR AI. Need help drafting an email or planning an itinerary?' }]);
    const messagesEndRef = useRef(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);

    const handleSendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const userMessage = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setChatInput('');
        setIsChatLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMessage, employeeId: currentUserIdentifier })
            });
            const data = await res.json();
            setChatMessages(prev => [...prev, { role: 'ai', text: res.ok && data.reply ? data.reply : `⚠️ Failed to context map dynamic vectors.` }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'ai', text: '⚠️ Connection timeout.' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    useEffect(() => {
        const handleOpenChat = () => setIsChatOpen(true);
        window.addEventListener('open-ai-chat', handleOpenChat);
        return () => window.removeEventListener('open-ai-chat', handleOpenChat);
    }, []);

    const handleRegionCardClick = (regionType) => {
        const targetIsIndia = regionType === 'india';
        const filtered = closedTrips.filter(t => isIndiaDestination(t.destination) === targetIsIndia);
        setRegionModal({
            open: true,
            regionName: targetIsIndia ? 'National (India) Trips Breakdown' : 'International Trips Breakdown',
            tripsList: filtered
        });
    };

    const handleStatCardClick = (type) => {
        let list = [];
        let title = '';
        const todayStr = new Date().toDateString();

        const combinedData = [...allLeads, ...closedTrips.filter(j => !allLeads.some(l => l.id === j.id))];

        if (type === 'Today Leads') { 
            list = allLeads.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === todayStr); 
            title = 'Today Leads Breakdown'; 
        } 
        else if (type === 'Pending Quotation') { 
            list = combinedData.filter(item => item.status === 'Move To Operation' || item.status === 'Shared to Sales'); 
            title = 'Operations Desk (Pending Quotation) Breakdown'; 
        } 
        else if (type === 'Booking Confirmation') { 
            list = combinedData.filter(item => item.status === 'Confirmed Bookings' || item.status === 'Booking Confirmation' || item.status === 'Upcoming Departure'); 
            title = 'Booking Confirmation Breakdown'; 
        }
        else if (type === 'On-Trip') {
            list = combinedData.filter(item => item.status === 'On-Trip' || item.status === 'On Trip' || item.status === 'Active Trip');
            title = 'On-Trip Breakdown';
        }

        setRegionModal({
            open: true, regionName: title, tripsList: list
        });
    };

    const handleDestinationClick = (destinationName) => {
        const filteredLeads = allLeads.filter(lead => 
            lead.destination && lead.destination.toLowerCase() === destinationName.toLowerCase()
        );

        setRegionModal({
            open: true, 
            regionName: `Leads for ${destinationName}`, 
            tripsList: filteredLeads
        });
    };

    const combinedData = [...allLeads, ...closedTrips.filter(j => !allLeads.some(l => l.id === j.id))];
    const todayStr = new Date().toDateString();
    
    const computedStats = {
        todayLeads: allLeads.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === todayStr).length || stats.todayLeads,
        pendingQuotation: combinedData.filter(item => item.status === 'Move To Operation' || item.status === 'Shared to Sales').length,
        bookingConfirmation: combinedData.filter(item => item.status === 'Confirmed Bookings' || item.status === 'Booking Confirmation' || item.status === 'Upcoming Departure').length,
        onTrip: combinedData.filter(item => item.status === 'On-Trip' || item.status === 'On Trip' || item.status === 'Active Trip').length
    };

    return (
        <div className={`min-h-screen w-full p-3 sm:p-5 lg:p-7 pt-20 sm:pt-24 lg:pt-6 pb-24 space-y-4 sm:space-y-5 poppins-regular text-base relative custom-scrollbar overflow-x-hidden transition-colors duration-300 ${darkMode ? 'bg-[#0b0f1a] text-slate-100 dark' : 'bg-slate-100 text-slate-800'}`}>

            {toast.show && (
                <div className={`fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[200] flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.4)] border transition-all backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100' : 'bg-red-950/90 border-red-500/30 text-red-100'}`}>
                    {toast.type === 'success' ? <Check size={18} className="text-emerald-400 flex-shrink-0" /> : <AlertCircle size={18} className="text-red-400 flex-shrink-0" />}
                    <p className="text-sm font-medium pr-4">{toast.message}</p>
                    <button onClick={() => setToast({ ...toast, show: false })} className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0"><X size={16} /></button>
                </div>
            )}

            {/* ── LEAVE APPLICATION MODAL (EMPLOYEES ONLY) ── */}
            <Modal open={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} title="Apply for Leave" maxWidth="max-w-md">
                <div className="px-1 py-1 space-y-4">
                    
                    <Field label="Leave Type">
                        <Select 
                            options={['Leave', 'Week Off', 'Half Day']} 
                            value={leaveForm.leaveType} 
                            onChange={v => setLeaveForm(f => ({ ...f, leaveType: v, startDate: '', endDate: '', reason: '', handoverTo: '', handoverNotes: '', workedOnDate: '', session: '' }))} 
                            placeholder=""
                        />
                    </Field>

                    {leaveForm.leaveType === 'Leave' && (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <Field label="From Date">
                                    <DateInput value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} />
                                </Field>
                                <Field label="To Date">
                                    <DateInput value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} />
                                </Field>
                            </div>
                            <Field label="Total Days">
                                <Input value={calculateDays(leaveForm.startDate, leaveForm.endDate)} readOnly className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-bold" />
                            </Field>
                            <Field label="Reason" className="mb-0">
                                <TextArea rows="2" value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
                            </Field>
                            <Field label="Work Handover To">
                                <Select 
                                    options={allEmployees.filter(emp => emp.designation?.toLowerCase() !== 'admin').map(emp => emp.name)} 
                                    value={leaveForm.handoverTo} 
                                    onChange={v => setLeaveForm(f => ({ ...f, handoverTo: v }))} 
                                    placeholder=""
                                />
                            </Field>
                            <Field label="Handover Notes">
                                <Input value={leaveForm.handoverNotes} onChange={e => setLeaveForm(f => ({ ...f, handoverNotes: e.target.value }))} />
                            </Field>
                        </>
                    )}

                    {leaveForm.leaveType === 'Week Off' && (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <Field label="Week Off Date">
                                    <DateInput value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} />
                                </Field>
                                <Field label="Worked On">
                                    <DateInput value={leaveForm.workedOnDate} onChange={e => setLeaveForm(f => ({ ...f, workedOnDate: e.target.value }))} />
                                </Field>
                            </div>
                            <Field label="Reason" className="mb-0">
                                <TextArea rows="2" value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
                            </Field>
                            <Field label="Work Handover To">
                                <Select 
                                    options={allEmployees.filter(emp => emp.designation?.toLowerCase() !== 'admin').map(emp => emp.name)} 
                                    value={leaveForm.handoverTo} 
                                    onChange={v => setLeaveForm(f => ({ ...f, handoverTo: v }))} 
                                    placeholder=""
                                />
                            </Field>
                            <Field label="Handover Notes">
                                <Input value={leaveForm.handoverNotes} onChange={e => setLeaveForm(f => ({ ...f, handoverNotes: e.target.value }))} />
                            </Field>
                        </>
                    )}

                    {leaveForm.leaveType === 'Half Day' && (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <Field label="Date">
                                    <DateInput value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} />
                                </Field>
                                <Field label="Session">
                                    <Select 
                                        options={['First Half', 'Second Half']} 
                                        value={leaveForm.session} 
                                        onChange={v => setLeaveForm(f => ({ ...f, session: v }))} 
                                        placeholder=""
                                    />
                                </Field>
                            </div>
                            <Field label="Reason" className="mb-0">
                                <TextArea rows="3" value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
                            </Field>
                        </>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button onClick={() => setLeaveModalOpen(false)} className="w-full sm:flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold transition-colors order-2 sm:order-1">CANCEL</button>
                    <button onClick={applyLeave} className="w-full sm:flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 order-1 sm:order-2">
                        SUBMIT
                    </button>
                </div>
            </Modal>

            <Modal open={allLeavesModalOpen} onClose={() => setAllLeavesModalOpen(false)} title={isAdmin ? "All Team Leaves" : "My Leave History"} maxWidth="max-w-3xl">
                <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {leaves.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">No leave records found.</p>
                    ) : (
                        leaves.map(leave => (
                            <div key={leave.id} className={`p-4 rounded-2xl border transition-colors ${
                                leave.status === 'Pending' ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10' :
                                'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/40'
                            }`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            {leave.employeeName} 
                                            {isAdmin && <span className="text-[10px] font-mono text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg">ID: {leave.employeeId}</span>}
                                        </p>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono space-y-1">
                                            <p>
                                                <span className="font-bold text-slate-600 dark:text-slate-300">{leave.leaveType || 'Leave'}</span>
                                                {leave.leaveType === 'Leave' && leave.totalDays && ` • ${leave.totalDays} Days`}
                                            </p>
                                            <p>
                                                {leave.leaveType === 'Half Day' ? (
                                                    `${leave.startDate} • ${leave.session}`
                                                ) : leave.leaveType === 'Week Off' ? (
                                                    `Off: ${leave.startDate} • Worked: ${leave.workedOnDate}`
                                                ) : (
                                                    `${leave.startDate} to ${leave.endDate || 'N/A'}`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-xl border uppercase tracking-wide flex-shrink-0 ${
                                        leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 
                                        leave.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 
                                        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    }`}>
                                        {leave.status}
                                    </span>
                                </div>
                                
                                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0d1526] p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-2.5">
                                    <p><span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-1">Reason</span> {leave.reason}</p>
                                    
                                    {(leave.handoverTo || leave.handoverNotes) && (
                                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/50 space-y-2.5">
                                            {leave.handoverTo && (
                                                <p><span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-1">Handover To</span> {leave.handoverTo}</p>
                                            )}
                                            {leave.handoverNotes && (
                                                <p><span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-1">Handover Notes</span> {leave.handoverNotes}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {isAdmin && leave.status === 'Pending' && (
                                    <div className="flex gap-3 mt-4">
                                        <button onClick={() => handleLeaveAction(leave.id, 'Approved')} className="flex-1 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors flex justify-center items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                                            <Check size={14}/> Approve Leave
                                        </button>
                                        <button onClick={() => handleLeaveAction(leave.id, 'Rejected')} className="flex-1 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors flex justify-center items-center gap-1.5 shadow-sm shadow-rose-500/20">
                                            <X size={14}/> Reject Leave
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-5 flex justify-end">
                    <button onClick={() => setAllLeavesModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">Close</button>
                </div>
            </Modal>

            <Modal open={leadModalOpen} onClose={() => setLeadModalOpen(false)} title="Add New Travel Lead" maxWidth="max-w-4xl">
                <div className="flex flex-col h-full">
                    <div className="space-y-5 flex-1 px-1 py-1">
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50 pb-2.5 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <Users size={14} className="text-violet-400" /> CUSTOMER INFORMATION	
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                <Field label="Customer Name"><Input value={leadForm.customerName} onChange={e => setLeadForm({ ...leadForm, customerName: e.target.value })} autoFocus /></Field>
                                <Field label="Mobile Number"><Input type="tel" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} /></Field>
                                <Field label="Email Address"><Input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} /></Field>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50 pb-2.5 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <MapPin size={14} className="text-emerald-400" /> TRAVEL REQUIREMENT	
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <Field label="Destination"><Input value={leadForm.destination} onChange={e => setLeadForm({ ...leadForm, destination: e.target.value })} /></Field>
                                <Field label="Tentative Travel Date"><Input value={leadForm.travelDates} onChange={e => setLeadForm({ ...leadForm, travelDates: e.target.value })} /></Field>
                                <Field label="Number of Adults"><Select options={PAX_OPTIONS} value={leadForm.pax} onChange={v => setLeadForm({ ...leadForm, pax: v })} placeholder="" /></Field>
                                <Field label="Number of Children"><Select options={CHILDREN_OPTIONS} value={leadForm.childrenPax} onChange={v => setLeadForm({ ...leadForm, childrenPax: v })} placeholder="" /></Field>
                                <Field label="Budgett"><Select options={BUDGET_OPTIONS} value={leadForm.budget} onChange={v => setLeadForm({ ...leadForm, budget: v })} placeholder="" allowCustom={true} /></Field>
                                <Field label="Package Type"><Select options={PACKAGE_TYPES} value={leadForm.packageType} onChange={v => setLeadForm({ ...leadForm, packageType: v })} placeholder="" allowCustom={true} /></Field>
                            <Field label="Message from Lead"><TextArea rows="3" value={leadForm.leadMessage} onChange={e => setLeadForm({ ...leadForm, leadMessage: e.target.value })} /></Field>
                                
                            </div>
                        </div>
                          
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50 pb-2.5 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <Target size={14} className="text-blue-400" /> LEAD SOURCE	
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <Field label="Platform"><Select options={PLATFORM_OPTIONS} value={leadForm.platform} onChange={v => setLeadForm({ ...leadForm, platform: v })} placeholder="" allowCustom={true} /></Field>
                                <Field label="Campaign Name"><Select options={campaignOptions} value={leadForm.campaign} onChange={v => setLeadForm({ ...leadForm, campaign: v })} placeholder="" allowCustom={true} /></Field>
                            </div>
                        </div>
                     
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/40 mt-5 sticky bottom-0 bg-white dark:bg-[#141b2d] pb-1 z-20">
                        <button onClick={() => setLeadModalOpen(false)} className="w-full sm:flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold transition-colors order-2 sm:order-1">Cancel</button>
                        <button onClick={saveLead} disabled={!leadForm.customerName.trim()} className="w-full sm:flex-1 py-2.5 rounded-xl bg-[#06BC7D] hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 order-1 sm:order-2">
                            <Save size={16} /> Save New Lead
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal open={taskModal.open} onClose={closeTaskModal} title={taskModal.mode === 'add' ? 'Add New Task' : 'Edit Task'}>
                <div className="px-1 py-1 space-y-4">
                    <Field label="Task Title" className="mb-0"><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && saveTask()} autoFocus /></Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">Due Date / Time</label>
                            <div className="relative bg-slate-50 dark:bg-[#0d1526] border border-slate-200 dark:border-slate-700/60 rounded-xl focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all overflow-hidden group flex items-center">
                                <input
                                    type="datetime-local" name="due" value={taskForm.due || ''} onChange={(e) => setTaskForm(f => ({ ...f, due: e.target.value }))}
                                    className="w-full px-3 py-2.5 text-sm bg-transparent text-slate-800 dark:text-slate-200 outline-none cursor-pointer appearance-none relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:top-0"
                                />
                                <Calendar size={15} className="absolute right-3 text-slate-400 group-hover:text-blue-400 z-0 pointer-events-none transition-colors" />
                            </div>
                        </div>
                        <Field label="Priority" className="mb-0"><Select options={PRIORITIES} value={taskForm.priority} onChange={v => setTaskForm(f => ({ ...f, priority: v }))} /></Field>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button onClick={closeTaskModal} className="w-full sm:flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold transition-colors order-2 sm:order-1">Cancel</button>
                    <button onClick={saveTask} disabled={!taskForm.title.trim()} className="w-full sm:flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 order-1 sm:order-2">
                        <Save size={16} /> {taskModal.mode === 'add' ? 'Add Task' : 'Save Changes'}
                    </button>
                </div>
            </Modal>

            <Modal open={eventModalOpen} onClose={() => setEventModalOpen(false)} title="Add Calendar Reminder">
                <div className="px-1 py-1">
                    <Field label="Reminder Title"><Input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} autoFocus /></Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Field label="Date"><Input type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} /></Field>
                        <Field label="Time"><Input type="time" value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))} /></Field>
                    </div>
                    <Field label="Category"><Select options={EVENT_CATEGORIES} value={eventForm.category} onChange={v => setEventForm(f => ({ ...f, category: v }))} placeholder="" /></Field>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button onClick={() => setEventModalOpen(false)} className="w-full sm:flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold transition-colors order-2 sm:order-1">Cancel</button>
                    <button onClick={saveEvent} disabled={!eventForm.title.trim() || !eventForm.date} className="w-full sm:flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 order-1 sm:order-2">
                        <Save size={16} /> Add Reminder
                    </button>
                </div>
            </Modal>

            <Modal open={allRemindersModalOpen} onClose={() => setAllRemindersModalOpen(false)} title="All Scheduled Reminders" maxWidth="max-w-2xl">
                <div className="space-y-2.5 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
                    {allReminderItems.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">No reminders found across any dates.</p>
                    ) : (
                        allReminderItems.map((ev) => (
                            <div key={ev.id} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3.5 rounded-xl border transition-colors ${ev.auto ? 'border-blue-100 dark:border-blue-700/30 bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{ev.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2">
                                        <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">{ev.date}</span>
                                        {!ev.auto && <span className="flex items-center gap-1 whitespace-nowrap"><Clock size={11} /> {ev.time}</span>}
                                        <span className="text-[9px] uppercase border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded-lg font-bold text-slate-400 whitespace-nowrap">{ev.category}</span>
                                        {ev.auto && <span className="text-[9px] uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded-lg font-bold whitespace-nowrap">Auto</span>}
                                    </p>
                                </div>
                                {!ev.auto && <button onClick={() => deleteEvent(ev.id)} className="self-end sm:self-center p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"><Trash2 size={15} /></button>}
                            </div>
                        ))
                    )}
                </div>
                <button onClick={() => setAllRemindersModalOpen(false)} className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">Close</button>
            </Modal>

            <Modal open={targetModal} onClose={() => { setTargetModal(false); setEditingTarget(null); }} title={editingTarget ? "Edit Target" : "Add Sales Target"} maxWidth="max-w-md">
                <div className="space-y-4 px-1 py-1">
                    <Field label="Target Name">
                        <Input value={targetForm.label} onChange={e => setTargetForm(f => ({ ...f, label: e.target.value }))} autoFocus />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Current Value">
                            <Input type="number" value={targetForm.value} onChange={e => setTargetForm(f => ({ ...f, value: Number(e.target.value) }))} />
                        </Field>
                        <Field label="Goal (Max)">
                            <Input type="number" value={targetForm.max} onChange={e => setTargetForm(f => ({ ...f, max: Number(e.target.value) }))} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Unit Designator">
                            <Input value={targetForm.unit} onChange={e => setTargetForm(f => ({ ...f, unit: e.target.value }))} />
                        </Field>
                        <Field label="Color Theme">
                            <div className="relative">
                                <input type="color" value={targetForm.color} onChange={e => setTargetForm(f => ({ ...f, color: e.target.value }))} className="w-full h-[42px] p-1 rounded-xl cursor-pointer bg-slate-50 dark:bg-[#0d1526] border border-slate-200 dark:border-slate-700/60" />
                            </div>
                        </Field>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button onClick={() => { setTargetModal(false); setEditingTarget(null); }} className="w-full sm:flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold transition-colors order-2 sm:order-1">Cancel</button>
                    <button onClick={saveTarget} disabled={!targetForm.label.trim() || targetForm.max <= 0} className="w-full sm:flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 order-1 sm:order-2">
                        <Save size={16} /> {editingTarget ? 'Save Changes' : 'Create Target'}
                    </button>
                </div>
            </Modal>

            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 dark:border-slate-700/30 shadow-sm dark:shadow-none flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-500/3 dark:to-blue-500/5 pointer-events-none rounded-2xl" />
                <div className="min-w-0 relative flex items-center gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl px-3.5 py-2 flex-shrink-0 border border-slate-200/60 shadow-sm">
                        <img src={logo} alt="i>Tour by Rethink Ways Pvt. Ltd." className="h-10 sm:h-12 lg:h-14 w-auto block" />
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight truncate">Welcome Back, {displayHeaderName}</h1>
                </div>
                <div className="flex items-center w-full lg:w-auto gap-2.5 sm:gap-3 relative">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700/60 text-slate-500 dark:text-amber-400 transition-all flex-shrink-0"
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {darkMode ? <Sun size={17}/> : <Moon size={17}/>}
                    </button>
                    <div className="hidden md:flex items-center bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/40 font-mono tabular-nums min-w-[300px] justify-between text-slate-500 dark:text-slate-400 text-xs tracking-wide">
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-blue-400" /> {formattedDate}</span>
                        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                        <span className="flex items-center gap-2"><Clock size={14} className="text-emerald-400" /> {formattedTime}</span>
                    </div>
                    <button onClick={() => setLeadModalOpen(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                        <Plus size={16}/> New Lead
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { id: 'Today Leads', label: 'Today Leads', value: computedStats.todayLeads, icon: <Users className="w-5 h-5 sm:w-6 sm:h-6"/>, accent: 'from-blue-500/20 to-blue-600/5', iconBg: 'bg-blue-500/15 text-blue-500 dark:text-blue-400', border: 'border-blue-500/10 dark:border-blue-500/10', glow: 'hover:border-blue-500/30 dark:hover:border-blue-500/20' },
                    { id: 'Pending Quotation', label: 'Pending Quotation', value: computedStats.pendingQuotation, icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6"/>, accent: 'from-amber-500/20 to-amber-600/5', iconBg: 'bg-amber-500/15 text-amber-500 dark:text-amber-400', border: 'border-amber-500/10 dark:border-amber-500/10', glow: 'hover:border-amber-500/30 dark:hover:border-amber-500/20' },
                    { id: 'Booking Confirmation', label: 'Booking Confirmation', value: computedStats.bookingConfirmation, icon: <BookmarkCheck className="w-5 h-5 sm:w-6 sm:h-6"/>, accent: 'from-emerald-500/20 to-emerald-600/5', iconBg: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/10 dark:border-emerald-500/10', glow: 'hover:border-emerald-500/30 dark:hover:border-emerald-500/20' },
                    { id: 'On-Trip', label: 'On-Trip', value: computedStats.onTrip, icon: <PlaneTakeoff className="w-5 h-5 sm:w-6 sm:h-6"/>, accent: 'from-violet-500/20 to-violet-600/5', iconBg: 'bg-violet-500/15 text-violet-500 dark:text-violet-400', border: 'border-violet-500/10 dark:border-violet-500/10', glow: 'hover:border-violet-500/30 dark:hover:border-violet-500/20' },
                ].map((s, i) => (
                    <div 
                        key={i} onClick={() => handleStatCardClick(s.id)}
                        className={`cursor-pointer group relative overflow-hidden bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-2xl border ${s.border} ${s.glow} flex flex-row items-center gap-3 sm:gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-none active:scale-[0.98]`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                        <div className={`p-2.5 sm:p-3 rounded-xl ${s.iconBg} flex-shrink-0 relative z-10`}>
                            {s.icon}
                        </div>
                        <div className="min-w-0 flex-1 relative z-10">
                            <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white leading-tight tracking-tight">{s.value}</h3>
                            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 truncate uppercase tracking-wide">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── SALES SPECIFIC DASHBOARD LAYOUT ─── */}
            {user?.role === ROLES.SALES ? (
                <div className="space-y-4 sm:space-y-5">
                    
                    {/* ── 3RD ROW: Employee List, Sales Targets, Top Destinations ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                        
                        {/* 1. Sales Report */}
                        <div className="bg-white dark:bg-[#0b101e] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col h-full lg:col-span-1 overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#111827]">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Sales Report</h2>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Today's Lead Counts & Status</p>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px] max-h-[320px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-[#0f1523] sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800/80">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Employee Name</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Counts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                        {/* Unassigned Today Leads Row */}
                                        <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200">Unassigned / New</td>
                                            <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-800 dark:text-white">
                                                {allLeads.filter(l => !l.assignedTo && !l.assignedToOps && l.createdAt && new Date(l.createdAt).toDateString() === todayStr).length}
                                            </td>
                                        </tr>
                                        
                                        {/* Dynamic Active Members Mapping (Today Leads Only & Logged In Today) */}
                                        {members
                                            .filter(member => member.lastActive && new Date(member.lastActive).toDateString() === todayStr)
                                            .map((member, idx) => {
                                                const todayCount = allLeads.filter(l => 
                                                    (l.assignedTo === member.name || l.assignedToOps === member.name) && 
                                                    l.createdAt && new Date(l.createdAt).toDateString() === todayStr
                                                ).length;
                                                
                                                return (
                                                    <tr key={member.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setSelectedMember(member)}>
                                                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                            <span className="truncate">{member.name}</span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right text-xs font-bold text-slate-800 dark:text-white">
                                                            {todayCount}
                                                        </td>
                                                    </tr>
                                                );
                                        })}
                                        
                                        {/* Self Assigned Today Leads Row */}
                                        <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200">Self Assigned</td>
                                            <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-800 dark:text-white">
                                                {allLeads.filter(l => (l.assignedTo === user?.name || l.assignedToOps === user?.name) && l.createdAt && new Date(l.createdAt).toDateString() === todayStr).length}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Sales Targets */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Sales Targets</h2>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Click ± to adjust</p>
                                </div>
                                <button onClick={() => { setEditingTarget(null); setTargetForm({ label: '', value: 0, max: 100, unit: '', isPercent: false, color: '#7c3aed' }); setTargetModal(true); }} className="flex items-center gap-1.5 text-xs font-bold text-violet-500 dark:text-violet-400 hover:text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-xl transition-colors border border-violet-500/15">
                                    <Plus size={13}/> Add
                                </button>
                            </div>
                            <div className="space-y-4 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                                {targets.map(item => {
                                    const pct = item.max > 0 ? Math.min(100, Math.round((item.value / item.max) * 100)) : 0;
                                    return (
                                        <div key={item.id} className="group">
                                            <div className="flex justify-between items-center mb-2 gap-2">
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{item.label}</span>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => nudgeTarget(item.id, -1, item.value, item.max, item.unit)} className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Minus size={10}/></button>
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 min-w-[58px] text-center font-mono">{formatTargetDisplay(item)}</span>
                                                        <button onClick={() => nudgeTarget(item.id, 1, item.value, item.max, item.unit)} className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Plus size={10}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <ProgressBar value={item.value} max={item.max} color={item.color} />
                                        </div>
                                    );
                                })}
                                {targets.length === 0 && <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">No targets set. Add one!</div>}
                            </div>
                        </div>

                        {/* 3. Top Destinations */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Top Destinations</h2>
                                </div>
                                <button type="button" onClick={() => setTopDestinationsModalOpen(true)} className="px-3 py-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">View All</button>
                            </div>
                            <div className="space-y-1 flex-1 mt-1 overflow-y-auto max-h-[320px] custom-scrollbar">
                                {topDestinations.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">No destination data yet.</div>
                                ) : (
                                    topDestinations.slice(0, 5).map((dest, idx) => (
                                        <div key={idx} onClick={() => handleDestinationClick(dest.name)} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 py-2.5 -mx-1 rounded-xl transition-all">
                                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-bold border border-amber-500/15 flex-shrink-0">{idx + 1}</div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-500 transition-colors truncate">{dest.name}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">Destination</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{dest.count}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── 4TH ROW: Tasks, Alerts, Calendars ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                        
                        {/* 1. Tasks */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Tasks</h2>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">{taskCounts.pending} pending</p>
                                </div>
                                <button onClick={openAddTask} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-500/20">
                                    <Plus size={13} /> Add Task
                                </button>
                            </div>
                            <div className="space-y-1 flex-1 overflow-y-auto max-h-[320px] custom-scrollbar pr-1">
                                {filteredTasks.length === 0 && <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">No tasks here. Add one!</div>}
                                {filteredTasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between py-3 px-3 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 group transition-all gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <button onClick={() => toggleTask(task.id, task.completed)} className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all cursor-pointer flex-shrink-0 ${task.completed ? 'bg-violet-500 border-violet-500' : 'bg-transparent border-slate-300 dark:border-slate-600 hover:border-violet-400'}`}>
                                                {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
                                            </button>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-semibold truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</p>
                                            </div>
                                        </div>
                                        <PriorityBadge priority={task.priority} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Alerts (Using Reminders/Events list as Alerts) */}
                        <div className="bg-white dark:bg-[#111827] border border-blue-200/60 dark:border-blue-900/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 flex-shrink-0">
                                        <BellRing size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">System Alerts</h2>
                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Active Notifications</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2.5 overflow-y-auto max-h-[320px] custom-scrollbar">
                                {events.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">No active alerts to display.</div>
                                ) : (
                                    events.map((ev) => (
                                        <div key={ev.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3.5 rounded-xl border border-blue-100 dark:border-blue-700/40 bg-blue-50/50 dark:bg-blue-800/10 hover:bg-blue-100/50 dark:hover:bg-blue-800/20 transition-colors">
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{ev.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2">
                                                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">{ev.date}</span>
                                                    <span className="flex items-center gap-1 whitespace-nowrap"><Clock size={11} /> {ev.time}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 3. Calendar */}
                        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/30 flex flex-col gap-3 shadow-sm lg:col-span-1">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Calendar</h2>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{monthNames[currentDate.getMonth()].substring(0,3)} {currentDate.getFullYear()}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30 rounded-xl p-2.5">
                                <div className="flex justify-between items-center mb-2.5 px-0.5">
                                    <div className="flex gap-1">
                                        <button onClick={prevDay} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-slate-400"><ChevronLeft size={14}/></button>
                                        <button onClick={nextDay} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-slate-400"><ChevronRight size={14}/></button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center gap-1">
                                    {dateStrip.map((date, idx) => {
                                        const isSelected = date.toDateString() === currentDate.toDateString();
                                        return (
                                            <div key={idx} onClick={() => { setCurrentDate(date); openAddEvent(date); }}
                                                className={`flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer transition-all w-full min-w-0 ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/40'}`}>
                                                <span className="text-[8px] uppercase font-bold tracking-wider mb-1 block">{date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2)}</span>
                                                <span className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>{date.getDate()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                                <button onClick={() => setAllRemindersModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700/30 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700/50">
                                    <Eye size={12}/> <span>View All</span>
                                </button>
                                <button onClick={() => openAddEvent(currentDate)} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-[11px] font-bold transition-colors shadow-lg shadow-blue-500/20">
                                    <Plus size={12}/> <span>Create</span>
                                </button>   
                            </div>
                        </div>
                    </div>

                    {/* ── 5TH ROW: Leave Form, Fulfillment Reports ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                        
                        {/* 1. Leave Form (My Leaves) */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">My Leaves</h2>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Track your applications</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setAllLeavesModalOpen(true)} className="px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors bg-blue-50/50 dark:bg-transparent">View All</button>
                                    <button onClick={() => setLeaveModalOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20">
                                        <Plus size={13} /> Apply Leave
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                                {leaves.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">No leave history found.</div>
                                ) : (
                                    leaves.slice(0, 5).map(leave => (
                                        <div key={leave.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{leave.startDate} to {leave.endDate || 'N/A'}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]">
                                                    <span className="font-semibold text-slate-600 dark:text-slate-300">{leave.leaveType || 'Leave'}</span> • {leave.reason}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide flex-shrink-0 ${
                                                leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                leave.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            }`}>
                                                {leave.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 2. Fulfillment Reports (Fulfillment Alerts) */}
                        <div className="bg-white dark:bg-[#111827] border border-rose-200/60 dark:border-rose-900/30 rounded-2xl p-4 sm:p-5 shadow-sm lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 flex-shrink-0">
                                        <AlertTriangle size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Fulfillment Reports</h2>
                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Trips within 7 days</p>
                                    </div>
                                </div>
                                <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-xl text-[10px] font-bold border border-rose-500/20 uppercase tracking-wide">{fulfillmentAlerts.length} Action{fulfillmentAlerts.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-2.5 overflow-y-auto max-h-[250px] custom-scrollbar">
                                {fulfillmentAlerts.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">No upcoming trips in the next 7 days.</div>
                                ) : (
                                    fulfillmentAlerts.map(alert => (
                                        <div key={alert.id} className="flex items-center justify-between bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 p-3 rounded-xl hover:bg-rose-100/80 dark:hover:bg-rose-500/10 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                                <div className="p-2 bg-rose-500/15 text-rose-500 rounded-xl flex-shrink-0"><PackageCheck size={15}/></div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{alert.customerName} — {alert.destination}</p>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">Trip starts <span className="font-bold text-slate-700 dark:text-slate-300">{alert.date}</span></p>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-sm shadow-rose-500/20 uppercase tracking-wide flex-shrink-0">Review</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── 6TH ROW: Due & Follow-Up Alerts (next 5 days) ── */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        <div className="bg-white dark:bg-[#111827] border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 sm:p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 flex-shrink-0">
                                        <AlarmClock size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Due & Follow-Up Alerts</h2>
                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Sales, Ops, Fulfillment &amp; Accounts · next 5 days</p>
                                    </div>
                                </div>
                                <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-xl text-[10px] font-bold border border-amber-500/20 uppercase tracking-wide">{dueSoonAlerts.length} Alert{dueSoonAlerts.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                                {dueSoonAlerts.length === 0 ? (
                                    <div className="col-span-full text-center py-8 text-slate-400 text-xs">Nothing due or following up in the next 5 days.</div>
                                ) : (
                                    dueSoonAlerts.map(alert => (
                                        <div key={alert.id} className="flex items-start justify-between gap-2 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 p-3 rounded-xl hover:bg-amber-100/80 dark:hover:bg-amber-500/10 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{alert.title}</p>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">{alert.category} · <span className="font-bold text-slate-700 dark:text-slate-300">{alert.date}</span></p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide flex-shrink-0 ${alert.daysLeft < 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : alert.daysLeft <= 1 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                                                {alert.daysLeft < 0 ? `${Math.abs(alert.daysLeft)}d overdue` : alert.daysLeft === 0 ? 'Today' : `${alert.daysLeft}d left`}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── NON-SALES DEFAULT DASHBOARD LAYOUT ─── */
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col h-[480px] lg:col-span-2">
                            <div className="flex justify-between items-center mb-3 flex-shrink-0">
                                <div>
                                    <h2 className="text-medium font-bold text-slate-800 dark:text-white tracking-tight">Payment</h2>
                                    <p className="text-[12px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Live ledger</p>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button type="button" onClick={() => setPaymentModalOpen(true)} className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors bg-emerald-50/50 dark:bg-transparent">View All</button>
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                        <Wallet size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mb-4 text-[14px] font-bold border border-slate-100 dark:border-slate-700/40 rounded-xl p-2.5 flex-shrink-0 bg-slate-50 dark:bg-slate-800/30">
                                <div className="flex-1">
                                    <span className="block text-slate-400 text-[12px] uppercase tracking-widest mb-0.5">Money In</span>
                                    <span className="text-emerald-500 font-mono">₹{payments.totalIn.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="w-px bg-slate-200 dark:bg-slate-700/50" />
                                <div className="flex-1">
                                    <span className="block text-slate-400 text-[12px] uppercase tracking-widest mb-0.5">Money Out</span>
                                    <span className="text-rose-400 font-mono">₹{payments.totalOut.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5 custom-scrollbar">
                                {individualPayments.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 text-xs">No live transaction profiles tracked.</div>
                                ) : (
                                    individualPayments.slice(0, 5).map(pay => (
                                        <div key={pay.id} onClick={() => setSelectedPaymentLead(pay.rawLead)} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/30 bg-slate-50/50 dark:bg-slate-800/20 space-y-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700/60 transition-all group">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{pay.customerName}</p>
                                                    <p className="text-[14px] text-slate-400 flex items-center gap-1 truncate mt-0.5"><MapPin size={9}/> {pay.destination} · LMN{pay.id}</p>
                                                </div>
                                                <span className={`text-[14px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wide flex-shrink-0 ${
                                                    pay.paymentStatus === 'Fully Paid' || pay.paymentStatus === 'Cleared' 
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                }`}>
                                                    {pay.paymentStatus}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/30 text-[12px] font-mono">
                                                <div>
                                                    <span className="text-slate-400 block text-[12px] uppercase tracking-wide mb-0.5">Received</span>
                                                    <span className="text-emerald-500 font-bold">₹{pay.received.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[12px] uppercase tracking-wide mb-0.5">Paid Ops</span>
                                                    <span className="text-rose-400 font-bold">₹{pay.vendorPaid.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[12px] uppercase tracking-wide mb-0.5">Balance</span>
                                                    <span className="text-amber-400 font-bold">₹{pay.pending.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/30 flex flex-col gap-3 shadow-sm lg:col-span-1">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Calendar</h2>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{monthNames[currentDate.getMonth()].substring(0,3)} {currentDate.getFullYear()}</span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30 rounded-xl p-2.5">
                                <div className="flex justify-between items-center mb-2.5 px-0.5">
                                    <div className="flex gap-1">
                                        <button onClick={prevDay} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-slate-400"><ChevronLeft size={14}/></button>
                                        <button onClick={nextDay} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-slate-400"><ChevronRight size={14}/></button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center gap-1">
                                    {dateStrip.map((date, idx) => {
                                        const isSelected = date.toDateString() === currentDate.toDateString();
                                        return (
                                            <div key={idx} onClick={() => { setCurrentDate(date); openAddEvent(date); }}
                                                className={`flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer transition-all w-full min-w-0 ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/40'}`}>
                                                <span className="text-[8px] uppercase font-bold tracking-wider mb-1 block">{date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2)}</span>
                                                <span className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>{date.getDate()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setAllRemindersModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700/30 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700/50">
                                    <Eye size={12}/> <span>View All</span>
                                </button>
                                <button onClick={() => openAddEvent(currentDate)} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-[11px] font-bold transition-colors shadow-lg shadow-blue-500/20">
                                    <Plus size={12}/> <span>Create</span>
                                </button>   
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-700/30 rounded-xl p-3 flex-1 flex flex-col">
                                <div className="flex justify-between items-center mb-2.5">
                                    <h3 className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Reminders · {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-full">{filteredEvents.length}</span>
                                </div>
                                <div className="space-y-2 flex-1 overflow-y-auto max-h-[140px] pr-1 custom-scrollbar">
                                    {filteredEvents.length === 0 ? (
                                        <p className="text-slate-400 text-center py-4 text-[10px]">No reminders today.</p>
                                    ) : (
                                        filteredEvents.map((event, idx) => {
                                            const evDate = event.date ? new Date(event.date + 'T00:00:00') : new Date();
                                            return (
                                                <div key={event.id || idx} className="flex gap-2.5 items-start group hover:bg-slate-100 dark:hover:bg-slate-800/40 p-1.5 rounded-lg transition-colors">
                                                    <div className="pl-2 border-l-2 border-blue-400/50 flex flex-col items-center min-w-[28px] flex-shrink-0">
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">{evDate.getDate()}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{monthNames[evDate.getMonth()].substring(0, 3)}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">{event.title}</h4>
                                                        <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            {event.auto ? <span className="uppercase tracking-wide text-blue-500 font-bold">{event.category}</span> : <><Clock size={9}/> {event.time}</>}
                                                        </p>
                                                    </div>
                                                    {!event.auto && <button onClick={() => deleteEvent(event.id)} className="text-slate-400 hover:text-red-400 p-1 flex-shrink-0 transition-colors"><Trash2 size={11}/></button>}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Tasks</h2>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">{taskCounts.pending} pending</p>
                                </div>
                                <button onClick={openAddTask} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-500/20">
                                    <Plus size={13} /> Add Task
                                </button>
                            </div>

                            <div className="flex gap-1.5 mb-4 bg-slate-100 dark:bg-slate-800/40 p-1 rounded-xl">
                                {[
                                    { key: 'all', label: `All (${taskCounts.all})` },
                                    { key: 'pending', label: `Pending (${taskCounts.pending})` },
                                    { key: 'completed', label: `Done (${taskCounts.completed})` },
                                ].map(tab => (
                                    <button key={tab.key} onClick={() => setTaskFilter(tab.key)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap px-2 cursor-pointer border-none uppercase tracking-wide ${taskFilter === tab.key ? 'bg-white dark:bg-slate-700/80 text-slate-800 dark:text-white shadow-sm' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-1 flex-1 overflow-y-auto max-h-[320px] sm:max-h-[380px] custom-scrollbar pr-1">
                                {filteredTasks.length === 0 && <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">No tasks here. Add one!</div>}
                                {filteredTasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between py-3 px-3 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 group transition-all gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <button onClick={() => toggleTask(task.id, task.completed)} className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all cursor-pointer flex-shrink-0 ${task.completed ? 'bg-violet-500 border-violet-500' : 'bg-transparent border-slate-300 dark:border-slate-600 hover:border-violet-400'}`}>
                                                {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
                                            </button>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-semibold truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1 uppercase tracking-wide"><Calendar size={9}/> {formatTaskDateTime(task.time)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <PriorityBadge priority={task.priority} />
                                            <div className="flex gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditTask(task)} className="p-1.5 rounded-lg text-slate-400 bg-transparent border-none cursor-pointer hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={12} /></button>
                                                <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-slate-400 bg-transparent border-none cursor-pointer hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Sales Targets</h2>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Click ± to adjust</p>
                                </div>
                                <button onClick={() => { setEditingTarget(null); setTargetForm({ label: '', value: 0, max: 100, unit: '', isPercent: false, color: '#7c3aed' }); setTargetModal(true); }} className="flex items-center gap-1.5 text-xs font-bold text-violet-500 dark:text-violet-400 hover:text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-xl transition-colors border border-violet-500/15">
                                    <Plus size={13}/> Add
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 mb-5">
                                <div 
                                    onClick={() => handleRegionCardClick('india')}
                                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-orange-500/15 bg-gradient-to-br from-orange-500/8 to-orange-500/3 relative overflow-hidden cursor-pointer hover:border-orange-500/30 hover:from-orange-500/12 active:scale-[0.98] transition-all group"
                                >
                                    <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-500 flex-shrink-0"><MapPin size={13}/></div>
                                    <div className="min-w-0">
                                        <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{tripRegionCounts.india}</p>
                                        <p className="text-[9px] text-slate-400 mt-1 font-semibold uppercase tracking-wide truncate group-hover:text-orange-400 transition-colors">🇮🇳 National</p>
                                    </div>
                                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                </div>
                                <div 
                                    onClick={() => handleRegionCardClick('international')}
                                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/8 to-cyan-500/3 relative overflow-hidden cursor-pointer hover:border-cyan-500/30 hover:from-cyan-500/12 active:scale-[0.98] transition-all group"
                                >
                                    <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-500 flex-shrink-0"><Globe size={13}/></div>
                                    <div className="min-w-0">
                                        <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{tripRegionCounts.international}</p>
                                        <p className="text-[9px] text-slate-400 mt-1 font-semibold uppercase tracking-wide truncate group-hover:text-cyan-400 transition-colors">🌐 Intl.</p>
                                    </div>
                                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {targets.map(item => {
                                    const pct = item.max > 0 ? Math.min(100, Math.round((item.value / item.max) * 100)) : 0;
                                    return (
                                        <div key={item.id} className="group">
                                            <div className="flex justify-between items-center mb-2 gap-2">
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{item.label}</span>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => nudgeTarget(item.id, -1, item.value, item.max, item.unit)} className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Minus size={10}/></button>
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 min-w-[58px] text-center font-mono">{formatTargetDisplay(item)}</span>
                                                        <button onClick={() => nudgeTarget(item.id, 1, item.value, item.max, item.unit)} className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Plus size={10}/></button>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-200 dark:border-slate-700/50">
                                                        <button onClick={() => openEditTarget(item)} className="w-5 h-5 rounded-lg hover:bg-blue-500/10 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors"><Pencil size={11}/></button>
                                                        <button onClick={() => deleteTarget(item.id)} className="w-5 h-5 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={11}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                            <ProgressBar value={item.value} max={item.max} color={item.color} />
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 text-right uppercase tracking-wide">{pct}% achieved</p>
                                        </div>
                                    );
                                })}
                                {targets.length === 0 && <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">No targets set. Add one!</div>}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:col-span-1">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Top Destinations</h2>
                                </div>
                                <button type="button" onClick={() => setTopDestinationsModalOpen(true)} className="px-3 py-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">View All</button>
                            </div>
                            <div className="space-y-1 flex-1 mt-1">
                                {topDestinations.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">No destination data yet.<br />Add some leads!</div>
                                ) : (
                                    topDestinations.slice(0, 5).map((dest, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleDestinationClick(dest.name)}
                                            className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 py-2.5 -mx-1 rounded-xl transition-all"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-bold border border-amber-500/15 flex-shrink-0">{idx + 1}</div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-500 transition-colors truncate">{dest.name}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">Destination</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{dest.count}</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">leads</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                        <div className="bg-white dark:bg-[#111827] border border-rose-200/60 dark:border-rose-900/30 rounded-2xl p-4 sm:p-5 shadow-sm lg:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 flex-shrink-0">
                                        <BellRing size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Fulfillment Alerts</h2>
                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Trips within 7 days</p>
                                    </div>
                                </div>
                                <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-xl text-[10px] font-bold border border-rose-500/20 uppercase tracking-wide">{fulfillmentAlerts.length} Action{fulfillmentAlerts.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-2.5 overflow-y-auto max-h-[240px] custom-scrollbar">
                                {fulfillmentAlerts.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">No upcoming trips in the next 7 days.</div>
                                ) : (
                                    fulfillmentAlerts.map(alert => (
                                        <div key={alert.id} className="flex items-center justify-between bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 p-3 rounded-xl hover:bg-rose-100/80 dark:hover:bg-rose-500/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-rose-500/15 text-rose-500 rounded-xl flex-shrink-0"><AlertTriangle size={15}/></div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{alert.customerName} — {alert.destination}</p>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">Trip starts <span className="font-bold text-slate-700 dark:text-slate-300">{alert.date}</span> · {alert.daysLeft}d left</p>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-sm shadow-rose-500/20 uppercase tracking-wide">Review</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col h-full lg:col-span-1">
                            <div className="flex justify-between items-start mb-4 gap-2">
                                <div>
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Active Team</h2>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">{members.filter(m => m.status === 'online').length} online now</p>
                                </div>
                                {members.length > 5 && (
                                    <button
                                        type="button" onClick={() => setAllMembersExpanded(!allMembersExpanded)}
                                        className="px-3 py-1.5 text-[11px] font-bold text-violet-500 dark:text-violet-400 border border-violet-500/20 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors flex-shrink-0"
                                    >
                                        {allMembersExpanded ? 'Less' : 'All'}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-0.5 min-h-[200px]">
                                {members.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">No active employees operating right now.</div>
                                ) : (
                                    (allMembersExpanded ? members : members.slice(0, 5)).map(member => (
                                        <div key={member.id} onClick={() => setSelectedMember(member)} className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group border border-transparent hover:border-slate-100 dark:hover:border-slate-700/30 cursor-pointer">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md uppercase" style={{ backgroundColor: member.color || '#7c3aed' }}>{member.initials}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate">{member.name}</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5 truncate uppercase tracking-wider font-semibold">{member.role}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/30">
                                                    <StatusDot status={member.status} />
                                                    <span className="hidden sm:inline text-[9px] font-bold text-slate-500 dark:text-slate-400 capitalize uppercase tracking-wide">{member.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Due & Follow-Up Alerts (next 5 days) ── */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        <div className="bg-white dark:bg-[#111827] border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 sm:p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 flex-shrink-0">
                                        <AlarmClock size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Due & Follow-Up Alerts</h2>
                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Sales, Ops, Fulfillment &amp; Accounts · next 5 days</p>
                                    </div>
                                </div>
                                <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-xl text-[10px] font-bold border border-amber-500/20 uppercase tracking-wide">{dueSoonAlerts.length} Alert{dueSoonAlerts.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                                {dueSoonAlerts.length === 0 ? (
                                    <div className="col-span-full text-center py-8 text-slate-400 text-xs">Nothing due or following up in the next 5 days.</div>
                                ) : (
                                    dueSoonAlerts.map(alert => (
                                        <div key={alert.id} className="flex items-start justify-between gap-2 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 p-3 rounded-xl hover:bg-amber-100/80 dark:hover:bg-amber-500/10 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{alert.title}</p>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">{alert.category} · <span className="font-bold text-slate-700 dark:text-slate-300">{alert.date}</span></p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide flex-shrink-0 ${alert.daysLeft <= 1 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                                                {alert.daysLeft < 0 ? `${Math.abs(alert.daysLeft)}d overdue` : alert.daysLeft === 0 ? 'Today' : `${alert.daysLeft}d left`}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 6: LEAVE MANAGEMENT ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                        {/* ── LEAVE DASHBOARD (EMPLOYEES ONLY) ── */}
                        {isSalesOrOps && (
                            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700/30 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:col-span-1">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">My Leaves</h2>
                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Track your applications</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setAllLeavesModalOpen(true)} className="px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors bg-blue-50/50 dark:bg-transparent">View All</button>
                                        <button onClick={() => setLeaveModalOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20">
                                            <Plus size={13} /> Apply Leave
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                                    {leaves.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-xs">No leave history found.</div>
                                    ) : (
                                        leaves.slice(0, 3).map(leave => (
                                            <div key={leave.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{leave.startDate} to {leave.endDate || 'N/A'}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{leave.leaveType || 'Leave'}</span> • {leave.reason}
        </p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide flex-shrink-0 ${
                                                    leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    leave.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {leave.status}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── LEAVE APPROVAL DASHBOARD (ADMIN ONLY) ── */}
                        {isAdmin && (
                            <div className="bg-white dark:bg-[#111827] border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 sm:p-5 shadow-sm lg:col-span-1">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 flex-shrink-0">
                                            <AlertCircle size={16} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Team Leaves</h2>
                                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Admin Overview</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setAllLeavesModalOpen(true)} className="px-3 py-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors bg-amber-50/50 dark:bg-transparent">View All</button>
                                        <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-xl text-[10px] font-bold border border-amber-500/20 uppercase tracking-wide">{leaves.filter(l => l.status === 'Pending').length} Pending</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2.5 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                                    {leaves.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-xs">No leave requests found.</div>
                                    ) : (
                                        leaves.slice(0, 3).map(leave => (
                                            <div key={leave.id} className={`p-3 border rounded-xl transition-colors ${
                                                leave.status === 'Pending' ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10' :
                                                'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/40'
                                            }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                            {leave.employeeName} <span className="font-normal text-slate-500 text-[10px]">({leave.employeeId})</span>
                                                        </p>
                                                        <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-mono space-y-0.5">
                                                            <p>
                                                                <span className="font-bold text-slate-600 dark:text-slate-300">{leave.leaveType || 'Leave'}</span>
                                                                {leave.leaveType === 'Leave' && leave.totalDays && ` • ${leave.totalDays} Days`}
                                                            </p>
                                                            <p>
                                                                {leave.leaveType === 'Half Day' ? (
                                                                    `${leave.startDate} • ${leave.session}`
                                                                ) : leave.leaveType === 'Week Off' ? (
                                                                    `Off: ${leave.startDate} • Worked: ${leave.workedOnDate}`
                                                                ) : (
                                                                    `${leave.startDate} to ${leave.endDate || 'N/A'}`
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wide flex-shrink-0 ${
                                                        leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                        leave.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    }`}>
                                                        {leave.status}
                                                    </span>
                                                </div>
                                                
                                                <div className="text-[10px] text-slate-600 dark:text-slate-300 mb-3 bg-white dark:bg-[#0d1526] p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50 space-y-2">
                                                    <p><span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block mb-0.5">Reason</span> {leave.reason}</p>
                                                    
                                                    {(leave.handoverTo || leave.handoverNotes) && (
                                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
                                                            {leave.handoverTo && (
                                                                <p><span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block mb-0.5">Handover To</span> {leave.handoverTo}</p>
                                                            )}
                                                            {leave.handoverNotes && (
                                                                <p><span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block mb-0.5">Handover Notes</span> {leave.handoverNotes}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {leave.status === 'Pending' && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleLeaveAction(leave.id, 'Approved')} className="flex-1 py-1.5 text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors flex justify-center items-center gap-1 shadow-sm shadow-emerald-500/20">
                                                            <Check size={12}/> Approve
                                                        </button>
                                                        <button onClick={() => handleLeaveAction(leave.id, 'Rejected')} className="flex-1 py-1.5 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors flex justify-center items-center gap-1 shadow-sm shadow-rose-500/20">
                                                            <X size={12}/> Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="All Payment List" maxWidth="max-w-3xl">
                <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                    {individualPayments.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">No payment ledgers available to display.</p>
                    ) : (
                        individualPayments.map(pay => (
                            <div key={pay.id} onClick={() => setSelectedPaymentLead(pay.rawLead)} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700/30 bg-slate-50 dark:bg-[#0d1526] space-y-3 hover:border-emerald-500/30 hover:shadow-sm transition-all cursor-pointer">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{pay.customerName}</p>
                                        <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                                            <MapPin size={11} className="text-violet-400" /> {pay.destination} <span className="text-slate-300 dark:text-slate-600">·</span> <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg text-[9px]">LMN{pay.id}</span>
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border uppercase tracking-wide flex-shrink-0 ${
                                        pay.paymentStatus === 'Fully Paid' || pay.paymentStatus === 'Cleared' 
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                            : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                                    }`}>
                                        {pay.paymentStatus}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/30">
                                    <div className="bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wide mb-1">Received</span>
                                        <span className="text-emerald-500 font-bold text-sm font-mono truncate block">₹{pay.received.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wide mb-1">Ops Paid</span>
                                        <span className="text-rose-500 font-bold text-sm font-mono truncate block">₹{pay.vendorPaid.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wide mb-1">Balance</span>
                                        <span className="text-amber-500 font-bold text-sm font-mono truncate block">₹{pay.pending.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-5 flex justify-end">
                    <button onClick={() => setPaymentModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">Close</button>
                </div>
            </Modal>

            <Modal open={topDestinationsModalOpen} onClose={() => setTopDestinationsModalOpen(false)} title="Top Destinations Breakdown" maxWidth="max-w-2xl">
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {topDestinations.map((dest, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => {
                                setTopDestinationsModalOpen(false);
                                handleDestinationClick(dest.name);
                            }}
                            className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-700/30 p-3.5 bg-slate-50 dark:bg-[#0d1526] cursor-pointer hover:border-amber-500/30 hover:bg-amber-50/50 dark:hover:bg-slate-800/60 transition-all"
                        >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold flex-shrink-0 text-xs border border-amber-500/15">{idx + 1}</div>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{dest.name}</span>
                            </div>
                            <span className="font-bold font-mono text-slate-800 dark:text-white flex-shrink-0 text-sm">{dest.count} <span className="text-slate-400 text-xs font-normal">leads</span></span>
                        </div>
                    ))}
                </div>
            </Modal>

            <Modal 
                open={regionModal.open} onClose={() => setRegionModal(prev => ({ ...prev, open: false }))} 
                title={regionModal.regionName} maxWidth="max-w-2xl"
            >
                <div className="space-y-2.5 overflow-y-auto max-h-[55vh] pr-1 custom-scrollbar">
                    {regionModal.tripsList.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">No metrics available for this category right now.</p>
                    ) : (
                        regionModal.tripsList.map((trip, idx) => (
                            <div key={idx} onClick={() => setSelectedLeadDetails(trip)} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer hover:border-violet-500/20">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2.5">
                                        <span className="bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-violet-400 whitespace-nowrap">{trip.jobId || `LMN${trip.id}`}</span>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{trip.customerName || trip.profileName || 'Unknown'}</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                                        {isIndiaDestination(trip.destination) ? <MapPin size={11} className="text-orange-400" /> : <Globe size={11} className="text-cyan-400" />}
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">{trip.destination || 'N/A'}</span>
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <button 
                    onClick={() => setRegionModal(prev => ({ ...prev, open: false }))} 
                    className="w-full mt-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                    Dismiss Window
                </button>
            </Modal>

            <Modal open={!!selectedPaymentLead} onClose={() => setSelectedPaymentLead(null)} title={`Payment History: ${selectedPaymentLead?.customerName || selectedPaymentLead?.profileName || 'Details'}`} maxWidth="max-w-3xl">
                {selectedPaymentLead && (() => {
                    let historyList = [];
                    try {
                        historyList = typeof selectedPaymentLead.paymentHistoryDetails === 'string' 
                            ? JSON.parse(selectedPaymentLead.paymentHistoryDetails) 
                            : (selectedPaymentLead.paymentHistoryList || []);
                    } catch(e) {}
                    
                    return (
                        <div className="flex flex-col h-full space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wide mb-1">Total Package</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">₹{(selectedPaymentLead.computedPackageCost || selectedPaymentLead.totalPackageCost || selectedPaymentLead.packageCost || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wide mb-1">Total Received</p>
                                    <p className="text-sm font-bold text-emerald-500">₹{(selectedPaymentLead.computedTotalReceived || selectedPaymentLead.amountReceived || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wide mb-1">Pending Balance</p>
                                    <p className="text-sm font-bold text-amber-500">₹{(selectedPaymentLead.computedBalancePending || Math.max(0, (selectedPaymentLead.totalPackageCost || selectedPaymentLead.packageCost || 0) - (selectedPaymentLead.amountReceived || 0))).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wide mb-1">Status</p>
                                    <p className="text-sm font-bold text-cyan-500">{selectedPaymentLead.paymentStatus || 'Pending'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/40 pb-2 uppercase tracking-widest">Transaction Ledger</h4>
                                <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                    {historyList.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-6">No individual payment transactions recorded yet.</p>
                                    ) : (
                                        historyList.map((txn, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl bg-white dark:bg-[#0d1526] border border-slate-100 dark:border-slate-700/30 gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-800 dark:text-white">₹{Number(txn.amount || 0).toLocaleString('en-IN')}</span>
                                                        <span className="text-[9px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 font-mono font-bold">{txn.mode || 'N/A'}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">For: {txn.service || 'Package'} · Txn: {txn.txnId || 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{txn.date}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={() => setSelectedPaymentLead(null)} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold transition-colors">Close</button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            <Modal open={!!selectedMember} onClose={() => setSelectedMember(null)} title="Team Member Profile" maxWidth="max-w-sm">
                {selectedMember && (
                    <div className="flex flex-col items-center text-center space-y-4 py-2">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-xl uppercase ring-4 ring-white/10" style={{ backgroundColor: selectedMember.color || '#7c3aed' }}>
                            {selectedMember.initials}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{selectedMember.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedMember.role || 'Agent'}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40">
                            <StatusDot status={selectedMember.status} />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize uppercase tracking-wide">{selectedMember.status || 'Offline'}</span>
                        </div>
                        <div className="w-full text-left space-y-3 mt-3 pt-4 border-t border-slate-100 dark:border-slate-700/40">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30">
                                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">Employee ID</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">{selectedMember.id || selectedMember.employeeId || 'N/A'}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30">
                                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">Last Active</span>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedMember.lastActive ? new Date(selectedMember.lastActive).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}</span>
                            </div>
                        </div>
                        <div className="w-full mt-2">
                            <button onClick={() => setSelectedMember(null)} className="w-full px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition-colors">Dismiss</button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal open={!!selectedLeadDetails} onClose={() => setSelectedLeadDetails(null)} title={`Lead: ${selectedLeadDetails?.customerName || selectedLeadDetails?.profileName || 'Details'}`} maxWidth="max-w-4xl">
                {selectedLeadDetails && (
                    <div className="flex flex-col h-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            
                            <div className="space-y-3 bg-slate-50 dark:bg-[#0d1526] p-4 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                <h4 className="font-bold text-violet-500 border-b border-slate-100 dark:border-slate-700/30 pb-2.5 flex items-center gap-2 text-xs uppercase tracking-widest"><Users size={13}/> Customer Profile</h4>
                                {[
                                    { label: 'System ID', value: `LMN${selectedLeadDetails.id}` },
                                    { label: 'Phone', value: selectedLeadDetails.phone || 'N/A' },
                                    { label: 'Email', value: selectedLeadDetails.email || 'N/A' },
                                    { label: 'Source', value: `${selectedLeadDetails.platform || 'Direct'} / ${selectedLeadDetails.campaign || 'Organic'}` },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">{label}</span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-[#0d1526] p-4 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                <h4 className="font-bold text-emerald-500 border-b border-slate-100 dark:border-slate-700/30 pb-2.5 flex items-center gap-2 text-xs uppercase tracking-widest"><MapPin size={13}/> Trip Logistics</h4>
                                {[
                                    { label: 'Destination', value: selectedLeadDetails.destination },
                                    { label: 'Travel Dates', value: selectedLeadDetails.travelDates || selectedLeadDetails.travelDate || selectedLeadDetails.tourStartDate || 'Flexible / TBD' },
                                    { label: 'Headcount', value: `${selectedLeadDetails.pax || selectedLeadDetails.noOfAdults || '0'} Adults, ${selectedLeadDetails.childrenPax || selectedLeadDetails.noOfChildren || '0'} Children` },
                                    { label: 'Package Type', value: selectedLeadDetails.packageType || selectedLeadDetails.tourType || 'Custom' },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">{label}</span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-[#0d1526] p-4 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                <h4 className="font-bold text-blue-500 border-b border-slate-100 dark:border-slate-700/30 pb-2.5 flex items-center gap-2 text-xs uppercase tracking-widest"><Target size={13}/> Pipeline Status</h4>
                                {[
                                    { label: 'Current Status', value: selectedLeadDetails.status || 'New Inquiry' },
                                    { label: 'Assigned Agent', value: selectedLeadDetails.assignedTo || selectedLeadDetails.assignedToOps || 'Unassigned' },
                                    { label: 'Entry Date', value: new Date(selectedLeadDetails.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
                                    { label: 'Last Modified', value: new Date(selectedLeadDetails.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">{label}</span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-[#0d1526] p-4 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                <h4 className="font-bold text-amber-500 border-b border-slate-100 dark:border-slate-700/30 pb-2.5 flex items-center gap-2 text-xs uppercase tracking-widest"><Wallet size={13}/> Financial Overview</h4>
                                {[
                                    { label: 'Quoted Budget', value: selectedLeadDetails.budget || selectedLeadDetails.budgetRange || 'N/A' },
                                    { label: 'Total Package Cost', value: `₹${selectedLeadDetails.computedPackageCost || selectedLeadDetails.totalPackageCost || selectedLeadDetails.packageCost || '0'}` },
                                    { label: 'Amount Received', value: `₹${selectedLeadDetails.computedTotalReceived || selectedLeadDetails.amountReceived || '0'}` },
                                    { label: 'Payment Status', value: selectedLeadDetails.paymentStatus || 'Pending' },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">{label}</span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="md:col-span-2 space-y-3 bg-slate-50 dark:bg-[#0d1526] p-4 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                <h4 className="font-bold text-pink-500 border-b border-slate-100 dark:border-slate-700/30 pb-2.5 flex items-center gap-2 text-xs uppercase tracking-widest"><MessageSquare size={13}/> Lead Message & Internal Notes</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Customer Message</span>
                                        <p className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/30 leading-relaxed">
                                            {selectedLeadDetails.leadMessage || selectedLeadDetails.messageFromLead || 'No direct message provided.'}
                                        </p>
                                    </div>
                                     
                                </div>
                            </div>

                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/40 flex justify-end">
                            <button onClick={() => setSelectedLeadDetails(null)} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold transition-colors">
                                Close 
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {isChatOpen && (
                <div className="fixed inset-0 sm:inset-auto sm:top-10 sm:bottom-auto sm:left-auto sm:right-6 w-full sm:w-[460px] h-full sm:h-[75vh] bg-[#0d1526] sm:border border-slate-700/50 rounded-none sm:rounded-2xl shadow-[0_32px_64px_-8px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col z-[150]">
                    <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 sm:px-5 py-3.5 flex justify-between items-center text-white shadow-lg">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-xl bg-white/15">
                                <Bot size={16}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight">iTour </h3>
                                <p className="text-[9px] text-teal-100/80 uppercase tracking-widest font-semibold">Intelligence Engine</p>
                            </div>
                        </div>
                        <button onClick={() => setIsChatOpen(false)} className="p-1.5 hover:bg-white/15 rounded-xl transition-colors"><X size={16}/></button>
                    </div>
                    <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto bg-[#0b0f1a] flex flex-col gap-3 custom-scrollbar">
                       {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-slate-800/80 text-slate-200 border border-slate-700/40 rounded-bl-sm'}`}>{msg.text}</div>
                        </div>
                        ))}
                        {isChatLoading && <div className="text-[10px] text-slate-500 flex items-center gap-2 px-2 uppercase tracking-wide"><Loader2 className="animate-spin" size={11} /> Syncing context...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendChatMessage} className="p-3 bg-slate-900/80 border-t border-slate-700/40 flex gap-2.5 backdrop-blur-sm">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Query sales target status or notes..." className="flex-1 bg-slate-800/80 border border-slate-700/50 focus:border-teal-500/70 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none transition-all placeholder-slate-600" />
                        <button type="submit" disabled={!chatInput.trim()} className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 rounded-xl transition-colors flex items-center justify-center flex-shrink-0"><Send size={14}/></button>
                    </form>
                </div>
            )}

            {!isChatOpen && (
                <button onClick={() => setIsChatOpen(true)} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 p-3.5 rounded-2xl text-white bg-teal-600 hover:bg-teal-500 shadow-[0_8px_32px_-4px_rgba(20,184,166,0.4)] hover:shadow-[0_8px_32px_-4px_rgba(20,184,166,0.6)] hover:scale-105 active:scale-95 transition-all z-50">
                    <MessageSquare size={20} />
                </button>
            )}

        </div>
    );
};
export default Dashboard;