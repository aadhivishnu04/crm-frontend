import React, { useState, useEffect } from 'react';
import { 
    Search, MapPin, Calendar, Users,
    Pencil, Trash2, Save, X, ChevronDown,
    Plus, Target, MessageSquare, PlaneTakeoff, Phone, Eye
} from 'lucide-react';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

// ─── UI HELPERS ──────────────────────────────────────────────────────────────

const Modal = ({ open, onClose, title, children, maxWidth = "max-w-md" }) => {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    
    if (!open) return null;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 bg-[#1e293b] border border-slate-600 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col overflow-hidden`}>
                
                {/* Sticky Header */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-700/50 bg-[#1e293b] z-20 flex-shrink-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white truncate pr-4">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="overflow-y-auto custom-scrollbar flex-1 p-4 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, children, className = '' }) => (
    <div className={`mb-4 px-0.5 py-0.5 ${className}`}>
        <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const Input = ({ className = '', ...props }) => (
    <input
        className={`w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all ${className}`}
        {...props}
    />
);

const TextArea = ({ className = '', ...props }) => (
    <textarea
        className={`w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all custom-scrollbar ${className}`}
        {...props}
    />
);

// ─── UPGRADED SELECT COMPONENT ──────────────────────────────────────────────
const Select = ({ options, value, onChange, placeholder, className = '' }) => {
    const isCustomValue = value && value !== "" && !options.includes(value);
    const [isManual, setIsManual] = useState(isCustomValue);

    useEffect(() => {
        if (value && options.includes(value)) {
            setIsManual(false);
        } else if (value && !options.includes(value)) {
            setIsManual(true);
        }
    }, [value, options]);

    if (isManual) {
        return (
            <div className="flex items-center gap-1.5 w-full transition-all">
                <input
                    type="text"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Type custom entry..."
                    className={`w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all flex-1 min-w-[80px] ${className}`}
                    autoFocus
                />
                <button
                    type="button"
                    onClick={() => {
                        setIsManual(false);
                        onChange(''); 
                    }}
                    className="flex items-center justify-center bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors flex-shrink-0 p-2 sm:p-2.5"
                    title="Cancel manual entry"
                >
                    <X size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <select
                value={value || ''}
                onChange={e => {
                    if (e.target.value === '__MANUAL__') {
                        setIsManual(true);
                        onChange('');
                    } else {
                        onChange(e.target.value);
                    }
                }}
                className={`w-full appearance-none bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all cursor-pointer ${className}`}
            >
                {placeholder && <option value="" disabled>{placeholder}</option>}
                {options.map(o => <option key={o} value={o}>{o}</option>)}
                <option value="__MANUAL__" className="font-bold text-emerald-400 bg-slate-800">+ Add Manual / Other</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PACKAGE_TYPES = ['Custom / Flexible', 'Honeymoon', 'Family Tour', 'Group Tour', 'Corporate Trip', 'Solo Backpacking'];
const PLATFORM_OPTIONS = ['Facebook', 'Instagram', 'Google Ads', 'Website', 'Referral', 'Walk-in', 'Other'];
const BUDGET_OPTIONS = ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', '₹1,00,000 - ₹3,00,000', '₹3,00,000 - ₹5,00,000', '₹5,00,000+'];
const PAX_OPTIONS = ['1', '2', '3', '4', '5', '6+'];
const CHILDREN_OPTIONS = ['0', '1', '2', '3', '4', '5+'];

const PLATFORM_STYLES = {
    Facebook: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    'Google Ads': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Website: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    Referral: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Walk-in': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    Other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

// Fixed pax default to '' to show placeholder
const initialLeadState = {
    customerName: '', phone: '', email: '', destination: '',
    travelDates: '', pax: '', childrenPax: '0', packageType: 'Custom / Flexible',
    budget: '₹25,000 - ₹50,000', platform: 'Website', campaign: '', leadMessage: '', notes: ''
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const LeadsManager = () => {
    const [leads, setLeads] = useState([]);
    const [campaignOptions, setCampaignOptions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // Edit/Add Modal State
    const [leadModalOpen, setLeadModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [leadForm, setLeadForm] = useState(initialLeadState);

    // View Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingLead, setViewingLead] = useState(null);

    // ── FETCH LEADS & CAMPAIGNS ────────────────────────────────────────────────
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [leadsRes, campaignsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/leads`),
                    fetch(`${API_BASE_URL}/campaigns`)
                ]);
                
                if (leadsRes.ok) setLeads(await leadsRes.json());
                
                if (campaignsRes.ok) {
                    const campaignData = await campaignsRes.json();
                    if (Array.isArray(campaignData)) {
                        setCampaignOptions(campaignData.map(c => c.name));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // ── MODAL HELPERS ──────────────────────────────────────────────────────────
    const openAddModal = () => {
        setLeadForm(initialLeadState);
        setEditingId(null);
        setLeadModalOpen(true);
    };

    const openEditModal = (lead) => {
        setLeadForm({
            customerName: lead.customerName || '',
            phone: lead.phone || '',
            email: lead.email || '',
            destination: lead.destination || '',
            travelDates: lead.travelDates || '',
            pax: lead.pax || '',
            childrenPax: lead.noOfChildren || lead.childrenPax || '0', // Directly binds to Prisma column
            packageType: lead.packageType || 'Custom / Flexible',
            budget: lead.budget || '₹25,000 - ₹50,000',
            platform: lead.platform || 'Website',
            campaign: lead.campaign || '',
            leadMessage: lead.leadMessage || '',
            notes: lead.notes || ''
        });
        setEditingId(lead.id);
        setLeadModalOpen(true);
    };

    const openViewModal = (lead) => {
        setViewingLead(lead);
        setViewModalOpen(true);
    };

    const closeModal = () => {
        setLeadModalOpen(false);
        setEditingId(null);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setViewingLead(null);
    };

    // ── SAVE (CREATE / UPDATE) ─────────────────────────────────────────────────
    const saveLead = async () => {
        try {
            const isEditing = Boolean(editingId);
            const url = isEditing ? `${API_BASE_URL}/leads/${editingId}` : `${API_BASE_URL}/leads`;
            const method = isEditing ? 'PUT' : 'POST';

            const existingLead = isEditing ? leads.find(l => l.id === editingId) : null;

            // Mapping state to Prisma Backend expectations explicitly
            const payload = {
                ...leadForm,
                noOfPax: leadForm.pax,
                noOfChildren: leadForm.childrenPax, 
                budgetRange: leadForm.budget,
                status: isEditing ? (existingLead?.status || 'Jobs') : 'Jobs'
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const saved = await res.json();
                setLeads(prev => isEditing ? prev.map(l => l.id === editingId ? saved : l) : [saved, ...prev]);
                
                // Trigger email alert for NEW leads directly
                if (!isEditing) {
                    console.log("Triggering email alert to backend...");
                    
                    fetch(`${API_BASE_URL}/notifications/new-lead`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            leadId: saved.id,
                            customerName: saved.customerName,
                            destination: saved.destination,
                            email: saved.email,
                            phone: saved.phone
                        })
                    })
                    .then(res => res.json())
                    .then(data => console.log("Email server response:", data))
                    .catch(err => console.error("Silently failing email trigger:", err));
                }

                closeModal();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Failed to save lead: ${errorData.error || 'Check backend terminal configurations.'}`);
            }
        } catch (err) {
            console.error("Network Error Details:", err);
            alert("Error connecting to the server. Check if your Fastify engine is up and running on port 8082.");
        }
    };

    // ── DELETE ─────────────────────────────────────────────────────────────────
    const deleteLead = async (id) => {
        if (!window.confirm("Are you sure you want to delete this lead?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/leads/${id}`, { method: 'DELETE' });
            if (res.ok) setLeads(prev => prev.filter(l => l.id !== id));
            else alert("Failed to delete lead.");
        } catch (err) {
            console.error(err);
            alert("Error connecting to the server.");
        }
    };

    // ── FILTER ─────────────────────────────────────────────────────────────────
    const filteredLeads = leads.filter(lead => {
        const query = searchQuery.toLowerCase();
        const displayId = `LMN${lead.id || ''}`.toLowerCase();
        const historicalId = (lead.jobId || '').toLowerCase();

        return (
            displayId.includes(query) ||
            historicalId.includes(query) ||
            (lead.customerName || '').toLowerCase().includes(query) ||
            (lead.destination || '').toLowerCase().includes(query) ||
            (lead.phone || '').includes(searchQuery) ||
            (lead.platform || '').toLowerCase().includes(query) ||
            (lead.campaign || '').toLowerCase().includes(query)
        );
    });

    return (
        <div className="bg-[#0f172a] min-h-screen w-full p-3 sm:p-4 lg:p-6 pt-20 sm:pt-24 lg:pt-24 space-y-4 sm:space-y-6 text-white text-base overflow-x-hidden">

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 sm:p-5 lg:p-6 rounded-xl border border-slate-700 shadow-sm bg-slate-900/50">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 tracking-tight">
                        <Users className="text-emerald-400" /> Leads Manager
                    </h1>
                    <p className="text-sm sm:text-base text-slate-400 mt-1 sm:mt-1.5">View, search, edit, and manage all your customer travel inquiries.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto mt-2 md:mt-0">
                    <div className="w-full md:w-72 lg:w-80 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search name, job ID..."
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                    <button onClick={openAddModal} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold transition-colors shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                        <Plus size={18} strokeWidth={2.5} /> New Lead
                    </button>
                </div>
            </div>

            {/* ── TABLE / MOBILE & TABLET CARDS ── */}
            <div className="bg-transparent lg:bg-slate-900/50 lg:border border-slate-700/50 rounded-xl shadow-sm overflow-hidden">
                <div className="w-full custom-scrollbar">
                    <table className="w-full text-left text-sm sm:text-base text-slate-300 block lg:table">
                        <thead className="text-xs uppercase tracking-wider text-slate-400 font-semibold bg-transparent border-b border-slate-700/50 hidden lg:table-header-group">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap">Job ID</th>
                                <th className="px-6 py-4 whitespace-nowrap">Customer Info</th>
                                <th className="px-6 py-4 whitespace-nowrap">Trip Details</th>
                                <th className="px-6 py-4 whitespace-nowrap">Package & Budget</th>
                                <th className="px-6 py-4 whitespace-nowrap">Message & Notes</th>
                                <th className="px-6 py-4 whitespace-nowrap">Source</th>
                                <th className="px-6 py-4 whitespace-nowrap">Date Added</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="block lg:table-row-group divide-y-0 lg:divide-y divide-slate-700/30">
                            {isLoading ? (
                                <tr className="block lg:table-row">
                                    <td colSpan="8" className="block lg:table-cell text-center py-12 text-slate-500">Loading your leads...</td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr className="block lg:table-row">
                                    <td colSpan="8" className="block lg:table-cell text-center py-12 text-slate-500">No leads found. Time to launch some marketing!</td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id} className="block lg:table-row bg-[#132033] lg:bg-transparent border border-[#1e3a52] lg:border-none rounded-xl mb-4 lg:mb-0 p-3 lg:p-0 hover:bg-slate-800/40 transition-colors group shadow-sm lg:shadow-none">
                                        
                                        {/* Job ID */}
                                        <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none font-medium text-slate-200">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Job ID</span>
                                            <span className="text-right lg:text-left">LMN{lead.id}</span>
                                        </td>
                                        
                                        {/* Customer Info */}
                                        <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Customer</span>
                                            <div className="text-right lg:text-left">
                                                <div className="font-bold text-white text-sm sm:text-base leading-none mb-1.5">
                                                    {lead.customerName || 'N/A'}
                                                </div>
                                                <div className="flex flex-col lg:items-start items-end gap-0.5 text-xs sm:text-sm text-slate-400">
                                                    <span className="flex items-center gap-1"><Phone size={13} className="flex-shrink-0" /> {lead.phone}</span>
                                                    {lead.email && <span className="text-[11px] sm:text-xs text-slate-500">{lead.email}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Trip Details */}
                                        <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trip Details</span>
                                            <div className="text-right lg:text-left">
                                                <div className="font-semibold text-emerald-400 flex items-center justify-end lg:justify-start gap-1.5 mb-1 text-sm sm:text-base">
                                                    <MapPin size={14} className="flex-shrink-0"/> <span className="capitalize">{lead.destination}</span>
                                                </div>
                                                <div className="flex flex-col lg:items-start items-end gap-1 text-[11px] sm:text-xs text-slate-400">
                                                    <span className="flex items-center gap-1.5"><Calendar size={13} className="flex-shrink-0"/> {lead.travelDates || 'TBD'}</span>
                                                    <span className="text-slate-500 lg:pl-5">
                                                        {lead.pax ? `${lead.pax} Adults` : 'TBD'} 
                                                        {(lead.noOfChildren || lead.childrenPax) && (lead.noOfChildren || lead.childrenPax) !== '0' ? `, ${lead.noOfChildren || lead.childrenPax} Children` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Package & Budget */}
                                        <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Package / Budget</span>
                                            <div className="flex flex-col gap-1.5 items-end lg:items-start">
                                                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded bg-purple-950/40 text-purple-300 border border-purple-900/40 whitespace-nowrap">
                                                    {lead.packageType || 'Custom / Flexible'}
                                                </span>
                                                <span className="font-semibold text-slate-200 text-xs sm:text-sm">
                                                    {lead.budget || 'Budget not set'}
                                                </span>
                                            </div>
                                        </td>
                                        
                                        {/* Message & Notes */}
                                        <td className="flex flex-col lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none text-xs sm:text-sm text-slate-500">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Message / Notes</span>
                                            <div className="max-w-full lg:max-w-[200px] flex flex-col gap-1">
                                                {lead.leadMessage ? (
                                                    <p className="truncate" title={lead.leadMessage}>
                                                        — {lead.leadMessage}
                                                    </p>
                                                ) : <p>— No message</p>}

                                                {lead.notes ? (
                                                    <p className="text-[11px] sm:text-xs text-emerald-500/80 truncate" title={lead.notes}>
                                                        — {lead.notes}
                                                    </p>
                                                ) : <p className="text-[11px] sm:text-xs">— No notes</p>}
                                            </div>
                                        </td>
                                        
                                        {/* Source */}
                                        <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Source</span>
                                            <div className="text-right lg:text-left flex flex-col items-end lg:items-start">
                                                {lead.platform ? (
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border ${PLATFORM_STYLES[lead.platform] || PLATFORM_STYLES.Other}`}>
                                                        {lead.platform}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                                {lead.campaign && (
                                                    <div className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate max-w-[120px]" title={lead.campaign}>
                                                        {lead.campaign}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        
                                        {/* Date Added */}
                                        <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none text-slate-400 text-xs sm:text-sm font-medium">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date Added</span>
                                            <span className="text-right lg:text-left">
                                                {lead.createdAt
                                                    ? new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : 'N/A'}
                                            </span>
                                        </td>
                                        
                                        {/* Actions */}
                                        <td className="flex justify-between items-center lg:table-cell py-3 lg:py-4 px-3 lg:px-6 lg:text-center mt-1 lg:mt-0">
                                            <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</span>
                                            <div className="flex items-center justify-end lg:justify-center gap-1.5 sm:gap-2">
                                                <button onClick={() => openViewModal(lead)}
                                                    className="p-2 lg:p-1.5 text-blue-400 lg:text-slate-400 bg-blue-500/10 lg:bg-transparent hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="View Lead">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => openEditModal(lead)}
                                                    className="p-2 lg:p-1.5 text-yellow-400 lg:text-slate-400 bg-yellow-500/10 lg:bg-transparent hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition-colors"
                                                    title="Edit Lead">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => deleteLead(lead.id)}
                                                    className="p-2 lg:p-1.5 text-rose-400 lg:text-slate-400 bg-rose-500/10 lg:bg-transparent hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Delete Lead">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── ADD/EDIT LEAD MODAL ── */}
            <Modal open={leadModalOpen} onClose={closeModal} title={editingId ? `Edit Travel Lead (LMN${editingId})` : "Add New Lead"} maxWidth="max-w-4xl">
                {/* Scrollable Form Body */}
                <div className="space-y-6">
                    {/* Section 1: Customer Details */}
                    <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-300 border-b border-slate-700/50 pb-2 mb-3 sm:mb-4 flex items-center gap-2">
                            <Users size={16} className="text-violet-400" /> Customer Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                            <Field label="Customer Name">
                                <Input value={leadForm.customerName} onChange={e => setLeadForm({ ...leadForm, customerName: e.target.value })} autoFocus />
                            </Field>
                            <Field label="Mobile Number">
                                <Input type="tel" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} />
                            </Field>
                            <Field label="Email Address">
                                <Input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} />
                            </Field>
                        </div>
                    </div>

                    {/* Section 2: Trip Logistics */}
                    <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-300 border-b border-slate-700/50 pb-2 mb-3 sm:mb-4 flex items-center gap-2">
                            <PlaneTakeoff size={16} className="text-emerald-400" /> TRAVEL REQUIREMENT	
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                            <Field label="Destination">
                                <Input value={leadForm.destination} onChange={e => setLeadForm({ ...leadForm, destination: e.target.value })} />
                            </Field>
                            <Field label="Tentative Travel Date">
                                <Input value={leadForm.travelDates} onChange={e => setLeadForm({ ...leadForm, travelDates: e.target.value })} />
                            </Field>
                            <Field label="Number of Adults">
                                <Select options={PAX_OPTIONS} value={leadForm.pax} onChange={v => setLeadForm({ ...leadForm, pax: v })} placeholder="" />
                            </Field>
                            <Field label="Number of Children">
                                <Select options={CHILDREN_OPTIONS} value={leadForm.childrenPax} onChange={v => setLeadForm({ ...leadForm, childrenPax: v })} placeholder="" />
                            </Field>
                            <Field label="Budget">
                                <Select options={BUDGET_OPTIONS} value={leadForm.budget} onChange={v => setLeadForm({ ...leadForm, budget: v })} placeholder="" />
                            </Field>
                                <Field label="Package Type">
                                <Select options={PACKAGE_TYPES} value={leadForm.packageType} onChange={v => setLeadForm({ ...leadForm, packageType: v })} placeholder="" />
                            </Field>
                              <Field label="Message from Lead">
                                <TextArea rows="2" value={leadForm.leadMessage} onChange={e => setLeadForm({ ...leadForm, leadMessage: e.target.value })} />
                            </Field>
                        </div>
                    </div>
                     
                  

                    {/* Section 3: Marketing & Package */}
                    <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-300 border-b border-slate-700/50 pb-2 mb-3 sm:mb-4 flex items-center gap-2">
                            <Target size={16} className="text-blue-400" />  LEAD SOURCE	
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                            <Field label="Platform">
                                <Select options={PLATFORM_OPTIONS} value={leadForm.platform} onChange={v => setLeadForm({ ...leadForm, platform: v })} placeholder="" />
                            </Field>
                            <Field label="Campaign Name">
                                <Select options={campaignOptions} value={leadForm.campaign} onChange={v => setLeadForm({ ...leadForm, campaign: v })} placeholder="" />
                            </Field>
                        
                            
                        </div>
                    </div>

                   
                </div>

                {/* Sticky Footer */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-5 border-t border-slate-700/50 mt-6 sticky -bottom-6 bg-[#1e293b] pb-6 sm:pb-0 z-20">
                    <button onClick={closeModal} className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm sm:text-base font-semibold transition-colors order-2 sm:order-1">
                        Cancel
                    </button>
                    <button onClick={saveLead} disabled={!leadForm.customerName.trim()}
                        className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm sm:text-base font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 order-1 sm:order-2">
                        <Save size={18} /> {editingId ? "Update Lead" : "Save New Lead"}
                    </button>
                </div>
            </Modal>

            {/* ── VIEW LEAD MODAL ── */}
            <Modal open={viewModalOpen} onClose={closeViewModal} title={`View Lead Details (LMN${viewingLead?.id || ''})`} maxWidth="max-w-2xl">
                {viewingLead && (
                    <div className="space-y-6 text-slate-300">
                        
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <Users size={16} /> Customer Information
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Name</p>
                                    <p className="font-medium text-white">{viewingLead.customerName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Phone</p>
                                    <p className="font-medium text-white">{viewingLead.phone || 'N/A'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                                    <p className="font-medium text-white">{viewingLead.email || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <PlaneTakeoff size={16} /> Trip Requirements
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Destination</p>
                                    <p className="font-medium text-white capitalize">{viewingLead.destination || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Travel Dates</p>
                                    <p className="font-medium text-white">{viewingLead.travelDates || 'TBD'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Adults</p>
                                    <p className="font-medium text-white">{viewingLead.pax || 'TBD'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Children</p>
                                    <p className="font-medium text-white">{viewingLead.noOfChildren || viewingLead.childrenPax || '0'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Budget</p>
                                    <p className="font-medium text-white">{viewingLead.budget || 'TBD'}</p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Package Type</p>
                                    <p className="font-medium text-white">{viewingLead.packageType || 'Custom / Flexible'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
                                <MessageSquare size={16} /> Additional Information & Marketing
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Source Platform</p>
                                    <p className="font-medium text-white">{viewingLead.platform || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Campaign</p>
                                    <p className="font-medium text-white">{viewingLead.campaign || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Message from Lead</p>
                                    <p className="p-2 bg-[#0f172a] rounded border border-slate-700 text-sm">{viewingLead.leadMessage || 'No message provided.'}</p>
                                </div>
                               
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button onClick={closeViewModal} className="px-6 py-2.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors">
                                Close Window
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default LeadsManager;