import React, { useState, useEffect, useRef } from 'react';
import {
    Eye, Pencil, Clock, Search, MapPin, Calendar,
    BookmarkCheck, PlaneTakeoff, X, AlertCircle, CheckCircle2, 
    CheckSquare, ArrowUp, ChevronDown, ChevronUp, ChevronRight,
    History, Target, Briefcase, ClipboardList, Wallet, PackageCheck,
    Plus, Trash2
} from 'lucide-react';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend3-1y9k.onrender.com/api";

const INDIAN_DESTINATION_KEYWORDS = [
    'india', 'chennai', 'mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru',
    'hyderabad', 'kolkata', 'pune', 'goa', 'kochi', 'cochin', 'kerala',
    'jaipur', 'udaipur', 'jodhpur', 'agra', 'varanasi', 'rishikesh', 'manali',
    'shimla', 'ooty', 'kodaikanal', 'munnar', 'mysore', 'pondicherry',
    'puducherry', 'andaman', 'lakshadweep', 'kashmir', 'ladakh', 'leh',
    'darjeeling', 'gangtok', 'sikkim', 'meghalaya', 'assam', 'tamil nadu',
    'karnataka', 'maharashtra', 'rajasthan', 'gujarat', 'uttarakhand','kanyakumari'
];

const getOperationTourType = (lead) => {
    const destination = (lead.destination || lead.confirmedDestination || lead.destinationRequest || '').toLowerCase();
    if (INDIAN_DESTINATION_KEYWORDS.some(place => destination.includes(place))) return 'Domestic Tour';
    if (destination.trim()) return 'International Tour';
    return lead.tourType || 'International Tour';
};

// ─── LEAD JOURNEY / FULL HISTORY ENGINE ───────────────────────────────────────
const safeParseHistory = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch (e) { return []; }
};

const safeParseArr = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch (e) { return []; }
};

const fmtHistoryDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return typeof val === 'string' ? val : null;
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const splitLabelValue = (text) => {
    if (!text) return null;
    const idx = text.indexOf(':');
    if (idx === -1) return { label: text.trim(), value: null };
    return { label: text.slice(0, idx).trim(), value: text.slice(idx + 1).trim() };
};

const STAGE_CONFIG = [
    { key: 'lead', label: 'Lead Captured', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', icon: Target },
    { key: 'sales', label: 'Sales', color: 'text-white-400 bg-purple-500/10 border-purple-500/20', icon: Briefcase },
    { key: 'operations', label: 'Operations', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: ClipboardList },
    { key: 'accounts', label: 'Accounts / Billing', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Wallet },
    { key: 'fulfillment', label: 'Fulfilment Record', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: PackageCheck },
];

const classifySalesEntry = (h, lead) => {
    const action = h.action || '';
    const note = h.note || '';

    if (/^Lead Created$/i.test(action)) return null;
    if (/^Auto-Moved to Recycle Bin$/i.test(action) || /^Archived Cycle:/i.test(action)) return null;

    const assignMatch = action.match(/^(?:Recovered & )?Assigned to (.+)$/i);
    if (assignMatch) {
        return { title: 'Lead Assigned', parts: [{ label: 'Assigned by', value: assignMatch[1].trim() }] };
    }

    const fu = action.match(/^Follow-up:\s*(.*)$/i);
    if (fu) {
        return {
            title: 'Lead Response Status',
            parts: [
                { label: 'Interaction Type', value: fu[1] },
                { label: 'Action Taken', value: note },
            ],
        };
    }

    const ou = action.match(/^Outcome Update:\s*(.*)$/i);
    if (ou) {
        const title = /readymade/i.test(note) ? 'Readymade Shared - Followup' : 'Sales Followup';
        return {
            title,
            parts: [
                { label: 'Sales Track - Customer Response', value: note },
                lead.nextFollowUpDatePostponed ? { label: 'Next Followup', value: lead.nextFollowUpDatePostponed } : null,
            ],
        };
    }

    if (/^Lead Profile Updated$/i.test(action)) {
        const stageMatch = note.match(/Stage:\s*([^|]+)/i);
        const stage = stageMatch ? stageMatch[1].trim() : '';
        if (/Requirement Collected/i.test(stage)) {
            const actionTaken = lead.actionTaken || '';
            const suffix = /readymade/i.test(actionTaken) ? ' (Readymade Shared)' : /customisation/i.test(actionTaken) ? ' (Customisation Required)' : '';
            return {
                title: 'Lead Response Status - Requirement Collected',
                parts: [
                    { label: 'Interaction Type', value: lead.interactionType },
                    { label: 'Travel Details - Action Taken', value: `${actionTaken}${suffix}` },
                ],
            };
        }
        return null;
    }

    return { title: action, parts: [splitLabelValue(note)].filter(Boolean) };
};

const buildLeadTimeline = (lead) => {
    if (!lead) return [];

    const explicit = safeParseHistory(lead.history).slice().reverse().map(h => {
        const classified = classifySalesEntry(h, lead);
        if (!classified) return null;
        return {
            date: h.date,
            stage: 'sales',
            title: classified.title,
            parts: (classified.parts || []).filter(p => p && (p.value || p.label)),
            _explicit: true,
        };
    }).filter(Boolean);

    const synthesized = [];
    const push = (stage, title, dateVal, parts) => synthesized.push({
        date: fmtHistoryDate(dateVal) || 'Recorded',
        stage, title,
        parts: (parts || []).filter(p => p && (p.value || p.label)),
        _explicit: false,
    });

    const custReqs = safeParseArr(lead.customisationRequests);
    if (lead.status === 'Move To Operation' || lead.sentToOperationsDate || custReqs.length) {
        const destinations = custReqs.map(r => r.destination || r.destinationRequest).filter(Boolean).join(', ')
            || lead.destinationRequest || lead.destination;
        push('operations', 'Sent To Operations', lead.sentToOperationsDate || lead.movedToOpsDate, [
            { label: 'Destination', value: destinations || 'N/A' }
        ]);
    }

    custReqs.forEach(req => {
        if (req.opsCustomisationStatus || req.workType || req.opsAssignedBy) {
            push('operations', req.opsAssignedBy ? `Assigned By ${req.opsAssignedBy}` : 'Operations Update', req.opsExpectedCompletionDate, [
                { label: 'Destination', value: req.destination || req.destinationRequest || lead.destination },
                { label: 'Work Type', value: req.workType },
                { label: 'Customisation Status', value: req.opsCustomisationStatus },
                req.operationsExecutive ? { label: null, value: req.operationsExecutive } : null,
            ]);
        }
    });
    if (lead.opsPreparedBy && custReqs.length === 0) {
        push('operations', `Assigned By ${lead.opsPreparedBy}`, lead.opsCompletedOn, [
            { label: 'Destination', value: lead.destinationRequest || lead.destination },
            { label: 'Customisation Status', value: lead.opsCustomisationStatus },
        ]);
    }

    if (lead.sharedWithSales) {
        push('operations', 'Back to Sales Board', lead.sharedWithSalesDate, [
            { label: 'Destination shared by ops', value: lead.destinationRequest || lead.destination }
        ]);
    }

    if (lead.customerResponse) {
        push('sales', 'Sales Followup', lead.confirmedDate || lead.lastFollowUpDate, [
            { label: 'Sales Track - Customer Response', value: lead.customerResponse },
            lead.nextFollowUpDatePostponed ? { label: 'Next Followup', value: lead.nextFollowUpDatePostponed } : null,
        ]);
    }
    if (lead.customerResponse === 'Booking Confirmed') {
        push('sales', 'Sales Followup', lead.confirmedDate, [
            { label: 'Booking Confirmed | Next Followup', value: lead.nextFollowUpDatePostponed || lead.confirmedDate }
        ]);
        push('accounts', 'Moved to All Confirmation Boards', lead.confirmedDate, []);
    }

    if (lead.amountReceived || lead.paymentStatus) {
        push('accounts', 'Customer Payment', lead.nextPaymentDate || lead.confirmedDate, [
            { label: 'Payment Stage', value: lead.paymentMode ? `${lead.paymentMode} • ₹${lead.amountReceived || 0} received` : `₹${lead.amountReceived || 0} received` }
        ]);
    }
    if (lead.paymentStatus === 'Fully Paid' || (lead.balancePending !== undefined && Number(lead.balancePending) === 0 && lead.amountReceived)) {
        push('accounts', 'Customer Payment', lead.fullyPaidDate || lead.nextPaymentDate, [
            { label: 'Payment Stage', value: 'Fully Paid' }
        ]);
    }

    if (lead.status === 'Upcoming Departure' || lead.bookingDate || lead.confirmedDate) {
        push('fulfillment', 'Booking Confirmed', lead.bookingDate || lead.confirmedDate, [
            { label: 'Destination', value: lead.confirmedDestination || lead.destination || 'N/A' }
        ]);
    }
    const selectedOptions = [
        lead.flightStatus ? `Flight: ${lead.flightStatus}` : null,
        lead.visaStatus ? `VISA: ${lead.visaStatus}` : null,
        lead.insuranceStatus ? `Insurance: ${lead.insuranceStatus}` : null,
        lead.dmcConfReceived ? `DMC: ${lead.dmcConfReceived}` : null,
    ].filter(Boolean);
    if (selectedOptions.length) {
        push('fulfillment', 'Flight Details/ VISA Details / Travel Insurance | DMC Fulfilment', lead.briefingDateVal || lead.bookingDate, [
            { label: null, value: selectedOptions.join(' | ') }
        ]);
    }
    if (lead.briefingDateVal || lead.briefedByVal) {
        push('fulfillment', 'Briefing Details', lead.briefingDateVal, [
            { label: 'Briefed By', value: lead.briefedByVal },
            { label: 'Briefing Method', value: lead.briefedMethodVal },
        ]);
    }
    if (lead.vendorPayStatus === 'Paid' || lead.vendorPayStatus === 'Completed' || lead.clrFinSupplier) {
        push('fulfillment', 'Vendor Payment Completed', lead.briefingDateVal, []);
    }
    if (lead.clrReadyDeparture) {
        push('fulfillment', 'Travel Ready', lead.tourStartDate || lead.travelDate || lead.travelDates, [
            { label: 'Travel Date', value: lead.tourStartDate || lead.travelDate || lead.travelDates }
        ]);
    }
    if (lead.status === 'Trip Completed' || lead.reviewStatus) {
        push('fulfillment', 'Trip Completed', lead.returnDate || lead.travelDates, [
            { label: 'Review Status', value: lead.reviewStatus || 'Pending Review' }
        ]);
    }

    return [...explicit, ...synthesized];
};

const STAGE_FIELD_MAPS = {
    sales: [
        ['assignedTo', 'Assigned Executive'], ['status', 'Pipeline Status'], ['actionTaken', 'Action Taken'],
        ['leadResponse', 'Lead Response'], ['interactionType', 'Interaction Type'], ['firstAttempt', 'First Attempt'],
        ['customerResponse', 'Customer Response'], ['followUpCount', 'Follow-ups Logged'], ['salesRemarks', 'Sales Remarks'],
    ],
    operations: [
        ['opsPreparedBy', 'Prepared By'], ['finalStatus', 'Final Status'], ['workType', 'Work Type'],
        ['destinationRequest', 'Destination Request'], ['packageCost', 'Package Cost'], ['itineraryPrepDate', 'Itinerary Prep Date'],
        ['itineraryVersion', 'Itinerary Version'], ['vendorName', 'Vendor Name'], ['vendorService', 'Vendor Service'],
        ['vendorMessage', 'Vendor Message'], ['documentStatus', 'Document Status'], ['qcStatus', 'QC Status'],
        ['qcDate', 'QC Date'], ['qcRemarks', 'QC Remarks'], ['bookingDate', 'Booking Date'], ['confirmationDate', 'Confirmation Date'],
    ],
    accounts: [
        ['operationsExecutive', 'Operations Executive'], ['totalPackageCost', 'Total Package Cost'], ['amountReceived', 'Amount Received'],
        ['balancePending', 'Balance Pending'], ['nextPaymentDate', 'Next Payment Date'], ['paymentMode', 'Payment Mode'],
        ['transactionId', 'Transaction ID'], ['gstStatus', 'GST Status'], ['tcsStatus', 'TCS Status'], ['confirmedDate', 'Confirmed Date'],
        ['confirmedDestination', 'Confirmed Destination'], ['confirmedNoOfPax', 'Confirmed Pax'],
    ],
    fulfillment: [
        ['briefedByVal', 'Briefed By'], ['briefingDateVal', 'Briefing Date'], ['briefedMethodVal', 'Briefing Method'],
        ['dmcConfReceived', 'DMC Confirmation'], ['flightTicketVerified', 'Flight Ticket Verified'], ['domTicketVerified', 'Domestic Ticket Verified'],
        ['clrOpsDocs', 'Docs Cleared'], ['clrOpsServices', 'Services Cleared'], ['clrFinPayment', 'Finance Cleared'],
        ['clrMgrReview', 'Manager Reviewed'], ['clrReadyDeparture', 'Ready for Departure'], ['vendorPayStatus', 'Vendor Payment Status'],
    ],
};

const MOCK_LEADS = [
    {
        id: 12, customerName: 'heer', destination: 'Singapore', amount: '₹5,00,000+', 
        status: 'Confirmed Bookings', phone: '9876543210', salesExecutive: 'Alex', operationsExecutive: 'Ops Desk 1',
        bookingDate: '2026-06-09', travelDate: '2026-08-12', returnDate: '2026-08-18', reviewStatus: 'Pending Review',
        noOfPax: '2', insRequired: 'Yes',
        flights: [
            { departureDateTime: '2026-08-12T10:30', boardingPoint: 'DEL', deboardingPoint: 'SIN' },
            { departureDateTime: '2026-08-18T18:00', boardingPoint: 'SIN', deboardingPoint: 'DEL' }
        ],
        visas: [{ visaType: 'e-Visa', visaStatus: 'Approved', transitVisaReq: 'No', visaCopyShared: 'Yes', arrivalCardApplicable: 'Yes', arrivalCardStatus: 'Completed' }],
        clientPayStatus: 'Cleared', vendorPayStatus: 'Pending'
    }
];

// ─────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, className }) => {
    const normalizedOptions = options.map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt });
    const safeValue = value !== undefined && value !== null ? String(value) : '';
    return (
        <select value={safeValue} onChange={(e) => onChange(e.target.value)} className={className}>
            <option value="" disabled hidden></option>
            {normalizedOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
};

const DatePickerField = ({ value, onChange, type = "date", readOnly = false, className }) => {
    const inputRef = useRef(null);
    const Icon = type === 'time' ? Clock : Calendar;
    return (
        <div className={`relative w-full flex items-center ${!readOnly ? 'cursor-pointer' : ''}`} onClick={() => { if (!readOnly && inputRef.current?.showPicker) inputRef.current.showPicker(); }}>
            <input ref={inputRef} type={type} value={value || ''} onChange={onChange} readOnly={readOnly} className={`${className} ${readOnly ? '' : 'cursor-pointer'} custom-date-input`} style={{ paddingRight: '2.5rem', colorScheme: 'dark' }} />
            <Icon size={15} className={`absolute right-3 pointer-events-none ${readOnly ? 'text-slate-600' : 'text-cyan-500'}`} />
        </div>
    );
};

const FormSection = ({ title, titleColor = "text-cyan-400", action, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm relative transition-all">
            <div 
                className={`flex items-center justify-between cursor-pointer ${isOpen ? 'mb-4' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold uppercase ${titleColor}`}>{title}</h3>
                    {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0"/> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0"/>}
            </div>
            {isOpen && <div className="space-y-4 animate-in fade-in duration-200">{children}</div>}
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
// GLOBAL STATE MANAGER (Persists across tab switches)
// ─────────────────────────────────────────────
let globalLeadsData = [];
let isGlobalDataLoaded = false;
let globalSubscribers = new Set();
let pollTimer = null;
let isFetching = false;

const fetchGlobalLeads = async (isBackground = false) => {
    if (isFetching) return;
    isFetching = true;
    try {
        const res = await fetch(`${API_BASE_URL}/leads`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const parseJSON = (val) => {
            if (!val) return [];
            try { return typeof val === 'string' ? JSON.parse(val) : val; } 
            catch (e) { return []; }
        };

        const mappedData = data.map(lead => {
            let parsedFulfillment = {};
            if (lead.fulfillmentData) {
                try { parsedFulfillment = typeof lead.fulfillmentData === 'string' ? JSON.parse(lead.fulfillmentData) : lead.fulfillmentData; }
                catch(e) { parsedFulfillment = {}; }
            }

            return {
                ...lead,
                ...parsedFulfillment, 
                passengers: parseJSON(lead.passengers),
                flights: parseJSON(lead.flights),
                intTransports: parseJSON(lead.intTransports),
                visas: parseJSON(lead.visas),
                domTransports: parseJSON(lead.domTransports),
                domHotels: parseJSON(lead.domHotels),
                intHotels: parseJSON(lead.intHotels),
                domLocalTransports: parseJSON(lead.domLocalTransports),
                paymentRequests: parseJSON(lead.paymentRequests),
                vendorRequests: parseJSON(lead.vendorRequests),
                customisationRequests: parseJSON(lead.customisationRequests)
            };
        });
        
        globalLeadsData = mappedData;
        isGlobalDataLoaded = true;
        globalSubscribers.forEach(notify => notify());
    } catch (err) {
        if (!isBackground) {
            globalLeadsData = MOCK_LEADS;
            isGlobalDataLoaded = true;
            globalSubscribers.forEach(notify => notify());
        }
    } finally {
        isFetching = false;
    }
};

// Start background polling immediately for the file module (runs forever)
if (typeof window !== 'undefined' && !pollTimer) {
    pollTimer = setInterval(() => {
        fetchGlobalLeads(true);
    }, 30000); // Changed to 30 seconds to match
}

// ─────────────────────────────────────────────
// HOOK – useLeads ENGINE (Using Global Store)
// ─────────────────────────────────────────────
function useLeads(triggerNotification) {
    const [leads, setLeads] = useState(globalLeadsData);
    const [isLoading, setLoading] = useState(!isGlobalDataLoaded);

    useEffect(() => {
        const handleUpdate = () => {
            setLeads([...globalLeadsData]);
            setLoading(false);
        };

        globalSubscribers.add(handleUpdate);
        
        // Only fetch if it hasn't been fetched yet. Otherwise load instantly.
        if (!isGlobalDataLoaded) {
            fetchGlobalLeads(false);
        } else {
            setLoading(false); 
        }

        return () => globalSubscribers.delete(handleUpdate);
    }, []);

    const updateLead = async (id, updatedData) => {
        // Optimistic global update to survive unmounts immediately
        globalLeadsData = globalLeadsData.map(l => l.id === id ? { ...l, ...updatedData } : l);
        globalSubscribers.forEach(notify => notify()); 

        try {
            await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            triggerNotification('success', 'Fulfillment data updated successfully!');
            fetchGlobalLeads(true); // Silently sync the latest data from server
        } catch (err) {
            triggerNotification('success', 'Fulfillment changes saved locally.');
        }
    };

    return { leads, isLoading, updateLead };
}

// ─────────────────────────────────────────────
// UI STATE PERSISTENCE 
// ─────────────────────────────────────────────
// This ensures that when you switch tabs and React destroys the component, 
// your form data, selected tab, and modals are restored perfectly when you return.
const preservedUI = {
    activeTab: 'Confirmed Bookings',
    searchQuery: '',
    currentPage: 1,
    selectedLeadForEdit: null,
    selectedLeadForView: null,
    viewModal: { show: false, title: '', content: '' },
    historyLead: null,
    isHistoryModalOpen: false,
    expandedStage: null,
    openJourneySections: { sales: false, operations: false, accounts: false, fulfillment: true }
};

function usePersistedState(key, initialValue) {
    const [state, setState] = useState(preservedUI[key] !== undefined ? preservedUI[key] : initialValue);
    useEffect(() => { preservedUI[key] = state; }, [state]);
    return [state, setState];
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Fulfillment() {
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const triggerNotification = (type, message) => setNotification({ show: true, type, message });

    useEffect(() => {
        if (notification.show) {
            const t = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
            return () => clearTimeout(t);
        }
    }, [notification.show]);

    const { leads, isLoading, updateLead } = useLeads(triggerNotification);

    // Using persisted state to save edits and layout settings if component unmounts
    const [activeTab, setActiveTab] = usePersistedState('activeTab', 'Confirmed Bookings');
    const [searchQuery, setSearchQuery] = usePersistedState('searchQuery', '');
    const [currentPage, setCurrentPage] = usePersistedState('currentPage', 1);
    const [entriesPerPage] = useState(10);
    
    const [selectedLeadForEdit, setSelectedLeadForEdit] = usePersistedState('selectedLeadForEdit', null);
    const [selectedLeadForView, setSelectedLeadForView] = usePersistedState('selectedLeadForView', null);
    const [viewModal, setViewModal] = usePersistedState('viewModal', { show: false, title: '', content: '' });
    const [historyLead, setHistoryLead] = usePersistedState('historyLead', null); 
    const [isHistoryModalOpen, setIsHistoryModalOpen] = usePersistedState('isHistoryModalOpen', false);
    const [expandedStage, setExpandedStage] = usePersistedState('expandedStage', null);
    const [openJourneySections, setOpenJourneySections] = usePersistedState('openJourneySections', { sales: false, operations: false, accounts: false, fulfillment: true });

    const [showScrollTop, setShowScrollTop] = useState(false);
    const mainRef = useRef(null);
    const tabScrollRef = useRef(null);
    
    const [operationsStaff, setOperationsStaff] = useState([]);

    // Dynamically get today's date and strip time for accurate day comparisons
    const SYSTEM_TODAY = new Date();
    SYSTEM_TODAY.setHours(0, 0, 0, 0);

    useEffect(() => {
        const fetchStaffDirectory = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/employees`, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    const ops = data.filter(emp => {
                        const searchString = `${emp.designation || ''} ${emp.role || ''} ${emp.department || ''}`.toLowerCase();
                        return searchString.includes('operation') || searchString.includes('ops');
                    }).map(emp => emp.name || emp.username);
                    setOperationsStaff(ops);
                }
            } catch (error) { 
                console.error('Failed to fetch dynamic directory components:', error); 
            }
        };
        fetchStaffDirectory();
    }, []);

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    // ─────────────────────────────────────────────
    // DYNAMIC UI DATA RENDERER FOR MODALS
    // ─────────────────────────────────────────────
    const renderDataContent = (content) => {
        if (!content) return <div className="text-slate-500 italic">No details available.</div>;
        
        if (typeof content === 'string') {
            return <div className="leading-relaxed">{content}</div>;
        }

        if (Array.isArray(content)) {
            if (content.length === 0) return <div className="italic text-slate-500">No records found.</div>;
            return (
                <div className="space-y-4">
                    {content.map((item, idx) => (
                        <div key={idx} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 shadow-inner">
                            <h4 className="text-xs font-bold text-cyan-500 mb-3 border-b border-slate-700/50 pb-1.5 uppercase tracking-wider">Record #{idx + 1}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                {Object.entries(item).map(([key, val]) => {
                                    if(typeof val === 'object' && val !== null) return null; // Skip complex nested data for clean UI
                                    const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                                    return (
                                        <div key={key} className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide capitalize">{formattedKey}</span>
                                            <span className="text-sm font-medium text-slate-200 break-words">{val !== null && val !== '' ? String(val) : '-'}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (typeof content === 'object') {
            return (
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {Object.entries(content).map(([key, val]) => {
                            if(typeof val === 'object' && val !== null) return null;
                            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                            return (
                                <div key={key} className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                                    <span className="text-xs text-slate-400 font-medium capitalize">{formattedKey}</span>
                                    <span className={`text-sm font-bold ${val === true || val === 'Yes' ? 'text-emerald-400' : val === false || val === 'No' ? 'text-slate-600' : 'text-slate-200'}`}>
                                        {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '-')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            );
        }

        return String(content);
    };

    // FULFILLMENT DATE LOGIC & CATEGORIZATION
    const categorizedLeads = leads.reduce((acc, lead) => {
        const travelDate = lead.travelDate ? new Date(lead.travelDate) : null;
        const returnDate = lead.returnDate ? new Date(lead.returnDate) : null;

        if (lead.status === 'Upcoming Departure' || lead.customerResponse === 'Booking Confirmed') acc['Confirmed Bookings'].push(lead);
        if (travelDate && travelDate.getMonth() === SYSTEM_TODAY.getMonth() && travelDate.getFullYear() === SYSTEM_TODAY.getFullYear()) acc['Trips For This Month'].push(lead);
        if (travelDate) {
            const diffDays = Math.ceil((travelDate.getTime() - SYSTEM_TODAY.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 15) acc['Upcoming Trips'].push(lead);
        }
        if (travelDate && returnDate && SYSTEM_TODAY >= travelDate && SYSTEM_TODAY <= returnDate) acc['On-Trip'].push(lead);
        if (returnDate && SYSTEM_TODAY > returnDate) acc['Trip Completed'].push(lead);

        return acc;
    }, { 'Confirmed Bookings': [], 'Trips For This Month': [], 'Upcoming Trips': [], 'On-Trip': [], 'Trip Completed': [] });

    const handleTabChange = (tab) => { setActiveTab(tab); setCurrentPage(1); };

    const filtered = categorizedLeads[activeTab].filter(item => {
        const q = searchQuery.toLowerCase();
        return !q || `LMN${item.id}`.toLowerCase().includes(q) || (item.customerName || '').toLowerCase().includes(q) || (item.destination || '').toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
    const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    const categories = [
        { id: 'Confirmed Bookings', label: 'Confirmed Bookings', icon: BookmarkCheck, count: categorizedLeads['Confirmed Bookings'].length },
        { id: 'Trips For This Month', label: 'Trips For This Month', icon: Calendar, count: categorizedLeads['Trips For This Month'].length },
        { id: 'Upcoming Trips', label: 'Upcoming Trips', icon: PlaneTakeoff, count: categorizedLeads['Upcoming Trips'].length },
        { id: 'On-Trip', label: 'On-Trip', icon: Clock, count: categorizedLeads['On-Trip'].length },
        { id: 'Trip Completed', label: 'Trip Completed', icon: CheckSquare, count: categorizedLeads['Trip Completed'].length },
    ];

    // EDIT MODAL INITIALIZATION (International & Domestic Logic)
    const handleEditClick = (lead) => {
        const tourType = getOperationTourType(lead);

        setSelectedLeadForEdit({
            ...lead,
            tourType,
            
            // Re-fetch Special Requirements to show true/false state in View Modals
            reqVeg: lead.reqVeg || false,
            reqWheelchair: lead.reqWheelchair || false,
            reqSenior: lead.reqSenior || false,
            reqHoneymoon: lead.reqHoneymoon || false,
            reqCandlelight: lead.reqCandlelight || false,
            reqFloating: lead.reqFloating || false,
            reqDecor: lead.reqDecor || false,
            reqBirthday: lead.reqBirthday || false,
            reqAnniversary: lead.reqAnniversary || false,
            reqManualAdd: lead.reqManualAdd || false,

            // International Custom Block
            flightTicketVerified: lead.flightTicketVerified || false,
            flBaggageDetails: lead.flBaggageDetails || '',
            flSeatSelection: lead.flSeatSelection || '',
            flMealStatusCheck: lead.flMealStatusCheck || false,
            flBoardingPassSupport: lead.flBoardingPassSupport || '',
            insIssuedChk: lead.insIssuedChk || false,
            dmcConfReceived: lead.dmcConfReceived || false,
            dmcDriverDetails: lead.dmcDriverDetails || false,
            dmcEmergencyContactReq: lead.dmcEmergencyContactReq || false,
            dmcPtPService: lead.dmcPtPService || '',
            specialReqStatusVal: lead.specialReqStatusVal || '',
            briefingDateVal: lead.briefingDateVal || '',
            briefedByVal: lead.briefedByVal || '',
            briefedMethodVal: lead.briefedMethodVal || '',
            
            advLocalRules: lead.advLocalRules || false,
            advTravelRestrictions: lead.advTravelRestrictions || false,
            advTourismTax: lead.advTourismTax || false,
            advPermitReq: lead.advPermitReq || false,
            finForex: lead.finForex || false,
            finCurrency: lead.finCurrency || false,
            finIntlCard: lead.finIntlCard || false,
            finLocalPayment: lead.finLocalPayment || false,
            destWeather: lead.destWeather || false,
            destCustoms: lead.destCustoms || false,
            destSafety: lead.destSafety || false,
            destEmergency: lead.destEmergency || false,

            // Domestic Specific Defaults
            domTransportType: lead.domTransportType || '', 
            domTicketVerified: lead.domTicketVerified || false,
            domBagDetails: lead.domBagDetails || '',
            domSeatSelection: lead.domSeatSelection || '',
            domMealStatus: lead.domMealStatus || '',
            domBoardingPass: lead.domBoardingPass || '',
            domSeatBerthConfirmed: lead.domSeatBerthConfirmed || false,
            
            domVendorType: lead.domVendorType || 'Complete Package', 
            domHotelVoucherReceived: lead.domHotelVoucherReceived || false,
            domHotelContactShared: lead.domHotelContactShared || false,
            domVehicleDetailsReceived: lead.domVehicleDetailsReceived || false,
            domDriverContactShared: lead.domDriverContactShared || false,
            
            vendorPayStatus_DMC: lead.vendorPayStatus_DMC || '',
            vendorPayStatus_Hotel1: lead.vendorPayStatus_Hotel1 || '',
            vendorPayStatus_Hotel2: lead.vendorPayStatus_Hotel2 || '',
            vendorPayStatus_Vehicle: lead.vendorPayStatus_Vehicle || '',
            
            advWeatherClothing: lead.advWeatherClothing || false,
            advSafetyGuidelines: lead.advSafetyGuidelines || false,
            advIdProof: lead.advIdProof || false,
            journPickupDetails: lead.journPickupDetails || false,
            journHotelContact: lead.journHotelContact || false,
            journEmergencyContact: lead.journEmergencyContact || false,
            journHotelCheckin: lead.journHotelCheckin || false,
            
            // Standard shared booleans
            clrOpsServices: lead.clrOpsServices || false, clrOpsDocs: lead.clrOpsDocs || false, clrFinPayment: lead.clrFinPayment || false, clrFinSupplier: lead.clrFinSupplier || false, clrMgrReview: lead.clrMgrReview || false, clrReadyDeparture: lead.clrReadyDeparture || false
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();

        const fulfillmentKeys = [
            'flightTicketVerified', 'flBaggageDetails', 'flSeatSelection', 'flMealStatusCheck', 'flBoardingPassSupport',
            'insIssuedChk',
            'dmcConfReceived', 'dmcDriverDetails', 'dmcEmergencyContactReq', 'dmcPtPService',
            'specialReqStatusVal', 'briefingDateVal', 'briefedByVal', 'briefedMethodVal',
            'advLocalRules', 'advTravelRestrictions', 'advTourismTax', 'advPermitReq',
            'finForex', 'finCurrency', 'finIntlCard', 'finLocalPayment',
            'destWeather', 'destCustoms', 'destSafety', 'destEmergency',
            
            'domTransportType', 'domTicketVerified', 'domBagDetails', 'domSeatSelection', 'domMealStatus', 'domBoardingPass', 'domSeatBerthConfirmed',
            'domVendorType', 'domHotelVoucherReceived', 'domHotelContactShared', 'domVehicleDetailsReceived', 'domDriverContactShared',
            'vendorPayStatus_DMC', 'vendorPayStatus_Hotel1', 'vendorPayStatus_Hotel2', 'vendorPayStatus_Vehicle',
            'advWeatherClothing', 'advSafetyGuidelines', 'advIdProof',
            'journPickupDetails', 'journHotelContact', 'journEmergencyContact', 'journHotelCheckin',
            
            'clrOpsServices', 'clrOpsDocs', 'clrOpsRemarks', 'clrFinPayment', 'clrFinSupplier', 'clrFinRemarks', 'clrMgrReview', 'clrReadyDeparture'
        ];

        const fulfillmentData = {};
        fulfillmentKeys.forEach(key => {
            if (selectedLeadForEdit[key] !== undefined) {
                fulfillmentData[key] = selectedLeadForEdit[key];
            }
        });

        const payloadToSave = {
            ...selectedLeadForEdit,
            fulfillmentData: JSON.stringify(fulfillmentData),
            passengers: JSON.stringify(selectedLeadForEdit.passengers || []),
            flights: JSON.stringify(selectedLeadForEdit.flights || []),
            intTransports: JSON.stringify(selectedLeadForEdit.intTransports || []),
            visas: JSON.stringify(selectedLeadForEdit.visas || []),
            domTransports: JSON.stringify(selectedLeadForEdit.domTransports || []),
            domHotels: JSON.stringify(selectedLeadForEdit.domHotels || []),
            intHotels: JSON.stringify(selectedLeadForEdit.intHotels || []),
            domLocalTransports: JSON.stringify(selectedLeadForEdit.domLocalTransports || []),
            paymentRequests: JSON.stringify(selectedLeadForEdit.paymentRequests || []),
            vendorRequests: JSON.stringify(selectedLeadForEdit.vendorRequests || []),
            customisationRequests: JSON.stringify(selectedLeadForEdit.customisationRequests || [])
        };

        updateLead(selectedLeadForEdit.id, payloadToSave);
        setSelectedLeadForEdit(null);
    };

    const handleFieldChange = (field, value) => {
        setSelectedLeadForEdit(prev => ({ ...prev, [field]: value }));
    };

    const toArr = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string' && val.trim()) {
            try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; }
        }
        return [];
    };

    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-400 text-sm cursor-not-allowed font-medium opacity-80 focus:outline-none";

    return (
        <div ref={mainRef} className="w-full bg-[#0f172a] min-h-screen font-sans text-white overflow-y-auto relative" style={{ height: '100vh' }}>
            <style>{`.custom-date-input::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer; }`}</style>
            
            {notification.show && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-bold bg-[#0d233e] tracking-wide animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{notification.message}</span>
                </div>
            )}

            {!selectedLeadForEdit ? (
                <>
                    <div className="p-4 sm:p-6">
                        <div className="py-5 mb-0  ">
                            <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">Fulfillment Dashboard</h1>
                        </div>

                        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                            {categories.map((cat) => (
                                <div key={cat.id} onClick={() => handleTabChange(cat.id)} className={`relative p-5 rounded-xl cursor-pointer transition-all border ${activeTab === cat.id ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`p-3 rounded-lg ${activeTab === cat.id ? 'bg-slate-700 text-white' : 'bg-slate-800/20 text-slate-300'}`}><cat.icon size={24} /></div>
                                        <span className={`text-xl font-bold ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.count}</span>
                                    </div>
                                    <h3 className={`font-semibold text-base ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.label}</h3>
                                    {activeTab === cat.id && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-slate-700" />}
                                </div>
                            ))}
                        </div>

                        <div className="bg-transparent border border-slate-700/30 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex flex-col sm:flex-row justify-between p-4 sm:p-5 border-b border-slate-700/20 gap-3">
                                <h2 className="text-base sm:text-lg font-bold text-white">{activeTab} <span className="text-slate-400 font-normal text-sm ml-2">({filtered.length} records)</span></h2>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                        <input type="text" placeholder="" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-600 rounded-lg text-slate-100 outline-none focus:border-cyan-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-200 min-w-[900px]">
                                    <thead className="bg-transparent border-b border-slate-700/20 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                        <tr>
                                            {activeTab === 'Trip Completed' && <th className="px-6 py-4">Review Status</th>}
                                            <th className="px-6 py-4">Lead ID</th>
                                            <th className="px-6 py-4">Client Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            {activeTab !== 'Confirmed Bookings' && <th className="px-6 py-4">Sales Exec</th>}
                                            {activeTab !== 'Trip Completed' && <th className="px-6 py-4">Ops Exec</th>}
                                            {activeTab === 'Confirmed Bookings' && <th className="px-6 py-4">Booking Date</th>}
                                            {['Trips For This Month', 'Upcoming Trips', 'On-Trip'].includes(activeTab) && <th className="px-6 py-4">Start Date</th>}
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/20">
                                        {paginated.length > 0 ? paginated.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                                                {activeTab === 'Trip Completed' && <td className="px-6 py-4 text-xs font-bold text-red-500">{row.reviewStatus || 'Pending'}</td>}
                                                <td className="px-6 py-4 font-mono font-bold">LMN{row.id}</td>
                                                <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                <td className="px-6 py-4 text-emerald-400 flex items-center gap-1 mt-3"><MapPin size={12} />{row.destination}</td>
                                                {activeTab !== 'Confirmed Bookings' && <td className="px-6 py-4">{row.salesExecutive}</td>}
                                                {activeTab !== 'Trip Completed' && <td className="px-6 py-4">{row.operationsExecutive}</td>}
                                                {activeTab === 'Confirmed Bookings' && <td className="px-6 py-4">{row.bookingDate}</td>}
                                                {['Trips For This Month', 'Upcoming Trips', 'On-Trip'].includes(activeTab) && <td className="px-6 py-4">{row.travelDate}</td>}
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button type="button" onClick={() => { setHistoryLead(row); setExpandedStage(null); setOpenJourneySections({ sales: false, operations: false, accounts: false, fulfillment: true }); setIsHistoryModalOpen(true); }} className="text-slate-400 hover:text-purple-400 transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-none p-0" title="View History">
                                                            <History size={18} /> History
                                                        </button>
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-none p-0" title="View Profile">
                                                            <Eye size={18} /> View
                                                        </button>
                                                        
                                                        {['Confirmed Bookings', 'Trips For This Month', 'Upcoming Trips'].includes(activeTab) && (
                                                            <button type="button" onClick={() => handleEditClick(row)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-900/40 text-cyan-400 hover:bg-cyan-800/60 border border-cyan-800 rounded transition-colors cursor-pointer">
                                                                <Pencil size={14} /> Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="12" className="px-6 py-12 text-center text-slate-500">No records found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalEntries={filtered.length} entriesPerPage={entriesPerPage} />
                        </div>
                    </div>

                    {/* ─── QUICK PROFILE VIEW MODAL ───────────────────────────────────────── */}
                    {selectedLeadForView && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                            <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg shadow-2xl w-full max-w-sm p-6">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
                                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Profile Inspector — LMN{selectedLeadForView.id}</h2>
                                    <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-none p-0"><X size={20} /></button>
                                </div>
                                <div className="space-y-3 text-slate-300 text-sm">
                                    <p className="flex justify-between border-b border-slate-800 pb-1">
                                        <span className="text-slate-500 font-medium">Customer</span> 
                                        <span className="font-bold text-white">{selectedLeadForView.customerName}</span>
                                    </p>
                                    <p className="flex justify-between border-b border-slate-800 pb-1">
                                        <span className="text-slate-500 font-medium">Destination</span> 
                                        <span className="text-cyan-400 font-bold">{selectedLeadForView.destination}</span>
                                    </p>
                                    <p className="flex justify-between border-b border-slate-800 pb-1">
                                        <span className="text-slate-500 font-medium">Travel Date</span> 
                                        <span className="text-slate-300">{selectedLeadForView.travelDate || 'TBD'}</span>
                                    </p>
                                    <p className="flex justify-between border-b border-slate-800 pb-1">
                                        <span className="text-slate-500 font-medium">Return Date</span> 
                                        <span className="text-slate-300">{selectedLeadForView.returnDate || 'TBD'}</span>
                                    </p>
                                    <p className="flex justify-between pb-1">
                                        <span className="text-slate-500 font-medium">Status</span> 
                                        <span className="text-emerald-400 font-bold">{selectedLeadForView.status}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── LEAD HISTORY MODAL — Lead Journey, matching the mockup exactly ──── */}
                    {isHistoryModalOpen && historyLead && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
                            <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[90vh]">
                                <div className="px-6 pt-6 pb-3 sm:pb-2 border-b border-slate-700/50 flex-shrink-0 flex justify-between items-center">
                                    <h2 className="text-lg sm:text-xl font-bold text-white pr-6 truncate flex items-center gap-2">
                                        <History size={20} className="text-purple-400" />
                                        Lead History - LMN{historyLead.id} | {historyLead.customerName || 'N/A'}
                                    </h2>
                                    <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 bg-transparent border-none cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="px-6 py-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                                    {(() => {
                                        const timeline = buildLeadTimeline(historyLead);
                                        const rawHistory = safeParseHistory(historyLead.history); // newest-first
                                        const createdEntry = rawHistory.find(h => /^Lead Created$/i.test(h.action || ''));
                                        const leadCreated = fmtHistoryDate(historyLead.createdAt) || createdEntry?.date || null;
                                        const leadUpdated = fmtHistoryDate(historyLead.updatedAt) || rawHistory[0]?.date || null;
                                        return (
                                            <>
                                                {/* Current stage banner */}
                                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 space-y-1.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Current Stage</span>
                                                        <span className="px-2.5 py-1 rounded-lg text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            {historyLead.finalStatus || historyLead.status || 'Confirmed Bookings'}
                                                        </span>
                                                        {historyLead.operationsExecutive && (
                                                            <span className="text-xs text-slate-400">Handled By: <span className="text-slate-200 font-semibold">{historyLead.operationsExecutive}</span></span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-100">{historyLead.leadResponse || historyLead.status || 'N/A'}</p>
                                                    <div className="text-xs text-slate-400 space-y-0.5">
                                                        <p>Lead Created: <span className="text-slate-300">{leadCreated || 'N/A'}</span></p>
                                                        <p>Lead Updated: <span className="text-slate-300">{leadUpdated || 'N/A'}</span></p>
                                                    </div>
                                                </div>

                                                {/* Lead Journey — grouped by stage; Fulfilment open by default, others as dropdowns */}
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-300 mb-1 flex items-center gap-2">
                                                        <History size={16} className="text-cyan-400" /> Lead Journey
                                                    </h4>
                                                    <div className="h-px bg-emerald-500/40 mb-4" />
                                                    {timeline.length === 0 ? (
                                                        <p className="text-sm text-slate-500 italic">No activity recorded yet.</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {STAGE_CONFIG.filter(s => s.key !== 'lead').map(stage => {
                                                                const stageEntries = timeline.map((log, idx) => ({ ...log, idx })).filter(e => e.stage === stage.key);
                                                                if (stageEntries.length === 0) return null;
                                                                const isOpen = !!openJourneySections[stage.key];
                                                                const StageIcon = stage.icon;
                                                                return (
                                                                    <div key={stage.key} className="rounded-xl border border-slate-700 overflow-hidden">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setOpenJourneySections(prev => ({ ...prev, [stage.key]: !prev[stage.key] }))}
                                                                            className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                                                                        >
                                                                            <span className={`flex items-center gap-2 text-sm font-bold ${stage.color.split(' ')[0]}`}>
                                                                                <StageIcon size={15} /> {stage.label}
                                                                            </span>
                                                                            <span className="flex items-center gap-2 text-xs text-slate-400">
                                                                                {stageEntries.length} update{stageEntries.length > 1 ? 's' : ''}
                                                                                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                                            </span>
                                                                        </button>
                                                                        {isOpen && (
                                                                            <div className="px-4 py-4 bg-[#0f172a] border-t border-slate-700/50">
                                                                                <div className="relative border-l-2 border-slate-700 ml-2 space-y-5">
                                                                                    {stageEntries.map(log => {
                                                                                        const isCurrent = log.idx === timeline.length - 1;
                                                                                        const stageColor = stage.color.split(' ')[0];
                                                                                        const body = (
                                                                                            <>
                                                                                                <p className="text-xs text-slate-500 mb-0.5">{log.date}</p>
                                                                                                <p className={`text-sm font-bold ${stageColor}`}>{log.title}</p>
                                                                                                {log.parts && log.parts.length > 0 && (
                                                                                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                                                                        {log.parts.map((p, pi) => (
                                                                                                            <span key={pi}>
                                                                                                                {pi > 0 && ' | '}
                                                                                                                {p.label && <span className="text-slate-400">{p.label}{p.value ? ': ' : ''}</span>}
                                                                                                                {p.value && <span className="text-rose-400 font-semibold">{p.value}</span>}
                                                                                                            </span>
                                                                                                        ))}
                                                                                                    </p>
                                                                                                )}
                                                                                            </>
                                                                                        );
                                                                                        return (
                                                                                            <div key={log.idx} className="pl-6 relative">
                                                                                                <span className={`absolute -left-[7px] top-1 w-3 h-3 rotate-45 ring-4 ring-[#0f172a] ${isCurrent ? 'bg-blue-500' : (log._explicit ? 'bg-purple-500' : 'bg-slate-500')}`} />
                                                                                                {isCurrent ? (
                                                                                                    <div className="border border-blue-500/60 bg-blue-500/5 rounded-lg px-3 py-2 -mt-1">
                                                                                                        {body}
                                                                                                    </div>
                                                                                                ) : body}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Complete stage-by-stage data — nothing left out */}
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2 border-t border-slate-700/50 pt-5">
                                                        <ClipboardList size={16} className="text-slate-400" /> Complete Record by Stage
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {STAGE_CONFIG.filter(s => s.key !== 'lead').map(stage => {
                                                            const fields = STAGE_FIELD_MAPS[stage.key] || [];
                                                            const populated = fields.filter(([f]) => {
                                                                const v = historyLead[f];
                                                                return v !== undefined && v !== null && v !== '' && v !== false;
                                                            });
                                                            const hasData = populated.length > 0;
                                                            const isOpen = expandedStage === stage.key;
                                                            const StageIcon = stage.icon;
                                                            return (
                                                                <div key={stage.key} className={`rounded-xl border ${hasData ? 'border-slate-700' : 'border-slate-800'} overflow-hidden`}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => hasData && setExpandedStage(isOpen ? null : stage.key)}
                                                                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${hasData ? 'bg-slate-800/50 hover:bg-slate-800 cursor-pointer' : 'bg-slate-900/30 cursor-default'}`}
                                                                    >
                                                                        <span className={`flex items-center gap-2 text-sm font-bold ${hasData ? stage.color.split(' ')[0] : 'text-slate-600'}`}>
                                                                            <StageIcon size={15} /> {stage.label}
                                                                        </span>
                                                                        {hasData ? (
                                                                            <span className="flex items-center gap-2 text-xs text-slate-400">
                                                                                {populated.length} field{populated.length > 1 ? 's' : ''} recorded
                                                                                <ChevronRight size={14} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-600 italic">Not reached yet</span>
                                                                        )}
                                                                    </button>
                                                                    {hasData && isOpen && (
                                                                        <div className="px-4 py-3 bg-[#0f172a] grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-700/50">
                                                                            {populated.map(([field, label]) => (
                                                                                <div key={field}>
                                                                                    <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{label}</p>
                                                                                    <p className="text-sm text-slate-200 break-words">{String(historyLead[field])}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end pt-2">
                                                    <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors">
                                                        Close Window
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* ─── FULFILLMENT FORM (FULL SCREEN REPLACEMENT) ──────────────────── */
                <div className="bg-[#0f172a] flex flex-col w-full min-h-screen text-slate-100 relative z-50">
                    <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-50 flex-shrink-0 shadow-md">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate pr-4">
                            <PlaneTakeoff size={20} className="text-cyan-400 flex-shrink-0" />
                            <span className="truncate hidden sm:inline">
                                {selectedLeadForEdit.tourType === 'Domestic Tour' ? 'Domestic Fulfillment Form' : 'International Fulfillment Form'}
                            </span>
                            <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-shrink-0">
                                LMN{String(selectedLeadForEdit.id || '').padStart(4, '0')}
                            </span>
                        </h2>
                        <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-auto cursor-pointer border-none bg-transparent">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 w-full relative pb-10">
                       <form id="edit-fulfillment-form" onSubmit={handleEditSubmit} className="px-4 sm:px-6 lg:px-8 py-6 space-y-8 w-full">
                            
                            {selectedLeadForEdit.tourType === 'International Tour' ? (
                                /* ───────────────────────────────────────────── */
                                /* INTERNATIONAL FORM                            */
                                /* ───────────────────────────────────────────── */
                                <div className="space-y-6">
                                    
                                    {/* CUSTOMER DETAILS */}
                                    <FormSection title="Customer Details" titleColor="text-emerald-500">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Customer Name</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.customerName || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Destination</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.destination || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">No. of Pax (Adults | Children)</label>
                                                <div className="flex gap-2">
                                                    <input type="text" readOnly value={selectedLeadForEdit.noOfAdults || selectedLeadForEdit.noOfPax || ''} className={readonlyCls} placeholder="Adults" />
                                                    <input type="text" readOnly value={selectedLeadForEdit.confirmedNoOfChildren || selectedLeadForEdit.noOfChildren || ''} className={readonlyCls} placeholder="Children" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Departure Date</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.departureDate || selectedLeadForEdit.travelDate || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Return Date</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.returnDate || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Services</label>
                                                <div className={`${readonlyCls} whitespace-normal break-words min-h-[38px]`}>{selectedLeadForEdit.confirmedServices || selectedLeadForEdit.services || ''}</div>
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* FLIGHT DETAILS */}
                                    <FormSection 
                                        title="Flight Details" 
                                        action={<button type="button" onClick={() => setViewModal({ show: true, title: 'FLIGHT DETAILS', content: selectedLeadForEdit.flights && selectedLeadForEdit.flights.length > 0 ? selectedLeadForEdit.flights : 'No flight history available.' })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>}
                                    >
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-4 sm:col-span-3 text-sm font-bold text-white">Ticket Verified</span>
                                                <div className="col-span-8 sm:col-span-9 flex items-center">
                                                    <input type="checkbox" checked={selectedLeadForEdit.flightTicketVerified} onChange={e => handleFieldChange('flightTicketVerified', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-4 sm:col-span-3 text-sm font-bold text-white">Baggage Details</span>
                                                <div className="col-span-8 sm:col-span-9 flex gap-6 items-center">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.flBaggageDetails === 'Added'} onChange={() => handleFieldChange('flBaggageDetails', 'Added')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Added</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.flBaggageDetails === 'Not Required'} onChange={() => handleFieldChange('flBaggageDetails', 'Not Required')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Not Required</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-4 sm:col-span-3 text-sm font-bold text-white">Seat Selection</span>
                                                <div className="col-span-8 sm:col-span-9 flex gap-6 items-center">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.flSeatSelection === 'Selected'} onChange={() => handleFieldChange('flSeatSelection', 'Selected')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Selected</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.flSeatSelection === 'Not Required'} onChange={() => handleFieldChange('flSeatSelection', 'Not Required')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Not Required</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-4 sm:col-span-3 text-sm font-bold text-white">Meal Status</span>
                                                <div className="col-span-8 sm:col-span-9 flex items-center">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.flMealStatusCheck} onChange={e => handleFieldChange('flMealStatusCheck', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Added</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-4 sm:col-span-3 text-sm font-bold text-white">Boarding Pass Support</span>
                                                <div className="col-span-8 sm:col-span-9 flex gap-6 items-center">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.flBoardingPassSupport === 'Team'} onChange={() => handleFieldChange('flBoardingPassSupport', 'Team')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Team</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.flBoardingPassSupport === 'Client'} onChange={() => handleFieldChange('flBoardingPassSupport', 'Client')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Client</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* TRAVEL INSURANCE */}
                                    {selectedLeadForEdit.insRequired === 'Yes' && (
                                        <FormSection title="Travel Insurance">
                                            <div className="flex items-center gap-4">
                                                <input type="checkbox" checked={selectedLeadForEdit.insIssuedChk} onChange={e => handleFieldChange('insIssuedChk', e.target.checked)} className="w-4 h-4 rounded" />
                                                <span className="text-sm text-white font-medium">Issued</span>
                                            </div>
                                        </FormSection>
                                    )}

                                    {/* VISA DETAILS */}
                                    {selectedLeadForEdit.visas && selectedLeadForEdit.visas.length > 0 && selectedLeadForEdit.visas[0].visaType && selectedLeadForEdit.visas[0].visaType !== 'VISA-Free' && (
                                        <FormSection 
                                            title="VISA Details"
                                            action={<button type="button" onClick={() => setViewModal({ show: true, title: 'VISA DETAILS', content: selectedLeadForEdit.visas && selectedLeadForEdit.visas.length > 0 ? selectedLeadForEdit.visas : 'No VISA history available.' })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>}
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <span className="w-32 text-sm font-bold text-white">VISA Status</span>
                                                        <input type="text" readOnly value={selectedLeadForEdit.visas[0].visaStatus || ''} className="w-32 bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm text-white focus:outline-none" />
                                                    </div>
                                                    {selectedLeadForEdit.visas[0].arrivalCardApplicable === 'Yes' && (
                                                        <div className="flex items-center gap-4">
                                                            <span className="w-32 text-sm font-bold text-white">Arrival Card Status</span>
                                                            <input type="text" readOnly value={selectedLeadForEdit.visas[0].arrivalCardStatus || ''} className="w-32 bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm text-white focus:outline-none" />
                                                        </div>
                                                    )}
                                                    {selectedLeadForEdit.visas[0].transitVisaReq === 'Yes' && (
                                                        <div className="flex items-center gap-4">
                                                            <span className="w-32 text-sm font-bold text-white">Transit VISA Status</span>
                                                            <input type="text" readOnly value={selectedLeadForEdit.visas[0].transitVisaStatus || ''} className="w-32 bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm text-white focus:outline-none" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </FormSection>
                                    )}

                                    {/* DMC FULFILMENT */}
                                    <FormSection 
                                        title="DMC Fulfilment"
                                        action={<button type="button" onClick={() => setViewModal({ show: true, title: 'DMC FULFILMENT', content: selectedLeadForEdit.vendorRequests && selectedLeadForEdit.vendorRequests.length > 0 ? selectedLeadForEdit.vendorRequests : 'No DMC/Vendor history available.' })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>}
                                    >
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-5 sm:col-span-4 text-sm font-bold text-white">DMC Confirmation Received</span>
                                                <div className="col-span-7 sm:col-span-8 flex items-center">
                                                    <input type="checkbox" checked={selectedLeadForEdit.dmcConfReceived} onChange={e => handleFieldChange('dmcConfReceived', e.target.checked)} className="w-5 h-5 rounded border border-slate-600 bg-transparent text-cyan-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-5 sm:col-span-4 text-sm font-bold text-white">Driver Details Received</span>
                                                <div className="col-span-7 sm:col-span-8 flex items-center">
                                                    <input type="checkbox" checked={selectedLeadForEdit.dmcDriverDetails} onChange={e => handleFieldChange('dmcDriverDetails', e.target.checked)} className="w-5 h-5 rounded border border-slate-600 bg-transparent text-cyan-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-5 sm:col-span-4 text-sm font-bold text-white">Emergency Contact Received</span>
                                                <div className="col-span-7 sm:col-span-8 flex items-center">
                                                    <input type="checkbox" checked={selectedLeadForEdit.dmcEmergencyContactReq} onChange={e => handleFieldChange('dmcEmergencyContactReq', e.target.checked)} className="w-5 h-5 rounded border border-slate-600 bg-transparent text-cyan-500" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-3">
                                                <span className="col-span-5 sm:col-span-4 text-sm font-bold text-white">Point-to-Point Service</span>
                                                <div className="col-span-7 sm:col-span-8 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.dmcPtPService === 'Explained to Client'} onChange={() => handleFieldChange('dmcPtPService', 'Explained to Client')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Explained to Client</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={selectedLeadForEdit.dmcPtPService === 'Not Applicable'} onChange={() => handleFieldChange('dmcPtPService', 'Not Applicable')} className="w-4 h-4 rounded text-cyan-500" />
                                                        <span className="text-sm text-slate-300">Not Applicable</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 pt-2">
                                                <h3 className="text-sm font-bold text-cyan-400">Special Requirements Status</h3>
                                                <button type="button" onClick={() => setViewModal({ show: true, title: 'SPECIAL REQUIREMENTS', content: {
                                                    "Veg Meal": selectedLeadForEdit.reqVeg,
                                                    "Wheel Chair": selectedLeadForEdit.reqWheelchair,
                                                    "Senior Citizen": selectedLeadForEdit.reqSenior,
                                                    "Honeymoon Perks": selectedLeadForEdit.reqHoneymoon,
                                                    "Candlelight Dinner": selectedLeadForEdit.reqCandlelight,
                                                    "Floating Breakfast": selectedLeadForEdit.reqFloating,
                                                    "Special Decoration": selectedLeadForEdit.reqDecor,
                                                    "Birthday": selectedLeadForEdit.reqBirthday,
                                                    "Anniversary": selectedLeadForEdit.reqAnniversary,
                                                    "Other": selectedLeadForEdit.reqManualAdd
                                                } })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>
                                                <CustomSelect value={selectedLeadForEdit.specialReqStatusVal} onChange={v => handleFieldChange('specialReqStatusVal', v)} options={['Pending', 'Completed', 'Not Applicable']} className="w-48 px-2 py-1.5 bg-slate-900 text-white text-sm rounded border border-slate-700 outline-none focus:border-cyan-500" />
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* PAYMENT CLEARANCE */}
                                    <FormSection title="Payment Clearance">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Client Payment Status</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.clientPayStatus || 'Pending'} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Vendor Payment Status</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.vendorPayStatus || 'Pending'} className={readonlyCls} />
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* BRIEFING DETAILS */}
                                    <FormSection title="Briefing Details">
                                        <div className="space-y-4 border-b border-slate-700/50 pb-6">
                                            <div className="grid grid-cols-12 items-center gap-4">
                                                <div className="col-span-4 sm:col-span-3">
                                                    <span className="text-sm font-bold text-white block">Finalised Itinerary</span>
                                                </div>
                                                <div className="col-span-8 sm:col-span-9 flex items-center gap-4 flex-wrap">
                                                    <button type="button" onClick={() => setViewModal({ show: true, title: 'FINALISED ITINERARY', content: selectedLeadForEdit.customisationRequests && selectedLeadForEdit.customisationRequests.length > 0 ? selectedLeadForEdit.customisationRequests : { Readymade_Package_Details: selectedLeadForEdit.readymadePackageDetails || 'No itinerary history available.' } })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>
                                                    <div className="relative inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded cursor-pointer">
                                                        <Plus size={12} /> Attach Itinerary
                                                        <input type="file" onChange={e => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            const r = new FileReader();
                                                            r.readAsDataURL(file);
                                                            r.onloadend = () => handleFieldChange('finalisedItineraryFile', r.result);
                                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    </div>
                                                    {selectedLeadForEdit.finalisedItineraryFile && (
                                                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/40 rounded border border-slate-700/50">
                                                            <span className="text-[10px] text-slate-300">Itinerary Attached</span>
                                                            <button type="button" onClick={() => window.open(selectedLeadForEdit.finalisedItineraryFile, '_blank')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-blue-400"><Eye size={12} /></button>
                                                            <button type="button" onClick={() => handleFieldChange('finalisedItineraryFile', '')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-red-400"><Trash2 size={12} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4">
                                                <div className="col-span-4 sm:col-span-3">
                                                    <span className="text-sm font-bold text-white block">Service Voucher</span>
                                                </div>
                                                <div className="col-span-8 sm:col-span-9">
                                                    <input type="file" className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-white mb-2">Briefing Date</label>
                                                    <DatePickerField value={selectedLeadForEdit.briefingDateVal || ''} onChange={e => handleFieldChange('briefingDateVal', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded text-white text-sm px-3 py-2 outline-none focus:border-cyan-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-white mb-2">Briefed By</label>
                                                    <CustomSelect value={selectedLeadForEdit.briefedByVal} onChange={v => handleFieldChange('briefedByVal', v)} options={operationsStaff} className="w-full bg-slate-900 text-white text-sm rounded border border-slate-700 px-3 py-2 outline-none focus:border-cyan-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-white mb-2">Briefed Method</label>
                                                    <CustomSelect value={selectedLeadForEdit.briefedMethodVal} onChange={v => handleFieldChange('briefedMethodVal', v)} options={['Call', 'WhatsApp', 'Video Call', 'In-Person']} className="w-full bg-slate-900 text-white text-sm rounded border border-slate-700 px-3 py-2 outline-none focus:border-cyan-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Briefing Topics Section */}
                                        <div className="pt-4">
                                            <h3 className="text-sm font-bold text-cyan-400 mb-4">Briefing Topics</h3>
                                            
                                            {/* Travel Advisory */}
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-white">Travel Advisory</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-slate-300">
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Local Rules & Regulations</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advLocalRules} onChange={e => handleFieldChange('advLocalRules', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Tourism / Green Tax</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advTourismTax} onChange={e => handleFieldChange('advTourismTax', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Travel Restrictions</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advTravelRestrictions} onChange={e => handleFieldChange('advTravelRestrictions', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Permit Requirements</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advPermitReq} onChange={e => handleFieldChange('advPermitReq', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Financial Guidance */}
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-white">Financial Guidance</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-slate-300">
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Forex</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.finForex} onChange={e => handleFieldChange('finForex', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>International Card Usage</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.finIntlCard} onChange={e => handleFieldChange('finIntlCard', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Currency Exchange</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.finCurrency} onChange={e => handleFieldChange('finCurrency', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Local Payment Methods</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.finLocalPayment} onChange={e => handleFieldChange('finLocalPayment', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Destination Guidance */}
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-white">Destination Guidance</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-slate-300">
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Weather & Clothing</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.destWeather} onChange={e => handleFieldChange('destWeather', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Safety Tips</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.destSafety} onChange={e => handleFieldChange('destSafety', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Local Customs & Etiquette</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.destCustoms} onChange={e => handleFieldChange('destCustoms', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/30 p-1 rounded">
                                                        <span>Emergency Contacts</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.destEmergency} onChange={e => handleFieldChange('destEmergency', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </FormSection>

                                </div>
                            ) : (
                                /* ───────────────────────────────────────────── */
                                /* DOMESTIC FORM                                 */
                                /* ───────────────────────────────────────────── */
                                <div className="space-y-6">
                                    
                                    {/* CUSTOMER DETAILS */}
                                    <FormSection title="Customer Details" titleColor="text-emerald-500">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Customer Name</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.customerName || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Destination</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.destination || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">No. of Pax (Adults | Children)</label>
                                                <div className="flex gap-2">
                                                    <input type="text" readOnly value={selectedLeadForEdit.noOfAdults || selectedLeadForEdit.noOfPax || ''} className={readonlyCls} placeholder="Adults" />
                                                    <input type="text" readOnly value={selectedLeadForEdit.confirmedNoOfChildren || selectedLeadForEdit.noOfChildren || ''} className={readonlyCls} placeholder="Children" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Departure Date</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.departureDate || selectedLeadForEdit.travelDate || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Return Date</label>
                                                <input type="text" readOnly value={selectedLeadForEdit.returnDate || ''} className={readonlyCls} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Services</label>
                                                <div className={`${readonlyCls} whitespace-normal break-words min-h-[38px]`}>{selectedLeadForEdit.confirmedServices || selectedLeadForEdit.services || ''}</div>
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* TRANSPORT DETAILS */}
                                    <FormSection 
                                        title="Transport Details"
                                        action={<button type="button" onClick={() => setViewModal({ show: true, title: 'TRANSPORT DETAILS', content: selectedLeadForEdit.domTransports && selectedLeadForEdit.domTransports.length > 0 ? selectedLeadForEdit.domTransports : 'No transport history available.' })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>}
                                    >
                                        <div className="grid grid-cols-12 items-center gap-4 border-b border-slate-700/30 pb-4 mb-4">
                                            <div className="col-span-4 sm:col-span-3">
                                                <CustomSelect 
                                                    value={selectedLeadForEdit.domTransportType} 
                                                    onChange={v => handleFieldChange('domTransportType', v)} 
                                                    options={['Flight', 'Train', 'Bus', 'None']} 
                                                    className={selectCls} 
                                                />
                                            </div>
                                            <div className="col-span-8 sm:col-span-9 flex items-center gap-4">
                                                {selectedLeadForEdit.domTransportType === 'Bus' && (
                                                    <>
                                                        <span className="text-sm font-bold text-white">Ticket Verified</span>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedLeadForEdit.domTicketVerified} 
                                                            onChange={e => handleFieldChange('domTicketVerified', e.target.checked)} 
                                                            className="w-4 h-4 rounded text-cyan-500" 
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                            {selectedLeadForEdit.domTransportType === 'Flight' && (
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold text-white border-b border-slate-700/50 pb-2">Flight Details</h4>
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center gap-4 justify-between">
                                                            <span className="text-sm font-bold text-slate-300 w-32">Baggage Details</span>
                                                            <div className="flex gap-4 flex-1">
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedLeadForEdit.domBagDetails === 'Added'} onChange={() => handleFieldChange('domBagDetails', 'Added')} className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-300">Added</span></label>
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedLeadForEdit.domBagDetails === 'Not Required'} onChange={() => handleFieldChange('domBagDetails', 'Not Required')} className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-300">Not Required</span></label>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 justify-between">
                                                            <span className="text-sm font-bold text-slate-300 w-32">Seat Selection</span>
                                                            <div className="flex gap-4 flex-1">
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedLeadForEdit.domSeatSelection === 'Selected'} onChange={() => handleFieldChange('domSeatSelection', 'Selected')} className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-300">Selected</span></label>
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedLeadForEdit.domSeatSelection === 'Not Required'} onChange={() => handleFieldChange('domSeatSelection', 'Not Required')} className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-300">Not Required</span></label>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 justify-between">
                                                            <span className="text-sm font-bold text-slate-300 w-32">Meal Status</span>
                                                            <div className="flex gap-4 flex-1">
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedLeadForEdit.domMealStatus === 'Added'} onChange={() => handleFieldChange('domMealStatus', 'Added')} className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-300">Added</span></label>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 justify-between pt-2">
                                                            <span className="text-sm font-bold text-slate-300 w-32">Boarding Pass Support</span>
                                                            <div className="flex gap-4 flex-1">
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedLeadForEdit.domBoardingPass === 'Team'} onChange={() => handleFieldChange('domBoardingPass', 'Team')} className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-300">Team</span></label>
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedLeadForEdit.domBoardingPass === 'Client'} onChange={() => handleFieldChange('domBoardingPass', 'Client')} className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-300">Client</span></label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedLeadForEdit.domTransportType === 'Train' && (
                                                <div className="space-y-4 border-l border-slate-700/50 pl-0 sm:pl-8">
                                                    <h4 className="text-sm font-bold text-white border-b border-slate-700/50 pb-2">Train Details</h4>
                                                    <div className="flex items-center justify-between gap-4 mt-4">
                                                        <span className="text-sm font-bold text-slate-300">Seat/Berth Confirmed</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.domSeatBerthConfirmed} onChange={e => handleFieldChange('domSeatBerthConfirmed', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </FormSection>

                                    {/* TRAVEL INSURANCE */}
                                    {selectedLeadForEdit.insRequired === 'Yes' && (
                                        <FormSection title="Travel Insurance">
                                            <div className="flex items-center gap-4">
                                                <input type="checkbox" checked={selectedLeadForEdit.insIssuedChk} onChange={e => handleFieldChange('insIssuedChk', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                <span className="text-sm text-white font-medium">Issued</span>
                                            </div>
                                        </FormSection>
                                    )}

                                    {/* VENDOR FULFILMENT */}
                                    <FormSection 
                                        title="Vendor Fulfilment"
                                        action={<button type="button" onClick={() => setViewModal({ show: true, title: 'VENDOR FULFILMENT', content: selectedLeadForEdit.vendorRequests && selectedLeadForEdit.vendorRequests.length > 0 ? selectedLeadForEdit.vendorRequests : 'No Vendor history available.' })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>}
                                    >
                                        {(() => {
                                            // Package Scope is no longer manually chosen here — it's fetched straight
                                            // from what Operations actually selected in Confirmed Bookings' Vendor
                                            // Details ('Complete Package' / 'Hotel Only' / 'Vehicle Only'), so only the
                                            // scopes Ops confirmed are shown.
                                            const rawScopes = toArr(selectedLeadForEdit.vendorRequests).map(v => v.vendorService).filter(Boolean);
                                            const normalize = s => s === 'Hotel Only' ? 'Hotel' : s === 'Vehicle Only' ? 'Vehicle' : s;
                                            const confirmedScopes = [...new Set(rawScopes.map(normalize))];
                                            return (
                                                <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4 flex-wrap">
                                                    <span className="text-xs font-bold text-slate-400">Package Scope:</span>
                                                    {confirmedScopes.length > 0 ? confirmedScopes.map(scope => (
                                                        <span key={scope} className="px-2.5 py-1 text-xs font-semibold text-cyan-400 bg-cyan-950/30 border border-cyan-800 rounded">{scope}</span>
                                                    )) : (
                                                        <span className="text-xs text-slate-500">Not yet confirmed by Operations</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 min-h-[120px]">
                                            {toArr(selectedLeadForEdit.vendorRequests).some(v => v.vendorService === 'Complete Package') && (
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold text-white border-b border-slate-700/50 pb-2">Complete Package Details</h4>
                                                    <div className="space-y-3">
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-sm text-slate-300">DMC Confirmation Received</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.dmcConfReceived} onChange={e => handleFieldChange('dmcConfReceived', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-sm text-slate-300">Driver Details Received</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.dmcDriverDetails} onChange={e => handleFieldChange('dmcDriverDetails', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-sm text-slate-300">Emergency Contact Received</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.dmcEmergencyContactReq} onChange={e => handleFieldChange('dmcEmergencyContactReq', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {toArr(selectedLeadForEdit.vendorRequests).some(v => v.vendorService === 'Hotel Only') && (
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold text-white border-b border-slate-700/50 pb-2">Hotel Details</h4>
                                                    <div className="space-y-3">
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-sm text-slate-300">Hotel Voucher Received</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.domHotelVoucherReceived} onChange={e => handleFieldChange('domHotelVoucherReceived', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-sm text-slate-300">Hotel Contact Shared to Client</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.domHotelContactShared} onChange={e => handleFieldChange('domHotelContactShared', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {toArr(selectedLeadForEdit.vendorRequests).some(v => v.vendorService === 'Vehicle Only') && (
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold text-white border-b border-slate-700/50 pb-2">Vehicle Details</h4>
                                                    <div className="space-y-3">
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-sm text-slate-300">Vehicle details received</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.domVehicleDetailsReceived} onChange={e => handleFieldChange('domVehicleDetailsReceived', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-sm text-slate-300">Driver contact shared with client</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.domDriverContactShared} onChange={e => handleFieldChange('domDriverContactShared', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
                                            <h3 className="text-sm font-bold text-cyan-400">Special Requirements Status</h3>
                                            <button type="button" onClick={() => setViewModal({ show: true, title: 'SPECIAL REQUIREMENTS', content: {
                                                "Veg Meal": selectedLeadForEdit.reqVeg,
                                                "Wheel Chair": selectedLeadForEdit.reqWheelchair,
                                                "Senior Citizen": selectedLeadForEdit.reqSenior,
                                                "Honeymoon Perks": selectedLeadForEdit.reqHoneymoon,
                                                "Candlelight Dinner": selectedLeadForEdit.reqCandlelight,
                                                "Floating Breakfast": selectedLeadForEdit.reqFloating,
                                                "Special Decoration": selectedLeadForEdit.reqDecor,
                                                "Birthday": selectedLeadForEdit.reqBirthday,
                                                "Anniversary": selectedLeadForEdit.reqAnniversary,
                                                "Other": selectedLeadForEdit.reqManualAdd
                                            } })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>
                                            <CustomSelect value={selectedLeadForEdit.specialReqStatusVal} onChange={v => handleFieldChange('specialReqStatusVal', v)} options={['Pending', 'Completed', 'Not Applicable']} className="w-48 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-sm outline-none focus:border-cyan-500" />
                                        </div>
                                    </FormSection>

                                    {/* PAYMENT CLEARANCE */}
                                    <FormSection title="Payment Clearance">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-3 border-r border-slate-700/50 pr-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-white mb-2">Client Payment Status</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.clientPayStatus || 'Pending'} className={readonlyCls} />
                                                </div>
                                            </div>
                                            <div className="space-y-3 pl-0 sm:pl-4">
                                                <label className="block text-xs font-bold text-white mb-2">Vendor Payment Status</label>
                                                <div className="grid grid-cols-[100px_1fr] items-center gap-2 text-sm text-slate-300">
                                                    <span>DMC/Vendor</span>
                                                    <input type="text" readOnly value={selectedLeadForEdit.vendorPayStatus_DMC || 'Pending'} className={readonlyCls} />
                                                    <span>Hotel 1</span>
                                                    <input type="text" readOnly value={selectedLeadForEdit.vendorPayStatus_Hotel1 || 'Pending'} className={readonlyCls} />
                                                    <span>Hotel 2</span>
                                                    <input type="text" readOnly value={selectedLeadForEdit.vendorPayStatus_Hotel2 || 'Pending'} className={readonlyCls} />
                                                    <span>Vehicle</span>
                                                    <input type="text" readOnly value={selectedLeadForEdit.vendorPayStatus_Vehicle || 'Pending'} className={readonlyCls} />
                                                </div>
                                            </div>
                                        </div>
                                    </FormSection>

                                    {/* BRIEFING DETAILS */}
                                    <FormSection title="Briefing Details">
                                        <div className="space-y-4 border-b border-slate-700/50 pb-6">
                                            <div className="grid grid-cols-12 items-center gap-4">
                                                <div className="col-span-4 sm:col-span-3">
                                                    <span className="text-sm font-bold text-white block">Finalised Itinerary</span>
                                                </div>
                                                <div className="col-span-8 sm:col-span-9 flex items-center gap-4 flex-wrap">
                                                    <button type="button" onClick={() => setViewModal({ show: true, title: 'FINALISED ITINERARY', content: selectedLeadForEdit.customisationRequests && selectedLeadForEdit.customisationRequests.length > 0 ? selectedLeadForEdit.customisationRequests : { Readymade_Package_Details: selectedLeadForEdit.readymadePackageDetails || 'No itinerary history available.' } })} className="text-cyan-500 cursor-pointer hover:text-cyan-400 bg-transparent border-none p-0" title="View Details"><Eye size={16} /></button>
                                                    <div className="relative inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded cursor-pointer">
                                                        <Plus size={12} /> Attach Itinerary
                                                        <input type="file" onChange={e => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            const r = new FileReader();
                                                            r.readAsDataURL(file);
                                                            r.onloadend = () => handleFieldChange('finalisedItineraryFile', r.result);
                                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    </div>
                                                    {selectedLeadForEdit.finalisedItineraryFile && (
                                                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/40 rounded border border-slate-700/50">
                                                            <span className="text-[10px] text-slate-300">Itinerary Attached</span>
                                                            <button type="button" onClick={() => window.open(selectedLeadForEdit.finalisedItineraryFile, '_blank')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-blue-400"><Eye size={12} /></button>
                                                            <button type="button" onClick={() => handleFieldChange('finalisedItineraryFile', '')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-red-400"><Trash2 size={12} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 items-center gap-4">
                                                <div className="col-span-4 sm:col-span-3">
                                                    <span className="text-sm font-bold text-white block">Service Voucher</span>
                                                </div>
                                                <div className="col-span-8 sm:col-span-9">
                                                    <input type="file" className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer" />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-white mb-2">Briefing Date</label>
                                                    <DatePickerField value={selectedLeadForEdit.briefingDateVal || ''} onChange={e => handleFieldChange('briefingDateVal', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded text-white text-sm px-3 py-2 outline-none focus:border-cyan-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-white mb-2">Briefed By</label>
                                                    <CustomSelect value={selectedLeadForEdit.briefedByVal} onChange={v => handleFieldChange('briefedByVal', v)} options={operationsStaff} className="w-full bg-slate-900 text-white text-sm rounded border border-slate-700 px-3 py-2 outline-none focus:border-cyan-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Briefing Topics Section */}
                                        <div className="pt-4">
                                            <h3 className="text-sm font-bold text-cyan-400 mb-4">Briefing Topics</h3>
                                            
                                            {/* Travel Advisory */}
                                            <div className="mb-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-white">Travel Advisory</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-1 gap-y-2 gap-x-6 text-sm text-slate-300 pl-4 sm:pl-7">
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Local Rules & Regulations</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advLocalRules} onChange={e => handleFieldChange('advLocalRules', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Weather & Clothing</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advWeatherClothing} onChange={e => handleFieldChange('advWeatherClothing', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Permit Requirements (If Applicable)</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advPermitReq} onChange={e => handleFieldChange('advPermitReq', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Safety Guidelines</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advSafetyGuidelines} onChange={e => handleFieldChange('advSafetyGuidelines', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>ID Proof Requirement</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.advIdProof} onChange={e => handleFieldChange('advIdProof', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                </div>  
                                            </div>

                                            {/* Journey Guidance */}
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-white">Journey Guidance</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-1 gap-y-2 gap-x-6 text-sm text-slate-300 pl-4 sm:pl-7">
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Pickup / Boarding Details Shared</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.journPickupDetails} onChange={e => handleFieldChange('journPickupDetails', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                    <div className="hidden sm:block"></div>
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Hotel Contact Shared</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.journHotelContact} onChange={e => handleFieldChange('journHotelContact', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                   
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Hotel Check-in Process Explained</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.journHotelCheckin} onChange={e => handleFieldChange('journHotelCheckin', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                     <label className="flex items-center justify-between cursor-pointer">
                                                        <span>Emergency Contacts</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.journEmergencyContact} onChange={e => handleFieldChange('journEmergencyContact', e.target.checked)} className="w-4 h-4 rounded text-cyan-500" />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </FormSection>

                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 mt-8 px-6 py-4 flex-shrink-0">
                                <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="px-5 py-2 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded cursor-pointer uppercase tracking-wider transition-colors">CANCEL</button>
                                <button type="submit" className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded shadow cursor-pointer uppercase tracking-wider transition-colors">SAVE FULFILLMENT</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── DYNAMIC VIEW MODAL ───────────────────────────────────────── */}
            {viewModal.show && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg shadow-2xl w-full max-w-2xl p-0 relative overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-700/50 bg-[#0b1329] flex-shrink-0">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{viewModal.title}</h2>
                            <button type="button" onClick={() => setViewModal({ show: false, title: '', content: '' })} className="text-slate-400 hover:text-white cursor-pointer transition-colors bg-transparent border-none p-1 rounded-md hover:bg-slate-800"><X size={20} /></button>
                        </div>
                        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-[#0f172a]">
                            {renderDataContent(viewModal.content)}
                        </div>
                        <div className="px-5 py-3 border-t border-slate-700/50 bg-[#0b1329] flex justify-end flex-shrink-0">
                            <button type="button" onClick={() => setViewModal({ show: false, title: '', content: '' })} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer uppercase tracking-wider">Close</button>
                        </div>
                    </div>
                </div>
            )}
            
            <button type="button" onClick={scrollToTop} aria-label="Scroll to top" className={`fixed bottom-6 right-5 z-40 p-3 rounded-full bg-slate-800 border border-slate-600 text-slate-300 shadow-lg transition-all duration-300 cursor-pointer hover:bg-slate-700 hover:text-white ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <ArrowUp size={18} />
            </button>
        </div>
    );
}