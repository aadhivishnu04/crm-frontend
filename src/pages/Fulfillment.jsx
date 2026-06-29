import React, { useState, useEffect, useRef } from 'react';
import {
    Eye, Pencil, Clock, Search, MapPin, Calendar,
    BookmarkCheck, PlaneTakeoff, X, AlertCircle, CheckCircle2, 
    CheckSquare, ChevronLeft, ChevronRight, ArrowUp
} from 'lucide-react';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "http://192.168.1.9:8082/api";

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
    const destination = (lead.destination || '').toLowerCase();
    if (INDIAN_DESTINATION_KEYWORDS.some(place => destination.includes(place))) return 'Domestic Tour';
    if (destination.trim()) return 'International Tour';
    return 'International Tour';
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
        visas: [{ visaType: 'e-Visa', visaStatus: 'Approved', transitVisaReq: 'No', visaCopyShared: 'Yes' }],
        clientPayStatus: 'Cleared', vendorPayStatus: 'Pending'
    },
    {
        id: 14, customerName: 'John Doe', destination: 'Dubai', amount: '₹3,00,000+', 
        status: 'Confirmed Bookings', phone: '9876543211', salesExecutive: 'Sarah', operationsExecutive: 'Ops Desk 2',
        bookingDate: '2026-06-15', travelDate: '2026-06-28', returnDate: '2026-07-04', reviewStatus: 'Review Received',
        noOfPax: '4', insRequired: 'No',
        flights: [
            { departureDateTime: '2026-06-28T22:30', boardingPoint: 'BOM', deboardingPoint: 'DXB' },
            { departureDateTime: '2026-07-04T04:00', boardingPoint: 'DXB', deboardingPoint: 'BOM' }
        ]
    },
    {
        id: 15, customerName: 'Jane Smith', destination: 'Kerala', amount: '₹1,50,000+', 
        status: 'Confirmed Bookings', phone: '9876543212', salesExecutive: 'Mike', operationsExecutive: 'Ops Desk 1',
        bookingDate: '2026-06-20', travelDate: '2026-06-22', returnDate: '2026-06-27', reviewStatus: 'Pending Review',
        noOfPax: '2', insRequired: 'No',
        domTransports: [],
        domHotels: [],
        reqVeg: true, reqHoneymoon: true
    }
];

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
    const Icon = type === 'time' ? Clock : Calendar;
    return (
        <div className={`relative w-full flex items-center ${!readOnly ? 'cursor-pointer' : ''}`} onClick={() => { if (!readOnly && inputRef.current?.showPicker) inputRef.current.showPicker(); }}>
            <input ref={inputRef} type={type} value={value || ''} onChange={onChange} readOnly={readOnly} className={`${className} ${readOnly ? '' : 'cursor-pointer'} custom-date-input`} style={{ paddingRight: '2.5rem', colorScheme: 'dark' }} />
            <Icon size={15} className={`absolute right-3 pointer-events-none ${readOnly ? 'text-slate-600' : 'text-cyan-500'}`} />
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

    useEffect(() => {
        const fetchLeads = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/leads`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                
                // === FIX 1: PARSE STRINGIFIED JSON ARRAYS ===
                const parseJSON = (val) => {
                    if (!val) return [];
                    try { return typeof val === 'string' ? JSON.parse(val) : val; } 
                    catch (e) { return []; }
                };

                const mappedData = data.map(lead => {
                    // Extract fulfillmentData into flat state
                    let parsedFulfillment = {};
                    if (lead.fulfillmentData) {
                        try { parsedFulfillment = typeof lead.fulfillmentData === 'string' ? JSON.parse(lead.fulfillmentData) : lead.fulfillmentData; }
                        catch(e) { parsedFulfillment = {}; }
                    }

                    return {
                        ...lead,
                        ...parsedFulfillment, // Spreads dynamic checklist fields onto the lead object
                        passengers: parseJSON(lead.passengers),
                        flights: parseJSON(lead.flights),
                        intTransports: parseJSON(lead.intTransports),
                        visas: parseJSON(lead.visas),
                        domTransports: parseJSON(lead.domTransports),
                        domHotels: parseJSON(lead.domHotels),
                        intHotels: parseJSON(lead.intHotels),
                        domLocalTransports: parseJSON(lead.domLocalTransports),
                        paymentRequests: parseJSON(lead.paymentRequests)
                    };
                });
                
                setLeads(mappedData);
            } catch (err) {
                setLeads(MOCK_LEADS);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, []);

    const updateLead = async (id, updatedData) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedData } : l));
        try {
            await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            triggerNotification('success', 'Fulfillment data updated successfully!');
        } catch (err) {
            triggerNotification('success', 'Fulfillment changes saved locally.');
        }
    };

    return { leads, isLoading, updateLead };
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

    const [activeTab, setActiveTab] = useState('Confirmed Bookings');
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
    const [selectedLeadForView, setSelectedLeadForView] = useState(null);

    const [showScrollTop, setShowScrollTop] = useState(false);
    const mainRef = useRef(null);
    const tabScrollRef = useRef(null);

    const SYSTEM_TODAY = new Date("2026-06-25T00:00:00");

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollTabs = (dir) => tabScrollRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });

    // FULFILLMENT DATE LOGIC & CATEGORIZATION
    const categorizedLeads = leads.reduce((acc, lead) => {
        const travelDate = lead.travelDate ? new Date(lead.travelDate) : null;
        const returnDate = lead.returnDate ? new Date(lead.returnDate) : null;

        if (lead.status === 'Confirmed Bookings' || lead.status === 'Upcoming Departure') acc['Confirmed Bookings'].push(lead);
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
            // Flight Defaults (Intl & Dom)
            flBaggageReq: lead.flBaggageReq || '', flBaggageBookedBy: lead.flBaggageBookedBy || '', flBaggageStatus: lead.flBaggageStatus || '', flBaggageSupport: lead.flBaggageSupport || '', flBaggageKg: lead.flBaggageKg || '',
            flSeatPref: lead.flSeatPref || '', flSeatBookedBy: lead.flSeatBookedBy || '', flSeatStatus: lead.flSeatStatus || '',
            flMealReq: lead.flMealReq || '', flMealType: lead.flMealType || '', flMealBookedBy: lead.flMealBookedBy || '', flMealStatus: lead.flMealStatus || '', flSpecialInst: lead.flSpecialInst || '',
            
            // Domestic Specific Defaults
            docCompleted: lead.docCompleted || '',
            locTransVehicleAssigned: lead.locTransVehicleAssigned || false,
            locTransDriverDetailsShared: lead.locTransDriverDetailsShared || false,
            locTransDriverContactShared: lead.locTransDriverContactShared || false,
            domSpecialReqStatus: lead.domSpecialReqStatus || '',
            domSpecialReqCompleted: lead.domSpecialReqCompleted || '',
            
            // Checklists & Booleans (Intl)
            dmcConfirmed: lead.dmcConfirmed || false, dmcHotelVoucher: lead.dmcHotelVoucher || false, dmcTransferVoucher: lead.dmcTransferVoucher || false, dmcSightseeingVoucher: lead.dmcSightseeingVoucher || false, dmcEmergencyContact: lead.dmcEmergencyContact || false,
            transAirportConf: lead.transAirportConf || false, transVehicleAssigned: lead.transVehicleAssigned || false, transDriverDetails: lead.transDriverDetails || false, transDriverContact: lead.transDriverContact || false, transPtPExplained: lead.transPtPExplained || false,
            chkLocalRules: lead.chkLocalRules || false, chkTourismTax: lead.chkTourismTax || false, chkDestRestrictions: lead.chkDestRestrictions || false, chkPermits: lead.chkPermits || false,
            chkBoardingRules: lead.chkBoardingRules || false, chkVisaConditions: lead.chkVisaConditions || false, chkIdPassport: lead.chkIdPassport || false, chkInsuranceCov: lead.chkInsuranceCov || false,
            chkForex: lead.chkForex || false, chkIntlCard: lead.chkIntlCard || false, chkCurrency: lead.chkCurrency || false, chkLocalPayment: lead.chkLocalPayment || false,
            chkDressCode: lead.chkDressCode || false, chkLocalCustoms: lead.chkLocalCustoms || false, chkWeather: lead.chkWeather || false, chkSafety: lead.chkSafety || false,
            ackItinerary: lead.ackItinerary || false, ackVoucher: lead.ackVoucher || false, ackBriefing: lead.ackBriefing || false,
            clrOpsServices: lead.clrOpsServices || false, clrOpsDocs: lead.clrOpsDocs || false, clrFinPayment: lead.clrFinPayment || false, clrFinSupplier: lead.clrFinSupplier || false, clrMgrReview: lead.clrMgrReview || false, clrReadyDeparture: lead.clrReadyDeparture || false,
            
            // Arrays Setup (CRITICAL: Defaulting to skeleton arrays if empty so they never disappear)
            intHotels: Array.isArray(lead.intHotels) && lead.intHotels.length > 0 ? lead.intHotels : [{ hotelName: '', location: '', confirmed: false, voucherShared: false }, { hotelName: '', location: '', confirmed: false, voucherShared: false }],
            
            domHotels: Array.isArray(lead.domHotels) && lead.domHotels.length > 0 ? lead.domHotels : [
                { hotelName: '', location: '', confirmed: false, voucherShared: false },
                { hotelName: '', location: '', confirmed: false, voucherShared: false },
                { hotelName: '', location: '', confirmed: false, voucherShared: false }
            ],
            
            domTransports: Array.isArray(lead.domTransports) && lead.domTransports.length > 0 ? lead.domTransports : [
                { transportType: '', bookingStatus: '', ticketSharedToClient: '', flight: { onward: {}, return: {} }, train: { onward: {}, return: {} }, bus: { onward: {}, return: {} } }
            ]
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();

        // === FIX 2: BUNDLE ALL FULFILLMENT LOOSE VARIABLES ===
        const fulfillmentKeys = [
            'flBaggageReq', 'flBaggageBookedBy', 'flBaggageStatus', 'flBaggageSupport', 'flBaggageKg',
            'flSeatPref', 'flSeatBookedBy', 'flSeatStatus',
            'flMealReq', 'flMealType', 'flMealBookedBy', 'flMealStatus', 'flSpecialInst',
            'docCompleted', 'locTransVehicleAssigned', 'locTransDriverDetailsShared', 'locTransDriverContactShared',
            'domSpecialReqStatus', 'domSpecialReqCompleted',
            'dmcConfirmed', 'dmcHotelVoucher', 'dmcTransferVoucher', 'dmcSightseeingVoucher', 'dmcEmergencyContact',
            'transAirportConf', 'transVehicleAssigned', 'transDriverDetails', 'transDriverContact', 'transPtPExplained',
            'chkLocalRules', 'chkTourismTax', 'chkDestRestrictions', 'chkPermits',
            'chkBoardingRules', 'chkVisaConditions', 'chkIdPassport', 'chkInsuranceCov',
            'chkForex', 'chkIntlCard', 'chkCurrency', 'chkLocalPayment',
            'chkDressCode', 'chkLocalCustoms', 'chkWeather', 'chkSafety',
            'ackItinerary', 'ackVoucher', 'ackBriefing', 'ackBriefingBy', 'ackBriefingDate', 'ackRemarks',
            'clrOpsServices', 'clrOpsDocs', 'clrOpsRemarks', 'clrFinPayment', 'clrFinSupplier', 'clrFinRemarks', 'clrMgrReview', 'clrReadyDeparture'
        ];

        const fulfillmentData = {};
        fulfillmentKeys.forEach(key => {
            if (selectedLeadForEdit[key] !== undefined) {
                fulfillmentData[key] = selectedLeadForEdit[key];
            }
        });

        // Pack the stringified fulfillment JSON alongside the standard lead data
        const payloadToSave = {
            ...selectedLeadForEdit,
            fulfillmentData: JSON.stringify(fulfillmentData)
        };

        updateLead(selectedLeadForEdit.id, payloadToSave);
        setSelectedLeadForEdit(null);
    };

    const handleFieldChange = (field, value) => {
        setSelectedLeadForEdit(prev => ({ ...prev, [field]: value }));
    };

    const handleHotelChange = (hotelArrayKey, index, field, value) => {
        const newHotels = [...selectedLeadForEdit[hotelArrayKey]];
        newHotels[index] = { ...newHotels[index], [field]: value };
        handleFieldChange(hotelArrayKey, newHotels);
    };

    // Special Requirements extraction helper
    const specialReqOptions = [
        { id: 'reqVeg', label: 'Vegetarian Meal' }, { id: 'reqFloating', label: 'Floating Breakfast' },
        { id: 'reqWheelchair', label: 'Wheelchair Assistance' }, { id: 'reqDecor', label: 'Special Decoration' },
        { id: 'reqSenior', label: 'Senior Citizen' }, { id: 'reqBirthday', label: 'Birthday During Trip' },
        { id: 'reqHoneymoon', label: 'Honeymoon Perks' }, { id: 'reqAnniversary', label: 'Anniversary During Trip' },
        { id: 'reqCandlelight', label: 'Candlelight Dinner' }
    ];

    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-400 text-sm cursor-not-allowed font-medium opacity-80 focus:outline-none";
    const sectionCls = "p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm relative";
    const sectionHeadCls = "text-sm font-bold text-cyan-400 mb-5 pb-2 border-b border-slate-700/50 tracking-wider uppercase";

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
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Fulfillment Dashboard</h1>
                    <p className="text-slate-400 text-sm sm:text-base mt-1">Manage fulfillment processing and department clearances.</p>
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
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-600 rounded-lg text-slate-100" />
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
                                {isLoading ? <tr><td colSpan="12" className="px-6 py-12 text-center text-slate-500">Querying records...</td></tr> : paginated.length > 0 ? paginated.map(row => (
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
                                                <button type="button" onClick={() => setSelectedLeadForView(row)} className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center gap-1" title="View Profile">
                                                    <Eye size={18} /> View
                                                </button>
                                                
                                                {/* Show Form Edit button only for Pre-Trip tabs */}
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
                            <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={20} /></button>
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

            {/* ─── FULFILLMENT MODAL (INTERNATIONAL & DOMESTIC) ────────────────────────────── */}
            {selectedLeadForEdit && (
                <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-[150] p-0 sm:p-4">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-none sm:rounded-xl shadow-2xl w-full sm:max-w-5xl h-full sm:h-[95vh] flex flex-col text-slate-100">
                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] flex-shrink-0 sm:rounded-t-xl">
                            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                <PlaneTakeoff size={20} className="text-cyan-400" />
                                {selectedLeadForEdit.tourType === 'Domestic Tour' ? 'Domestic Fulfillment Form' : 'International Fulfillment Form'}
                            </h2>
                            <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-6 py-6 overflow-y-auto flex-1 bg-[#0f172a] custom-scrollbar">
                                
                                {selectedLeadForEdit.tourType === 'International Tour' ? (
                                    /* ───────────────────────────────────────────── */
                                    /* INTERNATIONAL FORM                            */
                                    /* ───────────────────────────────────────────── */
                                    <div className="space-y-8">
                                        {/* Header Info Grid (FETCHED / READ ONLY) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Lead Id</label><input type="text" readOnly value={`LMN${selectedLeadForEdit.id}`} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Customer Name</label><input type="text" readOnly value={selectedLeadForEdit.customerName} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Destination</label><input type="text" readOnly value={selectedLeadForEdit.destination} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Travel Date</label><input type="text" readOnly value={selectedLeadForEdit.travelDate} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Return Date</label><input type="text" readOnly value={selectedLeadForEdit.returnDate || 'N/A'} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">No. Of Pax</label><input type="text" readOnly value={selectedLeadForEdit.noOfPax || 'N/A'} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Sales Executive</label><input type="text" readOnly value={selectedLeadForEdit.salesExecutive} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Operations Executive</label><input type="text" readOnly value={selectedLeadForEdit.operationsExecutive} className={readonlyCls} /></div>
                                        </div>

                                        {/* Document Completed (MANUAL) */}
                                        <div className="flex items-center gap-4 border-b border-slate-700/50 pb-4">
                                            <h3 className="text-cyan-400 font-bold whitespace-nowrap">Document Completed</h3>
                                            <div className="flex flex-col">
                                                <CustomSelect value={selectedLeadForEdit.docCompleted} onChange={(v) => handleFieldChange('docCompleted', v)} className={`${selectCls} max-w-xs`} placeholder="Select" options={['Pending', 'Partial', 'Completed']} />
                                                <span className="text-[10px] text-slate-500 mt-1">checklist</span>
                                            </div>
                                        </div>

                                        {/* Flight Details */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} flex items-center gap-2`}>Flight Details <span className="text-[10px] text-slate-500 normal-case font-medium ml-2">View Only</span></h3>
                                            <div className="space-y-6">
                                                
                                                {/* Fetched Flight Blocks */}
                                                {(() => {
                                                    const fOnward = selectedLeadForEdit.flights?.[0] || {};
                                                    const fReturn = selectedLeadForEdit.flights?.[1] || {};
                                                    const fInternal = selectedLeadForEdit.flights?.[2] || {};
                                                    return (
                                                        <>
                                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center border-b border-slate-700/30 pb-4">
                                                                <span className="text-sm text-slate-400 font-bold">Onward</span>
                                                                <input type="text" readOnly value={fOnward.departureDateTime || ''} className={readonlyCls} placeholder="Date & Time" />
                                                                <input type="text" readOnly value={fOnward.boardingPoint || ''} className={readonlyCls} placeholder="Boarding Point" />
                                                                <input type="text" readOnly value={fOnward.deboardingPoint || ''} className={readonlyCls} placeholder="Deboarding Point" />
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center border-b border-slate-700/30 pb-4">
                                                                <span className="text-sm text-slate-400 font-bold">Return</span>
                                                                <input type="text" readOnly value={fReturn.departureDateTime || ''} className={readonlyCls} placeholder="Date & Time" />
                                                                <input type="text" readOnly value={fReturn.boardingPoint || ''} className={readonlyCls} placeholder="Boarding Point" />
                                                                <input type="text" readOnly value={fReturn.deboardingPoint || ''} className={readonlyCls} placeholder="Deboarding Point" />
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center border-b border-slate-700/30 pb-4">
                                                                <span className="text-sm text-slate-400 font-bold">Internal</span>
                                                                <input type="text" readOnly value={fInternal.departureDateTime || ''} className={readonlyCls} placeholder="Date & Time" />
                                                                <input type="text" readOnly value={fInternal.boardingPoint || ''} className={readonlyCls} placeholder="Boarding Point" />
                                                                <input type="text" readOnly value={fInternal.deboardingPoint || ''} className={readonlyCls} placeholder="Deboarding Point" />
                                                            </div>
                                                        </>
                                                    )
                                                })()}

                                                {/* Manual Flight Details */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-bold text-white border border-slate-700 px-3 py-2 bg-slate-800 rounded">Baggage Details</h4>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Baggage Required</label>
                                                            <CustomSelect value={selectedLeadForEdit.flBaggageReq} onChange={(v) => handleFieldChange('flBaggageReq', v)} className={selectCls} placeholder="Select" options={['Yes', 'No', 'Yes, Only for return']} />
                                                            <p className="text-[10px] text-slate-500 mt-1">Yes / No / Yes, Only for return</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Booked By</label>
                                                            <CustomSelect value={selectedLeadForEdit.flBaggageBookedBy} onChange={(v) => handleFieldChange('flBaggageBookedBy', v)} className={selectCls} placeholder="Select" options={['Client', 'Team']} />
                                                            <p className="text-[10px] text-slate-500 mt-1">Client / Team</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Baggage Status</label>
                                                            <CustomSelect value={selectedLeadForEdit.flBaggageStatus} onChange={(v) => handleFieldChange('flBaggageStatus', v)} className={selectCls} placeholder="Select" options={['Not Required', 'Pending', 'Added']} />
                                                            <p className="text-[10px] text-slate-500 mt-1">Not Required / Pending / Added</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Boarding Pass Support</label>
                                                            <input type="text" placeholder="Enter details" value={selectedLeadForEdit.flBaggageSupport} onChange={(e) => handleFieldChange('flBaggageSupport', e.target.value)} className={inputCls} />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-bold text-white border border-slate-700 px-3 py-2 bg-slate-800 rounded">Seat Selection</h4>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Seat Preference</label>
                                                            <CustomSelect value={selectedLeadForEdit.flSeatPref} onChange={(v) => handleFieldChange('flSeatPref', v)} className={selectCls} placeholder="Select" options={['Window', 'Aisle', 'Middle']} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Seat Selected By</label>
                                                            <CustomSelect value={selectedLeadForEdit.flSeatBookedBy} onChange={(v) => handleFieldChange('flSeatBookedBy', v)} className={selectCls} placeholder="Select" options={['Client', 'Team']} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Booking Status</label>
                                                            <CustomSelect value={selectedLeadForEdit.flSeatStatus} onChange={(v) => handleFieldChange('flSeatStatus', v)} className={selectCls} placeholder="Select" options={['Not Required', 'Pending', 'Reserved']} />
                                                            <p className="text-[10px] text-slate-500 mt-1">Not Required / Pending / Reserved</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-bold text-white border border-slate-700 px-3 py-2 bg-slate-800 rounded">Meal Preference</h4>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Meal Required</label>
                                                            <CustomSelect value={selectedLeadForEdit.flMealReq} onChange={(v) => handleFieldChange('flMealReq', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                            <p className="text-[10px] text-slate-500 mt-1">Yes/ No</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Meal Type</label>
                                                            <CustomSelect value={selectedLeadForEdit.flMealType} onChange={(v) => handleFieldChange('flMealType', v)} className={selectCls} placeholder="Select" options={['Veg', 'Non-Veg', 'Special']} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Meal Booked By</label>
                                                            <CustomSelect value={selectedLeadForEdit.flMealBookedBy} onChange={(v) => handleFieldChange('flMealBookedBy', v)} className={selectCls} placeholder="Select" options={['Client', 'Team']} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Meal Status</label>
                                                            <CustomSelect value={selectedLeadForEdit.flMealStatus} onChange={(v) => handleFieldChange('flMealStatus', v)} className={selectCls} placeholder="Select" options={['Pending', 'Confirmed']} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-200 mb-1">Special Instructions</label>
                                                    <input type="text" placeholder="Enter special instructions" value={selectedLeadForEdit.flSpecialInst} onChange={(e) => handleFieldChange('flSpecialInst', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Travel Insurance */}
                                        {selectedLeadForEdit.insRequired === 'Yes' && (
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Travel Insurance <span className="text-[10px] text-slate-500 normal-case ml-2 font-medium">If they chosen "Yes" Under Insurance required, this part will appear</span></h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Insurance Issued</label>
                                                        <CustomSelect value={selectedLeadForEdit.insIssued} onChange={(v) => handleFieldChange('insIssued', v)} className={selectCls} placeholder="Select" options={['Pending', 'Issued']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Policy Shared To Client</label>
                                                        <CustomSelect value={selectedLeadForEdit.insPolicyShared} onChange={(v) => handleFieldChange('insPolicyShared', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* VISA Details */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>VISA Details</h3>
                                            {(() => {
                                                const primaryVisa = selectedLeadForEdit.visas?.[0] || {};
                                                return (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-xs text-slate-500 font-bold mb-1">VISA Type</label>
                                                            <input type="text" readOnly value={primaryVisa.visaType || 'N/A'} className={readonlyCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-slate-500 font-bold mb-1">VISA Status</label>
                                                            <input type="text" readOnly value={primaryVisa.visaStatus || 'N/A'} className={readonlyCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-slate-500 font-bold mb-1">Transit VISA Required</label>
                                                            <input type="text" readOnly value={primaryVisa.transitVisaReq || 'N/A'} className={readonlyCls} />
                                                            <p className="text-[10px] text-slate-500 mt-1">Automatic</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-slate-500 font-bold mb-1">VISA Copy Shared</label>
                                                            <input type="text" readOnly value={primaryVisa.visaCopyShared || 'N/A'} className={readonlyCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Arrival card Status</label>
                                                            <CustomSelect value={selectedLeadForEdit.visaArrivalCard} onChange={(v) => handleFieldChange('visaArrivalCard', v)} className={selectCls} placeholder="Select" options={['Pending', 'Completed']} />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* DMC & Hotel & Transport Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            
                                            {/* DMC Fulfilment */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>DMC Fulfilment</h3>
                                                <div className="space-y-3">
                                                    {[{id:'dmcConfirmed', l:'DMC Confirmed'}, {id:'dmcHotelVoucher', l:'Hotel Voucher Received'}, {id:'dmcTransferVoucher', l:'Airport Transfer Received'}, {id:'dmcSightseeingVoucher', l:'Sightseeing Voucher Received'}, {id:'dmcEmergencyContact', l:'Emergency Contact Received'}].map(c => (
                                                        <label key={c.id} className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded">
                                                            <span className="text-sm font-bold text-slate-200">{c.l}</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit[c.id]} onChange={(e) => handleFieldChange(c.id, e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Airport & Local Transport */}
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} flex items-center justify-between`}>Airport & Local Transport <span className="text-[10px] text-slate-500 normal-case">View</span></h3>
                                                <div className="space-y-3">
                                                    {[{id:'transAirportConf', l:'Airport Transfer Confirmed'}, {id:'transVehicleAssigned', l:'Vehicle Assigned'}, {id:'transDriverDetails', l:'Driver Details Shared'}, {id:'transDriverContact', l:'Driver Contact Shared'}].map(c => (
                                                        <label key={c.id} className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded">
                                                            <span className="text-sm font-bold text-slate-200">{c.l}</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit[c.id]} onChange={(e) => handleFieldChange(c.id, e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                    ))}
                                                    <label className="flex items-center gap-2 mt-4 cursor-pointer bg-green-950/20 p-2 rounded border border-green-900/30">
                                                        <input type="checkbox" checked={selectedLeadForEdit.transPtPExplained} onChange={(e) => handleFieldChange('transPtPExplained', e.target.checked)} className="w-4 h-4 rounded text-green-500" />
                                                        <span className="text-sm text-green-400 font-bold">Point-to-Point Pickup Explained to Client</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hotel Fulfilment */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Hotel Fulfilment</h3>
                                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 mb-2 px-2">
                                                <div className="col-span-6">Hotel Names | Location <span className="text-[10px] font-normal lowercase">(Fetched)</span></div>
                                                <div className="col-span-3 text-center">Confirmed</div>
                                                <div className="col-span-3 text-center">Voucher Shared</div>
                                            </div>
                                            <div className="space-y-3">
                                                {selectedLeadForEdit.intHotels?.map((hotel, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                                        <div className="col-span-6 flex gap-2">
                                                            <span className="text-slate-500 text-xs mt-2 w-12">Hotel {idx+1}</span>
                                                            <input type="text" readOnly value={`${hotel.hotelName || 'TBD'} | ${hotel.location || 'TBD'}`} className={readonlyCls} style={{textAlign: 'left'}} />
                                                        </div>
                                                        <div className="col-span-3 flex justify-center">
                                                            <input type="checkbox" checked={hotel.confirmed} onChange={(e) => handleHotelChange('intHotels', idx, 'confirmed', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 cursor-pointer" />
                                                        </div>
                                                        <div className="col-span-3 flex justify-center">
                                                            <input type="checkbox" checked={hotel.voucherShared} onChange={(e) => handleHotelChange('intHotels', idx, 'voucherShared', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Special Requirements */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Special Requirements</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-200 mb-1">Requirement Status</label>
                                                    <input type="text" placeholder="Enter status" value={selectedLeadForEdit.reqStatus} onChange={(e) => handleFieldChange('reqStatus', e.target.value)} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-200 mb-1">Pending / Completed</label>
                                                    <CustomSelect value={selectedLeadForEdit.reqCompleted} onChange={(v) => handleFieldChange('reqCompleted', v)} className={selectCls} placeholder="Select" options={['Pending', 'Completed']} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Clearance */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} flex items-center gap-2`}>Payment Clearance <span className="text-[10px] text-slate-500 normal-case ml-2 font-medium">automatic</span></h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-slate-500 font-bold mb-1">Client Payment Status</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.clientPayStatus || 'Cleared'} className={`${readonlyCls} text-left`} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 font-bold mb-1">Payment to Vendor</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.vendorPayStatus || 'Pending'} className={`${readonlyCls} text-left`} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pre-Departure Checklist */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Pre-Departure Checklist</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-bold text-white mb-3">Travel Advisory</h4>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkLocalRules} onChange={(e) => handleFieldChange('chkLocalRules', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Local Rules & Regulations Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkDestRestrictions} onChange={(e) => handleFieldChange('chkDestRestrictions', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Destination-Specific Restrictions Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkTourismTax} onChange={(e) => handleFieldChange('chkTourismTax', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Tourism Tax / Green Tax Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkPermits} onChange={(e) => handleFieldChange('chkPermits', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Permit Requirements Explained</span></label>
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-bold text-white mb-3">Travel Documentation</h4>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkBoardingRules} onChange={(e) => handleFieldChange('chkBoardingRules', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Boarding Rules Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkIdPassport} onChange={(e) => handleFieldChange('chkIdPassport', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">ID / Passport Requirements Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkVisaConditions} onChange={(e) => handleFieldChange('chkVisaConditions', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Visa Conditions Explained (International Only)</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkInsuranceCov} onChange={(e) => handleFieldChange('chkInsuranceCov', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Travel Insurance Coverage Explained</span></label>
                                                </div>
                                                <div className="space-y-2 border-t border-slate-700/50 pt-4">
                                                    <h4 className="text-sm font-bold text-white mb-3">Financial Guidance</h4>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkForex} onChange={(e) => handleFieldChange('chkForex', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Forex Requirements Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkCurrency} onChange={(e) => handleFieldChange('chkCurrency', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Currency Exchange Guidance Shared</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkIntlCard} onChange={(e) => handleFieldChange('chkIntlCard', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">International Card Usage Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkLocalPayment} onChange={(e) => handleFieldChange('chkLocalPayment', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Local Payment Methods Explained</span></label>
                                                </div>
                                                <div className="space-y-2 border-t border-slate-700/50 pt-4">
                                                    <h4 className="text-sm font-bold text-white mb-3">Destination Guidance</h4>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkDressCode} onChange={(e) => handleFieldChange('chkDressCode', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Dress Code Guidelines Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkWeather} onChange={(e) => handleFieldChange('chkWeather', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Weather & Seasonal Advisory Shared</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkLocalCustoms} onChange={(e) => handleFieldChange('chkLocalCustoms', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Local Customs & Etiquette Explained</span></label>
                                                    <label className="flex items-start gap-2 cursor-pointer group"><input type="checkbox" checked={selectedLeadForEdit.chkSafety} onChange={(e) => handleFieldChange('chkSafety', e.target.checked)} className="mt-1 w-3.5 h-3.5 rounded text-cyan-500" /><span className="text-xs font-bold text-slate-200">Safety Guidelines Shared</span></label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer Acknowledgement */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Customer Acknowledgement</h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <label className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded border border-slate-700/30">
                                                            <span className="text-sm font-bold text-slate-200">Finalised Itinerary Shared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.ackItinerary} onChange={(e) => handleFieldChange('ackItinerary', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded border border-slate-700/30">
                                                            <span className="text-sm font-bold text-slate-200">Service Voucher Shared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.ackVoucher} onChange={(e) => handleFieldChange('ackVoucher', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded border border-slate-700/30">
                                                            <span className="text-sm font-bold text-slate-200">Briefing Completed</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.ackBriefing} onChange={(e) => handleFieldChange('ackBriefing', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Briefing Conducted By</label>
                                                            <CustomSelect value={selectedLeadForEdit.ackBriefingBy} onChange={(v) => handleFieldChange('ackBriefingBy', v)} className={selectCls} placeholder="Name Dropdown" options={['Operations Manager', 'Sales Exec', 'Customer Success']} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Briefing Date & Time</label>
                                                            <DatePickerField type="datetime-local" value={selectedLeadForEdit.ackBriefingDate} onChange={(e) => handleFieldChange('ackBriefingDate', e.target.value)} className={inputCls} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-200 mb-1">Remarks</label>
                                                    <textarea rows="2" placeholder="Text Area" value={selectedLeadForEdit.ackRemarks} onChange={(e) => handleFieldChange('ackRemarks', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Department Clearance */}
                                        <div className={sectionCls} style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                                            <h3 className={`${sectionHeadCls} text-sky-400 border-sky-900/50`}>Department Clearance</h3>
                                            <div className="space-y-6">
                                                
                                                {/* Operations (Manual) */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-bold text-white mb-2">Operations</h4>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Services Confirmed</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrOpsServices} onChange={(e) => handleFieldChange('clrOpsServices', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Documents Verified</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrOpsDocs} onChange={(e) => handleFieldChange('clrOpsDocs', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                    </div>
                                                    <div className="h-full pt-1">
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Remarks</label>
                                                        <textarea rows="3" placeholder="Text Area" value={selectedLeadForEdit.clrOpsRemarks} onChange={(e) => handleFieldChange('clrOpsRemarks', e.target.value)} className={inputCls} />
                                                    </div>
                                                </div>

                                                {/* Finance */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start border-t border-slate-700/50 pt-6">
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-bold text-white mb-2 flex justify-between">Finance <span className="text-[10px] text-slate-500 normal-case font-normal bg-slate-800 px-1 rounded">Autofetch</span></h4>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Payment Cleared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrFinPayment} onChange={(e) => handleFieldChange('clrFinPayment', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Supplier Payments Cleared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrFinSupplier} onChange={(e) => handleFieldChange('clrFinSupplier', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                    </div>
                                                    <div className="h-full pt-1">
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Remarks</label>
                                                        <textarea rows="3" placeholder="Remarks" value={selectedLeadForEdit.clrFinRemarks || ''} onChange={(e) => handleFieldChange('clrFinRemarks', e.target.value)} className={inputCls} />
                                                    </div>
                                                </div>

                                                {/* Operations Manager Approval */}
                                                <div className="space-y-4 border-t border-slate-700/50 pt-6">
                                                    <h4 className="text-sm font-bold text-white mb-2 flex justify-between">Operations Manager Approval <span className="text-[10px] text-slate-500 normal-case font-normal bg-slate-800 px-1 rounded">Autofetch</span></h4>
                                                    <label className="flex items-center justify-between max-w-sm cursor-pointer group">
                                                        <span className="text-sm font-bold text-slate-200">Final Review Completed</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.clrMgrReview} onChange={(e) => handleFieldChange('clrMgrReview', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                    </label>
                                                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/50 p-4 border border-slate-700 rounded-lg">
                                                        <p className="text-xs text-slate-400 italic flex-1">
                                                            All travel services, documents, payments, and client communication have been completed and approved for travel.
                                                        </p>
                                                        <label className="flex items-center gap-2 shrink-0 bg-green-950/30 px-3 py-2 rounded border border-green-900/50 cursor-pointer">
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrReadyDeparture} onChange={(e) => handleFieldChange('clrReadyDeparture', e.target.checked)} className="w-4 h-4 rounded text-green-500" />
                                                            <span className="text-sm font-bold text-green-400">Ready for Departure</span>
                                                        </label>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>

                                    </div>
                                ) : (
                                    /* ───────────────────────────────────────────── */
                                    /* DOMESTIC FORM                                 */
                                    /* ───────────────────────────────────────────── */
                                    <div className="space-y-8">
                                        {/* Header Info Grid (FETCHED / READ ONLY) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Lead Id</label><input type="text" readOnly value={`LMN${selectedLeadForEdit.id}`} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Customer Name</label><input type="text" readOnly value={selectedLeadForEdit.customerName} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Destination</label><input type="text" readOnly value={selectedLeadForEdit.destination} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Travel Date</label><input type="text" readOnly value={selectedLeadForEdit.travelDate} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Return Date</label><input type="text" readOnly value={selectedLeadForEdit.returnDate || 'N/A'} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">No. Of Pax</label><input type="text" readOnly value={selectedLeadForEdit.noOfPax || 'N/A'} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Sales Executive</label><input type="text" readOnly value={selectedLeadForEdit.salesExecutive} className={readonlyCls} /></div>
                                            <div><label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Operations Executive</label><input type="text" readOnly value={selectedLeadForEdit.operationsExecutive} className={readonlyCls} /></div>
                                        </div>

                                        {/* Document Completed (MANUAL) */}
                                        <div className="flex items-center gap-4 border-b border-slate-700/50 pb-4">
                                            <h3 className="text-cyan-400 font-bold whitespace-nowrap">Document Completed</h3>
                                            <div className="flex flex-col">
                                                <CustomSelect value={selectedLeadForEdit.docCompleted} onChange={(v) => handleFieldChange('docCompleted', v)} className={`${selectCls} max-w-xs`} placeholder="Select" options={['Pending', 'Partial', 'Completed']} />
                                                <span className="text-[10px] text-slate-500 mt-1">checklist</span>
                                            </div>
                                        </div>

                                        {/* Transport Details */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} flex items-center gap-2`}>Transport Details <span className="text-[10px] text-slate-500 normal-case font-medium ml-2">View Only</span></h3>
                                            
                                            {/* Fetched Transports Map */}
                                            <div className="space-y-6">
                                                {selectedLeadForEdit.domTransports?.map((trans, idx) => {
                                                    const type = trans.transportType || '';
                                                    return (
                                                        <div key={idx} className="space-y-6 mb-6 border-b border-slate-700/30 pb-6 last:border-0 last:mb-0 last:pb-0">
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                <div><label className="block text-xs text-slate-500 font-bold mb-1">Transport Mode</label><input type="text" readOnly value={type} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs text-slate-500 font-bold mb-1">Booking Status</label><input type="text" readOnly value={trans.bookingStatus || ''} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs text-slate-500 font-bold mb-1">Ticket Shared to Client</label><input type="text" readOnly value={trans.ticketSharedToClient || ''} className={readonlyCls} /></div>
                                                            </div>

                                                            {type === 'Flight' && (
                                                                <div className="space-y-6">
                                                                    <p className="text-sm font-bold text-red-500">If Flight</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                                                                        <span className="text-sm text-slate-400 font-bold">Onward</span>
                                                                        <input type="text" readOnly value={trans.flight?.onward?.depDateTime || ''} className={readonlyCls} placeholder="Date & Time" />
                                                                        <input type="text" readOnly value={trans.flight?.onward?.from || ''} className={readonlyCls} placeholder="Boarding Point" />
                                                                        <input type="text" readOnly value={trans.flight?.onward?.to || ''} className={readonlyCls} placeholder="Deboarding Point" />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                                                                        <span className="text-sm text-slate-400 font-bold">Return</span>
                                                                        <input type="text" readOnly value={trans.flight?.return?.depDateTime || ''} className={readonlyCls} placeholder="Date & Time" />
                                                                        <input type="text" readOnly value={trans.flight?.return?.from || ''} className={readonlyCls} placeholder="Boarding Point" />
                                                                        <input type="text" readOnly value={trans.flight?.return?.to || ''} className={readonlyCls} placeholder="Deboarding Point" />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {type === 'Bus' && (
                                                                <div className="space-y-6">
                                                                    <p className="text-sm font-bold text-red-500">If Bus</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                                                                        <span className="text-sm text-slate-400 font-bold">Onward</span>
                                                                        <input type="text" readOnly value={trans.bus?.onward?.travelDateTime || ''} className={readonlyCls} placeholder="Departure Date & Time" />
                                                                        <input type="text" readOnly value={trans.bus?.onward?.boardingPoint || ''} className={readonlyCls} placeholder="Boarding Point" />
                                                                        <input type="text" readOnly value={trans.bus?.onward?.destination || ''} className={readonlyCls} placeholder="Deboarding Point" />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                                                                        <span className="text-sm text-slate-400 font-bold">Return</span>
                                                                        <input type="text" readOnly value={trans.bus?.return?.travelDateTime || ''} className={readonlyCls} placeholder="Departure Date & Time" />
                                                                        <input type="text" readOnly value={trans.bus?.return?.boardingPoint || ''} className={readonlyCls} placeholder="Boarding Point" />
                                                                        <input type="text" readOnly value={trans.bus?.return?.destination || ''} className={readonlyCls} placeholder="Deboarding Point" />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {type === 'Train' && (
                                                                <div className="space-y-6">
                                                                    <p className="text-sm font-bold text-red-500">If Train</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                                                                        <span className="text-sm text-slate-400 font-bold">Onward</span>
                                                                        <input type="text" readOnly value={trans.train?.onward?.trainName || ''} className={readonlyCls} placeholder="Train Name" />
                                                                        <input type="text" readOnly value={trans.train?.onward?.trainNo || ''} className={readonlyCls} placeholder="Train Number" />
                                                                        <input type="text" readOnly value={trans.train?.onward?.date || ''} className={readonlyCls} placeholder="Date & Time" />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center -mt-2">
                                                                        <span></span>
                                                                        <input type="text" readOnly value={trans.train?.onward?.boardingStation || ''} className={readonlyCls} placeholder="Boarding Station" />
                                                                        <input type="text" readOnly value={trans.train?.onward?.deboardingStation || trans.train?.onward?.destination || ''} className={readonlyCls} placeholder="Deboarding Station" />
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                                                                        <span className="text-sm text-slate-400 font-bold">Return</span>
                                                                        <input type="text" readOnly value={trans.train?.return?.trainName || ''} className={readonlyCls} placeholder="Train Name" />
                                                                        <input type="text" readOnly value={trans.train?.return?.trainNo || ''} className={readonlyCls} placeholder="Train Number" />
                                                                        <input type="text" readOnly value={trans.train?.return?.date || ''} className={readonlyCls} placeholder="Date & Time" />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center -mt-2">
                                                                        <span></span>
                                                                        <input type="text" readOnly value={trans.train?.return?.boardingStation || ''} className={readonlyCls} placeholder="Boarding Station" />
                                                                        <input type="text" readOnly value={trans.train?.return?.deboardingStation || trans.train?.return?.destination || ''} className={readonlyCls} placeholder="Deboarding Station" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Manual Global Transport Additions (Always shows, matching the spreadsheet) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 mt-6 border-t border-slate-700/30">
                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-bold text-white border border-slate-700 px-3 py-2 bg-slate-800 rounded">Baggage Details</h4>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Baggage Required</label>
                                                        <CustomSelect value={selectedLeadForEdit.flBaggageReq} onChange={(v) => handleFieldChange('flBaggageReq', v)} className={selectCls} placeholder="Select" options={['Yes', 'No', 'Yes, Only for return']} />
                                                        <p className="text-[10px] text-slate-500 mt-1">Yes / No / Yes, Only for return</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Booked By</label>
                                                        <CustomSelect value={selectedLeadForEdit.flBaggageBookedBy} onChange={(v) => handleFieldChange('flBaggageBookedBy', v)} className={selectCls} placeholder="Select" options={['Client', 'Team']} />
                                                        <p className="text-[10px] text-slate-500 mt-1">Client / Team</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Baggage Status</label>
                                                        <CustomSelect value={selectedLeadForEdit.flBaggageStatus} onChange={(v) => handleFieldChange('flBaggageStatus', v)} className={selectCls} placeholder="Select" options={['Not Required', 'Pending', 'Added']} />
                                                        <p className="text-[10px] text-slate-500 mt-1">Not Required / Pending / Added</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Baggage Kg</label>
                                                        <CustomSelect value={selectedLeadForEdit.flBaggageKg} onChange={(v) => handleFieldChange('flBaggageKg', v)} className={selectCls} placeholder="Select" options={['15 Kg', '20 Kg', '25 Kg', '30 Kg']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Boarding Pass Support</label>
                                                        <input type="text" placeholder="Enter details" value={selectedLeadForEdit.flBaggageSupport} onChange={(e) => handleFieldChange('flBaggageSupport', e.target.value)} className={inputCls} />
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-bold text-white border border-slate-700 px-3 py-2 bg-slate-800 rounded">Seat Selection</h4>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Seat Preference</label>
                                                        <CustomSelect value={selectedLeadForEdit.flSeatPref} onChange={(v) => handleFieldChange('flSeatPref', v)} className={selectCls} placeholder="Select" options={['Window', 'Aisle', 'Middle']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Seat Selected By</label>
                                                        <CustomSelect value={selectedLeadForEdit.flSeatBookedBy} onChange={(v) => handleFieldChange('flSeatBookedBy', v)} className={selectCls} placeholder="Select" options={['Client', 'Team']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Booking Status</label>
                                                        <CustomSelect value={selectedLeadForEdit.flSeatStatus} onChange={(v) => handleFieldChange('flSeatStatus', v)} className={selectCls} placeholder="Select" options={['Not Required', 'Pending', 'Reserved']} />
                                                        <p className="text-[10px] text-slate-500 mt-1">Not Required / Pending / Reserved</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-bold text-white border border-slate-700 px-3 py-2 bg-slate-800 rounded">Meal Preference</h4>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Meal Required</label>
                                                        <CustomSelect value={selectedLeadForEdit.flMealReq} onChange={(v) => handleFieldChange('flMealReq', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                        <p className="text-[10px] text-slate-500 mt-1">Yes/ No</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Meal Type</label>
                                                        <CustomSelect value={selectedLeadForEdit.flMealType} onChange={(v) => handleFieldChange('flMealType', v)} className={selectCls} placeholder="Select" options={['Veg', 'Non-Veg', 'Special']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Meal Booked By</label>
                                                        <CustomSelect value={selectedLeadForEdit.flMealBookedBy} onChange={(v) => handleFieldChange('flMealBookedBy', v)} className={selectCls} placeholder="Select" options={['Client', 'Team']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Meal Status</label>
                                                        <CustomSelect value={selectedLeadForEdit.flMealStatus} onChange={(v) => handleFieldChange('flMealStatus', v)} className={selectCls} placeholder="Select" options={['Pending', 'Confirmed']} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 mt-6 border-t border-slate-700/30">
                                                <label className="block text-xs font-bold text-slate-200 mb-1">Special Instructions</label>
                                                <input type="text" placeholder="on whole for Transport" value={selectedLeadForEdit.flSpecialInst} onChange={(e) => handleFieldChange('flSpecialInst', e.target.value)} className={inputCls} />
                                            </div>
                                        </div>

                                        {/* Travel Insurance */}
                                        {selectedLeadForEdit.insRequired === 'Yes' && (
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Travel Insurance <span className="text-[10px] text-slate-500 normal-case ml-2 font-medium">If they chosen "Yes" Under Insurance required, this part will appear</span></h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Insurance Issued</label>
                                                        <CustomSelect value={selectedLeadForEdit.insIssued} onChange={(v) => handleFieldChange('insIssued', v)} className={selectCls} placeholder="Select" options={['Pending', 'Issued']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Policy Shared To Client</label>
                                                        <CustomSelect value={selectedLeadForEdit.insPolicyShared} onChange={(v) => handleFieldChange('insPolicyShared', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hotel Fulfilment */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Hotel Fulfilment</h3>
                                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 mb-2 px-2">
                                                <div className="col-span-6">Hotel Names | Location <span className="text-[10px] font-normal lowercase">(Fetched)</span></div>
                                                <div className="col-span-3 text-center">Confirmed</div>
                                                <div className="col-span-3 text-center">Voucher Shared</div>
                                            </div>
                                            <div className="space-y-3">
                                                {selectedLeadForEdit.domHotels?.map((hotel, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                                        <div className="col-span-6 flex gap-2">
                                                            <span className="text-slate-500 text-xs mt-2 w-12">Hotel {idx+1}</span>
                                                            <input type="text" readOnly value={`${hotel.hotelName || 'TBD'} | ${hotel.location || 'TBD'}`} className={readonlyCls} style={{textAlign: 'left'}} />
                                                        </div>
                                                        <div className="col-span-3 flex justify-center">
                                                            <input type="checkbox" checked={hotel.confirmed} onChange={(e) => handleHotelChange('domHotels', idx, 'confirmed', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 cursor-pointer" />
                                                        </div>
                                                        <div className="col-span-3 flex justify-center">
                                                            <input type="checkbox" checked={hotel.voucherShared} onChange={(e) => handleHotelChange('domHotels', idx, 'voucherShared', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Local Transport */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} flex items-center justify-between`}>Local Transport <span className="text-[10px] text-slate-500 normal-case">View</span></h3>
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-4 cursor-pointer group hover:bg-slate-800/50 p-2 rounded max-w-sm">
                                                    <span className="text-sm font-bold text-slate-200 w-40">Vehicle Assigned</span>
                                                    <input type="checkbox" checked={selectedLeadForEdit.locTransVehicleAssigned} onChange={(e) => handleFieldChange('locTransVehicleAssigned', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                </label>
                                                <label className="flex items-center gap-4 cursor-pointer group hover:bg-slate-800/50 p-2 rounded max-w-sm">
                                                    <span className="text-sm font-bold text-slate-200 w-40">Driver Details Shared</span>
                                                    <input type="checkbox" checked={selectedLeadForEdit.locTransDriverDetailsShared} onChange={(e) => handleFieldChange('locTransDriverDetailsShared', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                </label>
                                                <label className="flex items-center gap-4 cursor-pointer group hover:bg-slate-800/50 p-2 rounded max-w-sm">
                                                    <span className="text-sm font-bold text-slate-200 w-40">Driver Contact Shared</span>
                                                    <input type="checkbox" checked={selectedLeadForEdit.locTransDriverContactShared} onChange={(e) => handleFieldChange('locTransDriverContactShared', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Special Requirements */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Special Requirements</h3>
                                            <p className="text-xs text-slate-400 mb-4 flex gap-2 flex-wrap items-center">
                                                Chosen Options Will Appear: 
                                                {specialReqOptions.filter(r => selectedLeadForEdit[r.id]).length > 0 ? (
                                                    specialReqOptions.filter(r => selectedLeadForEdit[r.id]).map(r => (
                                                        <span key={r.id} className="bg-slate-800 px-2 py-1 rounded text-cyan-400 font-bold">{r.label}</span>
                                                    ))
                                                ) : (
                                                    <span className="bg-slate-800 px-2 py-1 rounded">None selected</span>
                                                )}
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-200 mb-1">Requirement Status</label>
                                                    <input type="text" placeholder="Enter status" value={selectedLeadForEdit.domSpecialReqStatus} onChange={(e) => handleFieldChange('domSpecialReqStatus', e.target.value)} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-200 mb-1">Pending / Completed</label>
                                                    <CustomSelect value={selectedLeadForEdit.domSpecialReqCompleted} onChange={(v) => handleFieldChange('domSpecialReqCompleted', v)} className={selectCls} placeholder="Select" options={['Pending', 'Completed']} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Clearance */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} flex items-center gap-2`}>Payment Clearance <span className="text-[10px] text-slate-500 normal-case ml-2 font-medium">automatic</span></h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-slate-500 font-bold mb-1">Client Payment Status</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.clientPayStatus || 'Cleared'} className={`${readonlyCls} text-left`} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 font-bold mb-1">Payment to Vendor</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.vendorPayStatus || 'Pending'} className={`${readonlyCls} text-left`} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer Acknowledgement */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Customer Acknowledgement</h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <label className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded border border-slate-700/30">
                                                            <span className="text-sm font-bold text-slate-200">Finalised Itinerary Shared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.ackItinerary} onChange={(e) => handleFieldChange('ackItinerary', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded border border-slate-700/30">
                                                            <span className="text-sm font-bold text-slate-200">Service Voucher Shared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.ackVoucher} onChange={(e) => handleFieldChange('ackVoucher', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group hover:bg-slate-800/50 p-2 rounded border border-slate-700/30">
                                                            <span className="text-sm font-bold text-slate-200">Briefing Completed</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.ackBriefing} onChange={(e) => handleFieldChange('ackBriefing', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
                                                        </label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Briefing Conducted By</label>
                                                            <CustomSelect value={selectedLeadForEdit.ackBriefingBy} onChange={(v) => handleFieldChange('ackBriefingBy', v)} className={selectCls} placeholder="Name Dropdown" options={['Operations Manager', 'Sales Exec', 'Customer Success']} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-200 mb-1">Briefing Date & Time</label>
                                                            <DatePickerField type="datetime-local" value={selectedLeadForEdit.ackBriefingDate} onChange={(e) => handleFieldChange('ackBriefingDate', e.target.value)} className={inputCls} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-200 mb-1">Remarks</label>
                                                    <textarea rows="2" placeholder="Text Area" value={selectedLeadForEdit.ackRemarks} onChange={(e) => handleFieldChange('ackRemarks', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Department Clearance */}
                                        <div className={sectionCls} style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                                            <h3 className={`${sectionHeadCls} text-sky-400 border-sky-900/50`}>Department Clearance</h3>
                                            <div className="space-y-6">
                                                
                                                {/* Operations (Manual) */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-bold text-white mb-2">Operations</h4>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Services Confirmed</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrOpsServices} onChange={(e) => handleFieldChange('clrOpsServices', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Documents Verified</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrOpsDocs} onChange={(e) => handleFieldChange('clrOpsDocs', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                    </div>
                                                    <div className="h-full pt-1">
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Remarks</label>
                                                        <textarea rows="3" placeholder="Text Area" value={selectedLeadForEdit.clrOpsRemarks} onChange={(e) => handleFieldChange('clrOpsRemarks', e.target.value)} className={inputCls} />
                                                    </div>
                                                </div>

                                                {/* Finance */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start border-t border-slate-700/50 pt-6">
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-bold text-white mb-2 flex justify-between">Finance <span className="text-[10px] text-slate-500 normal-case font-normal bg-slate-800 px-1 rounded">Autofetch</span></h4>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Payment Cleared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrFinPayment} onChange={(e) => handleFieldChange('clrFinPayment', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                        <label className="flex items-center justify-between cursor-pointer group">
                                                            <span className="text-sm font-bold text-slate-200">Supplier Payments Cleared</span>
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrFinSupplier} onChange={(e) => handleFieldChange('clrFinSupplier', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                        </label>
                                                    </div>
                                                    <div className="h-full pt-1">
                                                        <label className="block text-xs font-bold text-slate-200 mb-1">Remarks</label>
                                                        <textarea rows="3" placeholder="Remarks" value={selectedLeadForEdit.clrFinRemarks || ''} onChange={(e) => handleFieldChange('clrFinRemarks', e.target.value)} className={inputCls} />
                                                    </div>
                                                </div>

                                                {/* Operations Manager Approval */}
                                                <div className="space-y-4 border-t border-slate-700/50 pt-6">
                                                    <h4 className="text-sm font-bold text-white mb-2 flex justify-between">Operations Manager Approval <span className="text-[10px] text-slate-500 normal-case font-normal bg-slate-800 px-1 rounded">Autofetch</span></h4>
                                                    <label className="flex items-center justify-between max-w-sm cursor-pointer group">
                                                        <span className="text-sm font-bold text-slate-200">Final Review Completed</span>
                                                        <input type="checkbox" checked={selectedLeadForEdit.clrMgrReview} onChange={(e) => handleFieldChange('clrMgrReview', e.target.checked)} className="w-4 h-4 rounded border-slate-600 text-cyan-500" />
                                                    </label>
                                                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/50 p-4 border border-slate-700 rounded-lg">
                                                        <p className="text-xs text-slate-400 italic flex-1">
                                                            All travel services, documents, payments, and client communication have been completed and approved for travel.
                                                        </p>
                                                        <label className="flex items-center gap-2 shrink-0 bg-green-950/30 px-3 py-2 rounded border border-green-900/50 cursor-pointer">
                                                            <input type="checkbox" checked={selectedLeadForEdit.clrReadyDeparture} onChange={(e) => handleFieldChange('clrReadyDeparture', e.target.checked)} className="w-4 h-4 rounded text-green-500" />
                                                            <span className="text-sm font-bold text-green-400">Ready for Departure</span>
                                                        </label>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 px-6 py-4 flex-shrink-0 bg-[#0b1329]">
                                <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="px-5 py-2 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded cursor-pointer uppercase tracking-wider">CANCEL</button>
                                <button type="submit" className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded shadow cursor-pointer uppercase tracking-wider">SAVE FULFILLMENT</button>
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