import React, { useState, useEffect, useRef } from 'react';
import {
    Eye, Pencil, Search, MapPin, Calendar, 
    CreditCard, AlertCircle, CheckCircle2,
    CheckSquare, FileText, X, ArrowUp, DollarSign, Wallet,
    Truck, Building2, Car, ChevronRight
} from 'lucide-react';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "http://192.168.1.9:8082/api";

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
// Full Purchase Details form matching wireframe
// ─────────────────────────────────────────────
function BookingInspectorModal({ lead, onClose, onMoveToBilling }) {
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";

    // ── Derive domestic/international flag ──────────────────────────────
    const INDIA_KEYWORDS = ['india','chennai','mumbai','delhi','bangalore','bengaluru','hyderabad','kolkata','pune','goa','kochi','cochin','kerala','jaipur','udaipur','jodhpur','agra','varanasi','rishikesh','manali','shimla','ooty','kodaikanal','munnar','mysore','pondicherry','puducherry','andaman','lakshadweep','kashmir','ladakh','leh','darjeeling','gangtok','sikkim','meghalaya','assam','tamil nadu','karnataka','maharashtra','rajasthan','gujarat','uttarakhand','kanyakumari'];
    const dest = (lead.destination || lead.confirmedDestination || '').toLowerCase();
    const isDomestic = INDIA_KEYWORDS.some(kw => dest.includes(kw));
    const tourTypeLabel = isDomestic ? 'Domestic' : 'International';

    // ── Calculate duration from dates ───────────────────────────────────
    const calcDuration = () => {
        const start = lead.tourStartDate || lead.travelDate || lead.travelDates;
        const end = lead.returnDate;
        if (!start || !end) return lead.duration || lead.confirmedDuration || 'N/A';
        const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
        if (diff > 0) return `${diff} Night${diff > 1 ? 's' : ''} / ${diff + 1} Days`;
        return lead.duration || lead.confirmedDuration || 'N/A';
    };

    // ── Build purchase rows from paymentRequests (ops-confirmation data) ─
    const payReqs = Array.isArray(lead.paymentRequests) ? lead.paymentRequests : [];

    // Group by service category
    const transportRows = payReqs.filter(r => {
        const s = (r.service || '').toLowerCase();
        return s.includes('flight') || s.includes('train') || s.includes('bus') || s.includes('transport') || s.includes('transfer') || s.includes('ferry');
    });

    const hotelRows = payReqs.filter(r => {
        const s = (r.service || '').toLowerCase();
        return s.includes('hotel') || s.includes('resort') || s.includes('stay') || s.includes('accommodation') || s.includes('room');
    });

    const localVehicleRows = payReqs.filter(r => {
        const s = (r.service || '').toLowerCase();
        return s.includes('vehicle') || s.includes('cab') || s.includes('local') || s.includes('car') || s.includes('taxi') || s.includes('sightseeing') || s.includes('tour');
    });

    const otherRows = payReqs.filter(r => {
        const s = (r.service || '').toLowerCase();
        return !s.includes('flight') && !s.includes('train') && !s.includes('bus') && !s.includes('transport') && !s.includes('transfer') && !s.includes('ferry') &&
               !s.includes('hotel') && !s.includes('resort') && !s.includes('stay') && !s.includes('accommodation') && !s.includes('room') &&
               !s.includes('vehicle') && !s.includes('cab') && !s.includes('local') && !s.includes('car') && !s.includes('taxi') && !s.includes('sightseeing') && !s.includes('tour');
    });

    // ── Amount calculations ─────────────────────────────────────────────
    const parseAmt = (v) => {
        if (!v) return 0;
        return parseFloat(String(v).replace(/[₹,\s]/g, '')) || 0;
    };

    const totalVendorPaid = payReqs.reduce((sum, r) => sum + parseAmt(r.outAmountPaid), 0);
    const totalVendorPending = payReqs.reduce((sum, r) => sum + parseAmt(r.amountToPay), 0);
    const packageCost = parseAmt(lead.totalPackageCost || lead.packageCost || lead.budget);
    const amountReceived = parseAmt(lead.amountReceived);
    const pendingAmount = packageCost > 0 ? (packageCost - amountReceived) : parseAmt(lead.balancePending);

    const formatINR = (v) => v > 0 ? `₹${v.toLocaleString('en-IN')}` : '₹0';

    // ── Purchase row component ──────────────────────────────────────────
    const PurchaseRow = ({ row, isFirst }) => (
        <tr className={`text-xs ${!isFirst ? 'border-t border-slate-800/50' : ''}`}>
            <td className="px-4 py-2.5 text-slate-300 font-medium">
                {row.providerName || row.service || '—'}
                <span className="block text-[10px] text-slate-500">{row.paymentType || ''}</span>
            </td>
            <td className="px-4 py-2.5 font-mono text-slate-200">{row.serviceCost || '—'}</td>
            <td className="px-4 py-2.5 font-mono text-purple-400">{row.margin || '—'}</td>
            <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{row.outAmountPaid ? `₹${parseAmt(row.outAmountPaid).toLocaleString('en-IN')}` : '—'}</td>
        </tr>
    );

    const EmptyRow = ({ label }) => (
        <tr className="text-xs">
            <td className="px-4 py-2.5 text-slate-600 italic">{label}</td>
            <td className="px-4 py-2.5 text-slate-700">—</td>
            <td className="px-4 py-2.5 text-slate-700">—</td>
            <td className="px-4 py-2.5 text-slate-700">—</td>
        </tr>
    );

    const SectionHeader = ({ icon: Icon, label, color = 'text-slate-400' }) => (
        <tr className="bg-slate-800/70">
            <td colSpan={4} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${color} flex items-center gap-1.5`}>
                <Icon size={11} className="inline" /> {label}
            </td>
        </tr>
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-[150] p-0 sm:p-4">
            <div className="bg-[#0f172a] border border-slate-700 rounded-none sm:rounded-xl shadow-2xl w-full sm:max-w-4xl h-full sm:h-[95vh] flex flex-col text-slate-100">
                
                {/* ── HEADER ── */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] flex-shrink-0 sm:rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <FileText size={18} className="text-cyan-400" />
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                                Booking Inspector — <span className="text-cyan-400">LMN{lead.id}</span>
                            </h2>
                            <p className="text-[10px] text-slate-500 mt-0.5">{lead.customerName} · {lead.destination}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">{tourTypeLabel}</span>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer ml-2"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-6 py-5 space-y-6">

                        {/* ════════════════════════════════════
                            SECTION 1 — TRIP DETAILS
                        ════════════════════════════════════ */}
                        <div>
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-700/50 flex items-center gap-2">
                                <MapPin size={13} /> Trip Details
                                <span className="ml-auto text-[10px] text-orange-400 font-normal italic bg-orange-950/30 px-2 py-0.5 rounded">Data fetched from Sales My Job</span>
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Lead ID</label>
                                    <input type="text" readOnly value={`LMN${lead.id}`} className={readonlyCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Client Name</label>
                                    <input type="text" readOnly value={lead.customerName || '—'} className={`${readonlyCls} text-white font-bold`} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Destination</label>
                                    <input type="text" readOnly value={lead.destination || lead.confirmedDestination || '—'} className={`${readonlyCls} text-emerald-400`} />
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Booking Date</label>
                                    <input type="text" readOnly value={lead.bookingDate || '—'} className={readonlyCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Travel Date</label>
                                    <input type="text" readOnly value={lead.tourStartDate || lead.travelDate || lead.travelDates || '—'} className={readonlyCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Return Date</label>
                                    <input type="text" readOnly value={lead.returnDate || '—'} className={readonlyCls} />
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Sales Executive</label>
                                    <input type="text" readOnly value={lead.salesExecutive || lead.assignedTo || '—'} className={readonlyCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Operations Executive</label>
                                    <input type="text" readOnly value={lead.operationsExecutive || lead.customisationAssignedTo || '—'} className={readonlyCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Duration</label>
                                    <input type="text" readOnly value={calcDuration()} className={readonlyCls} />
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Package Cost</label>
                                    <input type="text" readOnly value={lead.totalPackageCost || lead.packageCost || lead.budget || '—'} className={`${readonlyCls} text-emerald-400 font-mono font-bold`} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">GST Inclusion</label>
                                    <input type="text" readOnly value={lead.gstStatus || 'Excluded'} className={readonlyCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">TCS Inclusion</label>
                                    <input type="text" readOnly value={lead.tcsStatus || 'Excluded'} className={readonlyCls} />
                                </div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════
                            SECTION 2 — PURCHASE DETAILS
                        ════════════════════════════════════ */}
                        <div>
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-700/50 flex items-center gap-2">
                                <CreditCard size={13} /> Purchase Details
                            </h3>

                            <div className="bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm text-slate-300 min-w-[560px]">
                                    <thead className="bg-slate-800/60 text-[10px] uppercase text-slate-400 tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2.5 w-[30%]">Mode / Name</th>
                                            <th className="px-4 py-2.5">Cost</th>
                                            <th className="px-4 py-2.5">Margin</th>
                                            <th className="px-4 py-2.5">Amount Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/30">

                                        {/* 1. Transport */}
                                        <tr className="bg-slate-800/40">
                                            <td colSpan={4} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                                                <Truck size={11} className="inline" /> 1. Transport
                                            </td>
                                        </tr>
                                        {transportRows.length > 0
                                            ? transportRows.map((r, i) => <PurchaseRow key={i} row={r} isFirst={i === 0} />)
                                            : <EmptyRow label="No transport entries" />
                                        }
                                        <tr className="bg-slate-800/20 text-[10px]">
                                            <td colSpan={2} className="px-4 py-1.5 text-slate-500 italic">Cost from Ops-confirmation</td>
                                            <td className="px-4 py-1.5 text-slate-500 italic">from Ops-confirmation</td>
                                            <td className="px-4 py-1.5 text-emerald-600 italic">Total from Account out-payment</td>
                                        </tr>

                                        {/* 2. Hotel */}
                                        <tr className="bg-slate-800/40 border-t border-slate-700/30">
                                            <td colSpan={4} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                <Building2 size={11} className="inline" /> 2. Hotel
                                            </td>
                                        </tr>
                                        {hotelRows.length > 0
                                            ? hotelRows.map((r, i) => <PurchaseRow key={i} row={r} isFirst={i === 0} />)
                                            : (
                                                <>
                                                    {/* Also pull from domHotels / intHotels as fallback */}
                                                    {(() => {
                                                        const hotels = [...(lead.domHotels || []), ...(lead.intHotels || [])].filter(h => h.hotelName);
                                                        return hotels.length > 0
                                                            ? hotels.map((h, i) => (
                                                                <tr key={i} className="text-xs border-t border-slate-800/50">
                                                                    <td className="px-4 py-2.5 text-slate-300 font-medium">{h.hotelName}<span className="block text-[10px] text-slate-500">{h.location}</span></td>
                                                                    <td className="px-4 py-2.5 text-slate-600">—</td>
                                                                    <td className="px-4 py-2.5 text-slate-600">—</td>
                                                                    <td className="px-4 py-2.5 text-slate-600">—</td>
                                                                </tr>
                                                            ))
                                                            : <EmptyRow label="No hotel entries" />;
                                                    })()}
                                                </>
                                            )
                                        }
                                        <tr className="bg-slate-800/20 text-[10px]">
                                            <td colSpan={2} className="px-4 py-1.5 text-slate-500 italic">Cost from Ops-confirmation</td>
                                            <td className="px-4 py-1.5 text-slate-500 italic">from Ops-confirmation</td>
                                            <td className="px-4 py-1.5 text-emerald-600 italic">Total from Account out-payment</td>
                                        </tr>

                                        {/* 3. Local Vehicle */}
                                        <tr className="bg-slate-800/40 border-t border-slate-700/30">
                                            <td colSpan={4} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                                                <Car size={11} className="inline" /> 3. Local Vehicle
                                            </td>
                                        </tr>
                                        {localVehicleRows.length > 0
                                            ? localVehicleRows.map((r, i) => <PurchaseRow key={i} row={r} isFirst={i === 0} />)
                                            : (
                                                <>
                                                    {(() => {
                                                        const locTrans = lead.domLocalTransports || [];
                                                        return locTrans.length > 0
                                                            ? locTrans.map((t, i) => (
                                                                <tr key={i} className="text-xs border-t border-slate-800/50">
                                                                    <td className="px-4 py-2.5 text-slate-300 font-medium">{t.vendor || lead.locTransVendor || '—'}<span className="block text-[10px] text-slate-500">{t.vehicle || lead.locTransVehicle || ''}</span></td>
                                                                    <td className="px-4 py-2.5 text-slate-600">—</td>
                                                                    <td className="px-4 py-2.5 text-slate-600">—</td>
                                                                    <td className="px-4 py-2.5 text-slate-600">—</td>
                                                                </tr>
                                                            ))
                                                            : <EmptyRow label="No local vehicle entries" />;
                                                    })()}
                                                </>
                                            )
                                        }
                                        <tr className="bg-slate-800/20 text-[10px]">
                                            <td colSpan={2} className="px-4 py-1.5 text-slate-500 italic">Cost from Ops-confirmation</td>
                                            <td className="px-4 py-1.5 text-slate-500 italic">from Ops-confirmation</td>
                                            <td className="px-4 py-1.5 text-emerald-600 italic">Total from Account out-payment</td>
                                        </tr>

                                        {/* Other services if any */}
                                        {otherRows.length > 0 && (
                                            <>
                                                <tr className="bg-slate-800/40 border-t border-slate-700/30">
                                                    <td colSpan={4} className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Other Services</td>
                                                </tr>
                                                {otherRows.map((r, i) => <PurchaseRow key={i} row={r} isFirst={i === 0} />)}
                                            </>
                                        )}

                                        {/* Totals row */}
                                        {payReqs.length > 0 && (
                                            <tr className="border-t border-slate-700 bg-slate-900">
                                                <td className="px-4 py-3 text-xs font-bold text-white" colSpan={2}>Vendor Summary</td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-400">Total Pending: <span className="text-orange-400 font-mono">{formatINR(totalVendorPending)}</span></td>
                                                <td className="px-4 py-3 text-xs font-bold text-emerald-400 font-mono">{formatINR(totalVendorPaid)}</td>
                                            </tr>
                                        )}

                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ════════════════════════════════════
                            SECTION 3 — CLIENT PAYMENT DETAILS
                        ════════════════════════════════════ */}
                        <div>
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-700/50 flex items-center gap-2">
                                <DollarSign size={13} /> Client Payment Details
                            </h3>

                            <div className="bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden mb-4">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-800/60 text-[10px] uppercase text-slate-400 tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2.5">Package Cost</th>
                                            <th className="px-4 py-2.5 text-emerald-400">Amount Paid</th>
                                            <th className="px-4 py-2.5 text-orange-400">Pending Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="px-4 py-4 font-mono font-bold text-white text-base">{lead.totalPackageCost || lead.packageCost || lead.budget || '—'}</td>
                                            <td className="px-4 py-4 font-mono font-bold text-emerald-400 text-base">{lead.amountReceived ? `₹${parseAmt(lead.amountReceived).toLocaleString('en-IN')}` : '—'}</td>
                                            <td className="px-4 py-4 font-mono font-bold text-orange-400 text-base">
                                                {lead.balancePending
                                                    ? `₹${parseAmt(lead.balancePending).toLocaleString('en-IN')}`
                                                    : (pendingAmount > 0 ? formatINR(pendingAmount) : '—')
                                                }
                                            </td>
                                        </tr>
                                        <tr className="border-t border-slate-800/50 text-[10px]">
                                            <td className="px-4 py-1.5 text-slate-500 italic">As per package</td>
                                            <td className="px-4 py-1.5 text-slate-500 italic">Total calculation based on Sales Entry</td>
                                            <td className="px-4 py-1.5 text-slate-500 italic">Package Cost − Amount Paid</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Client Payment History */}
                            {Array.isArray(lead.paymentHistoryDetails) && lead.paymentHistoryDetails.length > 0 && (
                                <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-800/50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Payment History</div>
                                    <table className="w-full text-left text-xs text-slate-300">
                                        <thead className="border-b border-slate-700/50 text-[10px] uppercase text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2">Date</th>
                                                <th className="px-4 py-2">Amount</th>
                                                <th className="px-4 py-2">Mode</th>
                                                <th className="px-4 py-2">Transaction ID</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {lead.paymentHistoryDetails.map((h, i) => (
                                                <tr key={i} className="hover:bg-slate-800/20">
                                                    <td className="px-4 py-2.5">{h.date || '—'}</td>
                                                    <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{h.amount || '—'}</td>
                                                    <td className="px-4 py-2.5">{h.mode || '—'}</td>
                                                    <td className="px-4 py-2.5 font-mono text-slate-400">{h.transactionId || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Payment Status */}
                            <div className="mt-3 flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
                                <span className="text-xs text-slate-400">Client Payment Status:</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${lead.paymentStatus === 'Fully Paid' || lead.paymentStatus === 'Cleared'
                                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                                    : 'bg-orange-950/40 text-orange-400 border-orange-900/40'}`}>
                                    {lead.paymentStatus || 'Pending'}
                                </span>
                                <span className="text-xs text-slate-400 ml-2">Next Due:</span>
                                <span className="text-xs font-mono text-slate-300">{lead.nextPaymentDate || lead.paymentDueDate || '—'}</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-[#0b1329] flex-shrink-0 sm:rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded cursor-pointer uppercase tracking-wider">
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => onMoveToBilling(lead)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow cursor-pointer uppercase tracking-wider flex items-center gap-2 transition-colors"
                    >
                        <CheckCircle2 size={14} />
                        Client &amp; Vendor Payments Cleared: Moving to Billing
                        <ChevronRight size={14} />
                    </button>
                </div>
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
    const [selectedLeadForInspect, setSelectedLeadForInspect] = useState(null); // NEW: Booking Inspector
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

    // ─── DATA CATEGORIZATION LOGIC ─────────────────────────────────────────────
    const confirmedBookings = leads.filter(l => 
        l.status === 'Confirmed Bookings' || 
        l.status === 'Upcoming Departure' ||
        l.statusCategory === 'Confirmed'
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

    // ─── MOVE TO BILLING HANDLER ───────────────────────────────────────────────
    const handleMoveToBilling = (lead) => {
        updateLead(lead.id, {
            ...lead,
            status: 'Billing',
            statusCategory: 'Billing'
        });
        setSelectedLeadForInspect(null);
        triggerNotification('success', `LMN${lead.id} moved to Billing successfully!`);
    };

    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";
    const sectionHeadCls = "text-lg font-bold text-cyan-400 border-b border-slate-700/50 pb-2 mb-4";

    return (
        <div ref={mainRef} className="w-full bg-[#0f172a] min-h-screen font-sans text-white overflow-y-auto relative" style={{ height: '100vh' }}>
            <style>{`.custom-date-input::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer; }`}</style>
            
            <div className="p-4 sm:p-6">
                {notification.show && (
                    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-bold bg-[#0d233e] tracking-wide animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
                        {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        <span>{notification.message}</span>
                    </div>
                )}

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
                                                    {/* VIEW button now opens the Booking Inspector */}
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

            {/* ─── BOOKING INSPECTOR MODAL (Confirmed Bookings) ──────────────────── */}
            {selectedLeadForInspect && (
                <BookingInspectorModal
                    lead={selectedLeadForInspect}
                    onClose={() => setSelectedLeadForInspect(null)}
                    onMoveToBilling={handleMoveToBilling}
                />
            )}

            {/* ─── QUICK PROFILE VIEW MODAL (Other tabs) ─────────────────────────── */}
            {selectedLeadForView && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg p-0 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-[#0b1329]">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <FileText size={16} className="text-cyan-400" />
                                Accounts Inspector — LMN{selectedLeadForView.id}
                            </h2>
                            <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                            <div className="bg-slate-900/50 border border-slate-800 rounded p-4 text-xs">
                                <h3 className="font-bold text-cyan-400 mb-3 uppercase tracking-wider border-b border-slate-700/50 pb-1">Client & Trip Info</h3>
                                <div className="grid grid-cols-2 gap-y-3">
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Customer Name</span> <span className="font-bold text-white">{selectedLeadForView.customerName}</span></p>
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Destination</span> <span className="text-emerald-400 font-bold">{selectedLeadForView.destination}</span></p>
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Travel Dates</span> <span className="text-slate-300">{selectedLeadForView.travelDates || selectedLeadForView.travelDate || 'TBD'}</span></p>
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Status</span> <span className="text-cyan-400 font-bold">{selectedLeadForView.status}</span></p>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 rounded p-4 text-xs">
                                <h3 className="font-bold text-orange-400 mb-3 uppercase tracking-wider border-b border-slate-700/50 pb-1 flex items-center gap-1">
                                    <DollarSign size={14} /> Financial Overview
                                </h3>
                                <div className="grid grid-cols-2 gap-y-3">
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Total Package Cost</span> <span className="font-bold text-white font-mono text-sm">{selectedLeadForView.totalPackageCost || selectedLeadForView.packageCost || selectedLeadForView.budget || 'N/A'}</span></p>
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Amount Received</span> <span className="text-emerald-400 font-bold font-mono text-sm">{selectedLeadForView.amountReceived || 'N/A'}</span></p>
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Balance Pending</span> <span className="text-red-400 font-bold font-mono text-sm">{selectedLeadForView.balancePending || 'N/A'}</span></p>
                                    <p className="flex flex-col"><span className="text-slate-500 font-medium">Client Payment Status</span> <span className="text-slate-300 font-bold uppercase">{selectedLeadForView.paymentStatus || 'Pending'}</span></p>
                                </div>
                                <div className="mt-4 border-t border-slate-800 pt-3">
                                    <span className="text-slate-500 font-medium block mb-1">Payment History / Transaction Details</span>
                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {Array.isArray(selectedLeadForView.paymentHistoryDetails) 
                                            ? JSON.stringify(selectedLeadForView.paymentHistoryDetails, null, 2) 
                                            : (selectedLeadForView.paymentHistoryDetails || 'No manual ledger notes recorded.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── FULL ACCOUNTS EDIT MODAL (Per Wireframe) ─────────────────────── */}
            {selectedPaymentReq && (
                <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-[150] p-0 sm:p-4">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-none sm:rounded-xl shadow-2xl w-full sm:max-w-5xl h-full sm:h-[95vh] flex flex-col text-slate-100">
                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] flex-shrink-0 sm:rounded-t-xl">
                            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 uppercase">
                                <CreditCard size={20} className="text-cyan-400" />
                                Accounts Edit — LMN{selectedPaymentReq.leadId}
                            </h2>
                            <button type="button" onClick={() => setSelectedPaymentReq(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={24} /></button>
                        </div>

                        <form onSubmit={handlePaymentReqUpdate} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-6 py-6 overflow-y-auto flex-1 bg-[#0f172a] custom-scrollbar space-y-8">
                                
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

                                {/* VENDOR DETAILS TABLE */}
                                <div>
                                    <h3 className={sectionHeadCls}>Vendor Details</h3>
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
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-4">
                                        <h3 className="text-lg font-bold text-cyan-400 m-0 border-0 pb-0">Client Payment Status</h3>
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
                                <div>
                                    <h3 className={sectionHeadCls}>Payment Request</h3>
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
                                <div>
                                    <div className="flex items-center gap-4 border-b border-slate-700/50 pb-2 mb-4">
                                        <h3 className="text-lg font-bold text-cyan-400 m-0 border-0 pb-0">Out Payment</h3>
                                        <span className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded">View | Edit</span>
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

                            <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4 bg-[#0b1329] flex-shrink-0 sm:rounded-b-xl">
                                <button type="button" onClick={() => setSelectedPaymentReq(null)} className="px-5 py-2 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded cursor-pointer uppercase tracking-wider">CANCEL</button>
                                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow cursor-pointer uppercase tracking-wider flex items-center gap-2">
                                    <CheckSquare size={14} /> SAVE & CLEAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <button type="button" onClick={scrollToTop} aria-label="Scroll to top" className={`fixed bottom-6 right-5 z-40 p-3 rounded-full bg-slate-800 border border-slate-600 text-slate-300 shadow-lg transition-all duration-300 cursor-pointer hover:bg-slate-700 hover:text-white ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <ArrowUp size={18} />
            </button>
        </div>
    );
}