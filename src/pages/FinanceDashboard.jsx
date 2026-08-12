import React, { useState, useEffect, useRef } from 'react';
import {
    Search, FileText, CheckCircle2, Receipt, Eye, Pencil, 
    X, ArrowUp, AlertCircle, Calendar, MapPin, DollarSign,
    Calculator, Send
} from 'lucide-react';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "crm-backend-2-qlza.onrender.com/api";

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const getMonthYear = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

const formatMoney = (num) => {
    return Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function FinanceDashboard() {
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const triggerNotification = (type, message) => setNotification({ show: true, type, message });

    useEffect(() => {
        if (notification.show) {
            const t = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
            return () => clearTimeout(t);
        }
    }, [notification.show]);

    const [leads, setLeads] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Pending Billings');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [entriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
    const [selectedLeadForView, setSelectedLeadForView] = useState(null);
    
    // Dynamic State for Financial Closure Form calculations
    const [financeData, setFinanceData] = useState([]);

    const mainRef = useRef(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // ─── DATA FETCHING & BACKGROUND SYNC ──────────────────────────────────────
    const fetchLeads = async (isBackground = false) => {
        if (!isBackground && leads.length === 0) setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/leads`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setLeads(data);
        } catch (err) {
            console.error("Failed to fetch leads for Finance:", err);
            if (!isBackground) setLeads([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchLeads(); 
        
        // Automatic background update every 30 seconds
        const interval = setInterval(() => {
            fetchLeads(true);
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    const updateLead = async (id, updatedData) => {
        // Optimistic UI update
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedData } : l));
        try {
            await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            triggerNotification('success', 'Finance record updated successfully!');
            // Silently sync the latest data
            fetchLeads(true);
        } catch (err) {
            triggerNotification('success', 'Finance changes saved locally (simulation).');
        }
    };

    // ─── TAB & FILTER LOGIC ───────────────────────────────────────────────────
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setSearchQuery('');
        setFilterMonth('');
    };

    const getTabStatusList = (tab) => {
        switch (tab) {
            case 'Pending Billings': return ['Move To Billing', 'Moved To Billing', 'Pending Billings'];
            case 'Invoice Generated': return ['Invoice Generated'];
            case 'Case Closed': return ['Case Closed', 'Trip Closed'];
            default: return [];
        }
    };

    const activeStatuses = getTabStatusList(activeTab);

    const filtered = leads.filter(item => {
        let tabMatch = activeStatuses.includes(item.status);
        const q = searchQuery.toLowerCase();
        const searchMatch = !q || 
            `lmn${item.id}`.includes(q) || 
            (item.customerName || item.profileName || '').toLowerCase().includes(q) ||
            (item.destination || '').toLowerCase().includes(q);

        let monthMatch = true;
        if (activeTab === 'Case Closed' && filterMonth) {
            const confDate = item.confirmedDate || item.bookingDate;
            monthMatch = confDate ? confDate.substring(0, 7) === filterMonth : false;
        }

        return tabMatch && searchMatch && monthMatch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
    const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    const getTabDesc = (tabId) => {
        switch (tabId) {
            case 'Pending Billings': return ' ';
            case 'Invoice Generated': return ' ';
            case 'Case Closed': return ' ';
            default: return ' ';
        }
    };

    const categories = [
        { id: 'Pending Billings', label: 'Pending Billings', desc: getTabDesc('Pending Billings'), icon: FileText, count: leads.filter(l => getTabStatusList('Pending Billings').includes(l.status)).length },
        { id: 'Invoice Generated', label: 'Invoice Generated', desc: getTabDesc('Invoice Generated'), icon: Receipt, count: leads.filter(l => getTabStatusList('Invoice Generated').includes(l.status)).length },
        { id: 'Case Closed', label: 'Case Closed', desc: getTabDesc('Case Closed'), icon: CheckCircle2, count: leads.filter(l => getTabStatusList('Case Closed').includes(l.status)).length },
    ];

    // ─── EDIT MODAL INITIALIZATION ────────────────────────────────────────────
    const handleOpenEdit = (lead) => {
        setSelectedLeadForEdit(lead);
        
        // Parse existing finance details or build base array from confirmed services
        let existingFinanceData = [];
        try {
            existingFinanceData = lead.financeDetails ? JSON.parse(lead.financeDetails) : [];
        } catch(e) {}

        if (existingFinanceData.length > 0) {
            setFinanceData(existingFinanceData);
        } else {
            const servicesStr = lead.confirmedServices || lead.services || 'Tour Package';
            const servicesArr = servicesStr.split(', ').filter(Boolean);

            let parsedServiceCosts = {};
            try { parsedServiceCosts = lead.serviceCosts ? (typeof lead.serviceCosts === 'string' ? JSON.parse(lead.serviceCosts) : lead.serviceCosts) : {}; } catch(e) { parsedServiceCosts = {}; }

            const initialData = servicesArr.map((srv, idx) => {
                const srvCostRaw = (parsedServiceCosts && parsedServiceCosts[srv]) || lead[`service${idx + 1}Cost`] || 0;
                const sellingRaw = Number(String(srvCostRaw).replace(/[^0-9.-]+/g, '')) || 0;

                return {
                    service: srv,
                    selling: sellingRaw,
                    purchase: 0,
                    tcs: 0,
                    grossMargin: 0,
                    gstRate: '18', // Default 18%
                    gstAmount: 0,
                    netProfit: 0,
                    approvalStatus: 'Pending',
                    invoiceStatus: 'Generate',
                    taxFilingStatus: 'Pending'
                };
            });
            // Run an initial calculation pass
            setFinanceData(calculateFinanceRows(initialData, lead));
        }
    };

    // ─── FINANCE CALCULATION ENGINE ───────────────────────────────────────────
    const calculateFinanceRows = (dataRows, leadContext) => {
        const isIntl = (leadContext.confirmedTripType || leadContext.destinationType || '').toLowerCase() === 'international';

        return dataRows.map(row => {
            const selling = Number(row.selling) || 0;
            const purchase = Number(row.purchase) || 0;
            const isTourPkg = row.service.toLowerCase().includes('tour package') || row.service.toLowerCase().includes('package');

            // TCS Calculation: (Tour Package Client Paid x 2) / (100 + 2) only if International
            let tcs = 0;
            if (isIntl && isTourPkg) {
                tcs = (selling * 2) / 102;
            }

            // Gross Margin Calculation
            const grossMargin = isTourPkg ? (selling - tcs - purchase) : (selling - purchase);

            // GST Calculation: Gross Margin x GST% / (100 + GST%)
            const gstRate = Number(row.gstRate) || 0;
            const gstAmount = grossMargin > 0 ? (grossMargin * gstRate) / (100 + gstRate) : 0;

            // Net Profit: Gross Margin - GST Amount
            const netProfit = grossMargin - gstAmount;

            return {
                ...row,
                tcs: Number(tcs.toFixed(2)),
                grossMargin: Number(grossMargin.toFixed(2)),
                gstAmount: Number(gstAmount.toFixed(2)),
                netProfit: Number(netProfit.toFixed(2))
            };
        });
    };

    const handleFinanceChange = (index, field, value) => {
        const newData = [...financeData];
        newData[index][field] = value;
        setFinanceData(calculateFinanceRows(newData, selectedLeadForEdit));
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        
        // Check if director approval is requested based on the button clicked
        const submitAction = e.nativeEvent?.submitter?.name;
        
        const payload = {
            ...selectedLeadForEdit,
            financeDetails: JSON.stringify(financeData),
            billingApprovalStatus: submitAction === 'director_approval' ? 'Awaiting Director Approval' : selectedLeadForEdit.billingApprovalStatus,
        };

        updateLead(selectedLeadForEdit.id, payload);
        setSelectedLeadForEdit(null);
    };

    // ─── SHARED CSS CLASSES ───────────────────────────────────────────────────
    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none transition-colors";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer transition-colors";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium shadow-inner";
    const tableHeaderCls = "px-4 py-3 bg-slate-800/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-700";
    const tableCellCls = "px-4 py-3 text-sm text-slate-200 border-b border-slate-700/50";
    const sectionHeadCls = "text-base font-bold text-cyan-400 tracking-wider mb-4 border-b border-slate-700/50 pb-2";

    return (
        <div ref={mainRef} className="w-full bg-[#0f172a] min-h-screen font-sans text-white overflow-y-auto relative" style={{ height: '100vh' }}>
            
            {notification.show && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-bold bg-[#0d233e] tracking-wide animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{notification.message}</span>
                </div>
            )}

            {!selectedLeadForEdit && !selectedLeadForView ? (
                <div className="p-4 sm:p-6">
                    <div className="py-5 mb-0  ">
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Receipt className="text-cyan-500" size={28} /> Finance Dashboard
                        </h1>
                        {/* <p className="text-slate-400 text-sm sm:text-base mt-1">Manage billing, generate invoices, and close filed cases.</p> */}
                    </div>

                    <div className="hidden md:grid md:grid-cols-3 gap-4 mb-8">
                        {categories.map((cat) => (
                            <div key={cat.id} onClick={() => handleTabChange(cat.id)} className={`relative p-5 rounded-xl cursor-pointer transition-all border ${activeTab === cat.id ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200 hover:bg-slate-800/30'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`p-3 rounded-lg ${activeTab === cat.id ? 'bg-slate-700 text-cyan-400' : 'bg-slate-800/20 text-slate-300'}`}>
                                        <cat.icon size={24} />
                                    </div>
                                    <span className={`text-xl font-bold ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.count}</span>
                                </div>
                                <h3 className={`font-semibold text-base mb-1 ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.label}</h3>
                                <p className="text-[10px] text-slate-400 leading-tight pr-4">{cat.desc}</p>
                                {activeTab === cat.id && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-cyan-500" />}
                            </div>
                        ))}
                    </div>

                    <div className="bg-transparent border border-slate-700/30 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 border-b border-slate-700/20 gap-3">
                            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
                                {activeTab} <span className="text-slate-400 font-normal text-sm ml-2">({filtered.length} records)</span>
                            </h2>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {activeTab === 'Case Closed' && (
                                    <div className="relative flex items-center bg-[#0b1329] border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 w-full sm:w-[315px] cursor-pointer focus-within:border-cyan-500 transition-colors group">
                                        <span className="text-sm text-slate-400 font-medium mr-2 whitespace-nowrap">
                                            Search by Month:
                                        </span>
                                        <input 
                                            type="month" 
                                            value={filterMonth} 
                                            onChange={e => setFilterMonth(e.target.value)} 
                                            className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer w-full appearance-none flex-1 z-10 relative [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                                            style={{ colorScheme: 'dark' }} 
                                        />
                                        {filterMonth && (
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFilterMonth(''); }} 
                                                className="absolute right-8 z-20 text-slate-400 hover:text-red-400 flex items-center justify-center bg-[#0b1329] px-1"
                                                title="Clear filter"
                                            >
                                                <X size={14}/>
                                            </button>
                                        )}
                                        <Calendar size={16} className="text-slate-400 pointer-events-none group-focus-within:text-cyan-500 transition-colors z-0 ml-2 flex-shrink-0" />
                                    </div>
                                )}
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input type="text" placeholder="Search Name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-600 rounded-lg text-slate-100 focus:border-cyan-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-200 min-w-[900px]">
                                <thead className="bg-slate-900/80 border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Job Id</th>
                                        <th className="px-6 py-4">Customer Name</th>
                                        <th className="px-6 py-4">Destination Type</th>
                                        <th className="px-6 py-4">Travel Month</th>
                                        <th className="px-6 py-4">Booking Confirmed Month</th>
                                        {activeTab === 'Pending Billings' && <th className="px-6 py-4">Approval Status</th>}
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/20">
                                    {paginated.length > 0 ? paginated.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                            <td className="px-6 py-4 font-bold text-white">{row.customerName || row.profileName || '—'}</td>
                                            <td className="px-6 py-4 text-emerald-400">{row.confirmedTripType || row.destinationType || '—'}</td>
                                            <td className="px-6 py-4">{getMonthYear(row.travelDates || row.tourStartDate || row.travelDate)}</td>
                                            <td className="px-6 py-4">{getMonthYear(row.confirmedDate || row.bookingDate)}</td>
                                            
                                            {activeTab === 'Pending Billings' && (
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-950/40 text-amber-400 border border-amber-900/40">
                                                        {row.billingApprovalStatus || 'Pending'}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {activeTab === 'Pending Billings' && (
                                                        <>
                                                            <button type="button" onClick={() => handleOpenEdit(row)} className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold">
                                                                <Pencil size={14} /> Edit
                                                            </button>
                                                            <button type="button" onClick={() => setSelectedLeadForView(row)} className="text-blue-400 hover:text-blue-300 bg-blue-950/30 hover:bg-blue-900/50 border border-blue-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold">
                                                                <Eye size={14} /> View
                                                            </button>
                                                        </>
                                                    )}

                                                    {activeTab === 'Invoice Generated' && (
                                                        <button type="button" onClick={() => handleOpenEdit(row)} className="text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap">
                                                            <Receipt size={14} /> View Invoice
                                                        </button>
                                                    )}

                                                    {activeTab === 'Case Closed' && (
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="text-blue-400 hover:text-blue-300 bg-blue-950/30 hover:bg-blue-900/50 border border-blue-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold">
                                                            <Eye size={14} /> View
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-700/20 gap-3">
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 cursor-pointer">Previous</button>
                                {Array.from({ length: totalPages || 1 }, (_, i) => (
                                    <button type="button" key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1.5 rounded text-xs border cursor-pointer font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-700 text-white' : 'border-slate-700 bg-transparent text-slate-400'}`}>{i + 1}</button>
                                ))}
                                <button type="button" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 cursor-pointer">Next</button>
                            </div>
                            <p className="text-xs text-slate-500">Showing {filtered.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0}–{Math.min(currentPage * entriesPerPage, filtered.length)} of {filtered.length} records</p>
                        </div>
                    </div>
                </div>

            ) : selectedLeadForEdit ? (
                /* ─── FINANCIAL CLOSURE EDITOR MODAL ─── */
                <div className="flex flex-col w-full min-h-full bg-[#0f172a] text-slate-100 animate-in fade-in duration-200">
                    <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-50 flex-shrink-0 shadow-md">
                        <div className="flex items-center gap-3">
                            <Calculator size={22} className="text-cyan-400 flex-shrink-0" />
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase m-0">
                                    FINANCIAL CLOSURE
                                </h2>
                                <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                    LMN{String(selectedLeadForEdit.id || '').padStart(4, '0')}
                                </span>
                            </div>
                        </div>
                        <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 cursor-pointer border-none bg-transparent">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 w-full relative pb-10">
                        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full mx-auto">
                            
                            {/* 1. BOOKING DETAILS */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-800/60">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Booking Details</h3>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Customer Name</label><input type="text" readOnly value={selectedLeadForEdit.customerName || selectedLeadForEdit.profileName || '—'} className={readonlyCls} /></div>
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination Type</label><input type="text" readOnly value={selectedLeadForEdit.confirmedTripType || selectedLeadForEdit.destinationType || '—'} className={readonlyCls} /></div>
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination</label><input type="text" readOnly value={selectedLeadForEdit.confirmedDestination || selectedLeadForEdit.destination || '—'} className={readonlyCls} /></div>
                                    
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Duration</label><input type="text" readOnly value={selectedLeadForEdit.confirmedDuration || selectedLeadForEdit.duration || '—'} className={readonlyCls} /></div>
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5 text-red-400">Tour Start Date</label><input type="date" readOnly value={selectedLeadForEdit.tourStartDate || selectedLeadForEdit.travelDate || ''} className={readonlyCls} style={{colorScheme: 'dark'}} /></div>
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5 text-red-400">Tour End Date</label><input type="date" readOnly value={selectedLeadForEdit.tourEndDate || selectedLeadForEdit.returnDate || ''} className={readonlyCls} style={{colorScheme: 'dark'}} /></div>

                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Sales Executive</label><input type="text" readOnly value={selectedLeadForEdit.salesExecutive || selectedLeadForEdit.assignedTo || '—'} className={readonlyCls} /></div>
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Operations Executive</label><input type="text" readOnly value={selectedLeadForEdit.operationsExecutive || selectedLeadForEdit.operationExecutive || '—'} className={readonlyCls} /></div>
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Services</label><input type="text" readOnly value={selectedLeadForEdit.confirmedServices || selectedLeadForEdit.services || '—'} className={readonlyCls} /></div>

                                    {/* Map existing Service Costs (mirrors Sales exactly, one field per selected service) */}
                                    {(() => {
                                        const servicesStr = selectedLeadForEdit.confirmedServices || selectedLeadForEdit.services || '';
                                        const servicesArr = servicesStr.split(', ').filter(Boolean);
                                        let parsedServiceCosts = {};
                                        try { parsedServiceCosts = selectedLeadForEdit.serviceCosts ? (typeof selectedLeadForEdit.serviceCosts === 'string' ? JSON.parse(selectedLeadForEdit.serviceCosts) : selectedLeadForEdit.serviceCosts) : {}; } catch(e) { parsedServiceCosts = {}; }
                                        return servicesArr.map((srv, idx) => {
                                            const cost = (parsedServiceCosts && parsedServiceCosts[srv]) || selectedLeadForEdit[`service${idx + 1}Cost`];
                                            return (
                                                <div key={idx}>
                                                    <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">{srv} Cost</label>
                                                    <input type="text" readOnly value={cost || '—'} className={readonlyCls} />
                                                </div>
                                            );
                                        });
                                    })()}

                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">GST</label><input type="text" readOnly value={selectedLeadForEdit.gst || selectedLeadForEdit.gstStatus || '—'} className={readonlyCls} /></div>
                                    <div>
                                        <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">TCS</label>
                                        <input type="text" readOnly value={selectedLeadForEdit.tcs || selectedLeadForEdit.tcsStatus || '—'} className={readonlyCls} />
                                        {(selectedLeadForEdit.confirmedTripType || selectedLeadForEdit.destinationType) === 'International' && (
                                            <p className="text-[10px] text-red-400 mt-1 italic"> </p>
                                        )}
                                    </div>
                                    <div><label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Booking Confirmed Date</label><input type="date" readOnly value={selectedLeadForEdit.confirmedDate || selectedLeadForEdit.bookingDate || ''} className={readonlyCls} style={{colorScheme: 'dark'}} /></div>
                                </div>
                            </div>

                            {/* 2. REVENUE DETAILS */}
                            <div className="bg-slate-900/40 border border-cyan-800/50 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-cyan-800/50">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Revenue Details</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-200">
                                        <thead>
                                            <tr>
                                                <th className={tableHeaderCls}>Services</th>
                                                <th className={tableHeaderCls}>Selling  </th>
                                                <th className={tableHeaderCls}>Purchase </th>
                                                <th className={tableHeaderCls}>Gross Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {financeData.map((row, idx) => {
                                                const isTourPkg = row.service.toLowerCase().includes('tour package') || row.service.toLowerCase().includes('package');
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-800/20">
                                                        <td className={tableCellCls}>
                                                            <div className="flex items-center gap-2">
                                                                {/* <span className="text-xs font-medium text-slate-500 w-6 text-right mr-2">eg.</span> */}
                                                                <span className="font-bold text-white">{row.service}</span>
                                                            </div>
                                                        </td>
                                                        <td className={tableCellCls}>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                                                <input type="number" value={row.selling || ''} onChange={(e) => handleFinanceChange(idx, 'selling', e.target.value)} className={`${inputCls} pl-7 font-mono font-bold text-emerald-400`} placeholder="0" />
                                                            </div>
                                                        </td>
                                                        <td className={tableCellCls}>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                                                <input type="number" value={row.purchase || ''} onChange={(e) => handleFinanceChange(idx, 'purchase', e.target.value)} className={`${inputCls} pl-7 font-mono text-slate-300`} placeholder="0" />
                                                            </div>
                                                        </td>
                                                        <td className={tableCellCls}>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-mono font-bold text-orange-400 bg-orange-950/30 px-3 py-1.5 rounded border border-orange-900/30 w-fit">
                                                                    ₹{formatMoney(row.grossMargin)}
                                                                </span>
                                                                <span className="text-[10px] text-orange-400 font-semibold italic">
                                                                    {isTourPkg ? '' : ''}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* <div className="p-5 border-t border-slate-700/50 bg-[#0b1329]/50 flex gap-10 items-center">
                                    <span className="text-sm font-bold text-white">TCS Amount</span>
                                    <div className="flex flex-col items-center">
                                        <div className="bg-slate-900 border-2 border-red-900/50 text-red-400 font-mono font-bold px-6 py-3 rounded-lg text-center shadow-inner">
                                            
                                            ₹{formatMoney(financeData.reduce((sum, row) => sum + row.tcs, 0))}
                                            <div className="border-t border-red-900/50 my-1 border-dashed"></div>
                                            <span className="text-[10px]">Tour Package Client Paid x 2</span><br/>
                                            <span className="text-[10px]">100 + 2</span>
                                        </div>
                                    </div>
                                            
                                </div> */}
                            </div>

                            {/* 3. GST CALCULATION */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-800/60">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">GST Calculation</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-200">
                                        <thead>
                                            <tr>
                                                <th className={`${tableHeaderCls} w-1/3`}>Services <br/> </th>
                                                <th className={`${tableHeaderCls} w-1/3`}>GST %</th>
                                                <th className={`${tableHeaderCls} w-1/3`}>GST Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {financeData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-800/20">
                                                    <td className={`${tableCellCls} font-bold text-white`}>{row.service}</td>
                                                    <td className={tableCellCls}>
                                                        <select value={row.gstRate} onChange={(e) => handleFinanceChange(idx, 'gstRate', e.target.value)} className={`${selectCls} border-2 border-slate-600 font-bold max-w-[150px]`}>
                                                            <option value="5">5%</option>
                                                            <option value="9">9%</option>
                                                            <option value="18">18%</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellCls}>
                                                        <div className="bg-slate-900 border-2 border-red-900/50 text-red-400 font-mono font-bold px-4 py-2 rounded-lg w-fit shadow-inner flex flex-col gap-1">
                                                            <span>₹{formatMoney(row.gstAmount)}</span>
                                                            {/* <span className="text-[9px] border-t border-red-900/50 pt-1">Formula = Gross Margin x GST% / (100 + GST%)</span> */}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4. PROFIT SUMMARY */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-800/60">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Profit Summary</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-200">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-3 bg-slate-800/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-700 w-10">#</th>
                                                <th className={tableHeaderCls}>Service</th>
                                                <th className={tableHeaderCls}>Gross Service Fee</th>
                                                <th className={tableHeaderCls}>Net Profit</th>
                                                <th className={tableHeaderCls}>Approval Status</th>
                                                <th className={tableHeaderCls}>Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {financeData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-800/20">
                                                    <td className={tableCellCls}>{idx + 1}</td>
                                                    <td className={`${tableCellCls} font-bold text-white`}>{row.service}</td>
                                                    <td className={`${tableCellCls} font-mono font-bold text-orange-400`}>₹{formatMoney(row.grossMargin)}</td>
                                                    <td className={`${tableCellCls} font-mono font-bold text-emerald-400`}>₹{formatMoney(row.netProfit)}</td>
                                                    <td className={tableCellCls}>
                                                        <select value={row.approvalStatus} onChange={(e) => handleFinanceChange(idx, 'approvalStatus', e.target.value)} className={`${selectCls} max-w-[150px]`}>
                                                            <option value="Pending">Pending</option>
                                                            <option value="Approved">Approved</option>
                                                            <option value="Rejected">Rejected</option>
                                                        </select>
                                                    </td>
                                                    <td className={tableCellCls}>
                                                        <div className="flex flex-col gap-1">
                                                            <select 
                                                                value={row.invoiceStatus} 
                                                                onChange={(e) => handleFinanceChange(idx, 'invoiceStatus', e.target.value)} 
                                                                disabled={row.approvalStatus !== 'Approved'}
                                                                className={`${selectCls} max-w-[150px] ${row.approvalStatus !== 'Approved' ? 'opacity-50 cursor-not-allowed' : 'border-cyan-500'}`}
                                                            >
                                                                <option value="Generate">Generate</option>
                                                                <option value="Generated">Generated</option>
                                                            </select>
                                                            {row.approvalStatus !== 'Approved' && <span className="text-[9px] text-red-400 italic"> </span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 5. TAX SUMMARY */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-800/60">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Tax Summary</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-200">
                                        <thead>
                                            <tr>
                                                <th className={tableHeaderCls}>Service</th>
                                                <th className={tableHeaderCls}>GST Payable</th>
                                                <th className={tableHeaderCls}>TCS Payable</th>
                                                <th className={tableHeaderCls}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {financeData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-800/20">
                                                    <td className={`${tableCellCls} font-bold text-white`}>{row.service}</td>
                                                    <td className={tableCellCls}>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-mono font-bold text-red-400">₹{formatMoney(row.gstAmount)}</span>
                                                            <span className="text-[9px] text-red-400 italic"> </span>
                                                        </div>
                                                    </td>
                                                    <td className={tableCellCls}>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-mono font-bold text-red-400">₹{formatMoney(row.tcs)}</span>
                                                            <span className="text-[9px] text-red-400 italic"> </span>
                                                        </div>
                                                    </td>
                                                    <td className={tableCellCls}>
                                                        <select value={row.taxFilingStatus} onChange={(e) => handleFinanceChange(idx, 'taxFilingStatus', e.target.value)} className={`${selectCls} max-w-[150px]`}>
                                                            <option value="Pending">Pending</option>
                                                            <option value="Filed">Filed</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* MASTER SUMMARY TABLE (Optional wrap-up as seen in screenshot 2 bottom) */}
                            <div className="bg-[#0b1329] border border-emerald-900/40 rounded-xl overflow-hidden shadow-inner mt-8">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-200">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-3 bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-emerald-900/40">Service</th>
                                                <th className="px-4 py-3 bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-emerald-900/40">Selling Amount</th>
                                                <th className="px-4 py-3 bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-emerald-900/40">TCS Amount</th>
                                                <th className="px-4 py-3 bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-emerald-900/40">Purchase Amount</th>
                                                <th className="px-4 py-3 bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-emerald-900/40">Gross Margin</th>
                                                <th className="px-4 py-3 bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-emerald-900/40">GST Amount</th>
                                                <th className="px-4 py-3 bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-emerald-900/40">Profit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-900/20">
                                            {financeData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-800/30">
                                                    <td className="px-4 py-3 font-bold text-white flex items-center gap-2">  {row.service}</td>
                                                    <td className="px-4 py-3 font-mono">{formatMoney(row.selling)}</td>
                                                    <td className="px-4 py-3 font-mono">{formatMoney(row.tcs)}</td>
                                                    <td className="px-4 py-3 font-mono">{formatMoney(row.purchase)}</td>
                                                    <td className="px-4 py-3 font-mono text-orange-400 font-bold">{formatMoney(row.grossMargin)}</td>
                                                    <td className="px-4 py-3 font-mono text-red-400 font-bold">{formatMoney(row.gstAmount)}</td>
                                                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold flex flex-col gap-1">
                                                        <span>{formatMoney(row.netProfit)}</span>
                                                        <span className="text-[9px] text-emerald-500/70 font-sans italic"> </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] z-10 flex justify-center gap-6 rounded-b-xl shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)]">
                            <button 
                                type="submit" 
                                name="director_approval"
                                className="px-8 py-3 rounded-lg border-2 border-blue-500 bg-[#0f172a] hover:bg-blue-900/30 text-white text-sm font-bold shadow-lg cursor-pointer transition-colors flex flex-col items-center leading-tight"
                            >
                                <span>Share With</span>
                                <span>Director's Approval</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setSelectedLeadForEdit(null)} 
                                className="px-10 py-3 rounded-lg border-2 border-slate-600 bg-[#0f172a] hover:bg-slate-800 text-white text-sm font-bold cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

            ) : selectedLeadForView ? (
                /* ─── READ ONLY PROFILE VIEW ─── */
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg shadow-2xl w-full max-w-sm p-6 relative">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Profile Inspector — LMN{selectedLeadForView.id}</h2>
                            <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-none p-0"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 text-slate-300 text-sm">
                            <p className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500 font-medium">Customer</span> 
                                <span className="font-bold text-white">{selectedLeadForView.customerName || selectedLeadForView.profileName}</span>
                            </p>
                            <p className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500 font-medium">Destination Type</span> 
                                <span className="text-cyan-400 font-bold">{selectedLeadForView.confirmedTripType || selectedLeadForView.destinationType || '—'}</span>
                            </p>
                            <p className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500 font-medium">Invoice Number</span> 
                                <span className="text-slate-300">{selectedLeadForView.taxInvoiceNumber || 'Not Generated'}</span>
                            </p>
                            <p className="flex justify-between pb-1">
                                <span className="text-slate-500 font-medium">Status</span> 
                                <span className="text-emerald-400 font-bold">{selectedLeadForView.status}</span>
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}