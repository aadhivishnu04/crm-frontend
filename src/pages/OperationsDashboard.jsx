import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Eye, Pencil, Clock, CheckSquare, ArrowUpDown, History,
    Search, SlidersHorizontal, MapPin, Calendar,
    ShoppingCart, Target, X, Send, AlertCircle, CheckCircle2,
    Mic, Trash2, Layers, BookmarkCheck, PlaneTakeoff, Info,
    Briefcase, FileText, Activity, ShieldCheck, Share2, Play, Square, Plus,
    ChevronLeft, ChevronRight, ArrowUp, Copy, ChevronDown
} from 'lucide-react';
import { getCurrentUser } from '../utils/auth';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

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

// ─── DYNAMIC MESSAGE GENERATOR FOR VENDOR ASSISTANCE ──────────────────────────
const generateVendorMessage = (req, lead) => {
    const contact = req.vendorContactPerson || '[Contact Person - Vendor Assistance]';
    const dest = lead.destination || '[Destination - Vendor Assistance]';
    const pkg = lead.packageType || lead.tourType || '[Package Type - Lead Info]';
    const tDate = lead.travelDate || lead.travelDates || '[Travel Date - Destination Request]';
    const dur = lead.duration || '[Duration - Destination Request]';
    const paxA = lead.noOfAdults || '[No. of Adults - Destination Request]';
    const paxC = lead.noOfChildren || '[No. of Children - Destination Request]';
    const hotel = lead.hotelCategory || '[Hotel Category - Destination Request]';
    const vType = req.vendorVisaType || '[VISA Type]';
    const srv = req.vendorService;

    // New specific fields
    const checkIn = req.vendorCheckInDate || '[Check-in Date - Vendor Assistance]';
    const checkOut = req.vendorCheckOutDate || '[Check-out Date - Vendor Assistance]';
    const roomsReq = req.vendorRoomsRequired || '[Rooms Required - Vendor Assistance]';
    const vehType = req.vendorVehicleType || '[Vehicle Type]';
    const pickup = req.vendorPickupLocation || '[Pickup Location]';
    const drop = req.vendorDropLocation || '[Drop Location]';

    if (!srv) return '';

    let msg = `Hi ${contact},\n\nGreetings from iTour!\n\n`;

    const pTypeLower = pkg.toLowerCase();
    const isCorporate = pTypeLower.includes('corporate') || pTypeLower.includes('mice');

    if (srv === 'Complete Package') {
        msg += `Please share your best quotation for the following travel requirement.\n\n`;
        msg += `TRAVEL REQUIREMENTS\n\n`;
        msg += `Destination: ${dest}\n`;
        msg += `Package Type: ${pkg}\n`;
        msg += `Travel Dates: ${tDate}\n`;
        msg += `Duration: ${dur}\n`;
        msg += `Travellers: ${paxA} Adults | ${paxC} Children\n`;
        msg += `Hotel Category: ${hotel}\n\n`;

        msg += `Please provide a complete package excluding flights, including:\n`;
        msg += `• Airport Transfers\n• Hotel Accommodation\n• Local Transfers\n`;
        msg += isCorporate ? `• Sightseeing / Business Transfers (as applicable)\n` : `• Sightseeing\n`;
        msg += `• Applicable Taxes (if any)\n\n`;

        if (pTypeLower.includes('honeymoon')) {
            msg += `HONEYMOON PREFERENCES\n\nKindly suggest honeymoon-friendly hotels/resorts and include honeymoon inclusions wherever available, such as:\n\n• Honeymoon Room Decoration\n• Candlelight Dinner\n• Honeymoon Cake\n• Complimentary Honeymoon Benefits\n• Romantic Experiences (if available)\n\nPlease mention any complimentary inclusions or paid upgrade options separately.\n\n`;
        } else if (pTypeLower.includes('family')) {
            msg += `FAMILY PREFERENCES\n\nKindly suggest family-friendly hotels and include suitable room options for the mentioned travellers. Consider\n\n• Family-friendly accommodation\n• Interconnecting / Family Rooms (if available)\n• Child-friendly sightseeing and activities (if applicable)\n• Comfortable transfers suitable for the group\n• Hotels with good amenities for families\n\nPlease mention any complimentary inclusions or paid upgrade options separately.\n\n`;
        } else if (isCorporate) {
            msg += `CORPORATE REQUIREMENTS\n\nKindly suggest family-friendly hotels and include suitable room options for the mentioned travellers. Consider\n\n• Business hotels in convenient locations\n• Early Check-in / Late Check-out (subject to availability)\n• Reliable airport and local transfers\n• Flexible cancellation or amendment policy (if available)\n\nPlease mention any complimentary inclusions or paid upgrade options separately.\n\n`;
        }

        msg += `Kindly Share\n\n• Detailed Day-wise Itinerary\n• Hotel Options\n• Package Inclusions\n• Package Exclusions\n• Cancellation Policy\n• Quotation\n\n`;

    } else if (srv === 'Land Only') {
        msg += `Please share your best quotation for the following travel requirement.\n\n`;
        msg += `TRAVEL REQUIREMENTS\n\n`;
        msg += `Destination: ${dest}\n`;
        msg += `Package Type: ${pkg}\n`;
        msg += `Travel Dates: ${tDate}\n`;
        msg += `Duration: ${dur}\n`;
        msg += `Travellers: ${paxA} Adults | ${paxC} Children\n\n`;

        msg += `Please provide a complete package excluding flights, including:\n`;
        msg += `• Airport Transfers\n• Local Transfers\n• Sightseeing\n• Applicable Taxes (if any)\n\n`;

        msg += `Kindly Share\n\n• Detailed Day-wise Itinerary\n• Hotel Options\n• Package Inclusions\n• Package Exclusions\n• Cancellation Policy\n• Quotation\n\n`;

    } else if (srv === 'VISA') {
        msg += `Please share your best quotation for the following VISA requirement.\n\n`;
        msg += `Destination: ${dest}\n\n`;
        msg += `VISA Type: ${vType}\n\n`;
        msg += `Duration: ${dur}\n\n`;
        msg += `Travel Dates: ${tDate}\n\n`;
        msg += `Travellers: ${paxA} Adults | ${paxC} Children\n\n`;
        msg += `Kindly Share:\n\n• VISA Charges\n• Required Documents\n• Processing Time\n• Validity\n• Appointment Requirement (if applicable)\n• Terms & Conditions\n\n`;

    } else if (srv === 'Insurance') {
        msg += `Please share your best quotation for Travel Insurance for below requirement.\n\n`;
        msg += `Destination: ${dest}\n\n`;
        msg += `Duration: ${dur}\n\n`;
        msg += `Travel Dates: ${tDate}\n\n`;
        msg += `Travellers: ${paxA} Adults | ${paxC} Children\n\n`;
        msg += `Kindly Share:\n\n• Insurance Plan Details\n• Coverage\n• Premium Amount\n• Policy Validity\n• Claim Process\n\n`;

    } else if (srv === 'Hotel Only') {
        msg += `Please share your best quotation for the following hotel requirement.\n\n`;
        msg += `HOTEL REQUIREMENTS\n\n`;
        msg += `Destination: ${dest}\n`;
        msg += `Package Type: ${pkg}\n`;
        msg += `Check-in Date: ${checkIn}\n`;
        msg += `Check-out Date: ${checkOut}\n`;
        msg += `Duration: ${dur}\n`;
        msg += `Travellers: ${paxA} Adults\n`;
        msg += `Hotel Category: ${hotel}\n`;
        msg += `Rooms Required: ${roomsReq}\n\n`;

        msg += `Kindly Share\n\n• Hotel Name & Category\n• Room Type\n• Meal Plan\n• Room Inclusions\n• Check-in & Check-out Time\n• Cancellation Policy\n• B2B Net Rate\n• Payment Terms\n\n`;
        msg += `Please mention any complimentary inclusions or paid upgrade options separately.\n\n`;

    } else if (srv === 'Vehicle Only') {
        msg += `Please share your best quotation for the following travel requirement.\n\n`;
        msg += `TRAVEL REQUIREMENTS\n\n`;
        msg += `Destination: ${dest}\n`;
        msg += `Package Type: ${pkg}\n`;
        msg += `Travel Dates: ${tDate}\n`;
        msg += `Duration: ${dur}\n`;
        msg += `Travellers: ${paxA} Adults\n\n`;
        msg += `Vehicle Type: ${vehType}\n`;
        msg += `Pickup Location: ${pickup}\n`;
        msg += `Drop Location: ${drop}\n\n`;

        msg += `Kindly Share\n\n• Vehicle Type & Model\n• Vehicle Capacity\n• Service Type (Private / SIC)\n• Airport Transfer / Disposal Details (if applicable)\n• Driver Allowance (if applicable)\n• Toll & Parking Charges (if applicable)\n• Inclusions & Exclusions\n• Cancellation Policy\n• B2B Quotation\n\n`;
    
    } else if (srv === 'Others') {
        msg += `Please share your best quotation for the following custom travel requirement.\n\n`;
        msg += `Destination: ${dest}\n`;
        msg += `Travel Dates: ${tDate}\n`;
        msg += `Duration: ${dur}\n`;
        msg += `Travellers: ${paxA} Adults | ${paxC} Children\n\n`;
        msg += `REQUIREMENTS:\n• [Enter custom requirements here]\n\n`;
    }

    msg += `Kindly share your best available rates at the earliest.\n\nThank you.\n\nRegards,`;
    return msg;
};

// ─────────────────────────────────────────────
// COMPONENT – Custom Select (with Manual Entry)
// ─────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, className, hideDefaultManual = false, manualTrigger = "__MANUAL__", placeholder = "" }) => {
    const normalizedOptions = options.map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt });
    const optionValues = normalizedOptions.map(opt => String(opt.value));
    
    const safeValue = value !== undefined && value !== null ? String(value) : '';
    
    const [isManual, setIsManual] = useState(safeValue !== "" && !optionValues.includes(safeValue));

    useEffect(() => {
        if (safeValue !== "" && !optionValues.includes(safeValue) && !isManual) {
            setIsManual(true);
        }
    }, [safeValue, optionValues, isManual]);

    if (isManual) {
        return (
            <div className="flex items-center gap-1.5 w-full transition-all">
                <input
                    type="text"
                    value={safeValue}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full bg-slate-900 border border-slate-700 rounded text-white text-sm font-bold focus:border-cyan-500 outline-none flex-1 min-w-[80px] ${className && className.includes('py-1.5') ? 'py-1.5 px-3' : 'py-2 px-3'}`}
                    autoFocus
                />
                <button
                    type="button"
                    onClick={() => { setIsManual(false); onChange(''); }}
                    className={`flex items-center justify-center bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded border border-slate-600 transition-colors flex-shrink-0 ${className && className.includes('py-1.5') ? 'p-1.5' : 'p-2'}`}
                    title="Cancel custom entry"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <select
            value={safeValue}
            onChange={(e) => {
                if (e.target.value === manualTrigger) {
                    setIsManual(true);
                    onChange('');
                } else {
                    onChange(e.target.value);
                }
            }}
            className={className}
        >
            <option value="" disabled hidden>{placeholder}</option>
            {normalizedOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
            {!hideDefaultManual && <option value={manualTrigger} className="font-bold text-cyan-400 bg-slate-800">+ Add Manual / Other</option>}
        </select>
    );
};

// ─────────────────────────────────────────────
// COMPONENT – Date/Time Picker Field
// ─────────────────────────────────────────────
const DatePickerField = ({ value, onChange, type = "date", readOnly = false, className }) => {
    const inputRef = useRef(null);
    const Icon = type === 'time' ? Clock : Calendar;

    return (
        <div
            className={`relative w-full flex items-center ${!readOnly ? 'cursor-pointer' : ''}`}
            onClick={() => {
                if (!readOnly && inputRef.current && inputRef.current.showPicker) {
                    try { inputRef.current.showPicker(); } 
                    catch (e) { inputRef.current.focus(); }
                }
            }}
        >
            <input
                ref={inputRef}
                type={type}
                value={value || ''}
                onChange={onChange}
                readOnly={readOnly}
                className={`${className} ${readOnly ? '' : 'cursor-pointer'} custom-date-input`}
                style={{ paddingRight: '2.5rem', colorScheme: 'dark' }} 
            />
            <Icon size={15} className={`absolute right-3 pointer-events-none ${readOnly ? 'text-slate-600' : 'text-cyan-500'}`} />
        </div>
    );
};

// ─────────────────────────────────────────────
// COMPONENT – Pagination
// ─────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange, totalEntries, entriesPerPage }) {
    const from = totalEntries > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0;
    const to = Math.min(currentPage * entriesPerPage, totalEntries);
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-700/20 gap-3">
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">Previous</button>
                {Array.from({ length: totalPages || 1 }, (_, i) => (
                    <button type="button" key={i + 1} onClick={() => onPageChange(i + 1)} className={`px-3 py-1.5 rounded text-xs border cursor-pointer font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-700 text-white' : 'border-slate-700 bg-transparent text-slate-400 hover:text-white'}`}>{i + 1}</button>
                ))}
                <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">Next</button>
            </div>
            <p className="text-xs text-slate-500">Showing {from}–{to} of {totalEntries} records</p>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function OperationsDashboard() {
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const triggerNotification = (type, message) => setNotification({ show: true, type, message });

    const copyToClipboard = (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => triggerNotification('success', 'Message format copied to clipboard!'))
                .catch(() => fallbackCopyText(text));
        } else {
            fallbackCopyText(text);
        }
    };

    const fallbackCopyText = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            triggerNotification('success', 'Message format copied to clipboard!');
        } catch (err) {
            triggerNotification('error', 'Failed to copy text. Browser blocked action.');
        }
        document.body.removeChild(textArea);
    };

    const user = getCurrentUser();
    const loggedInUserName = user?.name || 'Admin';
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    useEffect(() => {
        if (notification.show) {
            const t = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
            return () => clearTimeout(t);
        }
    }, [notification.show]);

    const [leads, setLeads] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('New Requests');
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState('All');

    const [selectedLeadForView, setSelectedLeadForView] = useState(null);
    const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
    const [leadToFulfill, setLeadToFulfill] = useState(null);
    
    const [operationsStaff, setOperationsStaff] = useState([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTo, setAssignTo] = useState('');
    const [selectedLeadForAssign, setSelectedLeadForAssign] = useState(null);

    // Accordion State for Operations Pipeline Edit
    const [openSections, setOpenSections] = useState({
        leadInfo: false,
        destinationRequest: false,
        operationsActivity: true, // Open by default
        vendorAssistance: false,
        itineraryPreparation: false,
        qualityCheck: false,
        clientStatus: false
    });

    const toggleSection = (sectionKey) => {
        setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    };

    const handleHeaderClick = (e, sectionKey) => {
        if (e.target.closest('button')) return;
        toggleSection(sectionKey);
    };

    const [activeModal, setActiveModal] = useState(null); 
    const [showScrollTop, setShowScrollTop] = useState(false);
    const mainRef = useRef(null);
    const tabScrollRef = useRef(null);

    useEffect(() => {
        const fetchStaffDirectory = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/employees`);
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

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/leads`);
            if (!res.ok) throw new Error(`HTTP state exception code: ${res.status}`);
            const data = await res.json();

            const mappedData = data.map(lead => {
                let parsedAudio = [];
                if (lead.voiceBinaryFile) {
                    try { parsedAudio = JSON.parse(lead.voiceBinaryFile); }
                    catch (e) { console.warn("Failed to parse audio"); }
                }
                return {
                    ...lead,
                    date: lead.travelDates || lead.date || 'TBD',
                    amount: lead.budget || lead.amount || 'TBD',
                    localVoiceRecordings: parsedAudio
                };
            });
            setLeads(mappedData);
        } catch (err) {
            console.error('Failed to sync via API route:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollTabs = (dir) => tabScrollRef.current && tabScrollRef.current.scrollBy({ left: dir * 160, behavior: 'smooth' });

    const getTabStatus = (rawStatus) => {
        if (['New Requests', 'Move To Operation', 'Customization Required', 'Customisation Ready', 'Pending'].includes(rawStatus)) return 'New Requests';
        if (['Ops Assigned', 'Follow-Up'].includes(rawStatus)) return 'Follow-Up';
        if (['Upcoming Departure', 'Upcoming Bookings'].includes(rawStatus)) return 'Upcoming Bookings';
        if (['Confirmed Bookings'].includes(rawStatus)) return 'Confirmed Bookings';
        return rawStatus || 'New Requests';
    };

    const expandedLeads = leads.flatMap(item => {
        let parsedRequests = [];
        if (item.customisationRequests) {
            try { 
                parsedRequests = typeof item.customisationRequests === 'string' 
                    ? JSON.parse(item.customisationRequests) 
                    : item.customisationRequests; 
            } catch { parsedRequests = []; }
        }

        if (parsedRequests && parsedRequests.length > 0) {
            return parsedRequests.map((req, index) => {
                let rawRowStatus = (req.status && req.status !== 'Pending') ? req.status : 'Pending';
                return {
                    ...item,
                    uniqueKey: `${item.id}-${index}`,
                    reqIndex: index,
                    rawRowStatus: rawRowStatus,
                    destination: req.destination || item.destination,
                    customisationType: req.customisationType || item.customisationType,
                    requirements: req.requirements || item.requirements,
                    turnaroundTime: req.turnaroundTime || req.requiredByDate || item.turnaroundTime,
                    assignedOps: req.assignedTo || item.operationExecutive || ''
                };
            });
        }

        return [{ 
            ...item, 
            uniqueKey: `${item.id}-0`, 
            reqIndex: 0, 
            rawRowStatus: item.status || 'New Requests',
            assignedOps: item.operationExecutive || ''
        }];
    });

    const isAuthorizedForOps = (l) => isAdmin || l.assignedOps === loggedInUserName || l.opsPreparedBy === loggedInUserName;

    const countNew = expandedLeads.filter(l => getTabStatus(l.rawRowStatus) === 'New Requests').length; 
    const countFollow = expandedLeads.filter(l => getTabStatus(l.rawRowStatus) === 'Follow-Up' && isAuthorizedForOps(l)).length;
    const countBooked = expandedLeads.filter(l => getTabStatus(l.rawRowStatus) === 'Confirmed Bookings' && isAuthorizedForOps(l)).length;
    const countUpcoming = expandedLeads.filter(l => {
        if (getTabStatus(l.rawRowStatus) !== 'Upcoming Bookings' || !isAuthorizedForOps(l)) return false;
        const travelDate = new Date(l.travelDate || l.travelDates || l.departureDate);
        const past15Days = new Date();
        past15Days.setDate(past15Days.getDate() - 15);
        return !isNaN(travelDate) && travelDate >= past15Days;
    }).length;

    const handleOpenAssignModal = (lead) => {
        setSelectedLeadForAssign(lead);
        setAssignTo('');
        setIsAssignModalOpen(true);
    };

    const handleAssignSubmit = async () => {
        if (!assignTo) { alert('Please select a team or choose self assignment.'); return; }
        
        const finalAssignee = assignTo === 'Self Assigned' ? loggedInUserName : assignTo;
        const leadId = selectedLeadForAssign.id;
        const reqIndex = selectedLeadForAssign.reqIndex;
        const targetStatus = 'Follow-Up';

        const originalLead = leads.find(l => l.id === leadId);
        if (!originalLead) return;

        let parsedRequests = [];
        try {
            parsedRequests = typeof originalLead.customisationRequests === 'string'
                ? JSON.parse(originalLead.customisationRequests)
                : (originalLead.customisationRequests || []);
        } catch(e) { parsedRequests = []; }

        if (parsedRequests.length > 0 && parsedRequests[reqIndex]) {
            parsedRequests[reqIndex].status = targetStatus;
            parsedRequests[reqIndex].assignedTo = finalAssignee;
        }

        const allProcessed = parsedRequests.every(r => r.status === 'Follow-Up' || r.status === 'Customisation Ready');

        const updatedData = {
            customisationRequests: JSON.stringify(parsedRequests),
            operationExecutive: finalAssignee,
            opsPreparedBy: finalAssignee,
            status: allProcessed ? targetStatus : originalLead.status
        };

        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedData } : l));

        try {
            await fetch(`${API_BASE_URL}/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            triggerNotification('success', `Request assigned to ${finalAssignee}.`);
            fetchLeads();
        } catch (err) {
            triggerNotification('success', `Request assigned (Simulation mode).`);
        }
        setIsAssignModalOpen(false);
        setSelectedLeadForAssign(null);
    };

    const handleSendToSalesReady = async (row) => {
        const leadId = row.id;
        const reqIndex = row.reqIndex;
        const targetStatus = 'Customisation Ready'; 

        const originalLead = leads.find(l => l.id === leadId);
        if (!originalLead) return;

        let parsedRequests = [];
        try {
            parsedRequests = typeof originalLead.customisationRequests === 'string'
                ? JSON.parse(originalLead.customisationRequests)
                : (originalLead.customisationRequests || []);
        } catch(e) { parsedRequests = []; }

        if (parsedRequests.length > 0 && parsedRequests[reqIndex]) {
            parsedRequests[reqIndex].status = targetStatus;
        }

        const updatedData = {
            customisationRequests: JSON.stringify(parsedRequests),
            status: targetStatus 
        };

        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedData } : l));

        try {
            const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!res.ok) throw new Error('Update failed');
            triggerNotification('success', `Pushed back to Sales successfully.`);
            fetchLeads();
        } catch (err) {
            triggerNotification('success', `Pushed back to Sales (Simulation mode).`);
        }
    };

    const updateLead = async (id, updatedData) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedData } : l));
        try {
            const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(updatedData),
            });
            
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            
            triggerNotification('success', 'Configuration update committed!');
            fetchLeads();
        } catch (err) {
            console.error("Save failed:", err);
            triggerNotification('error', 'Failed to sync! Data kept locally. Ensure schema matches fields.');
        }
    };

    const sendToFulfillment = async (lead) => {
        try {
            await fetch(`${API_BASE_URL}/leads/${lead.id}/assign`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Upcoming Departure' })
            });
            setLeads(prev => prev.filter(l => l.id !== lead.id));
            triggerNotification('success', 'Job profile transmitted to external fulfillment logs.');
        } catch (err) {
            setLeads(prev => prev.filter(l => l.id !== lead.id));
            triggerNotification('success', 'Job sent to fulfillment (simulation mode).');
        }
    };

    const handleTabChange = (tab) => { setActiveTab(tab); setCurrentPage(1); };
    const handleSearch = (val) => { setSearchQuery(val); setCurrentPage(1); };

    // --- FORM DATA HANDLERS ---
    const handleArrayChange = (arrayName, index, field, value) => {
        const newArray = [...selectedLeadForEdit[arrayName]];
        newArray[index] = { ...newArray[index], [field]: value };
        setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const addArrayItem = (arrayName, defaultObj) => {
        setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: [...(prev[arrayName] || []), defaultObj] }));
    };

    const removeArrayItem = (arrayName, index) => {
        const newArray = [...selectedLeadForEdit[arrayName]];
        newArray.splice(index, 1);
        setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const updateDomTransport = (index, field, value) => {
        const newTrans = [...selectedLeadForEdit.domTransports];
        newTrans[index][field] = value;
        setSelectedLeadForEdit({ ...selectedLeadForEdit, domTransports: newTrans });
    };

    const updateDomTransportNested = (index, mode, leg, field, value) => {
        const newTrans = JSON.parse(JSON.stringify(selectedLeadForEdit.domTransports));
        if (!newTrans[index][mode]) newTrans[index][mode] = { onward: {}, return: null };
        if (!newTrans[index][mode][leg]) newTrans[index][mode][leg] = {};
        newTrans[index][mode][leg][field] = value;
        setSelectedLeadForEdit({ ...selectedLeadForEdit, domTransports: newTrans });
    };

    const addDomTransportReturn = (index, mode) => {
        const newTrans = JSON.parse(JSON.stringify(selectedLeadForEdit.domTransports));
        newTrans[index][mode].return = {}; 
        setSelectedLeadForEdit({ ...selectedLeadForEdit, domTransports: newTrans });
    };

    const removeDomTransportReturn = (index, mode) => {
        const newTrans = JSON.parse(JSON.stringify(selectedLeadForEdit.domTransports));
        newTrans[index][mode].return = null;
        setSelectedLeadForEdit({ ...selectedLeadForEdit, domTransports: newTrans });
    };

    const safeParseArray = (val, defaultItem) => {
        let arr = [];
        if (val) {
            try { arr = typeof val === 'string' ? JSON.parse(val) : val; } catch(e){}
        }
        return Array.isArray(arr) && arr.length > 0 ? arr : [defaultItem];
    };

    const handleEditClick = (lead) => {
        let parsedCustomisationRequests = [];
        if (lead.customisationRequests) {
            try { 
                parsedCustomisationRequests = typeof lead.customisationRequests === 'string' 
                    ? JSON.parse(lead.customisationRequests) 
                    : lead.customisationRequests; 
            } catch { parsedCustomisationRequests = []; }
        }
        
        if (!parsedCustomisationRequests || parsedCustomisationRequests.length === 0) {
            parsedCustomisationRequests = [{
                destination: lead.destinationRequest || lead.destination || '', customisationType: lead.customisationType || '', requirements: lead.requirements || '',
                readymadePackageDetails: lead.readymadePackageDetails || '', turnaroundTime: lead.turnaroundTime || '', status: 'Pending'
            }];
        }

        let parsedVendorRequests = [];
        if (lead.vendorRequests) {
            try { parsedVendorRequests = typeof lead.vendorRequests === 'string' ? JSON.parse(lead.vendorRequests) : lead.vendorRequests; } catch(e){}
        }
        if (!parsedVendorRequests || parsedVendorRequests.length === 0) {
            if (lead.vendorService || lead.vendorDmcName || lead.vendorName) {
                parsedVendorRequests = [{
                    vendorService: lead.vendorService || '',
                    vendorDmcName: lead.vendorDmcName || lead.vendorName || '',
                    vendorContactPerson: lead.vendorContactPerson || '',
                    contactMethod: lead.contactMethod || '',
                    vendorVisaType: lead.vendorVisaType || '',
                    vendorCheckInDate: '',
                    vendorCheckOutDate: '',
                    vendorRoomsRequired: '',
                    vendorVehicleType: '',
                    vendorPickupLocation: '',
                    vendorDropLocation: '',
                    vendorMessage: lead.vendorMessage || ''
                }];
            } else {
                parsedVendorRequests = [{ 
                    vendorService: '', vendorDmcName: '', vendorContactPerson: '', contactMethod: '', vendorVisaType: '',
                    vendorCheckInDate: '', vendorCheckOutDate: '', vendorRoomsRequired: '', vendorVehicleType: '', vendorPickupLocation: '', vendorDropLocation: '', 
                    vendorMessage: '' 
                }];
            }
        }

        const passengers = safeParseArray(lead.passengers, { fullName: '', dob: '', gender: '', aadharNumber: '', panNumber: '', passportNumber: '', passportIssueDate: '', passportExpiryDate: '', passportIssuePlace: '', mobileNumber: '', emergencyContact: '' });
        const flights = safeParseArray(lead.flights, { flightType: '', flightResponsibility: '', bookingStatus: '', airline: '', pnr: '', bookedThrough: '', category: '', departureDateTime: '', boardingPoint: '', ticketShared: '', ticketSharedDate: '', deboardingPoint: '', flightCost: '', markupCost: '', driveLink: '' });
        const visas = safeParseArray(lead.visas, { destination: '', visaType: '', transitVisaReq: '', arrivalCardApplicable: '', arrivalCardDetails: '', appliedBy: '', docsPending: '', visaStatus: '', visaCopyShared: '', visaApprovalDate: '', visaExpiryDate: '', visaCost: '', markupCost: '' });
        const domTransports = safeParseArray(lead.domTransports, { transportType: '', bookedBy: '', bookingStatus: '', ticketSharedToClient: '', sharedDate: '', flight: { onward: {}, return: null }, train: { onward: {}, return: null }, bus: { onward: {}, return: null } });
        const domHotels = safeParseArray(lead.domHotels, { location: '', hotelName: '', hotelCategory: '', bookedBy: '', refNo: '', status: '', roomCategory: '', noOfRooms: '', addMattress: '', specifications: '', mealPlan: '', earlyCheckIn: '', checkInDateTime: '', checkOutDateTime: '', refreshmentRoom: '', cost: '', markup: '', paymentDueDate: '', attachVoucher: '', specialArrangements: '', notes: '' });
        const domLocalTransports = safeParseArray(lead.domLocalTransports, { serviceProvider: '', vehicleType: '', contactPerson: '', driverName: '', vehicleNumber: '', status: '', pickupPoint: '', pickupDate: '', duration: '', dropPoint: '', dropDate: '', tollParking: '', cost: '', markup: '', paymentDueDate: '', notes: '' });
        const paymentRequests = safeParseArray(lead.paymentRequests, { service: '', providerName: '', paymentDueDate: '', serviceCost: '', paymentType: '', amountToPay: '', paymentAccountDetails: '' });

        let calculatedPriority = lead.priority || 'Low';
        const today = new Date(); today.setHours(0,0,0,0);
        
        let earliestReqDate = null;
        if (parsedCustomisationRequests.length > 0) {
            const dates = parsedCustomisationRequests.map(req => new Date(req.turnaroundTime || req.requiredByDate)).filter(d => !isNaN(d.getTime()));
            if (dates.length > 0) earliestReqDate = new Date(Math.min(...dates));
        }
        
        const travelDate = new Date(lead.travelDate || lead.travelDates);
        
        if (earliestReqDate && !isNaN(earliestReqDate.getTime())) {
            const diffDaysReq = Math.ceil((earliestReqDate - today) / (1000 * 60 * 60 * 24));
            if (diffDaysReq <= 1) calculatedPriority = 'High';
            else if (diffDaysReq >= 2 && diffDaysReq <= 4) calculatedPriority = 'Medium';
            else if (diffDaysReq >= 5 && diffDaysReq <= 7) calculatedPriority = 'Low';
        }
        
        if (travelDate && !isNaN(travelDate.getTime())) {
            const diffDaysTravel = Math.ceil((travelDate - today) / (1000 * 60 * 60 * 24));
            if (diffDaysTravel <= 7) calculatedPriority = 'High';
        }

        setSelectedLeadForEdit({
            ...lead,
            customisationRequests: parsedCustomisationRequests,
            vendorRequests: parsedVendorRequests,
            customisationType: lead.customisationType || '', customerName: lead.customerName || lead.profileName || '', mobileNumber: lead.phone || lead.mobileNumber || '', salesExecutive: lead.salesExecutive || '',
            destinationRequest: lead.destinationRequest || '', tourType: getOperationTourType(lead), duration: lead.duration || '', noOfAdults: lead.noOfAdults || '', noOfChildren: lead.noOfChildren || '', hotelCategory: lead.hotelCategory || '',
            travelDate: lead.travelDate || lead.travelDates || '', travelMonth: lead.travelMonth || '', budget: lead.budget || lead.amount || '', readymadePackageDetails: lead.readymadePackageDetails || '',
            turnaroundTime: lead.turnaroundTime || '', salesRemarks: lead.salesRemarks || '', voiceNote: lead.voiceNote || '', destination: lead.destination || '', workType: lead.workType || '',
            priority: calculatedPriority, status: lead.status || '', activityType: lead.activityType || '', activityOutcome: lead.activityOutcome || '', notes: lead.notes || '',
            nextActionRequired: lead.nextActionRequired || '', nextActionDate: lead.nextActionDate || '', 
            
            preparationMethod: lead.preparationMethod || '', itineraryVersion: lead.itineraryVersion || '', workingNotes: lead.workingNotes || '', itineraryPrepDate: lead.itineraryPrepDate || '',
            qcStatus: lead.qcStatus || '', qcRemarks: lead.qcRemarks || '', reviewedBy: lead.reviewedBy || '', qcDate: lead.qcDate || '', salesAcknowledged: lead.salesAcknowledged || '', finalStatus: lead.finalStatus || '',
            salesFunnelLeadStatus: lead.salesFunnelLeadStatus || 'Pipeline Active', salesFunnelNotes: lead.salesFunnelNotes || '', localVoiceRecordings: lead.localVoiceRecordings || [], bookingDate: lead.bookingDate || '',
            packageCost: lead.packageCost || lead.amount || '', confirmationDate: lead.confirmationDate || '', 
            passengers, flights, visas, domTransports, domHotels, domLocalTransports, paymentRequests,
            docAadhar: lead.docAadhar || '', docPan: lead.docPan || '', docPhoto: lead.docPhoto || '', docPassport: lead.docPassport || '', docDriveLink: lead.docDriveLink || '', documentStatus: lead.documentStatus || '', docRemarks: lead.docRemarks || '',
            domTransportType: lead.domTransportType || lead.transportMode || '', specialOffers: lead.specialOffers || lead.offers || '', arrivalDate: lead.arrivalDate || '', departureDate: lead.departureDate || '', returnDate: lead.returnDate || '',
            insRequired: lead.insRequired || '', insProvider: lead.insProvider || '', insPolicyNo: lead.insPolicyNo || '', insCost: lead.insCost || '', insMarkup: lead.insMarkup || '', insStatus: lead.insStatus || '', insPolicyShared: lead.insPolicyShared || '',
            reqVeg: lead.reqVeg || false, reqWheelchair: lead.reqWheelchair || false, reqSenior: lead.reqSenior || false, reqHoneymoon: lead.reqHoneymoon || false, reqCandlelight: lead.reqCandlelight || false,
            reqFloating: lead.reqFloating || false, reqDecor: lead.reqDecor || false, reqBirthday: lead.reqBirthday || false, reqAnniversary: lead.reqAnniversary || false, reqManualAdd: lead.reqManualAdd || false
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const timestamp = new Date().toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        
        let currentHistory = [];
        try { 
            currentHistory = typeof selectedLeadForEdit.history === 'string' ? JSON.parse(selectedLeadForEdit.history) : (Array.isArray(selectedLeadForEdit.history) ? selectedLeadForEdit.history : []); 
        } catch(err){}
        const updatedHistory = [{ date: timestamp, action: 'Operations Profile Updated', note: 'Data synchronized and saved from Operations Dashboard.' }, ...currentHistory];

        // ─── SAFE AUTO-SAVE TO LOCAL STORAGE (RUNS ONLY ON SUBMIT) ───
        try {
            const stored = localStorage.getItem('saved_vendor_directory');
            let directory = stored ? JSON.parse(stored) : {};
            let changed = false;

            selectedLeadForEdit.vendorRequests.forEach(req => {
                const dmc = req.vendorDmcName?.trim();
                const contact = req.vendorContactPerson?.trim();
                
                if (dmc && dmc.length > 1) { 
                    if (!directory[dmc]) { 
                        directory[dmc] = []; 
                        changed = true; 
                    }
                    if (contact && contact.length > 1 && !directory[dmc].includes(contact)) {
                        directory[dmc].push(contact);
                        changed = true;
                    }
                }
            });

            if (changed) {
                localStorage.setItem('saved_vendor_directory', JSON.stringify(directory));
            }
        } catch(e) {
            console.warn("Failed to save vendor directory to local storage");
        }
        // ─────────────────────────────────────────────────────────────

        const payloadToSave = { 
            ...selectedLeadForEdit, 
            vendorRequests: JSON.stringify(selectedLeadForEdit.vendorRequests),
            passengers: JSON.stringify(selectedLeadForEdit.passengers),
            flights: JSON.stringify(selectedLeadForEdit.flights),
            visas: JSON.stringify(selectedLeadForEdit.visas),
            domTransports: JSON.stringify(selectedLeadForEdit.domTransports),
            domHotels: JSON.stringify(selectedLeadForEdit.domHotels),
            domLocalTransports: JSON.stringify(selectedLeadForEdit.domLocalTransports),
            paymentRequests: JSON.stringify(selectedLeadForEdit.paymentRequests),
            customisationRequests: JSON.stringify(selectedLeadForEdit.customisationRequests),
            history: JSON.stringify(updatedHistory)
        };
        
        updateLead(selectedLeadForEdit.id, payloadToSave);
        setSelectedLeadForEdit(null); 
    };

    // --- FILTER & DISPLAY DATA ---
    const filtered = expandedLeads.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || `LMN${item.id}`.toLowerCase().includes(q) || (item.customerName || '').toLowerCase().includes(q) || (item.destination || '').toLowerCase().includes(q);
        
        let tabMatchedStatus = getTabStatus(item.rawRowStatus);
        let matchTab = tabMatchedStatus === activeTab;
        const matchPlatform = selectedPlatform === 'All' ? true : item.platform === selectedPlatform;

        let isAuthorized = true;
        if (activeTab !== 'New Requests' && !isAdmin) {
            isAuthorized = (item.assignedOps === loggedInUserName) || (item.opsPreparedBy === loggedInUserName);
        }

        if (activeTab === 'Upcoming Bookings') {
            const today = new Date();
            const past15Days = new Date(today);
            past15Days.setDate(today.getDate() - 15);
            const travelDate = new Date(item.travelDate || item.travelDates || item.departureDate);
            const isWithin15DaysBack = !isNaN(travelDate) && travelDate >= past15Days;
            matchTab = (tabMatchedStatus === 'Upcoming Bookings') && isWithin15DaysBack;
        }

        return matchSearch && matchTab && matchPlatform && isAuthorized;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
    const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    const categories = [
        { id: 'New Requests', label: 'Jobs', icon: ShoppingCart, count: countNew },
        { id: 'Follow-Up', label: 'My Jobs', icon: Target, count: countFollow },
        { id: 'Confirmed Bookings', label: 'Confirmed Bookings', icon: BookmarkCheck, count: countBooked },
        { id: 'Upcoming Bookings', label: 'Upcoming Bookings', icon: PlaneTakeoff, count: countUpcoming },
    ];

    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-400 text-sm cursor-not-allowed";
    const sectionCls = "p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm";
    const sectionHeadCls = "text-sm font-bold text-cyan-400 mb-5 pb-2 border-b border-slate-800/60 tracking-wider uppercase";

    const uniqueDestinations = selectedLeadForEdit ? [...new Set((selectedLeadForEdit.customisationRequests || []).map(req => req.destination).filter(Boolean))] : [];
    const destinationOptions = uniqueDestinations.length > 0 ? uniqueDestinations : ['Singapore', 'Dubai', 'Thailand', 'Malaysia', 'Japan', { value: 'UK', label: 'United Kingdom' }, 'India'];

    // ─── DYNAMIC DMC & CONTACT PERSON MAP BUILDER ────────────────────────────────
    const dmcToContactsMap = {};
    const baseVendorOptions = ['Bali DMC', 'Dubai DMC', 'Thai DMC', 'Singapore DMC'];
    baseVendorOptions.forEach(dmc => { dmcToContactsMap[dmc] = new Set(); });

    // 1. Extract from existing database leads
    leads.forEach(l => {
        const legacyDMC = l.vendorDmcName || l.vendorName || l.dmcName;
        const legacyContact = l.vendorContactPerson || l.dmcContactPerson;
        if (legacyDMC) {
            if (!dmcToContactsMap[legacyDMC]) dmcToContactsMap[legacyDMC] = new Set();
            if (legacyContact) dmcToContactsMap[legacyDMC].add(legacyContact);
        }
        
        if (l.vendorRequests) {
            let reqs = [];
            try { reqs = typeof l.vendorRequests === 'string' ? JSON.parse(l.vendorRequests) : l.vendorRequests; } catch(e){}
            if (Array.isArray(reqs)) {
                reqs.forEach(req => {
                    const dReq = req.vendorDmcName;
                    const cReq = req.vendorContactPerson;
                    if (dReq) {
                        if (!dmcToContactsMap[dReq]) dmcToContactsMap[dReq] = new Set();
                        if (cReq && cReq !== '') dmcToContactsMap[dReq].add(cReq);
                    }
                });
            }
        }
    });

    // 2. Extract from Local Storage (Persisted manual entries)
    try {
        const storedDirectory = JSON.parse(localStorage.getItem('saved_vendor_directory') || '{}');
        Object.keys(storedDirectory).forEach(dmc => {
            if (!dmcToContactsMap[dmc]) dmcToContactsMap[dmc] = new Set();
            storedDirectory[dmc].forEach(c => dmcToContactsMap[dmc].add(c));
        });
    } catch(e) {}

    // 3. Extract from Current Form Session (Immediate UI updates)
    if (selectedLeadForEdit && selectedLeadForEdit.vendorRequests) {
        selectedLeadForEdit.vendorRequests.forEach(req => {
            const dReq = req.vendorDmcName;
            const cReq = req.vendorContactPerson;
            if (dReq) {
                if (!dmcToContactsMap[dReq]) dmcToContactsMap[dReq] = new Set();
                if (cReq && cReq !== '') dmcToContactsMap[dReq].add(cReq);
            }
        });
    }

    const finalDmcOptions = Object.keys(dmcToContactsMap).sort();

    const getContactsForDMC = (dmcName) => {
        if (!dmcName || !dmcToContactsMap[dmcName]) return [];
        return Array.from(dmcToContactsMap[dmcName]).filter(Boolean).sort();
    };

    return (
        <div ref={mainRef} className="w-full bg-[#0f172a] min-h-screen font-sans text-white overflow-y-auto relative" style={{ height: '100vh' }}>
            <style>{`.custom-date-input::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer; }`}</style>
            
            {/* Global Notifications */}
            {notification.show && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-bold bg-[#0d233e] tracking-wide animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-cyan-500 text-cyan-400'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{notification.message}</span>
                </div>
            )}

            {!selectedLeadForEdit ? (
                <>
                    <div className="p-4 sm:p-6">
                        <div className="py-12 mb-0 sm:mb-8">
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Operations Dashboard</h1>
                            <p className="text-slate-400 text-sm sm:text-base mt-1">Manage, allocate, and process active operational pipeline handovers.</p>
                        </div>

                        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = activeTab === cat.id;
                                return (
                                    <div key={cat.id} onClick={() => handleTabChange(cat.id)} className={`relative p-5 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md ${isActive ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`p-3 rounded-lg ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-800/20 text-slate-300'}`}><Icon size={24} strokeWidth={2} /></div>
                                            <span className={`text-xl font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>{cat.count}</span>
                                        </div>
                                        <h3 className={`font-semibold text-base ${isActive ? 'text-white' : 'text-slate-200'}`}>{cat.label}</h3>
                                        {isActive && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-slate-700" />}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-1 mb-6 md:hidden">
                            <button type="button" onClick={() => scrollTabs(-1)} className="flex-shrink-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 cursor-pointer" aria-label="Scroll tabs left"><ChevronLeft size={16} /></button>
                            <div ref={tabScrollRef} className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    const isActive = activeTab === cat.id;
                                    return (
                                        <div key={cat.id} onClick={() => handleTabChange(cat.id)} className={`relative flex-shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${isActive ? 'ring-1 ring-cyan-500 border-cyan-700 bg-[#07202a] text-white' : 'bg-slate-800/30 border-slate-700/30 text-slate-300'}`} style={{ minWidth: '148px' }}>
                                            <div className={`p-1.5 rounded-md flex-shrink-0 ${isActive ? 'bg-slate-700 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}><Icon size={16} strokeWidth={2} /></div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-semibold leading-tight truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>{cat.label}</span>
                                                <span className={`text-base font-bold leading-tight ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>{cat.count}</span>
                                            </div>
                                            {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-b-xl bg-cyan-500" />}
                                        </div>
                                    );
                                })}
                            </div>
                            <button type="button" onClick={() => scrollTabs(1)} className="flex-shrink-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 cursor-pointer" aria-label="Scroll tabs right"><ChevronRight size={16} /></button>
                        </div>

                        <div className="bg-transparent border border-slate-700/30 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 border-b border-slate-700/20 gap-3">
                                <h2 className="text-base sm:text-lg font-bold text-white">
                                    {categories.find(c => c.id === activeTab)?.label || activeTab}
                                    <span className="text-slate-400 font-normal text-sm ml-2">({filtered.length} records)</span>
                                </h2>
                                <div className="flex items-center gap-2 w-full sm:w-auto relative">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                        <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-600 rounded-lg focus:outline-none text-slate-100" />
                                    </div>
                                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border flex-shrink-0 ${isFilterOpen || selectedPlatform !== 'All' ? 'bg-slate-700/30 text-white border-slate-600' : 'text-slate-200 bg-transparent border-slate-700/20 hover:bg-slate-800/30'}`}>
                                        <SlidersHorizontal size={15} />
                                        <span className="hidden sm:inline">{selectedPlatform !== 'All' ? selectedPlatform : 'Source'}</span>
                                    </button>
                                    {isFilterOpen && (
                                        <div className="absolute top-11 right-0 w-44 bg-[#07202a] border border-slate-700/30 rounded-lg shadow-lg z-10 p-2">
                                            {['All', 'Website', 'Instagram', 'Facebook', 'Referral'].map(p => (
                                                <button key={p} onClick={() => { setSelectedPlatform(p); setIsFilterOpen(false); }} className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors border-none cursor-pointer bg-transparent text-slate-400 hover:bg-slate-800/30 hover:text-white">{p}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-200 min-w-[900px]">
                                    <thead className="bg-transparent border-b border-slate-700/20 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                        <tr>
                                            {activeTab === 'Confirmed Bookings' ? (
                                                <>
                                                    <th className="px-6 py-4">Job Id</th>
                                                    <th className="px-6 py-4">Lead Info</th>
                                                    <th className="px-6 py-4">Tour Details</th>
                                                    <th className="px-6 py-4">Confirmed Date</th>
                                                    <th className="px-6 py-4">Confirmed Method</th>
                                                    <th className="px-6 py-4">Value</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-4">Job ID</th>
                                                    <th className="px-6 py-4">Client</th>
                                                    <th className="px-6 py-4">Destination</th>
                                                    <th className="px-6 py-4">Work / Priority</th>
                                                    {activeTab === 'Follow-Up' && <th className="px-6 py-4">Vendor</th>}
                                                    {activeTab === 'Upcoming Bookings' && <th className="px-6 py-4">Status</th>}
                                                </>
                                            )}
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/20">
                                        {isLoading ? (
                                            <tr><td colSpan="11" className="px-6 py-12 text-center text-slate-500">Querying database records...</td></tr>
                                        ) : paginated.length > 0 ? paginated.map(row => (
                                            <tr key={row.uniqueKey} className="hover:bg-slate-800/30 transition-colors">
                                                {activeTab === 'Confirmed Bookings' ? (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-bold">{row.customerName || row.profileName || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                                <span className="text-xs text-slate-500 truncate max-w-[150px]">{row.email || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-emerald-400 font-medium">{row.destination || 'Bali'}</span>
                                                                <span className="text-xs text-slate-400">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                                <span className="text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm text-slate-300">{row.confirmedDate || '—'}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm text-slate-300">{row.confirmedMethod || '—'}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-bold text-emerald-400">{row.finalPackageValue ? `₹${row.finalPackageValue}` : '—'}</span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-bold">{row.customerName || row.profileName || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-emerald-400 font-medium flex items-center gap-1"><MapPin size={12} />{row.destination}</span>
                                                                <span className="text-xs text-slate-400">📅 {row.travelDates || row.date}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm items-start gap-1">
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-900/40 text-xs font-bold">{row.workType || 'FIT'}</span>
                                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${row.priority === 'High' ? 'bg-red-950 text-red-400' : 'bg-blue-950 text-blue-400'}`}>{row.priority || 'Normal'}</span>
                                                            </div>
                                                        </td>
                                                        {activeTab === 'Follow-Up' && (
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col text-xs gap-0.5 text-slate-400">
                                                                    <span>Vendor: <strong className="text-slate-200">{row.vendorDmcName || row.vendorName || 'Internal'}</strong></span>
                                                                    <span>Next: <strong className="text-amber-400">{row.nextFollowUp || 'TBD'}</strong></span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        {activeTab === 'Upcoming Bookings' && (
                                                            <td className="px-6 py-4">
                                                                <span className="text-cyan-400 font-bold text-xs bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded">{row.voucherStatus || 'Vouchered'}</span>
                                                            </td>
                                                        )}
                                                    </>
                                                )}
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {activeTab === 'New Requests' ? (
                                                            <button type="button" onClick={() => handleOpenAssignModal(row)} className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-900/30 rounded-md transition-colors" title="Assign">
                                                                <CheckSquare size={18} />
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-md transition-colors" title="View Profile"><Eye size={18} /></button>
                                                                <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/20 rounded-md transition-colors" title="Edit"><Pencil size={18} /></button>
                                                                
                                                                {activeTab === 'Follow-Up' && (
                                                                    <button type="button" onClick={() => handleSendToSalesReady(row)} className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded-md transition-colors border border-transparent hover:border-emerald-800" title="Send to Sales (Customisation Ready)">
                                                                        <Send size={16} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {activeTab !== 'Upcoming Bookings' && (
                                                            <button type="button" onClick={() => setLeadToFulfill(row)} className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-900/30 rounded-md transition-colors" title="Send to Fulfillment">
                                                                <Send size={18} className="text-orange-400" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="11" className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Target size={32} className="text-slate-600 mb-2" />
                                                        <p className="text-sm font-medium text-slate-400">No records in this section.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="sm:hidden divide-y divide-slate-700/20">
                                {isLoading ? (
                                    <div className="px-4 py-10 text-center text-slate-500 text-sm">Loading records...</div>
                                ) : paginated.length > 0 ? paginated.map(row => (
                                    <div key={row.uniqueKey} className="p-4 hover:bg-slate-800/20 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-slate-300 text-sm">LMN{row.id}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-900/40 text-xs font-bold">{row.workType || 'FIT'}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${row.priority === 'High' ? 'bg-red-950 text-red-400' : 'bg-blue-950 text-blue-400'}`}>{row.priority || 'Normal'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {activeTab === 'New Requests' ? (
                                                    <button type="button" onClick={() => handleOpenAssignModal(row)} className="p-1.5 text-slate-400 hover:text-orange-400 bg-slate-800 rounded-md border border-slate-700" title="Assign">
                                                        <CheckSquare size={15} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 bg-slate-800 rounded-md border border-slate-700" title="View"><Eye size={15} /></button>
                                                        <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 bg-slate-800 rounded-md border border-slate-700" title="Edit"><Pencil size={15} /></button>
                                                        
                                                        {activeTab === 'Follow-Up' && (
                                                            <button type="button" onClick={() => handleSendToSalesReady(row)} className="p-1.5 text-emerald-400 bg-emerald-950/40 rounded-md border border-emerald-900/50" title="Send to Sales (Customisation Ready)">
                                                                <Send size={15} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {activeTab !== 'Upcoming Bookings' && (
                                                    <button type="button" onClick={() => setLeadToFulfill(row)} className="p-1.5 bg-slate-800 rounded-md border border-slate-700" title="Fulfillment">
                                                        <Send size={15} className="text-orange-400" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 mb-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-semibold text-sm">{row.customerName || row.profileName || 'N/A'}</span>
                                                <span className="text-slate-400 text-xs">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-emerald-400 text-xs font-medium flex items-center gap-1"><MapPin size={11} />{row.destination}</span>
                                                <span className="text-slate-500 text-xs">📅 {row.travelDates || row.date}</span>
                                            </div>
                                        </div>

                                        {activeTab === 'Follow-Up' && (
                                            <div className="text-xs text-slate-400 bg-slate-800/30 rounded px-2.5 py-1.5 mt-1">
                                                Vendor: <strong className="text-slate-200">{row.vendorDmcName || row.vendorName || 'Internal'}</strong>
                                                <span className="mx-2">·</span>
                                                Next: <strong className="text-amber-400">{row.nextFollowUp || 'TBD'}</strong>
                                            </div>
                                        )}
                                        {activeTab === 'Confirmed Bookings' && (
                                            <span className="inline-block mt-1 text-emerald-400 font-black font-mono text-sm">{row.amount || '₹2,50,000'}</span>
                                        )}
                                        {activeTab === 'Upcoming Bookings' && (
                                            <span className="inline-block mt-1 text-cyan-400 font-bold text-xs bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded">{row.voucherStatus || 'Vouchered'}</span>
                                        )}
                                    </div>
                                )) : (
                                    <div className="px-4 py-10 text-center">
                                        <Target size={28} className="text-slate-600 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">No records in this section.</p>
                                    </div>
                                )}
                            </div>

                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalEntries={filtered.length} entriesPerPage={entriesPerPage} />
                        </div>
                    </div>

                    <button type="button" onClick={scrollToTop} aria-label="Scroll to top" className={`fixed bottom-6 right-5 z-40 p-3 rounded-full bg-slate-800 border border-slate-600 text-slate-300 shadow-lg transition-all duration-300 cursor-pointer hover:bg-slate-700 hover:text-white ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <ArrowUp size={18} />
                    </button>
                </>
            ) : (
                /* ─── CRM HANDOVER SHEET (FULL SCREEN REPLACEMENT) ──────────────────── */
                <div className="bg-[#0f172a] flex flex-col w-full min-h-screen text-slate-100 relative z-50">
                  <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-50 flex-shrink-0 shadow-md">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate pr-4">
                            <FileText size={20} className="text-cyan-400 flex-shrink-0" />
                            <span className="truncate hidden sm:inline">
                                {activeTab === 'Confirmed Bookings'
                                    ? `Confirmed Booking — ${selectedLeadForEdit.tourType === 'International Tour' ? 'Intl' : 'Dom'}`
                                    : 'CRM Handover Sheet'}
                            </span>
                            <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-shrink-0">
                                LMN{String(selectedLeadForEdit.id || '').padStart(4, '0')}
                            </span>
                        </h2>
                        
                        <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-auto cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>

                   <div className="flex-1 w-full relative pb-10">
                        <form id="edit-ops-form" 
                              onSubmit={handleEditSubmit} 
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                                      e.preventDefault();
                                  }
                              }}
                              className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">

                                {activeTab === 'Confirmed Bookings' ? (
                                    selectedLeadForEdit.tourType === 'International Tour' ? (
                                        <div className="space-y-6">
                                            {/* Booking Information */}
                                            <div className={sectionCls} style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                                                <h3 className={`${sectionHeadCls} text-sky-400 border-sky-900/50 flex flex-wrap justify-between gap-1`}>
                                                    <span>INTERNATIONAL - Booking Information</span>
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label><input type="text" readOnly value={selectedLeadForEdit.customerName} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" readOnly value={selectedLeadForEdit.mobileNumber} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination</label><input type="text" readOnly value={selectedLeadForEdit.destination} className={readonlyCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">No. Of Adult</label><input type="text" value={selectedLeadForEdit.noOfAdults} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, noOfAdults: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">No. Of Children</label><input type="text" value={selectedLeadForEdit.noOfChildren} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, noOfChildren: e.target.value})} className={inputCls} /></div>
                                                    <div className="hidden sm:block"></div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Departure Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.departureDate} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Travel Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.travelDate} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Return Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.returnDate || 'TBD'} className={readonlyCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Transport Mode</label><input type="text" readOnly value={selectedLeadForEdit.domTransportType} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Special Offers</label><input type="text" readOnly value={selectedLeadForEdit.specialOffers} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Arrival Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.arrivalDate} className={readonlyCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Package Cost</label><input type="text" readOnly value={selectedLeadForEdit.packageCost} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Sales Executive</label><input type="text" readOnly value={selectedLeadForEdit.salesExecutive} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmation Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.confirmationDate || selectedLeadForEdit.bookingDate || 'TBD'} className={readonlyCls} /></div>
                                                </div>
                                            </div>

                                            {/* Passenger Details */}
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} flex flex-wrap justify-between gap-1`}>
                                                    <span>Passenger Details (Locked - Fetched from Sales)</span>
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedLeadForEdit.passengers?.map((pax, index) => (
                                                        <div key={index} className="p-4 bg-slate-950 rounded-lg border border-slate-800 relative opacity-80">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">PAX {index + 1}</span>
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label><input type="text" readOnly value={pax.fullName} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Date Of Birth</label><input type="text" readOnly value={pax.dob} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Gender</label><input type="text" readOnly value={pax.gender} className={readonlyCls} /></div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Aadhar Card Number</label><input type="text" readOnly value={pax.aadharNumber} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">PAN Number</label><input type="text" readOnly value={pax.panNumber} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Number</label><input type="text" readOnly value={pax.passportNumber} className={readonlyCls} /></div>

                                                                {selectedLeadForEdit.tourType === 'International Tour' && (
                                                                    <>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Issue Date</label><input type="text" readOnly value={pax.passportIssueDate} className={readonlyCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Expiry Date</label><input type="text" readOnly value={pax.passportExpiryDate} className={readonlyCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Place of Issue</label><input type="text" readOnly value={pax.passportIssuePlace} className={readonlyCls} /></div>
                                                                    </>
                                                                )}

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" readOnly value={pax.mobileNumber} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Emergency Contact</label><input type="text" readOnly value={pax.emergencyContact || ''} className={readonlyCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Flight Details */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Flight Details</h3>
                                                <div className="space-y-4">
                                                    {selectedLeadForEdit.flights?.map((flight, index) => (
                                                        <div key={index} className="p-4 bg-slate-950 rounded-lg border border-slate-800 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">FLIGHT {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('flights', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Flight Type</label>
                                                                    <CustomSelect value={flight.flightType} onChange={(v) => handleArrayChange('flights', index, 'flightType', v)} className={selectCls} options={['One Way', 'Round Trip', 'Multi City']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Flight Responsibility</label>
                                                                    <CustomSelect value={flight.flightResponsibility} onChange={(v) => handleArrayChange('flights', index, 'flightResponsibility', v)} className={selectCls} options={['Agency', 'Client']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label>
                                                                    <CustomSelect value={flight.bookingStatus} onChange={(v) => handleArrayChange('flights', index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Airline</label><input type="text" value={flight.airline} onChange={(e) => handleArrayChange('flights', index, 'airline', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">PNR No.</label><input type="text" value={flight.pnr} onChange={(e) => handleArrayChange('flights', index, 'pnr', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booked Through</label>
                                                                    <CustomSelect value={flight.bookedThrough} onChange={(v) => handleArrayChange('flights', index, 'bookedThrough', v)} className={selectCls} options={['Internal Team', 'DMC', 'Direct Client']} />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                                                                    <CustomSelect value={flight.category} onChange={(v) => handleArrayChange('flights', index, 'category', v)} className={selectCls} options={['Economy', 'Premium Economy', 'Business', 'First Class']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Flight Departure Date & Time</label><DatePickerField type="datetime-local" value={flight.departureDateTime} onChange={(e) => handleArrayChange('flights', index, 'departureDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Boarding Point</label><input type="text" value={flight.boardingPoint} onChange={(e) => handleArrayChange('flights', index, 'boardingPoint', e.target.value)} className={inputCls} /></div>

                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Ticket Shared</label>
                                                                    <CustomSelect value={flight.ticketShared} onChange={(v) => handleArrayChange('flights', index, 'ticketShared', v)} className={selectCls} options={['Yes', 'No']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Ticket Shared Date</label><DatePickerField type="date" value={flight.ticketSharedDate} onChange={(e) => handleArrayChange('flights', index, 'ticketSharedDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Deboarding Point</label><input type="text" value={flight.deboardingPoint} onChange={(e) => handleArrayChange('flights', index, 'deboardingPoint', e.target.value)} className={inputCls} /></div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Flight Cost</label><input type="text" value={flight.flightCost} onChange={(e) => handleArrayChange('flights', index, 'flightCost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Markup Cost</label><input type="text" value={flight.markupCost || ''} onChange={(e) => handleArrayChange('flights', index, 'markupCost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Attach Drive Link</label><input type="text" value={flight.driveLink} onChange={(e) => handleArrayChange('flights', index, 'driveLink', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center bg-slate-900 border border-slate-700/50 p-2 rounded">
                                                        <button type="button" onClick={() => addArrayItem('flights', { flightType: '', flightResponsibility: '', bookingStatus: '', airline: '', pnr: '', bookedThrough: '', category: '', departureDateTime: '', boardingPoint: '', ticketShared: '', ticketSharedDate: '', deboardingPoint: '', flightCost: '', markupCost: '', driveLink: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md cursor-pointer">
                                                            <Plus size={14} /> Add Flight
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Travel Insurance */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Travel Insurance</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Insurance Required (yes/no)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insRequired} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insRequired: v })} className={selectCls} options={['Yes', 'No']} />
                                                    </div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Provider</label><input type="text" value={selectedLeadForEdit.insProvider} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insProvider: e.target.value })} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Policy Number</label><input type="text" value={selectedLeadForEdit.insPolicyNo} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insPolicyNo: e.target.value })} className={inputCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={selectedLeadForEdit.insCost} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insCost: e.target.value })} className={inputCls} /></div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Status (Pending / Issued)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insStatus: v })} className={selectCls} options={['Pending', 'Issued']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Policy Shared (Yes / no)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insPolicyShared} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insPolicyShared: v })} className={selectCls} options={['Yes', 'No']} />
                                                    </div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Markup Cost</label><input type="text" value={selectedLeadForEdit.insMarkup || ''} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insMarkup: e.target.value })} className={inputCls} /></div>
                                                </div>
                                            </div>

                                            {/* VISA Details */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>VISA Details</h3>
                                                <div className="space-y-4">
                                                    {selectedLeadForEdit.visas?.map((visa, index) => (
                                                        <div key={index} className="p-4 bg-slate-950 rounded-lg border border-slate-800 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">VISA {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('visas', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination</label><input type="text" value={visa.destination} onChange={(e) => handleArrayChange('visas', index, 'destination', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">VISA Type</label>
                                                                    <CustomSelect value={visa.visaType} onChange={v => handleArrayChange('visas', index, 'visaType', v)} className={selectCls} options={['Tourist', 'Business', 'Transit', 'e-Visa', 'Visa on Arrival']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Transit VISA Required</label>
                                                                    <CustomSelect value={visa.transitVisaReq} onChange={v => handleArrayChange('visas', index, 'transitVisaReq', v)} className={selectCls} options={['Yes', 'No']} />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Card Applicable</label>
                                                                    <CustomSelect value={visa.arrivalCardApplicable} onChange={v => handleArrayChange('visas', index, 'arrivalCardApplicable', v)} className={selectCls} options={['Yes', 'No']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Arrival Card Details</label><input type="text" value={visa.arrivalCardDetails} onChange={e => handleArrayChange('visas', index, 'arrivalCardDetails', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Applied by</label>
                                                                    <CustomSelect value={visa.appliedBy} onChange={v => handleArrayChange('visas', index, 'appliedBy', v)} className={selectCls} options={['Client', 'Vendor', 'Team']} />
                                                                </div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Documents Pending</label><input type="text" value={visa.docsPending} onChange={e => handleArrayChange('visas', index, 'docsPending', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Status</label><input type="text" value={visa.visaStatus} onChange={e => handleArrayChange('visas', index, 'visaStatus', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">VISA Copy Shared</label>
                                                                    <CustomSelect value={visa.visaCopyShared} onChange={v => handleArrayChange('visas', index, 'visaCopyShared', v)} className={selectCls} options={['Yes', 'No']} />
                                                                </div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Approval Date</label><DatePickerField type="date" value={visa.visaApprovalDate} onChange={(e) => handleArrayChange('visas', index, 'visaApprovalDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Expiry Date</label><DatePickerField type="date" value={visa.visaExpiryDate} onChange={(e) => handleArrayChange('visas', index, 'visaExpiryDate', e.target.value)} className={inputCls} /></div>
                                                                <div className="hidden sm:block"></div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Cost</label><input type="text" value={visa.visaCost} onChange={e => handleArrayChange('visas', index, 'visaCost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Markup Cost</label><input type="text" value={visa.markupCost} onChange={e => handleArrayChange('visas', index, 'markupCost', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center bg-slate-900 border border-slate-700/50 p-2 rounded">
                                                        <button type="button" onClick={() => addArrayItem('visas', { destination: '', visaType: '', transitVisaReq: '', arrivalCardApplicable: '', arrivalCardDetails: '', appliedBy: '', docsPending: '', visaStatus: '', visaCopyShared: '', visaApprovalDate: '', visaExpiryDate: '', visaCost: '', markupCost: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md cursor-pointer">
                                                            <Plus size={14} /> Add VISA
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    ) : (
                                        /* ───────────────────────────────────────────── */
                                        /* NEW DOMESTIC CONFIRMED BOOKING VIEW           */
                                        /* ───────────────────────────────────────────── */
                                        <div className="space-y-6">
                                            {/* 1. Booking Information */}
                                            <div className={sectionCls} style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                                                <h3 className={`${sectionHeadCls} text-sky-400 border-sky-900/50 flex flex-wrap justify-between gap-1`}>
                                                    <span>Booking Information</span>
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label><input type="text" readOnly value={selectedLeadForEdit.customerName} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" readOnly value={selectedLeadForEdit.mobileNumber} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination</label><input type="text" readOnly value={selectedLeadForEdit.destination} className={readonlyCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">No. Of Adult</label><input type="text" value={selectedLeadForEdit.noOfAdults} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, noOfAdults: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">No. Of Children</label><input type="text" value={selectedLeadForEdit.noOfChildren} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, noOfChildren: e.target.value})} className={inputCls} /></div>
                                                    <div className="hidden sm:block"></div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Departure Date</label><DatePickerField type="date" value={selectedLeadForEdit.departureDate} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, departureDate: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Travel Date</label><DatePickerField type="date" value={selectedLeadForEdit.travelDate} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, travelDate: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Return Date</label><DatePickerField type="date" value={selectedLeadForEdit.returnDate || ''} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, returnDate: e.target.value})} className={inputCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Transport Mode</label><input type="text" value={selectedLeadForEdit.domTransportType} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, domTransportType: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Special Offers</label><input type="text" value={selectedLeadForEdit.specialOffers} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, specialOffers: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Arrival Date</label><DatePickerField type="date" value={selectedLeadForEdit.arrivalDate} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, arrivalDate: e.target.value})} className={inputCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Package Cost</label><input type="text" value={selectedLeadForEdit.packageCost} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, packageCost: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Sales Executive</label><input type="text" value={selectedLeadForEdit.salesExecutive} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, salesExecutive: e.target.value})} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmation Date</label><DatePickerField type="date" value={selectedLeadForEdit.confirmationDate || ''} onChange={e => setSelectedLeadForEdit({...selectedLeadForEdit, confirmationDate: e.target.value})} className={inputCls} /></div>
                                                </div>
                                            </div>

                                            {/* 2. Passenger Details */}
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} flex flex-wrap justify-between gap-1`}>
                                                    <span>Passenger Details (Locked - Fetched from Sales)</span>
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedLeadForEdit.passengers?.map((pax, index) => (
                                                        <div key={index} className="p-4 bg-slate-950 rounded-lg border border-slate-800 relative opacity-80">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">PAX {index + 1}</span>
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label><input type="text" readOnly value={pax.fullName} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Date Of Birth</label><input type="text" readOnly value={pax.dob} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Gender</label><input type="text" readOnly value={pax.gender} className={readonlyCls} /></div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Aadhar Card Number</label><input type="text" readOnly value={pax.aadharNumber} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">PAN Number</label><input type="text" readOnly value={pax.panNumber} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Number</label><input type="text" readOnly value={pax.passportNumber} className={readonlyCls} /></div>

                                                                {selectedLeadForEdit.tourType === 'International Tour' && (
                                                                    <>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Issue Date</label><input type="text" readOnly value={pax.passportIssueDate} className={readonlyCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Expiry Date</label><input type="text" readOnly value={pax.passportExpiryDate} className={readonlyCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Place of Issue</label><input type="text" readOnly value={pax.passportIssuePlace} className={readonlyCls} /></div>
                                                                    </>
                                                                )}

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" readOnly value={pax.mobileNumber} className={readonlyCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Emergency Contact</label><input type="text" readOnly value={pax.emergencyContact || ''} className={readonlyCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 3. Document Collection */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Document Collection (Locked - Fetched from Sales)</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-80">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Aadhar Copy</label><input type="text" readOnly value={selectedLeadForEdit.docAadhar || 'Pending'} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">PAN Card</label><input type="text" readOnly value={selectedLeadForEdit.docPan || 'Pending'} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Photograph</label><input type="text" readOnly value={selectedLeadForEdit.docPhoto || 'Pending'} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Attach Drive Link</label><input type="text" readOnly value={selectedLeadForEdit.docDriveLink || 'N/A'} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Document Status</label><input type="text" readOnly value={selectedLeadForEdit.documentStatus || 'Pending'} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Remarks</label><input type="text" readOnly value={selectedLeadForEdit.docRemarks || 'None'} className={readonlyCls} /></div>
                                                </div>
                                            </div>

                                            {/* 4. Transport Details */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Transport Details</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.domTransports?.map((trans, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative space-y-4">
                                                            {index > 0 && (
                                                                <button type="button" onClick={() => removeArrayItem('domTransports', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>
                                                            )}
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Transport Type</label>
                                                                    <CustomSelect value={trans.transportType} onChange={(v) => updateDomTransport(index, 'transportType', v)} className={selectCls} options={['Flight', 'Train', 'Bus']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booked By</label>
                                                                    <CustomSelect value={trans.bookedBy} onChange={(v) => updateDomTransport(index, 'bookedBy', v)} className={selectCls} options={['Internal Team', 'Customer']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label>
                                                                    <CustomSelect value={trans.bookingStatus} onChange={(v) => updateDomTransport(index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>
                                                                <div className="sm:col-start-2">
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Ticket Shared to Client</label>
                                                                    <CustomSelect value={trans.ticketSharedToClient || ''} onChange={(v) => updateDomTransport(index, 'ticketSharedToClient', v)} className={selectCls} options={['Yes', 'No']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Shared Date</label>
                                                                    <DatePickerField type="date" value={trans.sharedDate || ''} onChange={(e) => updateDomTransport(index, 'sharedDate', e.target.value)} className={inputCls} />
                                                                </div>
                                                            </div>

                                                            {trans.transportType === 'Flight' && (
                                                                <div className="space-y-4 border-t border-slate-700/30 pt-4">
                                                                    <div className="font-bold text-cyan-400 text-xs uppercase tracking-widest">If Flight</div>
                                                                    {['onward', 'return'].map((leg) => {
                                                                        if (leg === 'return' && !trans.flight?.return) return null;
                                                                        return (
                                                                            <div key={leg} className="space-y-3 bg-slate-900/50 p-3 border border-slate-700/30 rounded-md">
                                                                                <div className="font-semibold text-slate-300 text-xs capitalize">{leg}</div>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Airline</label><input type="text" value={trans.flight?.[leg]?.airline || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'airline', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">PNR No.</label><input type="text" value={trans.flight?.[leg]?.pnr || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'pnr', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Booking Date</label><DatePickerField type="date" value={trans.flight?.[leg]?.bookingDate || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'bookingDate', e.target.value)} className={inputCls} /></div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Booked Through</label>
                                                                                        <CustomSelect value={trans.flight?.[leg]?.bookedThrough || ''} onChange={(v) => updateDomTransportNested(index, 'flight', leg, 'bookedThrough', v)} className={selectCls} options={['Internal', 'DMC', 'Direct']} />
                                                                                    </div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Departure Date & Time</label><DatePickerField type="datetime-local" value={trans.flight?.[leg]?.depDateTime || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'depDateTime', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">From</label><input type="text" value={trans.flight?.[leg]?.from || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'from', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Attach Drive Link</label><input type="text" value={trans.flight?.[leg]?.attachTicket || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'attachTicket', e.target.value)} className={inputCls} /></div>
                                                                                    <div className="hidden sm:block"></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">To</label><input type="text" value={trans.flight?.[leg]?.to || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'to', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Flight Cost</label><input type="text" value={trans.flight?.[leg]?.flightCost || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'flightCost', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Markup Cost</label><input type="text" value={trans.flight?.[leg]?.markupCost || ''} onChange={(e) => updateDomTransportNested(index, 'flight', leg, 'markupCost', e.target.value)} className={inputCls} /></div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {!trans.flight?.return ? (
                                                                        <button type="button" onClick={() => addDomTransportReturn(index, 'flight')} className="font-bold text-sm text-cyan-400 hover:text-cyan-300 bg-transparent border-none cursor-pointer p-0 text-left">+ Add Return Details</button>
                                                                    ) : (
                                                                        <button type="button" onClick={() => removeDomTransportReturn(index, 'flight')} className="font-bold text-sm text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 text-left">- Remove Return Details</button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {trans.transportType === 'Train' && (
                                                                <div className="space-y-4 border-t border-slate-700/30 pt-4">
                                                                    <div className="font-bold text-cyan-400 text-xs uppercase tracking-widest">If Train is Selected</div>
                                                                    {['onward', 'return'].map((leg) => {
                                                                        if (leg === 'return' && !trans.train?.return) return null;
                                                                        return (
                                                                            <div key={leg} className="space-y-3 bg-slate-900/50 p-3 border border-slate-700/30 rounded-md">
                                                                                {leg === 'return' && <div className="font-semibold text-slate-300 text-xs capitalize">Return</div>}
                                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Train Name</label><input type="text" value={trans.train?.[leg]?.trainName || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'trainName', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Train No.</label><input type="text" value={trans.train?.[leg]?.trainNo || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'trainNo', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Booking Date</label><DatePickerField type="date" value={trans.train?.[leg]?.bookingDate || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'bookingDate', e.target.value)} className={inputCls} /></div>
                                                                                    
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Boarding Station</label><input type="text" value={trans.train?.[leg]?.boardingStation || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'boardingStation', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination</label><input type="text" value={trans.train?.[leg]?.destination || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'destination', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Train start Time</label><DatePickerField type="time" value={trans.train?.[leg]?.trainStartTime || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'trainStartTime', e.target.value)} className={inputCls} /></div>
                                                                                    
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={trans.train?.[leg]?.cost || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'cost', e.target.value)} className={inputCls} /></div>
                                                                                    <div className="hidden sm:block"></div> 
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Train Reaching Time</label><DatePickerField type="time" value={trans.train?.[leg]?.trainReachingTime || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'trainReachingTime', e.target.value)} className={inputCls} /></div>
                                                                                    
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Seat Details</label><input type="text" value={trans.train?.[leg]?.seatDetails || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'seatDetails', e.target.value)} className={inputCls} /></div>
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Train Class</label>
                                                                                        <CustomSelect value={trans.train?.[leg]?.trainClass || ''} onChange={(v) => updateDomTransportNested(index, 'train', leg, 'trainClass', v)} className={selectCls} options={['1A', '2A', '3A', 'SL', 'CC', 'EC']} />
                                                                                    </div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Attach Ticket Link</label><input type="text" value={trans.train?.[leg]?.attachTicketLink || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'attachTicketLink', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Meals</label><input type="text" value={trans.train?.[leg]?.meals || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'meals', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Train Cost</label><input type="text" value={trans.train?.[leg]?.trainCost || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'trainCost', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Mark-Up</label><input type="text" value={trans.train?.[leg]?.markupCost || ''} onChange={(e) => updateDomTransportNested(index, 'train', leg, 'markupCost', e.target.value)} className={inputCls} /></div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {!trans.train?.return ? (
                                                                        <button type="button" onClick={() => addDomTransportReturn(index, 'train')} className="font-bold text-sm text-cyan-400 hover:text-cyan-300 bg-transparent border-none cursor-pointer p-0 text-left">+ Add Return Details</button>
                                                                    ) : (
                                                                        <button type="button" onClick={() => removeDomTransportReturn(index, 'train')} className="font-bold text-sm text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 text-left">- Remove Return Details</button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {trans.transportType === 'Bus' && (
                                                                <div className="space-y-4 border-t border-slate-700/30 pt-4">
                                                                    <div className="font-bold text-cyan-400 text-xs uppercase tracking-widest">If Bus is Selected</div>
                                                                    {['onward', 'return'].map((leg) => {
                                                                        if (leg === 'return' && !trans.bus?.return) return null;
                                                                        return (
                                                                            <div key={leg} className="space-y-3 bg-slate-900/50 p-3 border border-slate-700/30 rounded-md">
                                                                                {leg === 'return' && <div className="font-semibold text-slate-300 text-xs capitalize">Return</div>}
                                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Service Provider</label><input type="text" value={trans.bus?.[leg]?.serviceProvider || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'serviceProvider', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Booking Date</label><DatePickerField type="date" value={trans.bus?.[leg]?.bookingDate || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'bookingDate', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination</label><input type="text" value={trans.bus?.[leg]?.destination || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'destination', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Boarding Point</label><input type="text" value={trans.bus?.[leg]?.boardingPoint || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'boardingPoint', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Travel Date & Time</label><DatePickerField type="datetime-local" value={trans.bus?.[leg]?.travelDateTime || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'travelDateTime', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Seat Details</label><input type="text" value={trans.bus?.[leg]?.seatDetails || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'seatDetails', e.target.value)} className={inputCls} /></div>
                                                                                    <div className="sm:col-start-2"><label className="block text-xs font-medium text-slate-400 mb-1">Bus Cost</label><input type="text" value={trans.bus?.[leg]?.cost || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'cost', e.target.value)} className={inputCls} /></div>
                                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Mark-Up</label><input type="text" value={trans.bus?.[leg]?.markupCost || ''} onChange={(e) => updateDomTransportNested(index, 'bus', leg, 'markupCost', e.target.value)} className={inputCls} /></div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {!trans.bus?.return ? (
                                                                        <button type="button" onClick={() => addDomTransportReturn(index, 'bus')} className="font-bold text-sm text-cyan-400 hover:text-cyan-300 bg-transparent border-none cursor-pointer p-0 text-left">+ Add Return Details</button>
                                                                    ) : (
                                                                        <button type="button" onClick={() => removeDomTransportReturn(index, 'bus')} className="font-bold text-sm text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 text-left">- Remove Return Details</button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('domTransports', { transportType: '', bookedBy: '', bookingStatus: '', ticketSharedToClient: '', sharedDate: '', flight: { onward: {}, return: null }, train: { onward: {}, return: null }, bus: { onward: {}, return: null } })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                        <Plus size={14} /> Add Transport Block
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 5. Hotel Booking */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Hotel Booking</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.domHotels?.map((hotel, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">HOTEL {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('domHotels', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Location</label><input type="text" value={hotel.location} onChange={(e) => handleArrayChange('domHotels', index, 'location', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Hotel Name</label><input type="text" value={hotel.hotelName} onChange={(e) => handleArrayChange('domHotels', index, 'hotelName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Hotel Category</label><input type="text" value={hotel.hotelCategory} onChange={(e) => handleArrayChange('domHotels', index, 'hotelCategory', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booked By</label>
                                                                    <CustomSelect value={hotel.bookedBy} onChange={(v) => handleArrayChange('domHotels', index, 'bookedBy', v)} className={selectCls} options={['Operations Desk 1', 'Operations Desk 2', 'Ground Vendor']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Reference No./ Booking Id</label><input type="text" value={hotel.refNo} onChange={(e) => handleArrayChange('domHotels', index, 'refNo', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                                                    <CustomSelect value={hotel.status} onChange={(v) => handleArrayChange('domHotels', index, 'status', v)} className={selectCls} options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Room Category</label><input type="text" value={hotel.roomCategory} onChange={(e) => handleArrayChange('domHotels', index, 'roomCategory', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">No. Of Rooms</label><input type="text" value={hotel.noOfRooms} onChange={(e) => handleArrayChange('domHotels', index, 'noOfRooms', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Additional Mattress</label><input type="text" value={hotel.addMattress} onChange={(e) => handleArrayChange('domHotels', index, 'addMattress', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Specifications</label>
                                                                    <CustomSelect value={hotel.specifications} onChange={(v) => handleArrayChange('domHotels', index, 'specifications', v)} className={selectCls} options={['Standard', 'Sea View', 'City View']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Meal Plan</label>
                                                                    <CustomSelect value={hotel.mealPlan} onChange={(v) => handleArrayChange('domHotels', index, 'mealPlan', v)} className={selectCls} options={['EP', 'CP', 'MAP', 'AP']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Early Check-In / Late</label>
                                                                    <CustomSelect value={hotel.earlyCheckIn} onChange={(v) => handleArrayChange('domHotels', index, 'earlyCheckIn', v)} className={selectCls} options={['None', 'Early Check-In', 'Late Check-Out']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Check-In Date & Time</label><DatePickerField type="datetime-local" value={hotel.checkInDateTime} onChange={(e) => handleArrayChange('domHotels', index, 'checkInDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Check-Out Date & Time</label><DatePickerField type="datetime-local" value={hotel.checkOutDateTime} onChange={(e) => handleArrayChange('domHotels', index, 'checkOutDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Refreshment Room Required</label>
                                                                    <CustomSelect value={hotel.refreshmentRoom} onChange={(v) => handleArrayChange('domHotels', index, 'refreshmentRoom', v)} className={selectCls} options={['Yes', 'No']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={hotel.cost} onChange={(e) => handleArrayChange('domHotels', index, 'cost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={hotel.paymentDueDate} onChange={(e) => handleArrayChange('domHotels', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Attach Voucher Link</label><input type="text" value={hotel.attachVoucher} onChange={(e) => handleArrayChange('domHotels', index, 'attachVoucher', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mark-Up</label><input type="text" value={hotel.markup || ''} onChange={(e) => handleArrayChange('domHotels', index, 'markup', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Special Arrangements</label><input type="text" value={hotel.specialArrangements} onChange={(e) => handleArrayChange('domHotels', index, 'specialArrangements', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Notes</label><input type="text" value={hotel.notes} onChange={(e) => handleArrayChange('domHotels', index, 'notes', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('domHotels', { location: '', hotelName: '', hotelCategory: '', bookedBy: '', refNo: '', status: '', roomCategory: '', noOfRooms: '', addMattress: '', specifications: '', mealPlan: '', earlyCheckIn: '', checkInDateTime: '', checkOutDateTime: '', refreshmentRoom: '', cost: '', markup: '', paymentDueDate: '', attachVoucher: '', specialArrangements: '', notes: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                        <Plus size={14} /> Add Hotel
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 6. Local Transport */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Local Transport</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.domLocalTransports?.map((trans, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">VEHICLE {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('domLocalTransports', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Local Operator Name</label><input type="text" value={trans.serviceProvider || trans.operatorName || ''} onChange={(e) => handleArrayChange('domLocalTransports', index, 'serviceProvider', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Type</label><input type="text" value={trans.vehicleType} onChange={(e) => handleArrayChange('domLocalTransports', index, 'vehicleType', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label><input type="text" value={trans.contactPerson} onChange={(e) => handleArrayChange('domLocalTransports', index, 'contactPerson', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Driver Name</label><input type="text" value={trans.driverName} onChange={(e) => handleArrayChange('domLocalTransports', index, 'driverName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Number</label><input type="text" value={trans.vehicleNumber} onChange={(e) => handleArrayChange('domLocalTransports', index, 'vehicleNumber', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                                                    <CustomSelect value={trans.status} onChange={(v) => handleArrayChange('domLocalTransports', index, 'status', v)} className={selectCls} options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Driver Contact Number</label><input type="text" value={trans.driverContact || ''} onChange={(e) => handleArrayChange('domLocalTransports', index, 'driverContact', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Toll Parking & Other State Permit</label>
                                                                    <CustomSelect value={trans.tollPermit || trans.tollParking || ''} onChange={(v) => handleArrayChange('domLocalTransports', index, 'tollPermit', v)} className={selectCls} options={['Included', 'Excluded']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Duration</label>
                                                                    <CustomSelect value={trans.duration} onChange={(v) => handleArrayChange('domLocalTransports', index, 'duration', v)} className={selectCls} options={['Half Day', 'Full Day', 'Multi Day']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Pickup Point</label><input type="text" value={trans.pickupPoint} onChange={(e) => handleArrayChange('domLocalTransports', index, 'pickupPoint', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Pickup Date</label><DatePickerField type="date" value={trans.pickupDate} onChange={(e) => handleArrayChange('domLocalTransports', index, 'pickupDate', e.target.value)} className={inputCls} /></div>
                                                                <div className="hidden sm:block"></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Drop Point</label><input type="text" value={trans.dropPoint} onChange={(e) => handleArrayChange('domLocalTransports', index, 'dropPoint', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Drop Date</label><DatePickerField type="date" value={trans.dropDate} onChange={(e) => handleArrayChange('domLocalTransports', index, 'dropDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Notes</label><input type="text" value={trans.notes} onChange={(e) => handleArrayChange('domLocalTransports', index, 'notes', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={trans.cost} onChange={(e) => handleArrayChange('domLocalTransports', index, 'cost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mark-Up</label><input type="text" value={trans.markup || ''} onChange={(e) => handleArrayChange('domLocalTransports', index, 'markup', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={trans.paymentDueDate} onChange={(e) => handleArrayChange('domLocalTransports', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('domLocalTransports', { serviceProvider: '', vehicleType: '', contactPerson: '', driverName: '', vehicleNumber: '', status: '', pickupPoint: '', pickupDate: '', duration: '', dropPoint: '', dropDate: '', tollParking: '', cost: '', markup: '', paymentDueDate: '', notes: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                        <Plus size={14} /> Add Vehicle
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 7. Special Requirements */}
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} flex flex-wrap justify-between gap-1`}>
                                                    <span>Special Requirements</span>
                                                </h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-4 gap-x-2">
                                                    {[
                                                        { id: 'reqVeg', label: 'Vegetarian Meal' },
                                                        { id: 'reqFloating', label: 'Floating Breakfast' },
                                                        { id: 'reqWheelchair', label: 'Wheelchair Assistance' },
                                                        { id: 'reqDecor', label: 'Special Decoration' },
                                                        { id: 'reqSenior', label: 'Senior Citizen' },
                                                        { id: 'reqBirthday', label: 'Birthday During Trip' },
                                                        { id: 'reqHoneymoon', label: 'Honeymoon Perks' },
                                                        { id: 'reqAnniversary', label: 'Anniversary During Trip' },
                                                        { id: 'reqCandlelight', label: 'Candlelight Dinner' },
                                                        { id: 'reqManualAdd', label: 'Add Manually' },
                                                    ].map(chk => (
                                                        <label key={chk.id} className="flex items-center gap-2 cursor-pointer group">
                                                            <input type="checkbox" checked={selectedLeadForEdit[chk.id]} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, [chk.id]: e.target.checked })}
                                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer" />
                                                            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{chk.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 8. Payment Request */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Payment Request</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.paymentRequests?.map((req, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">PAYMENT {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('paymentRequests', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Service</label>
                                                                    <CustomSelect value={req.service} onChange={(v) => handleArrayChange('paymentRequests', index, 'service', v)} className={selectCls} options={['Transport', 'Hotel', 'Local Vehicle Operator']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Provider Name </label>
                                                                    <input type="text" value={req.providerName} readOnly className={readonlyCls} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={req.paymentDueDate} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label><input type="text" value={req.serviceCost} onChange={(e) => handleArrayChange('paymentRequests', index, 'serviceCost', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Payment Type</label>
                                                                    <CustomSelect value={req.paymentType} onChange={(v) => handleArrayChange('paymentRequests', index, 'paymentType', v)} className={selectCls} options={['Full Payment', 'Advance', 'Balance']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount to Pay</label><input type="text" value={req.amountToPay} onChange={(e) => handleArrayChange('paymentRequests', index, 'amountToPay', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Account Details</label><input type="text" value={req.paymentAccountDetails} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentAccountDetails', e.target.value)} className={inputCls} /></div>
                                                                <div className="sm:col-start-3 flex items-end">
                                                                    <button type="button" className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 font-bold text-xs rounded transition-colors cursor-pointer text-center">Request To Director & Accounts</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('paymentRequests', { service: '', providerName: '', paymentDueDate: '', serviceCost: '', paymentType: '', amountToPay: '', paymentAccountDetails: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer"><Plus size={14} /> Add Payment Request</button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    /* ─── STANDARD OPS PIPELINE EDIT ────────────────────── */
                                    <div className="space-y-6">
                                        {/* Section 1: LEAD INFO */}
                                        <div className={sectionCls} style={{ borderColor: 'rgba(51,65,85,0.8)' }}>
                                            <h3 className={`${sectionHeadCls} cursor-pointer hover:text-white transition-colors`} 
                                                style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}
                                                onClick={(e) => handleHeaderClick(e, 'leadInfo')}>
                                                <span className="font-bold flex items-center gap-2">
                                                    LEAD INFO 
                                                    <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.leadInfo ? 'rotate-180' : ''}`} />
                                                </span>
                                            </h3>
                                            {openSections.leadInfo && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 animate-in slide-in-from-top-2 fade-in">
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Lead Date</label><input type="text" readOnly value={selectedLeadForEdit.dateAdded || selectedLeadForEdit.createdAt || selectedLeadForEdit.date || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Lead Source</label><input type="text" readOnly value={selectedLeadForEdit.platform || selectedLeadForEdit.leadSource || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Campaign</label><input type="text" readOnly value={selectedLeadForEdit.campaign || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Lead Name</label><input type="text" readOnly value={selectedLeadForEdit.customerName || selectedLeadForEdit.leadName || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Mobile Number</label><input type="text" readOnly value={selectedLeadForEdit.mobileNumber || selectedLeadForEdit.phone || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label><input type="text" readOnly value={selectedLeadForEdit.emailAddress || selectedLeadForEdit.email || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Package Type</label><input type="text" readOnly value={selectedLeadForEdit.packageType || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Budget</label><input type="text" readOnly value={selectedLeadForEdit.budget || selectedLeadForEdit.amount || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Message From Lead</label><input type="text" readOnly value={selectedLeadForEdit.messageFromLead || selectedLeadForEdit.leadMessage || selectedLeadForEdit.message || ''} className={readonlyCls} /></div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 2: DESTINATION REQUEST */}
                                        <div className={sectionCls} style={{ borderColor: 'rgba(51,65,85,0.8)' }}>
                                            <h3 className={`${sectionHeadCls} cursor-pointer hover:text-white transition-colors`} 
                                                style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}
                                                onClick={(e) => handleHeaderClick(e, 'destinationRequest')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold flex items-center gap-2">
                                                        DESTINATION REQUEST
                                                        <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.destinationRequest ? 'rotate-180' : ''}`} />
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'view', section: 'Destination Request' })} className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs font-bold transition-colors cursor-pointer"><Eye size={14} /> View</button>
                                                </div>
                                            </h3>
                                            {openSections.destinationRequest && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 animate-in slide-in-from-top-2 fade-in">
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Destination</label><input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.destination || selectedLeadForEdit.destination || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Customisation Type</label><input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.customisationType || selectedLeadForEdit.customisationType || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Required By</label><input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.requiredByDate || selectedLeadForEdit.customisationRequests?.[0]?.turnaroundTime || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Package Type</label><input type="text" readOnly value={selectedLeadForEdit.tourType || selectedLeadForEdit.packageType || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Travel Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.travelDate || selectedLeadForEdit.travelDates || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Duration</label><input type="text" readOnly value={selectedLeadForEdit.duration || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">No. Of Pax</label><input type="text" readOnly value={`${selectedLeadForEdit.noOfAdults || '0'} Adults, ${selectedLeadForEdit.noOfChildren || '0'} Children`} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Hotel Category</label><input type="text" readOnly value={selectedLeadForEdit.hotelCategory || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Budget</label><input type="text" readOnly value={selectedLeadForEdit.travelBudget || selectedLeadForEdit.budget || selectedLeadForEdit.amount || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Service</label><input type="text" readOnly value={selectedLeadForEdit.services || selectedLeadForEdit.service || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Departure City</label><input type="text" readOnly value={selectedLeadForEdit.departureCity || ''} className={readonlyCls} /></div>
                                                    <div className="hidden md:block"></div> 
                                                    <div className="md:col-span-3">
                                                        <label className="block text-xs font-bold text-slate-400 mb-1">Requirements</label>
                                                        <textarea readOnly rows={2} value={selectedLeadForEdit.customisationRequests?.[0]?.requirements || selectedLeadForEdit.requirements || ''} className={`${readonlyCls} resize-none`} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 3: OPERATIONS ACTIVITY */}
                                        <div className={sectionCls}>
                                            <div className="flex justify-between items-center mb-2 border-b border-slate-800/60 pb-3 cursor-pointer hover:bg-slate-800/20 transition-colors"
                                                 onClick={(e) => handleHeaderClick(e, 'operationsActivity')}>
                                                <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase m-0 flex items-center gap-2">
                                                    OPERATIONS ACTIVITY
                                                    <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.operationsActivity ? 'rotate-180' : ''}`} />
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'history', section: 'Operations Activity' })} className="hover:text-cyan-400 cursor-pointer transition-colors bg-transparent border-none p-0">History</button>
                                                    <span className="text-slate-600">|</span>
                                                    <button type="button" className="hover:text-cyan-400 cursor-pointer transition-colors bg-transparent border-none p-0">Edit</button>
                                                </div>
                                            </div>
                                            {openSections.operationsActivity && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3 animate-in slide-in-from-top-2 fade-in">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Destinations</label>
                                                        <CustomSelect 
                                                            value={selectedLeadForEdit.destination} 
                                                            onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, destination: v })} 
                                                            className={selectCls} 
                                                            options={destinationOptions} 
                                                            placeholder=" "
                                                        />
                                                    </div>
                                                
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Work Type</label>
                                                        <CustomSelect value={selectedLeadForEdit.workType} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, workType: v })} className={selectCls} options={[  'Vendor Assistance', 'Self Preparation','Only Price']} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 4: VENDOR ASSISTANCE */}
                                        {selectedLeadForEdit.workType === 'Vendor Assistance' && (
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} cursor-pointer hover:text-white transition-colors`} 
                                                    style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}
                                                    onClick={(e) => handleHeaderClick(e, 'vendorAssistance')}>
                                                    <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                                                        VENDOR ASSISTANCE
                                                        <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.vendorAssistance ? 'rotate-180' : ''}`} />
                                                    </span>
                                                </h3>
                                                
                                                {openSections.vendorAssistance && (
                                                    <div className="animate-in slide-in-from-top-2 fade-in">
                                                        {selectedLeadForEdit.vendorRequests?.map((req, index) => (
                                                            <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative mb-4 mt-2">
                                                                {selectedLeadForEdit.vendorRequests.length > 1 && (
                                                                    <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-cyan-400 border border-slate-700 rounded">VENDOR {index + 1}</span>
                                                                )}
                                                                {index > 0 && (
                                                                    <button type="button" onClick={() => removeArrayItem('vendorRequests', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>
                                                                )}
                                                                
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-2">
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Destination</label>
                                                                        <input type="text" readOnly value={selectedLeadForEdit.destination} className={readonlyCls} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Services</label>
                                                                        <CustomSelect 
                                                                            value={req.vendorService} 
                                                                            onChange={v => {
                                                                                const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                newReqs[index].vendorService = v;
                                                                                newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                            }} 
                                                                            className={selectCls} 
                                                                            options={['Complete Package', 'Land Only', 'VISA', 'Insurance', 'Hotel Only', 'Vehicle Only', 'Others']} 
                                                                            hideDefaultManual={true}
                                                                            manualTrigger="Others"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">DMC Name</label>
                                                                        <CustomSelect 
                                                                            value={req.vendorDmcName} 
                                                                            onChange={v => handleArrayChange('vendorRequests', index, 'vendorDmcName', v)} 
                                                                            className={selectCls} 
                                                                            options={finalDmcOptions} 
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Contact Person</label>
                                                                        <CustomSelect 
                                                                            value={req.vendorContactPerson} 
                                                                            onChange={v => {
                                                                                const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                newReqs[index].vendorContactPerson = v;
                                                                                newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                            }} 
                                                                            className={selectCls} 
                                                                            options={getContactsForDMC(req.vendorDmcName)} 
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Contact Method</label>
                                                                        <CustomSelect 
                                                                            value={req.contactMethod} 
                                                                            onChange={v => handleArrayChange('vendorRequests', index, 'contactMethod', v)} 
                                                                            className={selectCls} 
                                                                            options={['Email ', 'WhatsApp ', ' Call']} 
                                                                        />
                                                                    </div>

                                                                    {req.vendorService === 'VISA' && (
                                                                        <div>
                                                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">VISA Type</label>
                                                                            <CustomSelect 
                                                                                value={req.vendorVisaType || ''} 
                                                                                onChange={v => {
                                                                                    const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                    newReqs[index].vendorVisaType = v;
                                                                                    newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                    setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                                }} 
                                                                                className={selectCls} 
                                                                                options={['Tourist', 'Business', 'Transit', 'e-Visa']} 
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {req.vendorService === 'Hotel Only' && (
                                                                        <>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-slate-300 mb-1.5">Check-in Date</label>
                                                                                <DatePickerField type="date" value={req.vendorCheckInDate || ''} onChange={e => {
                                                                                    const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                    newReqs[index].vendorCheckInDate = e.target.value;
                                                                                    newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                    setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                                }} className={inputCls} />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-slate-300 mb-1.5">Check-out Date</label>
                                                                                <DatePickerField type="date" value={req.vendorCheckOutDate || ''} onChange={e => {
                                                                                    const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                    newReqs[index].vendorCheckOutDate = e.target.value;
                                                                                    newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                    setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                                }} className={inputCls} />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-slate-300 mb-1.5">Rooms Required</label>
                                                                                <CustomSelect 
                                                                                    value={req.vendorRoomsRequired || ''} 
                                                                                    onChange={v => {
                                                                                        const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                        newReqs[index].vendorRoomsRequired = v;
                                                                                        newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                        setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                                    }} 
                                                                                    className={selectCls} 
                                                                                    options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']} 
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    )}

                                                                    {req.vendorService === 'Vehicle Only' && (
                                                                        <>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-slate-300 mb-1.5">Vehicle Type</label>
                                                                                <CustomSelect value={req.vendorVehicleType || ''} onChange={v => {
                                                                                    const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                    newReqs[index].vendorVehicleType = v;
                                                                                    newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                    setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                                }} className={selectCls} options={['Sedan', 'SUV', 'Minivan', 'Coach']} />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-slate-300 mb-1.5">Pickup Location</label>
                                                                                <input type="text" value={req.vendorPickupLocation || ''} onChange={e => {
                                                                                    const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                    newReqs[index].vendorPickupLocation = e.target.value;
                                                                                    newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                    setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                                }} className={inputCls} />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-bold text-slate-300 mb-1.5">Drop Location</label>
                                                                                <input type="text" value={req.vendorDropLocation || ''} onChange={e => {
                                                                                    const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                    newReqs[index].vendorDropLocation = e.target.value;
                                                                                    newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                    setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                                }} className={inputCls} />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    
                                                                    {req.vendorMessage && (
                                                                        <div className="sm:col-span-3 mt-2 bg-[#091124] border border-slate-700/60 rounded-xl overflow-hidden shadow-inner transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                                                                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/60 bg-slate-900/50">
                                                                                <label className="block text-sm font-bold text-slate-200">Message Format Review & Edit <span className="text-orange-100 ml-1"> ({req.vendorService || 'Custom'})</span></label>
                                                                                <button type="button" onClick={() => copyToClipboard(req.vendorMessage)} className="px-4 py-1.5 bg-[#16D3F2]/10 hover:bg-[#16D3F2]/20 text-[#16D3F2] rounded text-xs font-bold transition-colors cursor-pointer border border-[#16D3F2]/30 flex items-center gap-1.5 shadow-sm"><Copy size={14}/> Copy </button>
                                                                            </div>
                                                                            <div className="p-1">
                                                                                <textarea rows="16" value={req.vendorMessage} onChange={e => handleArrayChange('vendorRequests', index, 'vendorMessage', e.target.value)} className="w-full bg-transparent border-none text-slate-300 text-[13px] leading-relaxed p-4 focus:ring-0 outline-none custom-scrollbar resize-y" spellCheck="false" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <div className="sm:col-span-3 mt-4 flex justify-end">
                                                            <button type="button" onClick={() => addArrayItem('vendorRequests', { vendorService: '', vendorDmcName: '', vendorContactPerson: '', contactMethod: '', vendorVisaType: '', vendorMessage: '' })} className="text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md px-4 py-2 transition-colors flex items-center gap-1.5 cursor-pointer">
                                                                <Plus size={14}/> Add Another Vendor
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Section 5: Itinerary Preparation */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} cursor-pointer hover:text-white transition-colors`} 
                                                style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}
                                                onClick={(e) => handleHeaderClick(e, 'itineraryPreparation')}>
                                                <span className="font-bold flex items-center gap-2">
                                                    Itinerary Preparation
                                                    <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.itineraryPreparation ? 'rotate-180' : ''}`} />
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'view', section: 'Itinerary Preparation' })} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Eye size={12} /> View</button>
                                                    <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Pencil size={12} /> Edit</button>
                                                </div>
                                            </h3>   
                                            {openSections.itineraryPreparation && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 animate-in slide-in-from-top-2 fade-in">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Preparation Method</label>
                                                        <CustomSelect value={selectedLeadForEdit.preparationMethod} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, preparationMethod: v })} className={selectCls} options={['Portal Designer v2', 'Manual Template Excel Sheet', 'External API Integrator Suite']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Itinerary Version</label>
                                                        <CustomSelect value={selectedLeadForEdit.itineraryVersion} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, itineraryVersion: v })} className={selectCls} options={['1.0.0', '1.1.0', '2.0.0']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Working Notes</label>
                                                        <textarea rows="1" value={selectedLeadForEdit.workingNotes} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, workingNotes: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Date & Time</label>
                                                        <DatePickerField type="datetime-local" value={selectedLeadForEdit.itineraryPrepDate} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, itineraryPrepDate: e.target.value })} className={inputCls} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 6: Quality Check */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} cursor-pointer hover:text-white transition-colors`} 
                                                style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}
                                                onClick={(e) => handleHeaderClick(e, 'qualityCheck')}>
                                                <span className="font-bold flex items-center gap-2">
                                                    Quality Check
                                                    <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.qualityCheck ? 'rotate-180' : ''}`} />
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'view', section: 'Quality Check' })} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Eye size={12} /> View</button>
                                                    <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Pencil size={12} /> Edit</button>
                                                </div>
                                            </h3>
                                            {openSections.qualityCheck && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 animate-in slide-in-from-top-2 fade-in">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">QC Status</label>
                                                        <CustomSelect value={selectedLeadForEdit.qcStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, qcStatus: v })} className={selectCls} options={['Pending Review', 'Approved', 'Correction Needed']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">QC Remarks</label>
                                                        <textarea rows="1" value={selectedLeadForEdit.qcRemarks} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, qcRemarks: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Reviewed By</label>
                                                        <input type="text" value={selectedLeadForEdit.reviewedBy} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, reviewedBy: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Date & Time</label>
                                                        <DatePickerField type="datetime-local" value={selectedLeadForEdit.qcDate} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, qcDate: e.target.value })} className={inputCls} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 7: Client Status */}
                                        <div className={sectionCls}>
                                            <h3 className={`${sectionHeadCls} cursor-pointer hover:text-white transition-colors`} 
                                                onClick={(e) => handleHeaderClick(e, 'clientStatus')}>
                                                <span className="font-bold flex items-center gap-2">
                                                    Client Status
                                                    <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.clientStatus ? 'rotate-180' : ''}`} />
                                                </span>
                                            </h3>
                                            {openSections.clientStatus && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4 animate-in slide-in-from-top-2 fade-in">
                                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Lead Status</label><input type="text" readOnly value={selectedLeadForEdit.status || selectedLeadForEdit.leadStatus} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Sales Funnel Lead Status</label><input type="text" readOnly value={selectedLeadForEdit.salesFunnelLeadStatus} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Sales Remarks</label><input type="text" readOnly value={selectedLeadForEdit.salesRemarks} className={readonlyCls} /></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </form>
                    </div>

                  <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] z-50 flex justify-end gap-3 flex-shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)]">
                        <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-transparent border border-cyan-500 hover:bg-slate-800 cursor-pointer text-cyan-400 text-sm sm:text-base font-semibold rounded-lg sm:rounded transition-colors uppercase tracking-wider order-2 sm:order-1">CANCEL</button>
                        <button type="submit" form="edit-ops-form" className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-[#16D3F2] hover:bg-cyan-400 active:bg-cyan-600 border-none cursor-pointer text-[#0f172a] text-sm sm:text-base font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider order-1 sm:order-2">SUBMIT</button>
                    </div>
                </div>
            )}

            {/* ─── ASSIGN MODAL ────────────────────────────────────────────────────── */}
            {isAssignModalOpen && selectedLeadForAssign && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-5 sm:pt-6 pb-2 flex-shrink-0">
                            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="absolute top-4 right-4 text-slate-400 border-none bg-transparent cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 tracking-tight pr-6 truncate">Assign Operation</h2>
                        </div>
                        <div className="px-6 pb-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Job ID</label>
                                <input type="text" readOnly value={`LMN${selectedLeadForAssign.id}`}
                                    className="w-full px-3 py-2.5 sm:py-2 bg-slate-900 border border-slate-700 rounded-lg sm:rounded-md text-slate-300 outline-none font-medium" />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Self Assignment</label>
                                <button type="button" onClick={() => setAssignTo('Self Assigned')}
                                    className={`w-full py-3 sm:py-2.5 rounded-lg sm:rounded-md font-semibold cursor-pointer text-center border transition-all ${assignTo === 'Self Assigned' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800/60'}`}>
                                    {assignTo === 'Self Assigned' ? '✓ Claimed by Me' : 'Assign to Myself'}
                                </button>
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Assigned To (Operations Team)</label>
                                <select 
                                    value={assignTo !== 'Self Assigned' ? assignTo : ''} 
                                    onChange={(e) => setAssignTo(e.target.value)} 
                                    className={`w-full px-3 py-3 sm:py-2.5 border rounded-lg sm:rounded-md bg-slate-900 text-white focus:outline-none transition-colors ${assignTo && assignTo !== 'Self Assigned' ? 'border-orange-500 focus:border-orange-500' : 'border-slate-700 focus:border-orange-500'}`}
                                >
                                    <option value="" disabled hidden></option>
                                    {operationsStaff.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-2">
                                <button type="button" onClick={handleAssignSubmit} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-orange-500 border-none cursor-pointer hover:bg-orange-600 text-white font-bold rounded-lg sm:rounded shadow transition-colors order-1 sm:order-2">Submit</button>
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-transparent cursor-pointer border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg sm:rounded transition-colors order-2 sm:order-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── HISTORY & VIEW MODAL ────────────────────────────────────────────── */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#1e293b] border-0 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-[#0f172a]">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                {activeModal.type === 'history' ? <History size={16} className="text-cyan-400" /> : <Eye size={16} className="text-cyan-400" />}
                                {activeModal.type === 'history' ? `${activeModal.section} - History` : `${activeModal.section} - View Details`}
                            </h3>
                            <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"><X size={18} /></button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto bg-[#0f172a] text-slate-300 text-sm max-h-[60vh] custom-scrollbar">
                            {activeModal.type === 'history' ? (
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                        <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-[#0f172a] bg-cyan-500 text-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg bg-slate-900 border border-slate-800 shadow">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-cyan-400 text-xs">Operations Team</span>
                                                <span className="text-[10px] text-slate-500">2026-06-23 11:45 AM</span>
                                            </div>
                                            <p className="text-xs text-slate-300">Reviewed initial client budget limitations and flagged priority requirement.</p>
                                        </div>
                                    </div>
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                        <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-[#0f172a] bg-slate-500 text-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg bg-slate-900 border border-slate-800 shadow">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-slate-400 text-xs">System</span>
                                                <span className="text-[10px] text-slate-500">2026-06-09 10:30 AM</span>
                                            </div>
                                            <p className="text-xs text-slate-300">Job handover pushed from Sales Pipeline into Operations pool.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {activeModal.section === 'Destination Request' && (
                                        <div className="space-y-4">
                                            {selectedLeadForEdit.customisationRequests?.map((req, idx) => (
                                                <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs text-slate-300 shadow-inner">
                                                    <h4 className="font-bold text-cyan-400 mb-3 border-b border-slate-700/50 pb-1">Request #{idx + 1}</h4>
                                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                                        <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Destination</span><span className="text-slate-200 font-medium">{req.destination || 'N/A'}</span></div>
                                                        <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Customisation Type</span><span className="text-slate-200 font-medium">{req.customisationType || 'N/A'}</span></div>
                                                        <div className="flex flex-col col-span-2"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Requirements</span><span className="text-slate-200 font-medium whitespace-pre-wrap">{req.requirements || 'N/A'}</span></div>
                                                        <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Assigned To</span><span className="text-slate-200 font-medium">{req.assignedTo || 'N/A'}</span></div>
                                                        <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Raise Request</span><span className="text-slate-200 font-medium">{req.raiseRequest || 'N/A'}</span></div>
                                                        <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Readymade Package Details</span><span className="text-slate-200 font-medium">{req.readymadePackageDetails || 'N/A'}</span></div>
                                                        <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Turnaround Time</span><span className="text-slate-200 font-medium">{req.turnaroundTime || 'N/A'}</span></div>
                                                        <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Status</span><span className="text-slate-200 font-medium">{req.status || 'N/A'}</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Fallback parameters */}
                                    {!['Destination Request'].includes(activeModal.section) && (
                                        <div className="space-y-3">
                                            <p className="text-slate-400 text-xs">Viewing locked system parameters for <strong>{activeModal.section}</strong> module.</p>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                                                {Object.entries(selectedLeadForEdit || {})
                                                    .filter(([k]) => !['passengers', 'flights', 'visas', 'domTransports', 'intHotels', 'domHotels', 'intTransports', 'domLocalTransports', 'localVoiceRecordings', 'customisationRequests', 'paymentRequests'].includes(k))
                                                    .slice(0, 15)
                                                    .map(([k, v]) => (
                                                        <div key={k} className="flex border-b border-slate-800/50 py-1 last:border-0">
                                                            <span className="w-1/2 text-cyan-500/70">{k}:</span>
                                                            <span className="w-1/2 text-slate-200">{String(v || 'N/A')}</span>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-700 bg-[#0b1329] flex justify-end">
                            <button type="button" onClick={() => setActiveModal(null)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer tracking-wide uppercase">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── FULFILLMENT MODAL ──────────────────────────────────────────────── */}
            {leadToFulfill && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#1e293b] border-0 rounded-xl shadow-2xl w-full max-w-sm text-center p-6">
                        <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Send to Fulfillment?</h3>
                        <p className="text-slate-400 mb-5 text-xs">Confirm push for <strong>LMN{leadToFulfill.id}</strong>.</p>
                        <div className="flex justify-center gap-2">
                            <button type="button" onClick={() => setLeadToFulfill(null)} className="flex-1 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                            <button type="button" onClick={() => sendToFulfillment(leadToFulfill)} className="flex-1 py-2 rounded bg-orange-500 text-slate-900 font-black text-xs cursor-pointer">Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── PROFILE VIEW MODAL ─────────────────────────────────────────────── */}
            {selectedLeadForView && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#0f172a] border-0 rounded-lg shadow-2xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Profile Inspector — LMN{selectedLeadForView.id}</h2>
                            <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 text-slate-300 text-xs font-mono">
                            <p><strong>Customer:</strong> {selectedLeadForView.customerName || selectedLeadForView.profileName}</p>
                            <p><strong>Destination:</strong> {selectedLeadForView.destination}</p>
                            <p><strong>Budget:</strong> <span className="text-emerald-400 font-bold">{selectedLeadForView.amount || selectedLeadForView.budget}</span></p>
                            <p><strong>Status:</strong> <span className="text-cyan-400">{selectedLeadForView.rowStatus || selectedLeadForView.status}</span></p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}