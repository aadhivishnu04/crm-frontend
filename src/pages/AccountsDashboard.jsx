import React, { useState, useEffect, useRef } from 'react';
import {
    Eye, Pencil, Search, MapPin, Calendar, 
    CreditCard, AlertCircle, CheckCircle2,
    CheckSquare, FileText, X, ArrowUp, DollarSign, Wallet,
    ChevronRight, ChevronDown, Plus
} from 'lucide-react';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

// ─────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder = "-- Select --", className }) => {
    const normalizedOptions = options.map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt });
    const safeValue = value !== undefined && value !== null ? String(value) : '';
    return (
        <select value={safeValue} onChange={(e) => onChange(e.target.value)} className={className}>
            <option value="" disabled hidden>{placeholder}</option>
            {normalizedOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
};

const DatePickerField = ({ value, onChange, type = "date", readOnly = false, className }) => {
    const inputRef = useRef(null);
    return (
        <div className={`relative w-full flex items-center ${!readOnly ? 'cursor-pointer' : ''}`} onClick={() => { if (!readOnly && inputRef.current?.showPicker) inputRef.current.showPicker(); }}>
            <input ref={inputRef} type={type} value={value || ''} onChange={onChange} readOnly={readOnly} className={`${className} ${readOnly ? '' : 'cursor-pointer'} custom-date-input`} style={{ paddingRight: '2.5rem', colorScheme: 'dark' }} />
            <Calendar size={15} className={`absolute right-3 pointer-events-none ${readOnly ? 'text-slate-600' : 'text-cyan-500'}`} />
        </div>
    );
};

function Pagination({ currentPage, totalPages, onPageChange, totalEntries, entriesPerPage }) {
    const from = totalEntries > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0;
    const to = Math.min(currentPage * entriesPerPage, totalEntries);
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-700/20 gap-3">
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 cursor-pointer">Previous</button>
                {Array.from({ length: totalPages || 1 }, (_, i) => (
                    <button type="button" key={i + 1} onClick={() => onPageChange(i + 1)} className={`px-3 py-1.5 rounded text-xs border cursor-pointer font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-700 text-white' : 'border-slate-700 bg-transparent text-slate-400'}`}>{i + 1}</button>
                ))}
                <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 cursor-pointer">Next</button>
            </div>
            <p className="text-xs text-slate-500">Showing {from}–{to} of {totalEntries} records</p>
        </div>
    );
}

// ─────────────────────────────────────────────
// HOOK – useLeads ENGINE
// ─────────────────────────────────────────────
function useLeads(triggerNotification) {
    const [leads, setLeads] = useState([]);
    const [isLoading, setLoading] = useState(true);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/leads`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            const parseJSON = (val) => {
                if (!val) return [];
                try { return typeof val === 'string' ? JSON.parse(val) : val; } 
                catch (e) { return []; }
            };

            const mappedData = data.map(lead => ({
                ...lead,
                paymentRequests: parseJSON(lead.paymentRequests),
                paymentHistoryDetails: parseJSON(lead.paymentHistoryDetails),
                domTransports: parseJSON(lead.domTransports),
                domHotels: parseJSON(lead.domHotels),
                intHotels: parseJSON(lead.intHotels),
                domLocalTransports: parseJSON(lead.domLocalTransports),
                flights: parseJSON(lead.flights),
            }));
            
            setLeads(mappedData);
        } catch (err) {
            console.error("Failed to fetch leads for Accounts:", err);
            setLeads([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    const updateLead = async (id, updatedData) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedData } : l));
        try {
            await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            triggerNotification('success', 'Accounts ledger updated successfully!');
            fetchLeads();
        } catch (err) {
            triggerNotification('success', 'Accounts changes saved locally.');
        }
    };

    return { leads, isLoading, updateLead, fetchLeads };
}

// ─────────────────────────────────────────────
// BOOKING INSPECTOR MODAL 
// (Customer Payment Verification Form)
// ─────────────────────────────────────────────
function BookingInspectorModal({ lead, onClose, updateLead }) {
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";

    // Track state of payment verifications locally before saving
    const [transactions, setTransactions] = useState(
        Array.isArray(lead.paymentHistoryDetails) ? lead.paymentHistoryDetails : []
    );

    // ── Derive domestic/international flag ──────────────────────────────
    const INDIA_KEYWORDS = ['india','chennai','mumbai','delhi','bangalore','bengaluru','hyderabad','kolkata','pune','goa','kochi','cochin','kerala','jaipur','udaipur','jodhpur','agra','varanasi','rishikesh','manali','shimla','ooty','kodaikanal','munnar','mysore','pondicherry','puducherry','andaman','lakshadweep','kashmir','ladakh','leh','darjeeling','gangtok','sikkim','meghalaya','assam','tamil nadu','karnataka','maharashtra','rajasthan','gujarat','uttarakhand','kanyakumari'];
    const dest = (lead.destination || lead.confirmedDestination || '').toLowerCase();
    const isDomestic = INDIA_KEYWORDS.some(kw => dest.includes(kw));
    const tourTypeLabel = isDomestic ? 'Domestic' : 'International';
    const isInternational = tourTypeLabel === 'International' || String(lead.destinationType).toLowerCase() === 'international';

    // ── Calculate duration from dates ───────────────────────────────────
    const calcDuration = () => {
        const start = lead.tourStartDate || lead.travelDate || lead.travelDates;
        const end = lead.returnDate || lead.tourEndDate;
        if (!start || !end) return lead.duration || lead.confirmedDuration || 'N/A';
        const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
        if (diff > 0) return `${diff} Night${diff > 1 ? 's' : ''} / ${diff + 1} Days`;
        return lead.duration || lead.confirmedDuration || 'N/A';
    };

    // Toggle verification for a specific transaction
    const handleToggleVerify = (idx) => {
        const updated = [...transactions];
        updated[idx] = { ...updated[idx], verified: !updated[idx].verified };
        setTransactions(updated);
    };

    // Save transaction modifications back to the lead without altering its stage
    const handleSaveVerifications = () => {
        updateLead(lead.id, {
            ...lead,
            paymentHistoryDetails: JSON.stringify(transactions)
        });
        onClose(); // Closes the modal and keeps it in the same list
    };

    return (
        <div className="bg-[#0f172a] flex flex-col w-full min-h-screen text-slate-100 relative z-50">
            {/* ── HEADER ── */}
            <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-50 flex-shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                    <FileText size={20} className="text-cyan-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase m-0">
                            Customer Payment Inspector
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 mb-0">Verify initial payment details from Sales</p>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 cursor-pointer border-none bg-transparent">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 w-full relative pb-10">
                <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full">
                    
                    {/* ════════════════════════════════════
                        SECTION 1 — CUSTOMER PAYMENT
                    ════════════════════════════════════ */}
                    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm">
                        <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-5 pb-2 border-b border-slate-800/60 uppercase tracking-wider">Customer Payment</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Lead Id</label>
                                <input type="text" readOnly value={`LMN${lead.id}`} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Customer Name</label>
                                <input type="text" readOnly value={lead.customerName || lead.profileName || '—'} className={`${readonlyCls} text-white font-bold`} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Booking Confirmed Date</label>
                                <input type="text" readOnly value={lead.confirmedDate || lead.bookingDate || '—'} className={readonlyCls} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination Type</label>
                                <input type="text" readOnly value={lead.destinationType || tourTypeLabel || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination</label>
                                <input type="text" readOnly value={lead.destination || lead.confirmedDestination || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Duration</label>
                                <input type="text" readOnly value={calcDuration()} className={readonlyCls} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">No. of Pax <span className="lowercase text-slate-600 font-normal">(Adults | Children)</span></label>
                                <input type="text" readOnly value={`${lead.noOfPax || '0'} | ${lead.noOfChildren || lead.confirmedNoOfChildren || '0'}`} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Tour Start Date</label>
                                <input type="text" readOnly value={lead.tourStartDate || lead.travelDate || lead.travelDates || '—'} className={`${readonlyCls} text-red-400`} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Tour End Date</label>
                                <input type="text" readOnly value={lead.tourEndDate || lead.returnDate || '—'} className={`${readonlyCls} text-red-400`} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Sales Executive</label>
                                <input type="text" readOnly value={lead.salesExecutive || lead.assignedTo || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Operations Executive</label>
                                <input type="text" readOnly value={lead.operationsExecutive || lead.operationExecutive || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Services</label>
                                <input type="text" readOnly value={lead.confirmedServices || lead.services || '—'} className={readonlyCls} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">GST</label>
                                <input type="text" readOnly value={lead.gstInclusion || lead.gstStatus || '—'} className={readonlyCls} />
                            </div>
                            {isInternational && (
                                <div>
                                    <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">TCS</label>
                                    <input type="text" readOnly value={lead.tcsInclusion || lead.tcsStatus || '—'} className={readonlyCls} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ════════════════════════════════════
                        SECTION 2 — SERVICE DETAILS
                    ════════════════════════════════════ */}
                    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm">
                        <h4 className="text-sm sm:text-base font-bold text-cyan-400 mb-5 pb-2 border-b border-slate-800/60 uppercase tracking-wider">Service Details</h4>
                        <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-800/60 text-[11px] uppercase text-slate-300 font-bold">
                                    <tr>
                                        <th className="px-5 py-3 w-[25%]">Service Name</th>
                                        <th className="px-5 py-3">Service Cost</th>
                                        <th className="px-5 py-3">Amount Paid <span className="text-[10px] text-emerald-400 font-normal lowercase ml-1">(verified)</span></th>
                                        <th className="px-5 py-3">Amount Pending</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {(() => {
                                        // 1. Gather services from confirmed lead data
                                        const srvsFromConfirmed = lead.confirmedServices ? lead.confirmedServices.split(', ').filter(Boolean) : [];
                                        
                                        // 2. Gather services from logged transactions to catch "Tour Package" or unmatched entries
                                        const srvsFromTxns = transactions.map(t => t.service).filter(Boolean);
                                        
                                        // 3. Create a unique list of all services
                                        const allServices = [...new Set([...srvsFromConfirmed, ...srvsFromTxns])];

                                        if (allServices.length === 0) {
                                            return (
                                                <tr className="hover:bg-slate-800/20">
                                                    <td colSpan="4" className="px-5 py-6 text-center text-slate-500 italic">No services listed</td>
                                                </tr>
                                            );
                                        }
                                        
                                        return allServices.map((s, idx) => {
                                            let costNum = 0;
                                            const sLower = s.toLowerCase();
                                            
                                            // Pull from total package cost if the transaction is for the whole package
                                            if (sLower === 'tour package' || sLower === 'package' || sLower === 'total') {
                                                costNum = Number(String(lead.totalPackageCost || lead.packageCost || lead.budget || lead.amount || '0').replace(/[^0-9.-]+/g,""));
                                            } else {
                                                // Find the original index of this service in the confirmed services array to map to service1Cost, service2Cost, etc.
                                                const originalIndex = srvsFromConfirmed.indexOf(s);
                                                
                                                const costsObj = typeof lead.serviceCosts === 'string' ? JSON.parse(lead.serviceCosts || '{}') : (lead.serviceCosts || {});
                                                let costStr = '0';
                                                
                                                if (costsObj[s]) {
                                                    costStr = costsObj[s];
                                                } else if (originalIndex !== -1) {
                                                    costStr = lead[`service${originalIndex + 1}Cost`] || '0';
                                                }
                                                
                                                costNum = Number(String(costStr).replace(/[^0-9.-]+/g,"")) || 0;
                                            }
                                            
                                            // Sum up ONLY the verified amounts for this specific service
                                            const paid = transactions
                                                .filter(t => (t.service || '').toLowerCase() === sLower && t.verified)
                                                .reduce((sum, t) => sum + (Number(String(t.amount).replace(/[^0-9.-]+/g,"")) || 0), 0);
                                                
                                            const pending = costNum - paid;
                                            
                                            return (
                                                <tr key={idx} className="hover:bg-slate-800/30">
                                                    <td className="px-5 py-4 font-bold text-white">{s}</td>
                                                    <td className="px-5 py-4 font-mono text-slate-300">₹{costNum}</td>
                                                    <td className="px-5 py-4 font-mono text-emerald-400">₹{paid}</td>
                                                    <td className="px-5 py-4 font-mono text-orange-400">₹{pending}</td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ════════════════════════════════════
                        SECTION 3 — TRANSACTION DETAILS
                    ════════════════════════════════════ */}
                    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm mb-6">
                        <h4 className="text-sm sm:text-base font-bold text-cyan-400 mb-5 pb-2 border-b border-slate-800/60 uppercase tracking-wider">Transaction Details</h4>
                        <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
                                <thead className="bg-slate-800/60 text-[11px] uppercase text-slate-300 font-bold whitespace-nowrap">
                                    <tr>
                                        <th className="px-4 py-3">No.</th>
                                        <th className="px-4 py-3">Service</th>
                                        <th className="px-4 py-3">Amount Received</th>
                                        <th className="px-4 py-3">Payment Mode</th>
                                        <th className="px-4 py-3">Transaction Reference</th>
                                        <th className="px-4 py-3">Payment Date</th>
                                        <th className="px-4 py-3">Attachment</th>
                                        <th className="px-4 py-3 text-center">Verification Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-xs">
                                    {(() => {
                                        if (transactions.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="8" className="px-4 py-6 text-center text-slate-500 italic">No transactions recorded</td>
                                                </tr>
                                            );
                                        }

                                        return transactions.map((txn, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-4 font-bold">{idx + 1}</td>
                                                <td className="px-4 py-4">{txn.service || '—'}</td>
                                                <td className="px-4 py-4 font-mono font-bold text-emerald-400">{txn.amount || '—'}</td>
                                                <td className="px-4 py-4">{txn.mode || '—'}</td>
                                                <td className="px-4 py-4 font-mono text-slate-400">{txn.transactionId || '—'}</td>
                                                <td className="px-4 py-4">{txn.date || '—'}</td>
                                                <td className="px-4 py-4 text-cyan-400 underline cursor-pointer">{txn.attachment ? 'View' : '—'}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none border border-slate-700 bg-slate-900 w-fit px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" 
                                                            checked={txn.verified || false} 
                                                            onChange={() => handleToggleVerify(idx)}
                                                        />
                                                        <span className={`font-bold ${txn.verified ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                            {txn.verified ? 'Verified' : 'Verify'}
                                                        </span>
                                                    </label>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── FOOTER ── */}
            <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] z-50 flex justify-end items-center gap-3 flex-shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)]">
                <button type="button" onClick={onClose} className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-transparent border border-cyan-500 hover:bg-slate-800 cursor-pointer text-cyan-400 text-sm font-semibold rounded-lg sm:rounded transition-colors uppercase tracking-wider order-2 sm:order-1 border-none">
                    Close
                </button>
                <button
                    type="button"
                    onClick={handleSaveVerifications}
                    className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 border-none cursor-pointer text-white text-sm font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                    <CheckSquare size={16} />
                    Save Verifications
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function AccountsDashboard() {
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const triggerNotification = (type, message) => setNotification({ show: true, type, message });

    useEffect(() => {
        if (notification.show) {
            const t = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
            return () => clearTimeout(t);
        }
    }, [notification.show]);

    const { leads, isLoading, updateLead } = useLeads(triggerNotification);

    const [activeTab, setActiveTab] = useState('Confirmed Bookings');
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modals
    const [selectedLeadForView, setSelectedLeadForView] = useState(null);
    const [selectedLeadForInspect, setSelectedLeadForInspect] = useState(null); // Booking Inspector
    const [selectedPaymentReq, setSelectedPaymentReq] = useState(null);

    // Filters for "Trip Completed"
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [showScrollTop, setShowScrollTop] = useState(false);
    const mainRef = useRef(null);

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

const confirmedBookings = leads.filter(l => 
        l.status === 'Confirmed Bookings' || 
        l.status === 'Move To Operation' || 
        l.status === 'Upcoming Departure' ||
        l.statusCategory === 'Confirmed' ||
        (Array.isArray(l.paymentHistoryDetails) && l.paymentHistoryDetails.length > 0)
    );

    const paymentRequestsList = leads.flatMap(lead => {
        return (lead.paymentRequests || []).map((req, index) => ({
            ...req,
            reqIndex: index,
            leadId: lead.id,
            customerName: lead.customerName || lead.profileName,
            destination: lead.destination,
            operationsExecutive: lead.assignedTo || 'Operations Team', 
            originalLead: lead
        }));
    }).filter(req => req.service && req.amountToPay); 

    const paymentPending = leads.filter(l => {
        if (!l.paymentStatus) return false;
        const status = String(l.paymentStatus).toLowerCase();
        return status !== 'fully paid' && status !== 'cleared' && l.status !== 'New Requests' && l.status !== 'Follow-Up';
    });

    let tripsCompleted = leads.filter(l => 
        l.status === 'Trip Completed' || 
        l.status === 'Trip Closed' || 
        l.status === 'Handover Completed'
    );

    if (filterStartDate && filterEndDate) {
        tripsCompleted = tripsCompleted.filter(l => {
            if (!l.travelDates && !l.travelDate && !l.tourStartDate) return false;
            const tripDate = new Date(l.travelDates || l.travelDate || l.tourStartDate);
            return tripDate >= new Date(filterStartDate) && tripDate <= new Date(filterEndDate);
        });
    }

    const getActiveData = () => {
        switch (activeTab) {
            case 'Confirmed Bookings': return confirmedBookings;
            case 'Payment Requests': return paymentRequestsList;
            case 'Client Payment Pending': return paymentPending;
            case 'Trip Completed': return tripsCompleted;
            default: return [];
        }
    };

    const handleTabChange = (tab) => { 
        setActiveTab(tab); 
        setCurrentPage(1); 
        setSearchQuery(''); 
    };

    const activeData = getActiveData();
    const filtered = activeData.filter(item => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return `LMN${item.leadId || item.id}`.toLowerCase().includes(q) || 
               (item.customerName || '').toLowerCase().includes(q) || 
               (item.destination || '').toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
    const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    const categories = [
        { id: 'Confirmed Bookings', label: 'Confirmed Bookings', icon: CheckSquare, count: confirmedBookings.length },
        { id: 'Payment Requests', label: 'Payment Requests', icon: FileText, count: paymentRequestsList.length },
        { id: 'Client Payment Pending', label: 'Client Overdue', icon: AlertCircle, count: paymentPending.length },
        { id: 'Trip Completed', label: 'Trip Completed', icon: CheckCircle2, count: tripsCompleted.length },
    ];

    // ─── PAYMENT REQ EDIT MODAL LOGIC ─────────────────────────────────────────
    const handlePaymentReqOpen = (req) => {
        setSelectedPaymentReq({
            ...req,
            outService: req.outService || req.service || '',
            outProviderName: req.outProviderName || req.providerName || '',
            outAmountPaid: req.outAmountPaid || '',
            outTransactionMode: req.outTransactionMode || '',
            outDepositedBank: req.outDepositedBank || '',
            outTransactionId: req.outTransactionId || '',
        });
    };

    const handlePaymentReqUpdate = (e) => {
        e.preventDefault();
        const leadToUpdate = leads.find(l => l.id === selectedPaymentReq.leadId);
        if (!leadToUpdate) return;

        const updatedRequests = [...leadToUpdate.paymentRequests];
        updatedRequests[selectedPaymentReq.reqIndex] = {
            service: selectedPaymentReq.service,
            providerName: selectedPaymentReq.providerName,
            paymentDueDate: selectedPaymentReq.paymentDueDate,
            serviceCost: selectedPaymentReq.serviceCost,
            paymentType: selectedPaymentReq.paymentType,
            amountToPay: selectedPaymentReq.amountToPay,
            paymentAccountDetails: selectedPaymentReq.paymentAccountDetails,
            dirStatus: selectedPaymentReq.dirStatus, 
            dirRemarks: selectedPaymentReq.dirRemarks,
            outService: selectedPaymentReq.outService,
            outProviderName: selectedPaymentReq.outProviderName,
            outAmountPaid: selectedPaymentReq.outAmountPaid,
            outTransactionMode: selectedPaymentReq.outTransactionMode,
            outDepositedBank: selectedPaymentReq.outDepositedBank,
            outTransactionId: selectedPaymentReq.outTransactionId,
            status: selectedPaymentReq.outAmountPaid ? 'Paid' : 'Pending' 
        };

        updateLead(leadToUpdate.id, {
            ...leadToUpdate,
            paymentRequests: JSON.stringify(updatedRequests)
        });

        setSelectedPaymentReq(null);
    };

    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";

    return (
        <div ref={mainRef} className="w-full bg-[#0f172a] min-h-screen font-sans text-white overflow-y-auto relative" style={{ height: '100vh' }}>
            <style>{`.custom-date-input::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer; }`}</style>
            
            {notification.show && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-bold bg-[#0d233e] tracking-wide animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{notification.message}</span>
                </div>
            )}

            {/* CONDITIONAL RENDER: Main Dashboard vs Full-Screen Forms */}
            {!selectedLeadForInspect && !selectedLeadForView && !selectedPaymentReq ? (
                <div className="p-4 sm:p-6">

                    <div className="py-12 mb-0 sm:mb-8">
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Wallet className="text-cyan-500" size={28} /> Accounts Dashboard
                        </h1>
                        <p className="text-slate-400 text-sm sm:text-base mt-1">Manage vendor payment requests, client dues, and finalized trip financials.</p>
                    </div>

                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {categories.map((cat) => (
                            <div key={cat.id} onClick={() => handleTabChange(cat.id)} className={`relative p-5 rounded-xl cursor-pointer transition-all border ${activeTab === cat.id ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200 hover:bg-slate-800/30'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`p-3 rounded-lg ${activeTab === cat.id ? 'bg-slate-700 text-cyan-400' : 'bg-slate-800/20 text-slate-300'}`}><cat.icon size={24} /></div>
                                    <span className={`text-xl font-bold ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.count}</span>
                                </div>
                                <h3 className={`font-semibold text-base ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.label}</h3>
                                {activeTab === cat.id && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-cyan-500" />}
                            </div>
                        ))}
                    </div>

                    <div className="bg-transparent border border-slate-700/30 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between p-4 sm:p-5 border-b border-slate-700/20 gap-3">
                            <div className="flex flex-col">
                                <h2 className="text-base sm:text-lg font-bold text-white">{activeTab} <span className="text-slate-400 font-normal text-sm ml-2">({filtered.length} records)</span></h2>
                                {activeTab === 'Confirmed Bookings' && <span className="text-xs text-slate-500 mt-1 italic">Once sales has given "Booking Confirmed"</span>}
                                {activeTab === 'Client Payment Pending' && <span className="text-xs text-slate-500 mt-1 italic">Client balance is not 0 or status is not Fully Paid</span>}
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                
                                {activeTab === 'Trip Completed' && (
                                    <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded border border-slate-700">
                                        <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer" style={{colorScheme: 'dark'}} />
                                        <span className="text-slate-500 text-xs">to</span>
                                        <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer" style={{colorScheme: 'dark'}} />
                                        {(filterStartDate || filterEndDate) && (
                                            <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="ml-1 text-slate-400 hover:text-red-400"><X size={14}/></button>
                                        )}
                                    </div>
                                )}

                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input type="text" placeholder="Search ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-600 rounded-lg text-slate-100 focus:border-cyan-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-200 min-w-[900px]">
                                <thead className="bg-slate-900/80 border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                    
                                    {activeTab === 'Confirmed Bookings' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Trip Date</th>
                                            <th className="px-6 py-4">Package Cost</th>
                                            <th className="px-6 py-4">Client Payment Status</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                    {activeTab === 'Payment Requests' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Service</th>
                                            <th className="px-6 py-4">Operations Exec</th>
                                            <th className="px-6 py-4">Requested Amount</th>
                                            <th className="px-6 py-4">Due Date</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                    {activeTab === 'Client Payment Pending' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination & Date</th>
                                            <th className="px-6 py-4">Sales Executive</th>
                                            <th className="px-6 py-4">Package Cost</th>
                                            <th className="px-6 py-4 text-orange-400">Due Amount</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                    {activeTab === 'Trip Completed' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Trip Dates</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                </thead>
                                <tbody className="divide-y divide-slate-700/20">
                                    {isLoading ? <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">Querying accounts records...</td></tr> : paginated.length > 0 ? paginated.map((row, idx) => (
                                        <tr key={`${row.id}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                                            
                                            {/* CONFIRMED BOOKINGS ROW */}
                                            {activeTab === 'Confirmed Bookings' && (
                                                <>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                    <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                    <td className="px-6 py-4 text-emerald-400 flex flex-col gap-0.5">
                                                        <span className="flex items-center gap-1"><MapPin size={12} />{row.destination}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase">{row.tourType || row.packageType}</span>
                                                    </td>
                                                    <td className="px-6 py-4">{row.travelDates || row.travelDate || row.tourStartDate || 'TBD'}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-200">
                                                        {row.totalPackageCost || row.packageCost || row.budget || 'TBD'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${row.paymentStatus === 'Fully Paid' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-orange-950/40 text-orange-400 border-orange-900/40'}`}>
                                                            {row.paymentStatus || 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLeadForInspect(row)}
                                                            className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full text-xs font-bold"
                                                            title="Open Booking Inspector"
                                                        >
                                                            <Eye size={14} /> Inspect
                                                        </button>
                                                    </td>
                                                </>
                                            )}

                                            {/* PAYMENT REQUESTS ROW */}
                                            {activeTab === 'Payment Requests' && (
                                                <>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.leadId}</td>
                                                    <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                    <td className="px-6 py-4 text-emerald-400"><MapPin size={12} className="inline mr-1"/>{row.destination}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-cyan-400">{row.service}</span>
                                                            <span className="text-[10px] text-slate-400">{row.providerName} - {row.paymentType}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">{row.operationsExecutive}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-orange-400">{row.amountToPay}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs font-bold ${new Date(row.paymentDueDate) < new Date() ? 'text-red-400' : 'text-slate-300'}`}>
                                                            {row.paymentDueDate}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button type="button" onClick={() => handlePaymentReqOpen(row)} className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full text-xs font-bold">
                                                            <Pencil size={14} /> View / Edit
                                                        </button>
                                                    </td>
                                                </>
                                            )}

                                            {/* CLIENT PAYMENT PENDING ROW */}
                                            {activeTab === 'Client Payment Pending' && (
                                                <>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                    <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-emerald-400"><MapPin size={12} className="inline mr-1"/>{row.destination}</span>
                                                            <span className="text-[10px] text-slate-400 bg-slate-800 w-fit px-1.5 rounded mt-0.5">{row.travelDates || row.travelDate || row.tourStartDate || 'TBD'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">{row.salesExecutive || row.assignedTo || 'Unassigned'}</td>
                                                    <td className="px-6 py-4 font-mono text-slate-300">{row.totalPackageCost || row.packageCost || row.budget || 'TBD'}</td>
                                                    <td className="px-6 py-4 font-mono font-black text-orange-400">{row.balancePending || 'Calculate Manually'}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center justify-center gap-1 w-full" title="View Specifics">
                                                            <Eye size={16} /> View
                                                        </button>
                                                    </td>
                                                </>
                                            )}

                                            {/* TRIP COMPLETED ROW */}
                                            {activeTab === 'Trip Completed' && (
                                                <>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                    <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                    <td className="px-6 py-4 text-emerald-400"><MapPin size={12} className="inline mr-1"/>{row.destination}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5 text-xs">
                                                            <span className="text-slate-300">Start: <strong className="text-cyan-400">{row.tourStartDate || row.travelDate || row.travelDates || 'TBD'}</strong></span>
                                                            <span className="text-slate-300">End: <strong className="text-orange-400">{row.returnDate || 'TBD'}</strong></span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center justify-center gap-1 w-full" title="View Details">
                                                            <Eye size={16} /> View
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                            
                                        </tr>
                                    )) : <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalEntries={filtered.length} entriesPerPage={entriesPerPage} />
                    </div>
                </div>

            ) : selectedLeadForInspect ? (
                /* ─── BOOKING INSPECTOR FULL-SCREEN VIEW ──────────────────── */
                <BookingInspectorModal
                    lead={selectedLeadForInspect}
                    onClose={() => setSelectedLeadForInspect(null)}
                    updateLead={updateLead}
                />

            ) : selectedLeadForView ? (
                /* ─── FULL-SCREEN PROFILE VIEW ─────────────────────────── */
                <div className="bg-[#0f172a] flex flex-col w-full min-h-screen text-slate-100 relative z-50">
                    {/* HEADER */}
                    <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-50 flex-shrink-0 shadow-md">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate pr-4">
                                <Eye size={20} className="text-blue-400 flex-shrink-0" />
                                <span className="truncate hidden sm:inline">Profile Inspector</span>
                                <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-shrink-0">
                                    LMN{String(selectedLeadForView.id || '').padStart(4, '0')}
                                </span>
                            </h2>
                        </div>
                        <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-auto cursor-pointer border-none bg-transparent">
                            <X size={20} />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 w-full relative pb-10">
                        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full max-w-7xl mx-auto">
                            
                            {/* SECTION: SUMMARY */}
                            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm transition-all duration-300">
                                <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-800/60">
                                    <h3 className="text-sm sm:text-base font-bold text-cyan-400 tracking-wider uppercase m-0">
                                        Trip Info & Financials
                                    </h3>
                                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded tracking-wider">Read-Only</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Customer Name</label>
                                        <input type="text" readOnly value={selectedLeadForView.customerName || selectedLeadForView.profileName || 'N/A'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Destination</label>
                                        <input type="text" readOnly value={selectedLeadForView.destination || selectedLeadForView.confirmedDestination || 'N/A'} className="w-full px-3 py-2 bg-[#091124]/50 border border-cyan-900/30 rounded text-cyan-400 font-bold text-sm cursor-not-allowed opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Status</label>
                                        <input type="text" readOnly value={selectedLeadForView.status || selectedLeadForView.rowStatus || 'N/A'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-emerald-400 text-sm uppercase cursor-not-allowed font-bold opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Travel Dates</label>
                                        <input type="text" readOnly value={selectedLeadForView.travelDates || selectedLeadForView.travelDate || selectedLeadForView.tourStartDate || 'TBD'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Total Cost / Budget</label>
                                        <input type="text" readOnly value={selectedLeadForView.totalPackageCost || selectedLeadForView.packageCost || selectedLeadForView.budget || selectedLeadForView.amount || 'N/A'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 font-mono text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Balance Pending</label>
                                        <input type="text" readOnly value={selectedLeadForView.balancePending || 'N/A'} className="w-full px-3 py-2 bg-[#091124]/50 border border-red-900/30 rounded text-red-400 font-mono font-bold text-sm cursor-not-allowed opacity-90 focus:outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: HISTORY / NOTES */}
                            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm transition-all duration-300">
                                <h3 className="text-sm sm:text-base font-bold text-cyan-400 tracking-wider uppercase mb-5 pb-2 border-b border-slate-800/60">
                                    History / Notes
                                </h3>
                                <textarea readOnly rows={5} value={Array.isArray(selectedLeadForView.paymentHistoryDetails) 
                                        ? JSON.stringify(selectedLeadForView.paymentHistoryDetails, null, 2) 
                                        : (selectedLeadForView.paymentHistoryDetails || selectedLeadForView.leadMessage || selectedLeadForView.message || 'No additional details recorded.')} className="w-full px-3 py-2 bg-[#07202a] border border-slate-700/30 rounded-lg text-slate-200 text-sm cursor-not-allowed opacity-90 focus:outline-none resize-none custom-scrollbar" />
                            </div>

                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] z-50 flex justify-end items-center gap-3 flex-shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)]">
                        <button type="button" onClick={() => setSelectedLeadForView(null)}
                            className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-slate-800 hover:bg-slate-700 cursor-pointer text-white text-sm sm:text-base font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider border-none">
                            CLOSE VIEW
                        </button>
                    </div>
                </div>
            ) : selectedPaymentReq ? (
                /* ─── FULL ACCOUNTS EDIT VIEW ─────────────────────── */
                <div className="bg-[#0f172a] flex flex-col w-full min-h-screen text-slate-100 relative z-50">
                    {/* HEADER */}
                    <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-50 flex-shrink-0 shadow-md">
                        <div className="flex items-center gap-3">
                            <CreditCard size={20} className="text-cyan-400 flex-shrink-0" />
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase m-0">
                                Accounts Edit — LMN{selectedPaymentReq.leadId}
                            </h2>
                        </div>
                        <button type="button" onClick={() => setSelectedPaymentReq(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 cursor-pointer border-none bg-transparent">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handlePaymentReqUpdate} className="flex flex-col flex-1 w-full relative">
                        {/* CONTENT */}
                        <div className="flex-1 w-full relative pb-10">
                            <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full max-w-7xl mx-auto">
                                
                                {/* HEADER DETAILS */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-700/50 p-5 rounded-xl bg-slate-900/30">
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Lead Id</label><input type="text" readOnly value={`LMN${selectedPaymentReq.leadId}`} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Customer Name</label><input type="text" readOnly value={selectedPaymentReq.customerName || ''} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Destination</label><input type="text" readOnly value={selectedPaymentReq.destination || ''} className={readonlyCls} /></div>
                                    
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Travel Date</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.travelDates || selectedPaymentReq.originalLead?.travelDate || 'TBD'} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Return Date</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.returnDate || 'TBD'} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">No. Of Pax</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.noOfPax || 'N/A'} className={readonlyCls} /></div>
                                    
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Sales Executive</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.salesExecutive || selectedPaymentReq.originalLead?.assignedTo || 'Unassigned'} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Operations Executive</label><input type="text" readOnly value={selectedPaymentReq.operationsExecutive || ''} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">No. Of Children</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.noOfChildren || '0'} className={readonlyCls} /></div>
                                    
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">GST Inclusion</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.gstStatus || 'Excluded'} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">TCS Inclusion</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.tcsStatus || 'Excluded'} className={readonlyCls} /></div>
                                    <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Total Package Cost</label><input type="text" readOnly value={selectedPaymentReq.originalLead?.totalPackageCost || selectedPaymentReq.originalLead?.packageCost || 'TBD'} className={`${readonlyCls} text-emerald-400`} /></div>
                                </div>

                                {/* CONFIRMED SERVICES — fetched from Sales Booking Confirmation entry */}
                                {(() => {
                                    const confirmedServicesArr = selectedPaymentReq.originalLead?.confirmedServices
                                        ? selectedPaymentReq.originalLead.confirmedServices.split(', ').filter(Boolean)
                                        : [];
                                    if (confirmedServicesArr.length === 0) return null;
                                    return (
                                        <div className="pt-4 border-t border-slate-700/50">
                                            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-3">
                                                <h3 className="text-sm font-bold text-cyan-400 tracking-wider m-0 uppercase">Confirmed Services</h3>
                                                <span className="text-xs text-orange-400 font-bold italic bg-orange-950/30 px-2 py-1 rounded">Service & Cost fetched from Sales</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {confirmedServicesArr.slice(0, 3).map((srv, idx) => (
                                                    <div key={idx}>
                                                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{srv} Cost</label>
                                                        <input type="text" readOnly value={selectedPaymentReq.originalLead?.[`service${idx + 1}Cost`] || 'TBD'} className={readonlyCls} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* VENDOR DETAILS TABLE */}
                                <div className="pt-4 border-t border-slate-700/50">
                                    <h3 className="text-sm font-bold text-cyan-400 tracking-wider mb-4 uppercase">Vendor Details</h3>
                                    <div className="bg-slate-900 border border-slate-700/50 rounded overflow-hidden">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                                                <tr>
                                                    <th className="px-4 py-2">Service</th>
                                                    <th className="px-4 py-2">Cost</th>
                                                    <th className="px-4 py-2">Amount Paid</th>
                                                    <th className="px-4 py-2">Pending Amount</th>
                                                    <th className="px-4 py-2">Next Payment Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {selectedPaymentReq.originalLead?.paymentRequests && selectedPaymentReq.originalLead.paymentRequests.length > 0 ? (
                                                    selectedPaymentReq.originalLead.paymentRequests.map((req, i) => (
                                                        <tr key={i} className="hover:bg-slate-800/30">
                                                            <td className="px-4 py-3 font-medium">{req.service} <span className="text-[10px] text-slate-500 block">{req.providerName}</span></td>
                                                            <td className="px-4 py-3 font-mono">{req.serviceCost || 'TBD'}</td>
                                                            <td className="px-4 py-3 font-mono text-emerald-400">{req.outAmountPaid || '0'}</td>
                                                            <td className="px-4 py-3 font-mono text-orange-400">{req.amountToPay || 'TBD'}</td>
                                                            <td className="px-4 py-3">{req.paymentDueDate || 'TBD'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-500">No vendor payment ledgers exist.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* CLIENT PAYMENT STATUS */}
                                <div className="pt-4 border-t border-slate-700/50">
                                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-4">
                                        <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase m-0">Client Payment Status</h3>
                                        <span className="text-xs text-orange-400 font-bold italic bg-orange-950/30 px-2 py-1 rounded">History of Payment Entry Given by Sales</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Client Paid</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.amountReceived || '0'} className={`${readonlyCls} text-emerald-400`} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Client Balance</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.balancePending || '0'} className={`${readonlyCls} text-red-400`} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Payment Due Date</label>
                                            <DatePickerField type="date" readOnly value={selectedPaymentReq.originalLead?.nextPaymentDate || ''} className={readonlyCls} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 border border-slate-700/50 rounded overflow-hidden">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                                                <tr>
                                                    <th className="px-4 py-2">Date</th>
                                                    <th className="px-4 py-2">Service</th>
                                                    <th className="px-4 py-2">Amount</th>
                                                    <th className="px-4 py-2">Mode</th>
                                                    <th className="px-4 py-2">Transaction ID</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {Array.isArray(selectedPaymentReq.originalLead?.paymentHistoryDetails) && selectedPaymentReq.originalLead?.paymentHistoryDetails.length > 0 ? (
                                                    selectedPaymentReq.originalLead.paymentHistoryDetails.map((hist, i) => (
                                                        <tr key={i} className="hover:bg-slate-800/30">
                                                            <td className="px-4 py-3">{hist.date || 'TBD'}</td>
                                                            <td className="px-4 py-3">{hist.service || 'N/A'}</td>
                                                            <td className="px-4 py-3 font-mono">{hist.amount || '0'}</td>
                                                            <td className="px-4 py-3">{hist.mode || 'N/A'}</td>
                                                            <td className="px-4 py-3 font-mono">{hist.transactionId || 'N/A'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td className="px-4 py-3">{selectedPaymentReq.originalLead?.nextPaymentDate || 'N/A'}</td>
                                                        <td className="px-4 py-3">Package</td>
                                                        <td className="px-4 py-3 font-mono text-emerald-400">{selectedPaymentReq.originalLead?.amountReceived || '0'}</td>
                                                        <td className="px-4 py-3">{selectedPaymentReq.originalLead?.paymentMode || 'N/A'}</td>
                                                        <td className="px-4 py-3 font-mono">{selectedPaymentReq.originalLead?.transactionId || 'N/A'}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* PAYMENT REQUEST */}
                                <div className="pt-4 border-t border-slate-700/50">
                                    <h3 className="text-sm font-bold text-cyan-400 tracking-wider mb-4 uppercase">Payment Request</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/40 p-5 rounded-xl border border-slate-700/50">
                                        <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Service</label><input type="text" readOnly value={selectedPaymentReq.service || ''} className={readonlyCls} /></div>
                                        <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Provider Name</label><input type="text" readOnly value={selectedPaymentReq.providerName || ''} className={readonlyCls} /></div>
                                        <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Due Date</label><DatePickerField type="date" readOnly value={selectedPaymentReq.paymentDueDate || ''} className={readonlyCls} /></div>
                                        
                                        <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Cost</label><input type="text" readOnly value={selectedPaymentReq.serviceCost || ''} className={readonlyCls} /></div>
                                        <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Payment Type</label><input type="text" readOnly value={selectedPaymentReq.paymentType || ''} className={readonlyCls} /></div>
                                        <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Amount to Pay</label><input type="text" readOnly value={selectedPaymentReq.amountToPay || ''} className={`${readonlyCls} text-orange-400`} /></div>
                                        
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Payment Account Details</label>
                                            <input type="text" readOnly value={selectedPaymentReq.paymentAccountDetails || ''} className={readonlyCls} />
                                        </div>

                                        <div className="sm:col-span-3 border-t border-slate-700/50 pt-4 mt-2 flex items-center justify-between relative">
                                            <span className="absolute -top-3 left-4 bg-[#0f172a] px-2 text-[10px] font-bold text-slate-500 italic">Fetched from Director's board</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-2">
                                                <div className="flex items-center gap-4">
                                                    <label className="text-sm font-bold text-slate-300 w-32 shrink-0">Director Approval</label>
                                                    <input type="text" readOnly value={selectedPaymentReq.dirStatus || 'Pending Review'} className={`${readonlyCls} w-full ${selectedPaymentReq.dirStatus === 'Approved' ? 'text-emerald-400' : 'text-slate-400'}`} />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <label className="text-sm font-bold text-slate-300 w-32 shrink-0">Director's Remarks</label>
                                                    <input type="text" readOnly value={selectedPaymentReq.dirRemarks || 'N/A'} className={`${readonlyCls} w-full`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* OUT PAYMENT (EDITABLE) */}
                                <div className="pt-4 border-t border-slate-700/50">
                                    <div className="flex items-center gap-4 border-b border-slate-700/50 pb-2 mb-4">
                                        <h3 className="text-sm font-bold text-cyan-400 tracking-wider m-0 uppercase">Out Payment</h3>
                                        <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-1 rounded">View | Edit</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-900/60 p-6 rounded-xl border border-slate-700">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1">Service</label>
                                            <input type="text" value={selectedPaymentReq.outService} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, outService: e.target.value})} className={inputCls} placeholder="Enter service type" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1">Provider Name</label>
                                            <input type="text" value={selectedPaymentReq.outProviderName} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, outProviderName: e.target.value})} className={inputCls} placeholder="Enter provider name" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1">Amount Paid</label>
                                            <input type="text" value={selectedPaymentReq.outAmountPaid} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, outAmountPaid: e.target.value})} className={`${inputCls} text-emerald-400 font-mono`} placeholder="₹0.00" />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1">Transaction Mode</label>
                                            <CustomSelect 
                                                value={selectedPaymentReq.outTransactionMode} 
                                                onChange={v => setSelectedPaymentReq({...selectedPaymentReq, outTransactionMode: v})} 
                                                className={selectCls} 
                                                placeholder="Dropdown" 
                                                options={['NEFT', 'RTGS', 'IMPS', 'UPI', 'Credit Card', 'Cash']} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1">Deposited Bank</label>
                                            <CustomSelect 
                                                value={selectedPaymentReq.outDepositedBank} 
                                                onChange={v => setSelectedPaymentReq({...selectedPaymentReq, outDepositedBank: v})} 
                                                className={selectCls} 
                                                placeholder="Dropdown" 
                                                options={['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Other']} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1">Transaction Id</label>
                                            <input type="text" value={selectedPaymentReq.outTransactionId} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, outTransactionId: e.target.value})} className={inputCls} placeholder="Enter transaction reference" />
                                        </div>
                                    </div>
                                </div>

                            </div>
                            
                            {/* FOOTER */}
                            <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] z-50 flex justify-end items-center gap-3 flex-shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)]">
                                <button type="button" onClick={() => setSelectedPaymentReq(null)} className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-transparent border border-cyan-500 hover:bg-slate-800 cursor-pointer text-cyan-400 text-sm font-semibold rounded-lg sm:rounded transition-colors uppercase tracking-wider order-2 sm:order-1 border-none">
                                    CANCEL
                                </button>
                                <button type="submit" className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-[#16D3F2] hover:bg-cyan-400 active:bg-cyan-600 border-none cursor-pointer text-[#0f172a] text-sm font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider flex items-center justify-center gap-2 order-1 sm:order-2">
                                    <CheckSquare size={16} /> SAVE & CLEAR
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : null}

            <button type="button" onClick={scrollToTop} aria-label="Scroll to top" className={`fixed bottom-6 right-5 z-40 p-3 rounded-full bg-slate-800 border border-slate-600 text-slate-300 shadow-lg transition-all duration-300 cursor-pointer hover:bg-slate-700 hover:text-white ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <ArrowUp size={18} />
            </button>
        </div>
    );
}