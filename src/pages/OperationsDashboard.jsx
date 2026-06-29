import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Eye, Pencil, Clock, CheckSquare, ArrowUpDown, History,
    Search, SlidersHorizontal, MapPin, Calendar,
    ShoppingCart, Target, X, Send, AlertCircle, CheckCircle2,
    Mic, Trash2, Layers, BookmarkCheck, PlaneTakeoff, Info,
    Briefcase, FileText, Activity, ShieldCheck, Share2, Play, Square, Plus,
    ChevronLeft, ChevronRight, ArrowUp
} from 'lucide-react';

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

const MOCK_LEADS = [
    {
        id: 12,
        customerName: 'heer',
        destination: 'Singapore',
        date: 'March 4',
        amount: '₹5,00,000+',
        status: 'Confirmed Bookings',
        platform: 'Instagram',
        phone: '9876543210',
        leadMessage: 'Looking for a luxury Singapore trip for 2 adults',
        priority: 'High',
        createDate: '2026-06-09 10:30',
        salesExecutive: 'Alex',
        tourType: 'International Tour',
        duration: '5 Nights / 6 Days',
        noOfAdults: '2',
        noOfChildren: '0',
        hotelCategory: '5 Star',
        travelDate: '2026-08-12',
        travelMonth: 'August',
        budget: '₹5,00,000+',
        workType: 'FIT',
        activityType: 'Call Client',
        activityOutcome: 'Connected',
        notes: 'Initial blueprint parameters confirmed.',
        nextActionRequired: 'Yes',
        nextActionDate: '2026-06-15T10:00',
        vendorName: 'Global Hotels Inc',
        contactMethod: 'Email Platform',
        contactDate: '2026-06-09T14:30',
        vendorResponseStatus: 'Rates Received',
        followUpType: 'Follow up call',
        preparationMethod: 'Portal Designer v2',
        itineraryVersion: '1.0.0',
        workingNotes: 'Margin targeted at 12%',
        qcStatus: 'Approved',
        reviewedBy: 'Operations Lead Manager',
        sharedTo: 'Alex',
        sharedVia: 'Slack Channel Matrix',
        salesAcknowledged: 'Yes',
        finalStatus: 'Handover Completed',
        salesFunnelLeadStatus: 'Hot Prospect',
        salesFunnelNotes: 'Ready to clear payment token upon receipt of v1 itinerary layout.',
        localVoiceRecordings: [],
        customisationRequests: '[{"destination":"Singapore","customisationType":"New Itinerary","requirements":"Need Universal Studios tickets included","assignedTo":"Operations Desk 1","raiseRequest":"Yes","readymadePackageDetails":"Standard SG 5N","turnaroundTime":"24 hours","status":"Pending"}]'
    }
];

// ─────────────────────────────────────────────
// COMPONENT – Custom Select (with Manual Entry)
// ─────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder = "-- Select --", className }) => {
    const normalizedOptions = options.map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt });
    const optionValues = normalizedOptions.map(opt => String(opt.value));
    
    const safeValue = value !== undefined && value !== null ? String(value) : '';
    const isCustomValue = safeValue !== "" && !optionValues.includes(safeValue);

    const [isManual, setIsManual] = useState(isCustomValue);

    useEffect(() => {
        setIsManual(safeValue !== "" && !optionValues.includes(safeValue));
    }, [safeValue]);

    if (isManual) {
        return (
            <div className="flex items-center gap-1.5 w-full transition-all">
                <input
                    type="text"
                    value={safeValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Manual entry..."
                    className={`w-full bg-slate-900 border border-slate-700 rounded text-white text-sm font-bold focus:border-cyan-500 outline-none flex-1 min-w-[80px] ${className && className.includes('py-1.5') ? 'py-1.5 px-3' : 'py-2 px-3'}`}
                    autoFocus
                />
                <button
                    type="button"
                    onClick={() => {
                        setIsManual(false);
                        onChange('');
                    }}
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
                if (e.target.value === '__MANUAL__') {
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
            <option value="__MANUAL__" className="font-bold text-cyan-400 bg-slate-800">+ Add Manual / Other</option>
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
                    try {
                        inputRef.current.showPicker();
                    } catch (e) {
                        inputRef.current.focus();
                    }
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
// HOOK – useLeads ENGINE
// ─────────────────────────────────────────────
function useLeads(triggerNotification) {
    const [leads, setLeads] = useState([]);
    const [isLoading, setLoading] = useState(true);

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
                    catch (e) { console.warn("Failed to extract voice data array:", e); }
                }

                let currentStatus = lead.status || 'New Requests';
                if (currentStatus === 'Move To Operation') currentStatus = 'New Requests';
                if (currentStatus === 'Ops Assigned') currentStatus = 'Follow-Up';

                return {
                    ...lead,
                    date: lead.travelDates || lead.date || 'TBD',
                    amount: lead.budget || lead.amount || 'TBD',
                    status: currentStatus,
                    localVoiceRecordings: parsedAudio
                };
            });

            setLeads(mappedData);
        } catch (err) {
            console.error('Failed to sync via API route, activating fallback mock data matrix:', err);
            setLeads(MOCK_LEADS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    const acceptJob = async (id, targetStatus = 'Follow-Up') => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, status: targetStatus } : l));
        try {
            const res = await fetch(`${API_BASE_URL}/leads/${id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStatus }),
            });
            if (!res.ok) throw new Error('Network status commit failed');
            triggerNotification('success', `Job token assignment updated to ${targetStatus}.`);
        } catch (err) {
            triggerNotification('success', `Job assigned to ${targetStatus} locally.`);
        }
    };

    const updateLead = async (id, updatedData) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedData } : l));
        try {
            const res = await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!res.ok) throw new Error('Commit request rejected');
            triggerNotification('success', 'CRM Sales Handover configuration update committed!');
            fetchLeads();
        } catch (err) {
            triggerNotification('success', 'Changes updated inside active local application stack.');
        }
    };

    const sendToFulfillment = async (lead) => {
        try {
            const response = await fetch(`${API_BASE_URL}/leads/${lead.id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Upcoming Departure' })
            });
            if (!response.ok) throw new Error('Source status parameter reference mismatch');
            setLeads(prev => prev.filter(l => l.id !== lead.id));
            triggerNotification('success', 'Job profile transmitted to external fulfillment logs.');
        } catch (err) {
            setLeads(prev => prev.filter(l => l.id !== lead.id));
            triggerNotification('success', 'Job sent to fulfillment (simulation mode).');
        }
    };

    return { leads, isLoading, acceptJob, updateLead, sendToFulfillment, refetch: fetchLeads };
}

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

    useEffect(() => {
        if (notification.show) {
            const t = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
            return () => clearTimeout(t);
        }
    }, [notification.show]);

    const { leads, isLoading, acceptJob, updateLead, sendToFulfillment } = useLeads(triggerNotification);

    const [activeTab, setActiveTab] = useState('New Requests');
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState('All');

    const [selectedLeadForView, setSelectedLeadForView] = useState(null);
    const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null);
    const [leadToAcknowledge, setLeadToAcknowledge] = useState(null);
    const [leadToFulfill, setLeadToFulfill] = useState(null);
    
    // Popup Modal State for History & View modes
    const [activeModal, setActiveModal] = useState(null); 

    const [showScrollTop, setShowScrollTop] = useState(false);
    const mainRef = useRef(null);
    const tabScrollRef = useRef(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [playingIndex, setPlayingIndex] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioPlayersRef = useRef({});

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollTabs = (dir) => {
        if (tabScrollRef.current) {
            tabScrollRef.current.scrollBy({ left: dir * 160, behavior: 'smooth' });
        }
    }

    const countNew = leads.filter(l => l.status === 'New Requests' || l.status === 'Move To Operation').length;
    const countFollow = leads.filter(l => l.status === 'Follow-Up' || l.status === 'Ops Assigned').length;
    const countShared = leads.filter(l => l.status === 'Shared to Sales').length;
    const countBooked = leads.filter(l => l.status === 'Confirmed Bookings').length;
    const countDepart = leads.filter(l => l.status === 'Upcoming Departure').length;

    const handleTabChange = (tab) => { setActiveTab(tab); setCurrentPage(1); };
    const handleSearch = (val) => { setSearchQuery(val); setCurrentPage(1); };

    const startRecording = async () => {
        audioChunksRef.current = [];
        setRecordingTime(0);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(audioBlob);
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    setSelectedLeadForEdit(prev => ({
                        ...prev,
                        localVoiceRecordings: [...(prev.localVoiceRecordings || []), { url, base64: reader.result, timestamp: new Date().toLocaleString() }]
                    }));
                };
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) {
            alert('Microphone access denied. Please check system parameters.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const deleteRecording = (index) => {
        if (playingIndex === index) {
            audioPlayersRef.current[index]?.pause();
            setPlayingIndex(null);
        }
        setSelectedLeadForEdit(prev => ({
            ...prev,
            localVoiceRecordings: prev.localVoiceRecordings.filter((_, i) => i !== index)
        }));
    };

    const togglePlayback = (index) => {
        const player = audioPlayersRef.current[index];
        if (!player) return;
        if (playingIndex === index) {
            player.pause();
            setPlayingIndex(null);
        } else {
            audioPlayersRef.current[playingIndex]?.pause();
            player.play();
            setPlayingIndex(index);
        }
    };

    const formatTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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

    // Deep nested transport array handlers
    const updateDomTransport = (index, field, value) => {
        const newTrans = [...selectedLeadForEdit.domTransports];
        newTrans[index][field] = value;
        setSelectedLeadForEdit({ ...selectedLeadForEdit, domTransports: newTrans });
    };

    const updateDomTransportNested = (index, mode, leg, field, value) => {
        const newTrans = JSON.parse(JSON.stringify(selectedLeadForEdit.domTransports));
        if (!newTrans[index][mode]) {
            newTrans[index][mode] = { onward: {}, return: null };
        }
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


    const handleEditClick = (lead) => {
        let parsedCustomisationRequests = [];
        if (lead.customisationRequests) {
            try { 
                parsedCustomisationRequests = typeof lead.customisationRequests === 'string' 
                    ? JSON.parse(lead.customisationRequests) 
                    : lead.customisationRequests; 
            } catch { parsedCustomisationRequests = []; }
        }
        
        // Ensure at least one request exists to populate the Operations data if missing
        if (!parsedCustomisationRequests || parsedCustomisationRequests.length === 0) {
            parsedCustomisationRequests = [{
                destination: lead.destinationRequest || lead.destination || '',
                customisationType: lead.customisationType || '',
                requirements: lead.requirements || '',
                readymadePackageDetails: lead.readymadePackageDetails || '',
                turnaroundTime: lead.turnaroundTime || '',
                status: 'Pending'
            }];
        }

        const passengers = Array.isArray(lead.passengers) && lead.passengers.length > 0
            ? lead.passengers
            : [{ fullName: '', dob: '', gender: '', aadhar: '', pan: '', passportNumber: '', passportIssueDate: '', passportExpiry: '', passportPlaceOfIssue: '', otherId: '', mobile: '', emergencyContact: '' }];

        const intTransports = Array.isArray(lead.intTransports) && lead.intTransports.length > 0
            ? lead.intTransports
            : [{ operatorName: '', vehicleType: '', contactPerson: '', driverName: '', vehicleNumber: '', status: '', driverContact: '', duration: '', pickupPoint: '', pickupDate: '', dropPoint: '', dropDate: '', notes: '', cost: '', markup: '', paymentDueDate: '' }];

        const flights = Array.isArray(lead.flights) && lead.flights.length > 0
            ? lead.flights
            : [{ flightType: '', flightResponsibility: '', bookingStatus: '', airline: '', pnr: '', bookedThrough: '', category: '', departureDateTime: '', boardingPoint: '', ticketShared: '', ticketSharedDate: '', deboardingPoint: '', flightCost: '', markupCost: '', driveLink: '' }];

        const visas = Array.isArray(lead.visas) && lead.visas.length > 0
            ? lead.visas
            : [{ destination: '', visaType: '', transitVisaReq: '', arrivalCardApplicable: '', arrivalCardDetails: '', appliedBy: '', docsPending: '', visaStatus: '', visaCopyShared: '', visaApprovalDate: '', visaExpiryDate: '', visaCost: '', markupCost: '' }];

        // Initialize Domestic Form arrays
        const domTransports = Array.isArray(lead.domTransports) && lead.domTransports.length > 0
            ? lead.domTransports
            : [{
                transportType: '', bookedBy: '', bookingStatus: '', ticketSharedToClient: '', sharedDate: '',
                flight: { onward: { airline: '', pnr: '', bookingDate: '', flightCost: '', markupCost: '', depDateTime: '', from: '', attachTicket: '', notes: '', to: '' }, return: null },
                train: { onward: { trainName: '', trainNo: '', bookingDate: '', boardingStation: '', destination: '', trainStartTime: '', cost: '', markupCost: '', trainReachingTime: '', seatDetails: '', trainClass: '', attachTicketLink: '', meals: '' }, return: null },
                bus: { onward: { serviceProvider: '', bookingDate: '', destination: '', boardingPoint: '', travelDateTime: '', seatDetails: '', cost: '', markupCost: '', attachTicketLink: '' }, return: null }
            }];

        const intHotels = Array.isArray(lead.intHotels) && lead.intHotels.length > 0
            ? lead.intHotels
            : [{ location: '', hotelName: '', hotelCategory: '', bookedBy: '', refNo: '', status: '', roomCategory: '', noOfRooms: '', addMattress: '', specifications: '', mealPlan: '', earlyCheckIn: '', checkInDateTime: '', checkOutDateTime: '', refreshmentRoom: '', cost: '', paymentDueDate: '', attachVoucher: '', specialArrangements: '', notes: '' }];

        const domHotels = Array.isArray(lead.domHotels) && lead.domHotels.length > 0
            ? lead.domHotels
            : [{ location: '', hotelName: '', hotelCategory: '', bookedBy: '', refNo: '', status: '', roomCategory: '', noOfRooms: '', addMattress: '', specifications: '', mealPlan: '', earlyCheckIn: '', checkInDateTime: '', checkOutDateTime: '', refreshmentRoom: '', cost: '', markup: '', paymentDueDate: '', attachVoucher: '', specialArrangements: '', notes: '' }];

        const domLocalTransports = Array.isArray(lead.domLocalTransports) && lead.domLocalTransports.length > 0
            ? lead.domLocalTransports
            : [{ serviceProvider: '', vehicleType: '', contactPerson: '', driverName: '', vehicleNumber: '', status: '', pickupPoint: '', pickupDate: '', duration: '', dropPoint: '', dropDate: '', tollParking: '', cost: '', markup: '', paymentDueDate: '', notes: '' }];

        const paymentRequests = Array.isArray(lead.paymentRequests) && lead.paymentRequests.length > 0
            ? lead.paymentRequests
            : [{ service: '', providerName: '', paymentDueDate: '', serviceCost: '', paymentType: '', amountToPay: '', paymentAccountDetails: '' }];

        setSelectedLeadForEdit({
            ...lead,
            customisationRequests: parsedCustomisationRequests,
            customisationType: lead.customisationType || '',
            customerName: lead.customerName || lead.profileName || '',
            mobileNumber: lead.phone || lead.mobileNumber || '',
            salesExecutive: lead.salesExecutive || '',
            destinationRequest: lead.destinationRequest || '',
            tourType: getOperationTourType(lead),
            duration: lead.duration || '',
            noOfAdults: lead.noOfAdults || '',
            noOfChildren: lead.noOfChildren || '',
            hotelCategory: lead.hotelCategory || '',
            travelDate: lead.travelDate || lead.travelDates || '',
            travelMonth: lead.travelMonth || '',
            budget: lead.budget || lead.amount || '',
            readymadePackageDetails: lead.readymadePackageDetails || '',
            turnaroundTime: lead.turnaroundTime || '',
            salesRemarks: lead.salesRemarks || '',
            voiceNote: lead.voiceNote || '',
            destination: lead.destination || '',
            workType: lead.workType || '',
            priority: lead.priority || '',
            status: lead.status || '',
            activityType: lead.activityType || '',
            activityOutcome: lead.activityOutcome || '',
            notes: lead.notes || '',
            nextActionRequired: lead.nextActionRequired || '',
            nextActionDate: lead.nextActionDate || '',
            vendorName: lead.vendorName || '',
            contactMethod: lead.contactMethod || '',
            contactDate: lead.contactDate || '',
            vendorResponseStatus: lead.vendorResponseStatus || '',
            vendorRemarks: lead.vendorRemarks || '',
            nextFollowType: lead.nextFollowType || '',
            followUpType: lead.followUpType || '',
            preparationMethod: lead.preparationMethod || '',
            itineraryVersion: lead.itineraryVersion || '',
            workingNotes: lead.workingNotes || '',
            itineraryPrepDate: lead.itineraryPrepDate || '',
            qcStatus: lead.qcStatus || '',
            qcRemarks: lead.qcRemarks || '',
            reviewedBy: lead.reviewedBy || '',
            qcDate: lead.qcDate || '',
            sharedTo: lead.sharedTo || '',
            sharedVia: lead.sharedVia || '',
            salesAcknowledged: lead.salesAcknowledged || '',
            finalStatus: lead.finalStatus || '',
            salesFunnelLeadStatus: lead.salesFunnelLeadStatus || 'Pipeline Active',
            salesFunnelNotes: lead.salesFunnelNotes || '',
            localVoiceRecordings: lead.localVoiceRecordings || [],
            bookingDate: lead.bookingDate || '',
            packageCost: lead.packageCost || lead.amount || '',
            confirmationDate: lead.confirmationDate || '',
            
            // Shared details
            passengers,
            intTransports,
            flights,
            visas,
            domTransports,
            domHotels,
            intHotels,
            domLocalTransports,
            paymentRequests,

            // Simple Documents
            docAadhar: lead.docAadhar || '',
            docPan: lead.docPan || '',
            docPhoto: lead.docPhoto || '',
            docPassport: lead.docPassport || '',
            docDriveLink: lead.docDriveLink || '',
            docStatus: lead.docStatus || '',
            docNotes: lead.docNotes || '',

            // Domestic/International General Single fields
            domTransportType: lead.domTransportType || lead.transportMode || '',
            specialOffers: lead.specialOffers || lead.offers || '',
            arrivalDate: lead.arrivalDate || '',
            departureDate: lead.departureDate || '',
            returnDate: lead.returnDate || '',

            // International Insurance & DMC
            insRequired: lead.insRequired || '',
            insProvider: lead.insProvider || '',
            insPolicyNo: lead.insPolicyNo || '',
            insCost: lead.insCost || '',
            insMarkup: lead.insMarkup || '',
            insStatus: lead.insStatus || '',
            insPolicyShared: lead.insPolicyShared || '',

            dmcName: lead.dmcName || '',
            dmcContactPerson: lead.dmcContactPerson || '',
            dmcPackageType: lead.dmcPackageType || '',
            dmcWhatsapp: lead.dmcWhatsapp || '',
            dmcEmail: lead.dmcEmail || '',
            dmcStatus: lead.dmcStatus || '',
            dmcRefNo: lead.dmcRefNo || '',
            dmcPackageCost: lead.dmcPackageCost || '',
            dmcMarkupCost: lead.dmcMarkupCost || '',
            dmcVoucherReceived: lead.dmcVoucherReceived || '',
            dmcDeliverables: lead.dmcDeliverables || '',

            // Checkboxes
            reqVeg: lead.reqVeg || false,
            reqWheelchair: lead.reqWheelchair || false,
            reqSenior: lead.reqSenior || false,
            reqHoneymoon: lead.reqHoneymoon || false,
            reqCandlelight: lead.reqCandlelight || false,
            reqFloating: lead.reqFloating || false,
            reqDecor: lead.reqDecor || false,
            reqBirthday: lead.reqBirthday || false,
            reqAnniversary: lead.reqAnniversary || false,
            reqManualAdd: lead.reqManualAdd || false
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        updateLead(selectedLeadForEdit.id, selectedLeadForEdit);
        setSelectedLeadForEdit(null);
    };

    const handleSendToFulfillment = async () => {
        try {
            await sendToFulfillment(leadToFulfill);
            setLeadToFulfill(null);
        } catch (error) {
            triggerNotification('error', 'Transmission execution exception.');
        }
    };

    const filtered = leads.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || `LMN${item.id}`.toLowerCase().includes(q) || (item.customerName || '').toLowerCase().includes(q) || (item.destination || '').toLowerCase().includes(q);
        let sNorm = item.status;
        if (sNorm === 'Move To Operation') sNorm = 'New Requests';
        if (sNorm === 'Ops Assigned') sNorm = 'Follow-Up';
        const matchTab = sNorm === activeTab;
        return matchSearch && matchTab && (selectedPlatform === 'All' ? true : item.platform === selectedPlatform);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
    const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    const categories = [
        { id: 'New Requests', label: 'New Requests', icon: ShoppingCart, count: countNew },
        { id: 'Follow-Up', label: 'Follow-Up', icon: Target, count: countFollow },
        { id: 'Shared to Sales', label: 'Shared to Sales', icon: Layers, count: countShared },
        { id: 'Confirmed Bookings', label: 'Confirmed Bookings', icon: BookmarkCheck, count: countBooked },
        { id: 'Upcoming Departure', label: 'Upcoming Departure', icon: PlaneTakeoff, count: countDepart },
    ];

    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-400 text-sm cursor-not-allowed";
    const sectionCls = "p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm";
    const sectionHeadCls = "text-sm font-bold text-cyan-400 mb-5 pb-2 border-b border-slate-800/60 tracking-wider uppercase";

    // Dynamic Destinations pulled strictly from the Customisation Requests array attached to the Lead
    const uniqueDestinations = selectedLeadForEdit ? [...new Set(
        (selectedLeadForEdit.customisationRequests || [])
        .map(req => req.destination)
        .filter(Boolean)
    )] : [];

    // Safe fallback so dropdown doesn't break if Sales failed to provide a destination
    const destinationOptions = uniqueDestinations.length > 0 ? uniqueDestinations : ['Singapore', 'Dubai', 'Thailand', 'Malaysia', 'Japan', { value: 'UK', label: 'United Kingdom' }, 'India'];

    return (
        <div
            ref={mainRef}
            className="w-full bg-[#0f172a] min-h-screen font-sans text-white overflow-y-auto relative"
            style={{ height: '100vh' }}
        >
            <style>{`
                .custom-date-input::-webkit-calendar-picker-indicator {
                    opacity: 0;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                }
            `}</style>
            
            <div className="p-4 sm:p-6">
                {notification.show && (
                    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-bold bg-[#0d233e] tracking-wide animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-cyan-500 text-cyan-400'}`}>
                        {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        <span>{notification.message}</span>
                    </div>
                )}

                <div className="py-12 mb-0 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Operations Dashboard</h1>
                    <p className="text-slate-400 text-sm sm:text-base mt-1">Manage, allocate, and process active operational pipeline handovers.</p>
                </div>

                <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeTab === cat.id;
                        return (
                            <div
                                key={cat.id}
                                onClick={() => handleTabChange(cat.id)}
                                className={`relative p-5 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md ${isActive ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200'}`}
                            >
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
                                <input type="text" placeholder="Search Name, ID, Destination..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-600 rounded-lg focus:outline-none text-slate-100 placeholder-slate-500" />
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
                                    <th className="px-6 py-4">Job ID</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Destination</th>
                                    <th className="px-6 py-4">Work / Priority</th>
                                    {activeTab === 'Follow-Up' && <th className="px-6 py-4">Vendor</th>}
                                    {activeTab === 'Shared to Sales' && <th className="px-6 py-4">Version</th>}
                                    {activeTab === 'Confirmed Bookings' && <th className="px-6 py-4">Value</th>}
                                    {activeTab === 'Upcoming Departure' && <th className="px-6 py-4">Status</th>}
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/20">
                                {isLoading ? (
                                    <tr><td colSpan="11" className="px-6 py-12 text-center text-slate-500">Querying database records...</td></tr>
                                ) : paginated.length > 0 ? paginated.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
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
                                                    <span>Vendor: <strong className="text-slate-200">{row.vendorName || 'Internal'}</strong></span>
                                                    <span>Next: <strong className="text-amber-400">{row.nextFollowUp || 'TBD'}</strong></span>
                                                </div>
                                            </td>
                                        )}
                                        {activeTab === 'Shared to Sales' && (
                                            <td className="px-6 py-4">
                                                <span className="font-mono bg-[#1a3350] text-sky-300 px-2 py-0.5 rounded font-bold text-xs">v{row.itineraryVersion || '1.0.0'}</span>
                                            </td>
                                        )}
                                        {activeTab === 'Confirmed Bookings' && (
                                            <td className="px-6 py-4">
                                                <span className="text-emerald-400 font-black font-mono">{row.amount || '₹2,50,000'}</span>
                                            </td>
                                        )}
                                        {activeTab === 'Upcoming Departure' && (
                                            <td className="px-6 py-4">
                                                <span className="text-cyan-400 font-bold text-xs bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded">{row.voucherStatus || 'Vouchered'}</span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                {activeTab === 'New Requests' ? (
                                                    <button type="button" onClick={() => setLeadToAcknowledge(row)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-900 rounded-md transition-colors border-none cursor-pointer uppercase tracking-wider">
                                                        <CheckSquare size={13} /> Acknowledge
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-md transition-colors" title="View Profile"><Eye size={18} /></button>
                                                        <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/20 rounded-md transition-colors" title="Edit"><Pencil size={18} /></button>
                                                        
                                                        {activeTab === 'Follow-Up' && (
                                                            <button type="button" onClick={() => updateLead(row.id, { status: 'Shared to Sales' })} className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-900/30 rounded-md transition-colors" title="Share back to Sales">
                                                                <Share2 size={18} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {activeTab !== 'Upcoming Departure' && (
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
                            <div key={row.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-300 text-sm">LMN{row.id}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-900/40 text-xs font-bold">{row.workType || 'FIT'}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${row.priority === 'High' ? 'bg-red-950 text-red-400' : 'bg-blue-950 text-blue-400'}`}>{row.priority || 'Normal'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {activeTab === 'New Requests' ? (
                                            <button type="button" onClick={() => setLeadToAcknowledge(row)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-900 rounded-md border-none cursor-pointer">
                                                <CheckSquare size={12} /> Ack
                                            </button>
                                        ) : (
                                            <>
                                                <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 bg-slate-800 rounded-md border border-slate-700" title="View"><Eye size={15} /></button>
                                                <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 bg-slate-800 rounded-md border border-slate-700" title="Edit"><Pencil size={15} /></button>
                                                
                                                {activeTab === 'Follow-Up' && (
                                                    <button type="button" onClick={() => updateLead(row.id, { status: 'Shared to Sales' })} className="p-1.5 text-slate-400 hover:text-purple-400 bg-slate-800 rounded-md border border-slate-700" title="Share to Sales">
                                                        <Share2 size={15} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {activeTab !== 'Upcoming Departure' && (
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
                                        Vendor: <strong className="text-slate-200">{row.vendorName || 'Internal'}</strong>
                                        <span className="mx-2">·</span>
                                        Next: <strong className="text-amber-400">{row.nextFollowUp || 'TBD'}</strong>
                                    </div>
                                )}
                                {activeTab === 'Shared to Sales' && (
                                    <span className="inline-block mt-1 font-mono bg-[#1a3350] text-sky-300 px-2 py-0.5 rounded font-bold text-xs">v{row.itineraryVersion || '1.0.0'}</span>
                                )}
                                {activeTab === 'Confirmed Bookings' && (
                                    <span className="inline-block mt-1 text-emerald-400 font-black font-mono text-sm">{row.amount || '₹2,50,000'}</span>
                                )}
                                {activeTab === 'Upcoming Departure' && (
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

            {/* ─── EDIT MODAL ─────────────────────────────────────────────────────── */}
            {selectedLeadForEdit && (
                <div className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-none sm:rounded-xl shadow-2xl w-full sm:max-w-6xl h-full sm:h-[92vh] flex flex-col text-slate-100">
                        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] flex-shrink-0 rounded-t-none sm:rounded-t-xl">
                            <h2 className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                <FileText size={18} className="text-cyan-400 flex-shrink-0" />
                                <span className="truncate">
                                    {activeTab === 'Confirmed Bookings'
                                        ? `Confirmed Booking — ${selectedLeadForEdit.tourType === 'International Tour' ? 'Intl' : 'Dom'} (LMN${selectedLeadForEdit.id})`
                                        : `CRM Handover Sheet (LMN${selectedLeadForEdit.id})`
                                    }
                                </span>
                            </h2>
                            <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="text-slate-400 hover:text-white p-1 bg-transparent border-none cursor-pointer flex-shrink-0"><X size={22} /></button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 bg-[#0f172a] custom-scrollbar">

                                {activeTab === 'Confirmed Bookings' ? (
                                    selectedLeadForEdit.tourType === 'International Tour' ? (
                                        /* ───────────────────────────────────────────── */
                                        /* NEW INTERNATIONAL CONFIRMED BOOKING VIEW      */
                                        /* ───────────────────────────────────────────── */
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
                                                    <span>Passenger Details</span>
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedLeadForEdit.passengers?.map((pax, index) => (
                                                        <div key={index} className="p-4 bg-slate-950 rounded-lg border border-slate-800 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">PAX {index + 1}</span>
                                                            {index > 0 && (
                                                                <button type="button" onClick={() => removeArrayItem('passengers', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>
                                                            )}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Full Name As Per Passport</label><input type="text" value={pax.fullName} onChange={(e) => handleArrayChange('passengers', index, 'fullName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Date Of Birth</label><DatePickerField type="date" value={pax.dob} onChange={(e) => handleArrayChange('passengers', index, 'dob', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                                                                    <CustomSelect value={pax.gender} onChange={(val) => handleArrayChange('passengers', index, 'gender', val)} className={selectCls} placeholder="Select Gender" options={['Male', 'Female', 'Other']} />
                                                                </div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Aadhar Card Number</label><input type="text" value={pax.aadhar} onChange={(e) => handleArrayChange('passengers', index, 'aadhar', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">PAN Number</label><input type="text" value={pax.pan} onChange={(e) => handleArrayChange('passengers', index, 'pan', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Number</label><input type="text" value={pax.passportNumber} onChange={(e) => handleArrayChange('passengers', index, 'passportNumber', e.target.value)} className={inputCls} /></div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Issue Date</label><DatePickerField type="date" value={pax.passportIssueDate} onChange={(e) => handleArrayChange('passengers', index, 'passportIssueDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Expiry Date</label><DatePickerField type="date" value={pax.passportExpiry} onChange={(e) => handleArrayChange('passengers', index, 'passportExpiry', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Passport Place of Issue</label><input type="text" value={pax.passportPlaceOfIssue} onChange={(e) => handleArrayChange('passengers', index, 'passportPlaceOfIssue', e.target.value)} className={inputCls} /></div>

                                                                <div className="sm:col-start-2"><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" value={pax.mobile} onChange={(e) => handleArrayChange('passengers', index, 'mobile', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Emergency Contact Number</label><input type="text" value={pax.emergencyContact || ''} onChange={(e) => handleArrayChange('passengers', index, 'emergencyContact', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center bg-slate-900 border border-slate-700/50 p-2 rounded">
                                                        <button type="button" onClick={() => addArrayItem('passengers', { fullName: '', dob: '', gender: '', aadhar: '', pan: '', passportNumber: '', passportIssueDate: '', passportExpiry: '', passportPlaceOfIssue: '', otherId: '', mobile: '', emergencyContact: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                            <Plus size={14} /> Add Passenger
                                                        </button>
                                                    </div>
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
                                                                {/* Row 1 */}
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Flight Type</label>
                                                                    <CustomSelect value={flight.flightType} onChange={(v) => handleArrayChange('flights', index, 'flightType', v)} className={selectCls} placeholder="Select" options={['One Way', 'Round Trip', 'Multi City']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Flight Responsibility</label>
                                                                    <CustomSelect value={flight.flightResponsibility} onChange={(v) => handleArrayChange('flights', index, 'flightResponsibility', v)} className={selectCls} placeholder="Select" options={['Agency', 'Client']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label>
                                                                    <CustomSelect value={flight.bookingStatus} onChange={(v) => handleArrayChange('flights', index, 'bookingStatus', v)} className={selectCls} placeholder="Select" options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>

                                                                {/* Row 2 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Airline</label><input type="text" value={flight.airline} onChange={(e) => handleArrayChange('flights', index, 'airline', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">PNR No.</label><input type="text" value={flight.pnr} onChange={(e) => handleArrayChange('flights', index, 'pnr', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booked Through</label>
                                                                    <CustomSelect value={flight.bookedThrough} onChange={(v) => handleArrayChange('flights', index, 'bookedThrough', v)} className={selectCls} placeholder="Select" options={['Internal Team', 'DMC', 'Direct Client']} />
                                                                </div>

                                                                {/* Row 3 */}
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                                                                    <CustomSelect value={flight.category} onChange={(v) => handleArrayChange('flights', index, 'category', v)} className={selectCls} placeholder="Select" options={['Economy', 'Premium Economy', 'Business', 'First Class']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Flight Departure Date & Time</label><DatePickerField type="datetime-local" value={flight.departureDateTime} onChange={(e) => handleArrayChange('flights', index, 'departureDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Boarding Point</label><input type="text" value={flight.boardingPoint} onChange={(e) => handleArrayChange('flights', index, 'boardingPoint', e.target.value)} className={inputCls} /></div>

                                                                {/* Row 4 */}
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Ticket Shared</label>
                                                                    <CustomSelect value={flight.ticketShared} onChange={(v) => handleArrayChange('flights', index, 'ticketShared', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Ticket Shared Date</label><DatePickerField type="date" value={flight.ticketSharedDate} onChange={(e) => handleArrayChange('flights', index, 'ticketSharedDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Deboarding Point</label><input type="text" value={flight.deboardingPoint} onChange={(e) => handleArrayChange('flights', index, 'deboardingPoint', e.target.value)} className={inputCls} /></div>

                                                                {/* Row 5 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Flight Cost</label><input type="text" value={flight.flightCost} onChange={(e) => handleArrayChange('flights', index, 'flightCost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Markup Cost</label><input type="text" value={flight.markupCost || ''} onChange={(e) => handleArrayChange('flights', index, 'markupCost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Attach Drive Link</label><input type="text" placeholder="https://..." value={flight.driveLink} onChange={(e) => handleArrayChange('flights', index, 'driveLink', e.target.value)} className={inputCls} /></div>
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
                                                        <CustomSelect value={selectedLeadForEdit.insRequired} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insRequired: v })} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                    </div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Provider</label><input type="text" value={selectedLeadForEdit.insProvider} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insProvider: e.target.value })} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Policy Number</label><input type="text" value={selectedLeadForEdit.insPolicyNo} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insPolicyNo: e.target.value })} className={inputCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={selectedLeadForEdit.insCost} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insCost: e.target.value })} className={inputCls} /></div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Status (Pending / Issued)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insStatus: v })} className={selectCls} placeholder="Select" options={['Pending', 'Issued']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Policy Shared (Yes / no)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insPolicyShared} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insPolicyShared: v })} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
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
                                                                    <CustomSelect value={visa.visaType} onChange={v => handleArrayChange('visas', index, 'visaType', v)} className={selectCls} placeholder="Select" options={['Tourist', 'Business', 'Transit', 'e-Visa', 'Visa on Arrival']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Transit VISA Required</label>
                                                                    <CustomSelect value={visa.transitVisaReq} onChange={v => handleArrayChange('visas', index, 'transitVisaReq', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Card Applicable</label>
                                                                    <CustomSelect value={visa.arrivalCardApplicable} onChange={v => handleArrayChange('visas', index, 'arrivalCardApplicable', v)} className={selectCls} placeholder="Yes/ No" options={['Yes', 'No']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Arrival Card Details</label><input type="text" value={visa.arrivalCardDetails} onChange={e => handleArrayChange('visas', index, 'arrivalCardDetails', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Applied by</label>
                                                                    <CustomSelect value={visa.appliedBy} onChange={v => handleArrayChange('visas', index, 'appliedBy', v)} className={selectCls} placeholder="Client / Vendor / Team" options={['Client', 'Vendor', 'Team']} />
                                                                </div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Documents Pending</label><input type="text" value={visa.docsPending} onChange={e => handleArrayChange('visas', index, 'docsPending', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Status</label><input type="text" value={visa.visaStatus} onChange={e => handleArrayChange('visas', index, 'visaStatus', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">VISA Copy Shared</label>
                                                                    <CustomSelect value={visa.visaCopyShared} onChange={v => handleArrayChange('visas', index, 'visaCopyShared', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                                </div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Approval Date</label><DatePickerField type="date" value={visa.visaApprovalDate} onChange={e => handleArrayChange('visas', index, 'visaApprovalDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Expiry Date</label><DatePickerField type="date" value={visa.visaExpiryDate} onChange={e => handleArrayChange('visas', index, 'visaExpiryDate', e.target.value)} className={inputCls} /></div>
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

                                            {/* DMC Details & Deliverables */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>DMC Details</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">DMC Name</label><input type="text" value={selectedLeadForEdit.dmcName} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcName: e.target.value })} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label><input type="text" value={selectedLeadForEdit.dmcContactPerson} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcContactPerson: e.target.value })} className={inputCls} /></div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Package Type</label>
                                                        <CustomSelect value={selectedLeadForEdit.dmcPackageType} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcPackageType: v })} className={selectCls} placeholder="Select" options={['Standard', 'Premium', 'Luxury', 'Budget']} />
                                                    </div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">WhatsApp Number</label><input type="text" value={selectedLeadForEdit.dmcWhatsapp} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcWhatsapp: e.target.value })} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label><input type="text" value={selectedLeadForEdit.dmcEmail} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcEmail: e.target.value })} className={inputCls} /></div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                                        <CustomSelect value={selectedLeadForEdit.dmcStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcStatus: v })} className={selectCls} placeholder="Select" options={['Pending', 'Confirmed', 'Cancelled']} />
                                                    </div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Reference No./ Booking Id</label><input type="text" value={selectedLeadForEdit.dmcRefNo} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcRefNo: e.target.value })} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Package Cost</label><input type="text" value={selectedLeadForEdit.dmcPackageCost || ''} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcPackageCost: e.target.value })} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Markup Cost</label><input type="text" value={selectedLeadForEdit.dmcMarkupCost || ''} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcMarkupCost: e.target.value })} className={inputCls} /></div>
                                                </div>

                                                <div className="mt-6 border-t border-slate-700/50 pt-6">
                                                    <h3 className={sectionHeadCls}>DMC Deliverables</h3>
                                                    <div className="w-1/3 min-w-[200px]">
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Check Box</label>
                                                        <CustomSelect value={selectedLeadForEdit.dmcDeliverables} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, dmcDeliverables: v })} className={selectCls} placeholder="Select" options={['Accommodation', 'Transport', 'Sightseeing', 'All Included']} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hotel Booking */}
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} flex flex-wrap justify-between gap-1`}>
                                                    <span>Hotel Booking</span>
                                                </h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.intHotels?.map((hotel, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">HOTEL {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('intHotels', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Location</label><input type="text" value={hotel.location} onChange={(e) => handleArrayChange('intHotels', index, 'location', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Hotel Name</label><input type="text" value={hotel.hotelName} onChange={(e) => handleArrayChange('intHotels', index, 'hotelName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Hotel Category</label><input type="text" value={hotel.hotelCategory} onChange={(e) => handleArrayChange('intHotels', index, 'hotelCategory', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booked By</label>
                                                                    <CustomSelect value={hotel.bookedBy} onChange={(v) => handleArrayChange('intHotels', index, 'bookedBy', v)} className={selectCls} placeholder="Select" options={['Operations Desk 1', 'Operations Desk 2', 'Ground Vendor']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Reference No./ Booking Id</label><input type="text" value={hotel.refNo} onChange={(e) => handleArrayChange('intHotels', index, 'refNo', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                                                    <CustomSelect value={hotel.status} onChange={(v) => handleArrayChange('intHotels', index, 'status', v)} className={selectCls} placeholder="Select" options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Room Category</label><input type="text" value={hotel.roomCategory} onChange={(e) => handleArrayChange('intHotels', index, 'roomCategory', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">No. Of Rooms</label><input type="text" value={hotel.noOfRooms} onChange={(e) => handleArrayChange('intHotels', index, 'noOfRooms', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Additional Mattress</label><input type="text" value={hotel.addMattress} onChange={(e) => handleArrayChange('intHotels', index, 'addMattress', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Specifications</label>
                                                                    <CustomSelect value={hotel.specifications} onChange={(v) => handleArrayChange('intHotels', index, 'specifications', v)} className={selectCls} placeholder="Select" options={['Standard', 'Sea View', 'City View']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Meal Plan</label>
                                                                    <CustomSelect value={hotel.mealPlan} onChange={(v) => handleArrayChange('intHotels', index, 'mealPlan', v)} className={selectCls} placeholder="Select" options={['EP', 'CP', 'MAP', 'AP']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Early Check-In / Late</label>
                                                                    <CustomSelect value={hotel.earlyCheckIn} onChange={(v) => handleArrayChange('intHotels', index, 'earlyCheckIn', v)} className={selectCls} placeholder="Select" options={['None', 'Early Check-In', 'Late Check-Out']} />
                                                                </div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Check-In Date & Time</label><DatePickerField type="datetime-local" value={hotel.checkInDateTime} onChange={(e) => handleArrayChange('intHotels', index, 'checkInDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Check-Out Date & Time</label><DatePickerField type="datetime-local" value={hotel.checkOutDateTime} onChange={(e) => handleArrayChange('intHotels', index, 'checkOutDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Refreshment Room Required</label>
                                                                    <CustomSelect value={hotel.refreshmentRoom} onChange={(v) => handleArrayChange('intHotels', index, 'refreshmentRoom', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                                </div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={hotel.cost} onChange={(e) => handleArrayChange('intHotels', index, 'cost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={hotel.paymentDueDate} onChange={(e) => handleArrayChange('intHotels', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Attach Voucher Link</label><input type="text" value={hotel.attachVoucher} onChange={(e) => handleArrayChange('intHotels', index, 'attachVoucher', e.target.value)} className={inputCls} /></div>

                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Special Arrangements</label><input type="text" value={hotel.specialArrangements} onChange={(e) => handleArrayChange('intHotels', index, 'specialArrangements', e.target.value)} className={inputCls} /></div>
                                                                <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-400 mb-1">Notes</label><input type="text" value={hotel.notes} onChange={(e) => handleArrayChange('intHotels', index, 'notes', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('intHotels', { location: '', hotelName: '', hotelCategory: '', bookedBy: '', refNo: '', status: '', roomCategory: '', noOfRooms: '', addMattress: '', specifications: '', mealPlan: '', earlyCheckIn: '', checkInDateTime: '', checkOutDateTime: '', refreshmentRoom: '', cost: '', paymentDueDate: '', attachVoucher: '', specialArrangements: '', notes: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                        <Plus size={14} /> Add Hotel
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Local Transport */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Local Transport</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.intTransports?.map((trans, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">VEHICLE {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('intTransports', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                {/* Row 1 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Local Operator Name</label><input type="text" value={trans.operatorName} onChange={(e) => handleArrayChange('intTransports', index, 'operatorName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Type</label><input type="text" value={trans.vehicleType} onChange={(e) => handleArrayChange('intTransports', index, 'vehicleType', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label><input type="text" value={trans.contactPerson} onChange={(e) => handleArrayChange('intTransports', index, 'contactPerson', e.target.value)} className={inputCls} /></div>
                                                                
                                                                {/* Row 2 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Driver Name</label><input type="text" value={trans.driverName} onChange={(e) => handleArrayChange('intTransports', index, 'driverName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Number</label><input type="text" value={trans.vehicleNumber} onChange={(e) => handleArrayChange('intTransports', index, 'vehicleNumber', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                                                    <CustomSelect value={trans.status} onChange={(v) => handleArrayChange('intTransports', index, 'status', v)} className={selectCls} placeholder="Select Status" options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>

                                                                {/* Row 3 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Driver Contact Number</label><input type="text" value={trans.driverContact} onChange={(e) => handleArrayChange('intTransports', index, 'driverContact', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Duration</label>
                                                                    <CustomSelect value={trans.duration} onChange={(v) => handleArrayChange('intTransports', index, 'duration', v)} className={selectCls} placeholder="Select Duration" options={['Half Day', 'Full Day', 'Multi Day']} />
                                                                </div>
                                                                <div className="hidden sm:block"></div>

                                                                {/* Row 4 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Pickup Point</label><input type="text" value={trans.pickupPoint} onChange={(e) => handleArrayChange('intTransports', index, 'pickupPoint', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Pickup Date</label><DatePickerField type="date" value={trans.pickupDate} onChange={(e) => handleArrayChange('intTransports', index, 'pickupDate', e.target.value)} className={inputCls} /></div>
                                                                <div className="hidden sm:block"></div>

                                                                {/* Row 5 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Drop Point</label><input type="text" value={trans.dropPoint} onChange={(e) => handleArrayChange('intTransports', index, 'dropPoint', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Drop Date</label><DatePickerField type="date" value={trans.dropDate} onChange={(e) => handleArrayChange('intTransports', index, 'dropDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Notes</label><input type="text" value={trans.notes} onChange={(e) => handleArrayChange('intTransports', index, 'notes', e.target.value)} className={inputCls} /></div>

                                                                {/* Row 6 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={trans.cost} onChange={(e) => handleArrayChange('intTransports', index, 'cost', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mark-Up</label><input type="text" value={trans.markup || ''} onChange={(e) => handleArrayChange('intTransports', index, 'markup', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={trans.paymentDueDate} onChange={(e) => handleArrayChange('intTransports', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('intTransports', { operatorName: '', vehicleType: '', contactPerson: '', driverName: '', vehicleNumber: '', status: '', driverContact: '', duration: '', pickupPoint: '', pickupDate: '', dropPoint: '', dropDate: '', notes: '', cost: '', markup: '', paymentDueDate: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                        <Plus size={14} /> Add Transport
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Special Requirements */}
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
                                                                    <CustomSelect value={req.service} onChange={(v) => handleArrayChange('paymentRequests', index, 'service', v)} className={selectCls} placeholder="Select" options={['Transport', 'Hotel', 'Local Vehicle Operator']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Provider Name <span className="text-[10px] text-red-400 italic ml-1">(autofetch)</span></label>
                                                                    <input type="text" value={req.providerName} readOnly className={readonlyCls} placeholder="Auto-populated" />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={req.paymentDueDate} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label><input type="text" value={req.serviceCost} onChange={(e) => handleArrayChange('paymentRequests', index, 'serviceCost', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Payment Type</label>
                                                                    <CustomSelect value={req.paymentType} onChange={(v) => handleArrayChange('paymentRequests', index, 'paymentType', v)} className={selectCls} placeholder="Select" options={['Full Payment', 'Advance', 'Balance']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount to Pay</label><input type="text" value={req.amountToPay} onChange={(e) => handleArrayChange('paymentRequests', index, 'amountToPay', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Account Details</label><input type="text" value={req.paymentAccountDetails} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentAccountDetails', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div className="sm:col-start-3 flex items-end">
                                                                    <button type="button" className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 font-bold text-xs rounded transition-colors cursor-pointer text-center">
                                                                        Request To Director & Accounts
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('paymentRequests', { service: '', providerName: '', paymentDueDate: '', serviceCost: '', paymentType: '', amountToPay: '', paymentAccountDetails: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                        <Plus size={14} /> Add Payment Request
                                                    </button>
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
                                                    <span>Passenger Details</span>
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedLeadForEdit.passengers?.map((pax, index) => (
                                                        <div key={index} className="p-4 bg-slate-950 rounded-lg border border-slate-800 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">PAX {index + 1}</span>
                                                            {index > 0 && (
                                                                <button type="button" onClick={() => removeArrayItem('passengers', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>
                                                            )}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Full Name As Per Aadhar</label><input type="text" value={pax.fullName} onChange={(e) => handleArrayChange('passengers', index, 'fullName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Date Of Birth</label><DatePickerField type="date" value={pax.dob} onChange={(e) => handleArrayChange('passengers', index, 'dob', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                                                                    <CustomSelect value={pax.gender} onChange={(val) => handleArrayChange('passengers', index, 'gender', val)} className={selectCls} placeholder="Select Gender" options={['Male', 'Female', 'Other']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Aadhar Card Number</label><input type="text" value={pax.aadhar} onChange={(e) => handleArrayChange('passengers', index, 'aadhar', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">PAN Number</label><input type="text" value={pax.pan} onChange={(e) => handleArrayChange('passengers', index, 'pan', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" value={pax.mobile} onChange={(e) => handleArrayChange('passengers', index, 'mobile', e.target.value)} className={inputCls} /></div>
                                                                <div className="sm:col-start-3"><label className="block text-xs font-medium text-slate-400 mb-1">Emergency Contact Number</label><input type="text" value={pax.emergencyContact || ''} onChange={(e) => handleArrayChange('passengers', index, 'emergencyContact', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center bg-slate-900 border border-slate-700/50 p-2 rounded">
                                                        <button type="button" onClick={() => addArrayItem('passengers', { fullName: '', dob: '', gender: '', aadhar: '', pan: '', mobile: '', emergencyContact: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                            <Plus size={14} /> Add Passenger
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. Document Collection */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Document Collection</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Aadhar Copy</label>
                                                        <CustomSelect value={selectedLeadForEdit.docAadhar} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, docAadhar: v })} className={selectCls} placeholder="Select Status" options={['Pending', 'Received', 'Verified']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">PAN Card</label>
                                                        <CustomSelect value={selectedLeadForEdit.docPan} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, docPan: v })} className={selectCls} placeholder="Select Status" options={['Pending', 'Received', 'Verified']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Photograph</label>
                                                        <CustomSelect value={selectedLeadForEdit.docPhoto} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, docPhoto: v })} className={selectCls} placeholder="Select Status" options={['Pending', 'Received', 'Verified']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Attach Drive Link</label>
                                                        <input type="text" placeholder="https://drive.google.com/..." value={selectedLeadForEdit.docDriveLink} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, docDriveLink: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Document Status</label>
                                                        <CustomSelect value={selectedLeadForEdit.docStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, docStatus: v })} className={selectCls} placeholder="Select Status" options={['Pending', 'Partial', 'Completed']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                                                        <input type="text" value={selectedLeadForEdit.docNotes || ''} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, docNotes: e.target.value })} className={inputCls} />
                                                    </div>
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
                                                                    <CustomSelect value={trans.transportType} onChange={(v) => updateDomTransport(index, 'transportType', v)} className={selectCls} placeholder="Select Type" options={['Flight', 'Train', 'Bus']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booked By</label>
                                                                    <CustomSelect value={trans.bookedBy} onChange={(v) => updateDomTransport(index, 'bookedBy', v)} className={selectCls} placeholder="Select" options={['Internal Team', 'Customer']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label>
                                                                    <CustomSelect value={trans.bookingStatus} onChange={(v) => updateDomTransport(index, 'bookingStatus', v)} className={selectCls} placeholder="Select" options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>
                                                                <div className="sm:col-start-2">
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Ticket Shared to Client</label>
                                                                    <CustomSelect value={trans.ticketSharedToClient || ''} onChange={(v) => updateDomTransport(index, 'ticketSharedToClient', v)} className={selectCls} placeholder="Yes / No" options={['Yes', 'No']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Shared Date</label>
                                                                    <DatePickerField type="date" value={trans.sharedDate || ''} onChange={(e) => updateDomTransport(index, 'sharedDate', e.target.value)} className={inputCls} />
                                                                </div>
                                                            </div>

                                                            {/* IF FLIGHT */}
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
                                                                                        <CustomSelect value={trans.flight?.[leg]?.bookedThrough || ''} onChange={(v) => updateDomTransportNested(index, 'flight', leg, 'bookedThrough', v)} className={selectCls} placeholder="Select" options={['Internal', 'DMC', 'Direct']} />
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
                                                                        <button type="button" onClick={() => addDomTransportReturn(index, 'flight')} className="font-bold text-sm text-cyan-400 hover:text-cyan-300 bg-transparent border-none cursor-pointer p-0 text-left">
                                                                            + Add Return Details
                                                                        </button>
                                                                    ) : (
                                                                        <button type="button" onClick={() => removeDomTransportReturn(index, 'flight')} className="font-bold text-sm text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 text-left">
                                                                            - Remove Return Details
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* IF TRAIN */}
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
                                                                                        <CustomSelect value={trans.train?.[leg]?.trainClass || ''} onChange={(v) => updateDomTransportNested(index, 'train', leg, 'trainClass', v)} className={selectCls} placeholder="Select Class" options={['1A', '2A', '3A', 'SL', 'CC', 'EC']} />
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
                                                                        <button type="button" onClick={() => addDomTransportReturn(index, 'train')} className="font-bold text-sm text-cyan-400 hover:text-cyan-300 bg-transparent border-none cursor-pointer p-0 text-left">
                                                                            + Add Return Details
                                                                        </button>
                                                                    ) : (
                                                                        <button type="button" onClick={() => removeDomTransportReturn(index, 'train')} className="font-bold text-sm text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 text-left">
                                                                            - Remove Return Details
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* IF BUS */}
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
                                                                        <button type="button" onClick={() => addDomTransportReturn(index, 'bus')} className="font-bold text-sm text-cyan-400 hover:text-cyan-300 bg-transparent border-none cursor-pointer p-0 text-left">
                                                                            + Add Return Details
                                                                        </button>
                                                                    ) : (
                                                                        <button type="button" onClick={() => removeDomTransportReturn(index, 'bus')} className="font-bold text-sm text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 text-left">
                                                                            - Remove Return Details
                                                                        </button>
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

                                            {/* Travel Insurance */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Travel Insurance</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Insurance Required (yes/no)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insRequired} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insRequired: v })} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                    </div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Provider</label><input type="text" value={selectedLeadForEdit.insProvider} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insProvider: e.target.value })} className={inputCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Policy Number</label><input type="text" value={selectedLeadForEdit.insPolicyNo} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insPolicyNo: e.target.value })} className={inputCls} /></div>
                                                    
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Cost</label><input type="text" value={selectedLeadForEdit.insCost} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insCost: e.target.value })} className={inputCls} /></div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Status (Pending / Issued)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insStatus: v })} className={selectCls} placeholder="Select" options={['Pending', 'Issued']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Policy Shared (Yes / no)</label>
                                                        <CustomSelect value={selectedLeadForEdit.insPolicyShared} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insPolicyShared: v })} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                    </div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Mark-Up</label><input type="text" value={selectedLeadForEdit.insMarkup || ''} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, insMarkup: e.target.value })} className={inputCls} /></div>
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
                                                                    <CustomSelect value={hotel.bookedBy} onChange={(v) => handleArrayChange('domHotels', index, 'bookedBy', v)} className={selectCls} placeholder="Select" options={['Operations Desk 1', 'Operations Desk 2', 'Ground Vendor']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Reference No./ Booking Id</label><input type="text" value={hotel.refNo} onChange={(e) => handleArrayChange('domHotels', index, 'refNo', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                                                    <CustomSelect value={hotel.status} onChange={(v) => handleArrayChange('domHotels', index, 'status', v)} className={selectCls} placeholder="Select" options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Room Category</label><input type="text" value={hotel.roomCategory} onChange={(e) => handleArrayChange('domHotels', index, 'roomCategory', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">No. Of Rooms</label><input type="text" value={hotel.noOfRooms} onChange={(e) => handleArrayChange('domHotels', index, 'noOfRooms', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Additional Mattress</label><input type="text" value={hotel.addMattress} onChange={(e) => handleArrayChange('domHotels', index, 'addMattress', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Specifications</label>
                                                                    <CustomSelect value={hotel.specifications} onChange={(v) => handleArrayChange('domHotels', index, 'specifications', v)} className={selectCls} placeholder="Select" options={['Standard', 'Sea View', 'City View']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Meal Plan</label>
                                                                    <CustomSelect value={hotel.mealPlan} onChange={(v) => handleArrayChange('domHotels', index, 'mealPlan', v)} className={selectCls} placeholder="Select" options={['EP', 'CP', 'MAP', 'AP']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Early Check-In / Late</label>
                                                                    <CustomSelect value={hotel.earlyCheckIn} onChange={(v) => handleArrayChange('domHotels', index, 'earlyCheckIn', v)} className={selectCls} placeholder="Select" options={['None', 'Early Check-In', 'Late Check-Out']} />
                                                                </div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Check-In Date & Time</label><DatePickerField type="datetime-local" value={hotel.checkInDateTime} onChange={(e) => handleArrayChange('domHotels', index, 'checkInDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Check-Out Date & Time</label><DatePickerField type="datetime-local" value={hotel.checkOutDateTime} onChange={(e) => handleArrayChange('domHotels', index, 'checkOutDateTime', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Refreshment Room Required</label>
                                                                    <CustomSelect value={hotel.refreshmentRoom} onChange={(v) => handleArrayChange('domHotels', index, 'refreshmentRoom', v)} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
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
                                                                {/* Row 1 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Local Operator Name</label><input type="text" value={trans.serviceProvider || trans.operatorName || ''} onChange={(e) => handleArrayChange('domLocalTransports', index, 'serviceProvider', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Type</label><input type="text" value={trans.vehicleType} onChange={(e) => handleArrayChange('domLocalTransports', index, 'vehicleType', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label><input type="text" value={trans.contactPerson} onChange={(e) => handleArrayChange('domLocalTransports', index, 'contactPerson', e.target.value)} className={inputCls} /></div>
                                                                
                                                                {/* Row 2 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Driver Name</label><input type="text" value={trans.driverName} onChange={(e) => handleArrayChange('domLocalTransports', index, 'driverName', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Number</label><input type="text" value={trans.vehicleNumber} onChange={(e) => handleArrayChange('domLocalTransports', index, 'vehicleNumber', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                                                    <CustomSelect value={trans.status} onChange={(v) => handleArrayChange('domLocalTransports', index, 'status', v)} className={selectCls} placeholder="Select Status" options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>

                                                                {/* Row 3 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Driver Contact Number</label><input type="text" value={trans.driverContact || ''} onChange={(e) => handleArrayChange('domLocalTransports', index, 'driverContact', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Toll Parking & Other State Permit</label>
                                                                    <CustomSelect value={trans.tollPermit || trans.tollParking || ''} onChange={(v) => handleArrayChange('domLocalTransports', index, 'tollPermit', v)} className={selectCls} placeholder="Select" options={['Included', 'Excluded']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Duration</label>
                                                                    <CustomSelect value={trans.duration} onChange={(v) => handleArrayChange('domLocalTransports', index, 'duration', v)} className={selectCls} placeholder="Select Duration" options={['Half Day', 'Full Day', 'Multi Day']} />
                                                                </div>

                                                                {/* Row 4 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Pickup Point</label><input type="text" value={trans.pickupPoint} onChange={(e) => handleArrayChange('domLocalTransports', index, 'pickupPoint', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Pickup Date</label><DatePickerField type="date" value={trans.pickupDate} onChange={(e) => handleArrayChange('domLocalTransports', index, 'pickupDate', e.target.value)} className={inputCls} /></div>
                                                                <div className="hidden sm:block"></div>

                                                                {/* Row 5 */}
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Drop Point</label><input type="text" value={trans.dropPoint} onChange={(e) => handleArrayChange('domLocalTransports', index, 'dropPoint', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Drop Date</label><DatePickerField type="date" value={trans.dropDate} onChange={(e) => handleArrayChange('domLocalTransports', index, 'dropDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Notes</label><input type="text" value={trans.notes} onChange={(e) => handleArrayChange('domLocalTransports', index, 'notes', e.target.value)} className={inputCls} /></div>
                                                                
                                                                {/* Row 6 */}
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
                                                                    <CustomSelect value={req.service} onChange={(v) => handleArrayChange('paymentRequests', index, 'service', v)} className={selectCls} placeholder="Select" options={['Transport', 'Hotel', 'Local Vehicle Operator']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Provider Name <span className="text-[10px] text-red-400 italic ml-1">(autofetch)</span></label>
                                                                    <input type="text" value={req.providerName} readOnly className={readonlyCls} placeholder="Auto-populated" />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={req.paymentDueDate} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label><input type="text" value={req.serviceCost} onChange={(e) => handleArrayChange('paymentRequests', index, 'serviceCost', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Payment Type</label>
                                                                    <CustomSelect value={req.paymentType} onChange={(v) => handleArrayChange('paymentRequests', index, 'paymentType', v)} className={selectCls} placeholder="Select" options={['Full Payment', 'Advance', 'Balance']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount to Pay</label><input type="text" value={req.amountToPay} onChange={(e) => handleArrayChange('paymentRequests', index, 'amountToPay', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Account Details</label><input type="text" value={req.paymentAccountDetails} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentAccountDetails', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div className="sm:col-start-3 flex items-end">
                                                                    <button type="button" className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 font-bold text-xs rounded transition-colors cursor-pointer text-center">
                                                                        Request To Director & Accounts
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('paymentRequests', { service: '', providerName: '', paymentDueDate: '', serviceCost: '', paymentType: '', amountToPay: '', paymentAccountDetails: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer">
                                                        <Plus size={14} /> Add Payment Request
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    )
                                ) : (
                                    /* ─── STANDARD OPS PIPELINE EDIT ────────────────────── */
                                    <div className="space-y-6">

                                        {/* Section 1: Client Info */}
                                        <div className={sectionCls} style={{ borderColor: 'rgba(51,65,85,0.8)' }}>
                                            <h3 className={sectionHeadCls} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                                <span className="font-bold">Client Info</span>
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Lead Name</label><input type="text" readOnly value={selectedLeadForEdit.customerName} className={readonlyCls} /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Mobile Number</label><input type="text" readOnly value={selectedLeadForEdit.mobileNumber} className={readonlyCls} /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Sales Executive</label><input type="text" readOnly value={selectedLeadForEdit.salesExecutive} className={readonlyCls} /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">No. of Adults</label><input type="text" readOnly value={selectedLeadForEdit.noOfAdults} className={readonlyCls} /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">No. of Children</label><input type="text" readOnly value={selectedLeadForEdit.noOfChildren} className={readonlyCls} /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Duration</label><input type="text" readOnly value={selectedLeadForEdit.duration} className={readonlyCls} /></div>
                                            </div>
                                        </div>

                                        {/* Section 2: Destination Request */}
                                        <div className={sectionCls} style={{ borderColor: 'rgba(51,65,85,0.8)' }}>
                                            <h3 className={sectionHeadCls} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">Destination Request</span>
                                                    <span className="text-[10px] text-slate-500 italic bg-slate-800/50 px-2 py-0.5 rounded">Fetched from sales form</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'view', section: 'Destination Request' })} className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs font-bold transition-colors cursor-pointer">
                                                        <Eye size={14} /> View
                                                    </button>
                                                </div>
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Destination</label>
                                                    <input type="text" readOnly value={uniqueDestinations.join(', ') || selectedLeadForEdit.destination || ''} className={readonlyCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Customisation Type</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.customisationType || selectedLeadForEdit.customisationType || ''} className={readonlyCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Tour Type</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.tourType || selectedLeadForEdit.tourType || ''} className={readonlyCls} />
                                                </div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Travel Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.travelDate || selectedLeadForEdit.travelDate || ''} className={readonlyCls} /></div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Travel Month</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.travelMonth || selectedLeadForEdit.travelMonth || ''} className={readonlyCls} />
                                                </div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Budget</label><input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.budget || selectedLeadForEdit.budget || ''} className={readonlyCls} /></div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Hotel Category</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.hotelCategory || selectedLeadForEdit.hotelCategory || ''} className={readonlyCls} />
                                                </div>
                                                
                                                {/* Gray / Fetch Fields */}
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Readymade Package Details</label><input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.readymadePackageDetails || selectedLeadForEdit.readymadePackageDetails || ''} className={readonlyCls} /></div>
                                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Turnaround Time</label><input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.turnaroundTime || selectedLeadForEdit.turnaroundTime || ''} className={readonlyCls} /></div>
                                                <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-400 mb-1">Sales Remarks</label><input type="text" readOnly value={selectedLeadForEdit.customisationRequests?.[0]?.salesRemarks || selectedLeadForEdit.salesRemarks || ''} className={readonlyCls} /></div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">Voice Note {`>`}</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.voiceNoteSummary || 'No voice note attached'} className={readonlyCls} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 3: Operations Activity */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                                <span className="font-bold">Operations Activity</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'history', section: 'Operations Activity' })} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><History size={12} /> History</button>
                                                    <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Pencil size={12} /> Edit</button>
                                                </div>
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Destination</label>
                                                    <CustomSelect value={selectedLeadForEdit.destination} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, destination: v })} className={selectCls} placeholder="Select Destination" options={destinationOptions} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Work Type</label>
                                                    <CustomSelect value={selectedLeadForEdit.workType} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, workType: v })} className={selectCls} placeholder="Vendor Assistance" options={['FIT', 'Vendor Assistance', 'Group Departure']} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
                                                    <CustomSelect value={selectedLeadForEdit.priority} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, priority: v })} className={selectCls} placeholder="Select Priority" options={['High', 'Medium', 'Normal', 'Low']} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Activity Type</label>
                                                    <CustomSelect value={selectedLeadForEdit.activityType} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, activityType: v })} className={selectCls} placeholder="Select Activity" options={['Call Client', 'Vendor Sync', 'Itinerary Draft', 'Rate Verification']} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Activity Outcome</label>
                                                    <CustomSelect value={selectedLeadForEdit.activityOutcome} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, activityOutcome: v })} className={selectCls} placeholder="Select Outcome" options={[{ value: 'Connected', label: 'Connected / Answered' }, 'No Response', { value: 'Rates Shared', label: 'Rates Shared OK' }, 'Revisions Pending']} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Status</label>
                                                    <CustomSelect value={selectedLeadForEdit.status} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, status: v })} className={selectCls} placeholder="Select Status" options={['New Requests', 'Follow-Up', 'Shared to Sales', 'Confirmed Bookings', 'Upcoming Departure']} />
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Notes</label>
                                                    <input type="text" value={selectedLeadForEdit.notes} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, notes: e.target.value })} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Next Follow-Up Date</label>
                                                    <DatePickerField type="datetime-local" value={selectedLeadForEdit.nextActionDate} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, nextActionDate: e.target.value })} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Follow-Up Type</label>
                                                    <CustomSelect value={selectedLeadForEdit.followUpType} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, followUpType: v })} className={selectCls} placeholder="Select Type" options={['Call', 'WhatsApp', 'Email']} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 4: Vendor Coordination */}
                                        {selectedLeadForEdit.workType === 'Vendor Assistance' && (
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                                    <span className="font-bold">Vendor Coordination</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button type="button" onClick={() => setActiveModal({ type: 'view', section: 'Vendor Coordination' })} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Eye size={12} /> View</button>
                                                        <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Pencil size={12} /> Edit</button>
                                                    </div>
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Destination</label>
                                                        <input type="text" readOnly value={selectedLeadForEdit.destination} className={readonlyCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Vendor Name</label>
                                                        <input type="text" value={selectedLeadForEdit.vendorName} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorName: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Service</label>
                                                        <CustomSelect value={selectedLeadForEdit.service || ''} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, service: v })} className={selectCls} placeholder="Select Service" options={['Hotel', 'Transport', 'Activities', 'Full Package']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Contact Method</label>
                                                        <CustomSelect value={selectedLeadForEdit.contactMethod} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, contactMethod: v })} className={selectCls} placeholder="Select Method" options={['Email Platform', 'WhatsApp API', 'B2B Portal Integration', 'Verbal Call']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Contact Date & Time</label>
                                                        <DatePickerField type="datetime-local" value={selectedLeadForEdit.contactDate} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, contactDate: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Vendor Response Status</label>
                                                        <CustomSelect value={selectedLeadForEdit.vendorResponseStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorResponseStatus: v })} className={selectCls} placeholder="Select Status" options={['Awaiting Rates', 'Rates Received', 'Negotiation In Progress']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Next Action Required</label>
                                                        <CustomSelect value={selectedLeadForEdit.nextActionRequired} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, nextActionRequired: v })} className={selectCls} placeholder="Select" options={['Yes', 'No']} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Next Action Date</label>
                                                        <DatePickerField type="date" value={selectedLeadForEdit.vendorNextActionDate || selectedLeadForEdit.nextActionDate} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorNextActionDate: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1">Vendor Remarks</label>
                                                        <textarea rows="1" value={selectedLeadForEdit.vendorRemarks} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRemarks: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div className="sm:col-span-3 mt-2">
                                                        <button type="button" className="text-xs font-bold text-cyan-400 bg-transparent border-none cursor-pointer">Add Vendor</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Section 5: Itinerary Preparation */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                                <span className="font-bold">Itinerary Preparation</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'view', section: 'Itinerary Preparation' })} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Eye size={12} /> View</button>
                                                    <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Pencil size={12} /> Edit</button>
                                                </div>
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Preparation Method</label>
                                                    <CustomSelect value={selectedLeadForEdit.preparationMethod} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, preparationMethod: v })} className={selectCls} placeholder="Select Method" options={['Portal Designer v2', 'Manual Template Excel Sheet', 'External API Integrator Suite']} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Itinerary Version</label>
                                                    <CustomSelect value={selectedLeadForEdit.itineraryVersion} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, itineraryVersion: v })} className={selectCls} placeholder="Select Version" options={['1.0.0', '1.1.0', '2.0.0']} />
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
                                        </div>

                                        {/* Section 6: Quality Check */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                                <span className="font-bold">Quality Check</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button type="button" onClick={() => setActiveModal({ type: 'view', section: 'Quality Check' })} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Eye size={12} /> View</button>
                                                    <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-bold transition-colors cursor-pointer"><Pencil size={12} /> Edit</button>
                                                </div>
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">QC Status</label>
                                                    <CustomSelect value={selectedLeadForEdit.qcStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, qcStatus: v })} className={selectCls} placeholder="Approved" options={['Pending Review', 'Approved', 'Correction Needed']} />
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
                                        </div>

                                        {/* Section 7: Share to Sales */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Share to Sales</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Shared To</label>
                                                    <input type="text" value={selectedLeadForEdit.sharedTo || selectedLeadForEdit.salesExecutive} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, sharedTo: e.target.value })} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1">Shared Via</label>
                                                    <CustomSelect value={selectedLeadForEdit.sharedVia} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, sharedVia: v })} className={selectCls} placeholder="Select Channel" options={['Slack Channel Matrix', 'Internal CRM Note Connection']} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Sales Acknowledged</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.salesAcknowledged} className={readonlyCls} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 8: Client Status */}
                                        <div className={sectionCls}>
                                            <h3 className={sectionHeadCls}>Client Status</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Lead Status</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.status || selectedLeadForEdit.leadStatus} className={readonlyCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Sales Funnel Lead Status</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.salesFunnelLeadStatus} className={readonlyCls} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Sales Remarks</label>
                                                    <input type="text" readOnly value={selectedLeadForEdit.salesRemarks} className={readonlyCls} />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 px-4 sm:px-6 py-4 flex-shrink-0 bg-[#0b1329]">
                                <button type="button" onClick={() => setSelectedLeadForEdit(null)} className="px-5 py-2 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded transition-colors uppercase tracking-wider cursor-pointer">CANCEL</button>
                                <button type="submit" className="px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-bold rounded shadow transition-colors uppercase tracking-wider cursor-pointer">SUBMIT</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── HISTORY & VIEW MODAL ────────────────────────────────────────────── */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
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
                                    {activeModal.section === 'Vendor Coordination' && (
                                        <div className="space-y-3">
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs text-slate-300 shadow-inner">
                                                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Destination</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.destination || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Vendor Name</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.vendorName || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Service</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.service || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Contact Method</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.contactMethod || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Date & Time</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.contactDate || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Response Status</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.vendorResponseStatus || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Next Action Date</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.vendorNextActionDate || selectedLeadForEdit.nextActionDate || 'N/A'}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeModal.section === 'Itinerary Preparation' && (
                                        <div className="space-y-3">
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs text-slate-300 shadow-inner">
                                                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Destination</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.destination || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Preparation Method</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.preparationMethod || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Itinerary Version</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.itineraryVersion || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Date & Time</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.itineraryPrepDate || 'N/A'}</span></div>
                                                    <div className="flex flex-col col-span-2"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Working Notes</span><span className="text-slate-200 font-medium whitespace-pre-wrap">{selectedLeadForEdit.workingNotes || 'N/A'}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {activeModal.section === 'Quality Check' && (
                                        <div className="space-y-3">
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs text-slate-300 shadow-inner">
                                                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Destination</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.destination || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">QC Status</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.qcStatus || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Reviewed By</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.reviewedBy || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">Date & Time</span><span className="text-slate-200 font-medium">{selectedLeadForEdit.qcDate || 'N/A'}</span></div>
                                                    <div className="flex flex-col col-span-2"><span className="text-cyan-500/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">QC Remarks</span><span className="text-slate-200 font-medium whitespace-pre-wrap">{selectedLeadForEdit.qcRemarks || 'N/A'}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Fallback for anything else */}
                                    {!['Destination Request', 'Vendor Coordination', 'Itinerary Preparation', 'Quality Check'].includes(activeModal.section) && (
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

            {/* ─── ACKNOWLEDGE MODAL ──────────────────────────────────────────────── */}
            {leadToAcknowledge && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm text-center p-6">
                        <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">Acknowledge Pipeline Job</h3>
                        <p className="text-slate-400 mb-5 text-xs leading-relaxed">Acknowledge lead <strong>LMN{leadToAcknowledge.id}</strong>? Transitions to Follow-Up workspace.</p>
                        <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => setLeadToAcknowledge(null)} className="flex-1 py-2 rounded bg-slate-900 text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer">Abort</button>
                            <button type="button" onClick={async () => { await acceptJob(leadToAcknowledge.id, 'Follow-Up'); setLeadToAcknowledge(null); }} className="flex-1 py-2 rounded bg-cyan-500 text-slate-900 font-black text-xs uppercase tracking-wider cursor-pointer">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── FULFILLMENT MODAL ──────────────────────────────────────────────── */}
            {leadToFulfill && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm text-center p-6">
                        <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Send to Fulfillment?</h3>
                        <p className="text-slate-400 mb-5 text-xs">Confirm push for <strong>LMN{leadToFulfill.id}</strong>.</p>
                        <div className="flex justify-center gap-2">
                            <button type="button" onClick={() => setLeadToFulfill(null)} className="flex-1 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                            <button type="button" onClick={handleSendToFulfillment} className="flex-1 py-2 rounded bg-orange-500 text-slate-900 font-black text-xs cursor-pointer">Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── PROFILE VIEW MODAL ─────────────────────────────────────────────── */}
            {selectedLeadForView && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg shadow-2xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Profile Inspector — LMN{selectedLeadForView.id}</h2>
                            <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 text-slate-300 text-xs font-mono">
                            <p><strong>Customer:</strong> {selectedLeadForView.customerName || selectedLeadForView.profileName}</p>
                            <p><strong>Destination:</strong> {selectedLeadForView.destination}</p>
                            <p><strong>Budget:</strong> <span className="text-emerald-400 font-bold">{selectedLeadForView.amount || selectedLeadForView.budget}</span></p>
                            <p><strong>Status:</strong> <span className="text-cyan-400">{selectedLeadForView.status}</span></p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}