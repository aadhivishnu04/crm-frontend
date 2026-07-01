import React, { useState, useEffect, useRef } from 'react';
import { 
    ShoppingCart, Target, Search, Filter, Eye, Calendar, MapPin, 
    CheckSquare, X, Send, Pencil, Mic, Square, Trash2, Play, 
    RefreshCw, Users, ArrowUp, ChevronLeft, ChevronRight, ChevronDown, History,
    Plus, UserPlus, Phone, Mail, Globe, MessageSquare
} from 'lucide-react';

// ─── NETWORK CONFIGURATION ───────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

// ─── NEW LEAD FORM INITIAL STATE ─────────────────────────────────────────────
const initialNewLeadState = {
    customerName: '',
    phone: '',
    email: '',
    destination: '',
    travelDates: '',
    pax: '',        
    childrenPax: '0',
    packageType: 'Custom / Flexible',
    budget: '',
    platform: 'Website',
    campaign: '',
    leadMessage: '',
    notes: '',
    type: 'B2C Enquiry',
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PACKAGE_TYPES = ['Custom / Flexible', 'Honeymoon', 'Family Tour', 'Group Tour', 'Corporate Trip', 'Solo Backpacking', 'Friends Trip', 'Adventure / Trekking'];
const PLATFORM_OPTIONS = ['Website', 'Instagram', 'Facebook', 'Google Ads', 'Referral', 'Walk-in', 'WhatsApp', 'Other'];
const BUDGET_OPTIONS = ['Under ₹30,000', '₹30,000 - ₹60,000', '₹60,000 - ₹1,00,000', '₹1,00,000 - ₹2,00,000', 'Above ₹2,00,000'];
const PAX_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];
const CHILDREN_OPTIONS = ['0', '1', '2', '3', '4', '5+'];
const DESTINATION_OPTIONS = ['Singapore', 'Dubai', 'Thailand', 'Malaysia', 'Japan', 'UK', 'Bali', 'Maldives', 'Europe', 'Sri Lanka', 'Vietnam', 'Nepal', 'Kashmir', 'Goa', 'Kerala', 'Rajasthan'];

// Utility to format ISO strings to highly readable strings
const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        let hours = dateObj.getHours();
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const strHours = String(hours).padStart(2, '0');

        return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
    } catch (e) {
        return dateStr;
    }
};

const SalesDashboard = () => {
    // Shared Input / UI Classes
    const inputCls = "w-full px-3 py-2 sm:py-1.5 bg-slate-900 border border-slate-700 rounded-lg sm:rounded text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all";
    const selectCls = "w-full px-3 py-2 sm:py-1.5 bg-slate-900 border border-slate-700 rounded-lg sm:rounded text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none cursor-pointer transition-all";
    const readonlyCls = "w-full px-3 py-2 sm:py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg sm:rounded text-slate-400 text-sm cursor-not-allowed";
    const inlineInputCls = "bg-[#091124] text-slate-200 text-xs sm:text-sm border border-slate-700/60 rounded px-2.5 sm:px-2 py-1.5 sm:py-0.5 outline-none focus:border-cyan-500 w-full transition-all";
    const sectionCls = "p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/10 transition-all duration-300";
    const sectionHeadCls = "text-sm sm:text-base font-bold text-cyan-400 tracking-wider uppercase";

    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Jobs');

    // --- SEARCH & FILTER STATES ---
    const [searchName, setSearchName] = useState('');
    const [searchId, setSearchId] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [searchDestination, setSearchDestination] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('All');

    // --- SCROLL TO TOP STATE ---
    const [showScrollButton, setShowScrollButton] = useState(false);
    const tabScrollRef = useRef(null);

    // --- MODAL STATES ---
    const [selectedLead, setSelectedLead] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTo, setAssignTo] = useState('');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignOption, setReassignOption] = useState('pool');
    const [reassignTargetEmployee, setReassignTargetEmployee] = useState('');
    const [reassignReason, setReassignReason] = useState('');

    const [manualEntryStates, setManualEntryStates] = useState({});

    // --- NEW LEAD MODAL STATES ---
    const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
    const [newLeadForm, setNewLeadForm] = useState(initialNewLeadState);
    const [isSubmittingNewLead, setIsSubmittingNewLead] = useState(false);
    const [campaignOptions, setCampaignOptions] = useState([]);
    const [newLeadManualStates, setNewLeadManualStates] = useState({});

    // --- DYNAMIC DATA STATES ---
    const [operationsStaff, setOperationsStaff] = useState([]);
    const [salesStaff, setSalesStaff] = useState([]);

    // --- EDIT MODAL & ACCORDION STATES (salesActivity Default True) ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        leadInfo: true, salesActivity: true, travelDetails: false, customisation: false, operationResponse: false, bookingConfirmation: false, paymentInfo: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const [editFormData, setEditFormData] = useState({
        leadName: '', leadSource: '', leadDate: '', mobileNumber: '', emailAddress: '', assignedTo: '',
        campaign: '', packageType: '', budget: '', messageFromLead: '', tourType: '', destination: '',
        travelDate: '', duration: '', travelBudget: '', hotelCategory: '', noOfAdults: '',
        noOfChildren: '', offers: '', departureCity: '',
        firstAttempt: '', leadResponse: '', interactionType: '', actionTaken: '', 
        leadStatusField: '', salesNotes: '', followupDate: '',
        leadTemperature: '', objectionTracking: '', bookingProbability: '0%', customerResponse: '', noResponseLogs: [],
        customisationRequests: [],
        opsPreparedBy: '', opsCompletedOn: '', opsRemarks: '', opsActionTaken: '',
        opsVerificationStatus: 'Pending Verified', opsSharedWithClient: 'No', 
        billingName: '', bookingDate: '', operationExecutive: '',
        confirmedTripType: '', confirmedDestination: '', confirmedDuration: '', noOfPax: '', confirmedNoOfChildren: '',
        transportMode: '', departureDate: '', tourStartDate: '', returnDate: '', travelEndDate: '', totalPackageCost: '', specialOffers: '',
        arrivalDate: '', flightStatus: '', visaStatus: '', insuranceStatus: '', 
        paymentDueDate: '', transactionId: '', amountReceived: '', paymentMode: '', 
        nextPaymentDate: '', paymentStatus: 'Pending Initial Deposit', paymentHistoryDetails: '', voiceRecordings: [], 
        leadStatus: 'Jobs', gstInclusion: '', tcsInclusion: '', paymentService: '', paymentHistoryList: [],
        followUpCount: 0, followUpType: '', followupAction: '', history: []
    });

    // --- AUTO CALCULATION FOR PAYMENT DUE DATE ---
    useEffect(() => {
        if (isEditModalOpen && editFormData.departureDate && !editFormData.paymentDueDate) {
            const depDate = new Date(editFormData.departureDate);
            if (!isNaN(depDate.getTime())) {
                depDate.setDate(depDate.getDate() - 10);
                const formatted = depDate.toISOString().split('T')[0];
                setEditFormData(prev => ({ ...prev, paymentDueDate: formatted }));
            }
        }
    }, [editFormData.departureDate, isEditModalOpen]);

    // --- AUTO CALCULATION FOR BOOKING PROBABILITY & TEMPERATURE ---
    useEffect(() => {
        let prob = '0%'; 
        let temp = 'Cold';
        const { leadResponse, leadStatusField, customerResponse, actionTaken } = editFormData;

        if (leadStatusField === 'Booking Confirmed') {
            prob = '100%'; temp = 'Hot';
        } else if (leadStatusField === 'Negotiation') {
            prob = '90%'; temp = 'Hot';
        } else if (customerResponse === 'Needs Revision') {
            prob = '75%'; temp = 'Hot';
        } else if (actionTaken === 'Customisation Required') {
            prob = '50%'; temp = 'Warm';
        } else if (leadResponse === 'Requirement Collected') {
            prob = '25%'; temp = 'Cold';
        } else if (leadResponse === 'No Response') {
            prob = '0%'; temp = 'Cold';
        }

        setEditFormData(prev => ({ ...prev, bookingProbability: prob, leadTemperature: temp }));
    }, [editFormData.leadResponse, editFormData.leadStatusField, editFormData.customerResponse, editFormData.actionTaken]);

    // --- VOICE RECORDER STATES ---
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [playingIndex, setPlayingIndex] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioPlayersRef = useRef({});

    const handlePreventEnterSubmit = (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    };

    const appendHistory = (existingHistory, action, note) => {
        const timestamp = new Date().toLocaleString('en-IN', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
        
        let currentHistory = [];
        if (typeof existingHistory === 'string') {
            try { currentHistory = JSON.parse(existingHistory); } catch (e) { currentHistory = []; }
        } else if (Array.isArray(existingHistory)) {
            currentHistory = existingHistory;
        }

        return [{ date: timestamp, action, note }, ...currentHistory];
    };

    const handleCustomisationChange = (index, field, value) => {
        const newRequests = [...editFormData.customisationRequests];
        newRequests[index] = { ...newRequests[index], [field]: value };
        setEditFormData(prev => ({ ...prev, customisationRequests: newRequests }));
    };

    const addCustomisationRequest = () => {
        setEditFormData(prev => ({
            ...prev,
            customisationRequests: [
                ...prev.customisationRequests,
                {
                    destination: prev.destination || '', customisationType: '', requirements: '',
                    assignedTo: '', raiseRequest: 'No', readymadePackageDetails: '',
                    turnaroundTime: '', status: 'Pending'
                }
            ]
        }));
    };
    
    const removeCustomisationRequest = (index) => {
        setEditFormData(prev => ({
            ...prev,
            customisationRequests: prev.customisationRequests.filter((_, i) => i !== index)
        }));
    };

    // --- LOG SUBMISSION HANDLER WITH AUTO-SAVE & PERFECT SYNC ---
    const handleLogNoResponse = async () => {
        if (!editFormData.salesNotes && !editFormData.interactionType && !editFormData.actionTaken) {
            alert("Please enter notes, interaction type, or action first.");
            return;
        }
        
        const newEntry = {
            timestamp: formatDateTime(new Date().toISOString()),
            interaction: editFormData.interactionType,
            action: editFormData.actionTaken,
            notes: editFormData.salesNotes
        };
    
        const updatedLogs = [...(editFormData.noResponseLogs || []), newEntry];
        const updatedCount = updatedLogs.length; // Strict Sync with array length
        const updatedHistory = appendHistory(editFormData.history, `Follow-up: ${editFormData.interactionType || 'Logged'}`, editFormData.salesNotes || editFormData.actionTaken);

        let newStatus = selectedLead?.status || editFormData.leadStatus;
        if (updatedCount >= 10) {
            newStatus = 'Recycle Bin';
        }

        setEditFormData(prev => ({
            ...prev,
            noResponseLogs: updatedLogs,
            followUpCount: updatedCount,
            history: updatedHistory,
            salesNotes: '', 
            leadStatus: newStatus
        }));

        // Auto-save instantly to DB
        try {
            await fetch(`${API_BASE_URL}/leads/${selectedLead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noResponseLogs: JSON.stringify(updatedLogs),
                    followupCount: updatedCount,
                    history: JSON.stringify(updatedHistory),
                    status: newStatus
                })
            });
            fetchJobs(true);
        } catch (e) {
            console.error("Auto-save log failed", e);
        }
    };

    useEffect(() => {
        fetchJobs();
        return () => clearInterval(timerRef.current);
    }, [activeTab]);

    useEffect(() => {
        const fetchStaffDirectory = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/employees`);
                if (response.ok) {
                    const data = await response.json();
                    const opsNames = data.filter(emp => emp.designation && emp.designation.toLowerCase().includes('operation')).map(emp => emp.name);
                    setOperationsStaff(opsNames);
                    const salesNames = data.filter(emp => emp.designation && emp.designation.toLowerCase().includes('sales')).map(emp => emp.name);
                    setSalesStaff(salesNames);
                }
            } catch (error) {
                console.error('Failed to fetch dynamic directory components:', error);
            }
        };
        fetchStaffDirectory();
    }, []);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/campaigns`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setCampaignOptions(data.map(c => c.name || c));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch campaigns:', error);
            }
        };
        fetchCampaigns();
    }, []);

    const fetchJobs = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/leads`);
            if (response.ok) {
                const data = await response.json();
                const sanitized = data.map(item => {
                    let parsedHistory = [];
                    if (typeof item.history === 'string') {
                        try { parsedHistory = JSON.parse(item.history); } catch(e) {}
                    } else if (Array.isArray(item.history)) {
                        parsedHistory = item.history;
                    }
                    return { ...item, status: item.status || 'Jobs', history: parsedHistory };
                });
                setJobs(sanitized);
            } else {
                console.error('Backend error:', response.status);
            }
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    useEffect(() => {
        const handleScrollVisibility = () => {
            setShowScrollButton(window.scrollY > 300);
        };
        window.addEventListener("scroll", handleScrollVisibility);
        return () => window.removeEventListener("scroll", handleScrollVisibility);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
    const scrollTabs = (dir) => tabScrollRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });

    const handleOpenNewLeadModal = () => {
        setNewLeadForm(initialNewLeadState);
        setNewLeadManualStates({});
        setIsNewLeadModalOpen(true);
    };

    const handleNewLeadInputChange = (e) => {
        const { name, value } = e.target;
        setNewLeadForm(prev => ({ ...prev, [name]: value }));
    };

    const handleNewLeadSubmit = async (e) => {
        e.preventDefault();
        if (!newLeadForm.customerName.trim()) {
            alert('Customer name is required.');
            return;
        }
        if (!newLeadForm.phone.trim()) {
            alert('Phone number is required.');
            return;
        }

        setIsSubmittingNewLead(true);
        try {
            const initialHistory = appendHistory([], 'Lead Created', `Source: ${newLeadForm.platform} | Campaign: ${newLeadForm.campaign || 'N/A'} | Added manually via Sales Dashboard`);

            const payload = {
                customerName: newLeadForm.customerName,
                phone: newLeadForm.phone,
                email: newLeadForm.email,
                destination: newLeadForm.destination,
                travelDates: newLeadForm.travelDates,
                noOfPax: newLeadForm.pax,
                noOfChildren: newLeadForm.childrenPax,
                packageType: newLeadForm.packageType,
                budget: newLeadForm.budget,
                budgetRange: newLeadForm.budget,
                platform: newLeadForm.platform,
                campaign: newLeadForm.campaign,
                leadMessage: newLeadForm.leadMessage,
                notes: newLeadForm.notes,
                type: newLeadForm.type,
                status: 'Jobs',
                history: JSON.stringify(initialHistory),
                dateAdded: new Date().toISOString(),
            };

            const response = await fetch(`${API_BASE_URL}/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const saved = await response.json();
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
                }).catch(err => console.error('Silently failing email trigger:', err));

                setIsNewLeadModalOpen(false);
                fetchJobs();
            } else {
                const err = await response.json().catch(() => ({}));
                alert(`Failed to create lead: ${err.message || err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('New lead submit error:', error);
            alert('Network error. Check if the backend server is running.');
        } finally {
            setIsSubmittingNewLead(false);
        }
    };

    const renderNewLeadDropdown = (name, value, placeholder, options) => {
        const isCustomValue = value && value !== '' && !options.includes(value);

        const handleSelect = (e) => {
            if (e.target.value === '__MANUAL__') {
                setNewLeadManualStates(prev => ({ ...prev, [name]: true }));
                setNewLeadForm(prev => ({ ...prev, [name]: '' }));
            } else {
                setNewLeadForm(prev => ({ ...prev, [name]: e.target.value }));
            }
        };

        if (newLeadManualStates[name] || isCustomValue) {
            return (
                <div className="flex items-center gap-1.5 w-full">
                    <input
                        type="text"
                        name={name}
                        value={value || ''}
                        onChange={handleNewLeadInputChange}
                        placeholder="Type manually..."
                        className={`${inputCls} flex-1`}
                        autoFocus={newLeadManualStates[name] && !isCustomValue}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setNewLeadManualStates(prev => ({ ...prev, [name]: false }));
                            setNewLeadForm(prev => ({ ...prev, [name]: '' }));
                        }}
                        className="flex items-center justify-center bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded border border-slate-600 transition-colors flex-shrink-0 p-1.5"
                        title="Cancel"
                    >
                        <X size={16} />
                    </button>
                </div>
            );
        }

        return (
            <select name={name} value={value || ''} onChange={handleSelect} className={selectCls}>
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                ))}
                <option value="__MANUAL__" className="font-bold text-orange-400 bg-slate-800">+ Add Manual / Other</option>
            </select>
        );
    };

    const startRecording = async () => {
        audioChunksRef.current = [];
        setRecordingTime(0);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(audioBlob);
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    setEditFormData(prev => ({ ...prev, voiceRecordings: [...(prev.voiceRecordings || []), { url, base64: reader.result }] }));
                };
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) {
            alert('Microphone access denied. Please check system permissions.');
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
        if (playingIndex === index) { audioPlayersRef.current[index]?.pause(); setPlayingIndex(null); }
        setEditFormData(prev => ({ ...prev, voiceRecordings: prev.voiceRecordings.filter((_, i) => i !== index) }));
    };

    const togglePlayback = (index) => {
        const player = audioPlayersRef.current[index];
        if (!player) return;
        if (playingIndex === index) { player.pause(); setPlayingIndex(null); } 
        else { audioPlayersRef.current[playingIndex]?.pause(); player.play(); setPlayingIndex(index); }
    };

    const formatTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleOpenReassignModal = (lead) => {
        setSelectedLead(lead);
        setReassignOption('pool');
        setReassignTargetEmployee('');
        setReassignReason('');
        setIsReassignModalOpen(true);
    };

    const handleReassignSubmit = async () => {
        if (reassignOption === 'employee' && !reassignTargetEmployee) {
            alert('Please select a sales employee to assign this job.');
            return;
        }
        try {
            const actionText = reassignOption === 'pool' ? 'Moved back to Jobs Pool' : `Reassigned to ${reassignTargetEmployee}`;
            const noteText = reassignOption === 'pool' ? 'Released from sales assignment.' : `Reason: ${reassignReason || 'No reason provided.'}`;
            const updatedHistory = appendHistory(selectedLead.history, actionText, noteText);
            const payload = reassignOption === 'pool'
                ? { assignedTo: '', status: 'Jobs', history: JSON.stringify(updatedHistory) }
                : { assignedTo: reassignTargetEmployee, status: 'Sales Assigned', reassignmentReason: reassignReason, history: JSON.stringify(updatedHistory) };

            const response = await fetch(`${API_BASE_URL}/leads/${selectedLead.id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) { setIsReassignModalOpen(false); fetchJobs(); }
            else alert('Failed to execute reassignment.');
        } catch (error) {
            console.error('Reassign error:', error);
        }
    };

    const handleOpenEditModal = (lead) => {
        setSelectedLead(lead);
        setRecordingTime(0);
        setIsRecording(false);
        setPlayingIndex(null);

        setExpandedSections({
            leadInfo: true, salesActivity: true, travelDetails: false, customisation: false, operationResponse: false, bookingConfirmation: false, paymentInfo: false
        });

        // --- Safe JSON Parsing for Previous Attempts ---
        let parsedNoResponseLogs = [];
        try {
            if (lead.noResponseLogs && lead.noResponseLogs !== '[object Object]') {
                parsedNoResponseLogs = typeof lead.noResponseLogs === 'string' ? JSON.parse(lead.noResponseLogs) : lead.noResponseLogs;
                if (!Array.isArray(parsedNoResponseLogs)) {
                    parsedNoResponseLogs = [];
                }
            }
        } catch (e) {
            console.error("Error securely parsing noResponseLogs", e);
            parsedNoResponseLogs = [];
        }

        // --- Self Healing & Strict Legacy Sync ---
        let pHistory = [];
        try { pHistory = typeof lead.history === 'string' ? JSON.parse(lead.history) : (lead.history || []); } catch(e){}

        if (parsedNoResponseLogs.length === 0 && (lead.followupCount > 0 || lead.followUpCount > 0)) {
            const recoveredLogs = pHistory.filter(h => 
                h.action && (h.action.toLowerCase().includes('follow') || h.action.toLowerCase().includes('response') || h.action.toLowerCase().includes('log') || h.action.toLowerCase().includes('attempt'))
            ).map(h => ({
                timestamp: formatDateTime(h.date),
                interaction: 'Legacy Record',
                action: h.action,
                notes: h.note || 'Historical entry'
            }));
            
            if (recoveredLogs.length > 0) {
                parsedNoResponseLogs = recoveredLogs;
            } else {
                const dummyCount = lead.followupCount || lead.followUpCount || 1;
                for (let i=0; i<dummyCount; i++) {
                    parsedNoResponseLogs.push({
                        timestamp: formatDateTime(lead.createdAt || lead.dateAdded) || 'Legacy Date',
                        interaction: 'Legacy Record',
                        action: 'Previous Activity',
                        notes: 'Migrated from legacy system'
                    });
                }
            }
        }

        let initialRecordings = [];
        if (lead.voiceBinaryFile) {
            try { initialRecordings = JSON.parse(lead.voiceBinaryFile); }
            catch { initialRecordings = [{ url: lead.voiceBinaryFile, base64: lead.voiceBinaryFile }]; }
        } else if (Array.isArray(lead.voiceRecordings)) {
            initialRecordings = lead.voiceRecordings;
        }
        
        let parsedPaymentHistory = [];
        if (lead.paymentHistoryDetails) {
            try { parsedPaymentHistory = JSON.parse(lead.paymentHistoryDetails); }
            catch { parsedPaymentHistory = []; }
        } else if (Array.isArray(lead.paymentHistoryList)) {
            parsedPaymentHistory = lead.paymentHistoryList;
        }

        let parsedCustomisationRequests = [];
        if (lead.customisationRequests) {
            try { parsedCustomisationRequests = typeof lead.customisationRequests === 'string' ? JSON.parse(lead.customisationRequests) : lead.customisationRequests; } 
            catch { parsedCustomisationRequests = []; }
        }
        if (!parsedCustomisationRequests || parsedCustomisationRequests.length === 0) {
            parsedCustomisationRequests = [{
                destination: lead.customisationDestination || lead.destination || '',
                customisationType: lead.customisationType || '',
                requirements: lead.requirements || '',
                requiredByDate: lead.requiredByDate || '',
                assignedTo: lead.customisationAssignedTo || '',
                raiseRequest: lead.raiseRequest || 'No',
                readymadePackageDetails: lead.readymadePackageDetails || '',
                turnaroundTime: lead.turnaroundTime || '',
                status: lead.customisationStatus || 'Pending'
            }];
        }

        setEditFormData({
            leadName: lead.customerName || lead.profileName || '',
            leadSource: lead.platform || 'Website',
            leadDate: formatDateTime(lead.createdAt || lead.dateAdded) || '',
            mobileNumber: lead.phone || lead.mobileNo || '',
            emailAddress: lead.email || '',
            assignedTo: lead.assignedTo || 'Unassigned',
            campaign: lead.campaign || 'Organic Search',
            packageType: lead.packageType || lead.type || 'B2C Enquiry',
            budget: lead.budget || lead.amount || '',
            messageFromLead: lead.leadMessage || lead.message || lead.notes || '',
            tourType: lead.tourType || '',
            destination: lead.destination || '',
            travelDate: lead.travelDate || lead.travelDates || '',
            duration: lead.duration || '',
            travelBudget: lead.travelBudget || lead.budget || '',
            hotelCategory: lead.hotelCategory || '',
            noOfAdults: lead.noOfAdults || '2',
            noOfChildren: lead.noOfChildren || '0',
            offers: lead.offers || '',
            departureCity: lead.departureCity || '',
            firstAttempt: lead.firstAttempt || '',
            leadResponse: lead.leadResponse || '',
            interactionType: lead.interactionType || '',
            actionTaken: lead.actionTaken || '',
            leadStatusField: lead.leadStatusField || '',
            salesNotes: lead.salesNotes || '',
            followupDate: lead.nextFollowUp || lead.followupDate || '',
            leadTemperature: lead.leadTemperature || '',
            objectionTracking: lead.objectionTracking || '',
            customerResponse: lead.customerResponse || '',
            bookingProbability: lead.bookingProbability || '0%',
            
            noResponseLogs: parsedNoResponseLogs,
            history: pHistory,

            customisationRequests: parsedCustomisationRequests,
            opsPreparedBy: lead.opsPreparedBy || '',
            opsCompletedOn: lead.opsCompletedOn || '',
            opsRemarks: lead.opsRemarks || '',
            opsActionTaken: lead.opsActionTaken || '',
            opsVerificationStatus: lead.opsVerificationStatus || 'Pending Verified',
            opsSharedWithClient: lead.opsSharedWithClient || 'No', 
            billingName: lead.billingName || '',
            bookingDate: lead.bookingDate || '',
            operationExecutive: lead.operationExecutive || '',
            confirmedTripType: lead.tripCategory || lead.tourType || '',
            confirmedDestination: lead.confirmedDestination || lead.destination || '',
            confirmedDuration: lead.confirmedDuration || lead.duration || '',
            noOfPax: lead.noOfPax || lead.travellerCount || '',
            confirmedNoOfChildren: lead.confirmedNoOfChildren || lead.noOfChildren || '0',
            transportMode: lead.transportMode || '',
            departureDate: lead.departureDate || '',
            tourStartDate: lead.tourStartDate || '',
            returnDate: lead.returnDate || '',
            travelEndDate: lead.travelEndDate || '',
            totalPackageCost: lead.totalPackageCost || lead.amount || lead.budget || '',
            specialOffers: lead.specialOffers || '',
            arrivalDate: lead.arrivalDate || '',
            flightStatus: lead.flightStatus || '',
            visaStatus: lead.visaStatus || '',
            insuranceStatus: lead.insuranceStatus || '', 
            paymentDueDate: lead.paymentDueDate || '',
            transactionId: lead.transactionId || '',
            amountReceived: lead.amountReceived || '',
            paymentMode: lead.paymentMode || '', 
            nextPaymentDate: lead.nextPaymentDate || '',
            paymentStatus: lead.paymentStatus || 'Pending Initial Deposit',
            paymentHistoryDetails: lead.paymentHistoryDetails || '',
            voiceRecordings: initialRecordings, 
            leadStatus: lead.status || 'Jobs',
            gstInclusion: lead.gstInclusion || '',
            tcsInclusion: lead.tcsInclusion || '',
            paymentService: lead.paymentService || '',
            paymentHistoryList: parsedPaymentHistory,
            
            // STRICTLY TIE FOLLOW UP COUNT TO THE ARRAY LENGTH
            followUpCount: parsedNoResponseLogs.length, 
            followUpType: lead.followUpType || '',
            followupAction: lead.followupAction || ''
        });
        setIsEditModalOpen(true);
    };

    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        try {
            let finalStatus = editFormData.leadStatus;
            if (editFormData.followUpCount >= 10) {
                finalStatus = 'Recycle Bin';
            }

            const updatedHistory = appendHistory(
                editFormData.history,
                `Lead Profile Updated`,
                `Status: ${editFormData.leadStatusField || finalStatus} | Stage: ${editFormData.leadResponse || 'N/A'}`
            );

            const payload = {
                ...editFormData,
                packageCost: editFormData.totalPackageCost,
                offers: editFormData.specialOffers, 
                noOfChildren: editFormData.confirmedNoOfChildren || editFormData.noOfChildren,
                noResponseLogs: editFormData.noResponseLogs?.length ? JSON.stringify(editFormData.noResponseLogs) : null,
                followupCount: editFormData.followUpCount,
                voiceBinaryFile: editFormData.voiceRecordings?.length ? JSON.stringify(editFormData.voiceRecordings) : null,
                paymentHistoryDetails: editFormData.paymentHistoryList?.length ? JSON.stringify(editFormData.paymentHistoryList) : null,
                
                // --- UNIFIED PIPELINE ARRAYS ---
                customisationRequests: editFormData.customisationRequests?.length ? JSON.stringify(editFormData.customisationRequests) : null,
                customisationDestination: editFormData.customisationRequests[0]?.destination || '',
                customisationType: editFormData.customisationRequests[0]?.customisationType || '',
                requirements: editFormData.customisationRequests[0]?.requirements || '',
                requiredByDate: editFormData.customisationRequests[0]?.requiredByDate || '',
                customisationAssignedTo: editFormData.customisationRequests[0]?.assignedTo || '',
                raiseRequest: editFormData.customisationRequests[0]?.raiseRequest || 'No',
                readymadePackageDetails: editFormData.customisationRequests[0]?.readymadePackageDetails || '',
                turnaroundTime: editFormData.customisationRequests[0]?.turnaroundTime || '',
                customisationStatus: editFormData.customisationRequests[0]?.status || 'Pending',
                
                status: finalStatus,
                history: JSON.stringify(updatedHistory)
            };
            
            const response = await fetch(`${API_BASE_URL}/leads/${selectedLead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) { setIsEditModalOpen(false); fetchJobs(); }
            else {
                const err = await response.json();
                alert(`Update failed: ${err.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Edit submit error:', error);
            alert('Network error while updating lead.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleOpenAssignModal = (lead) => {
        setSelectedLead(lead);
        setAssignTo('');
        setIsAssignModalOpen(true);
    };

    const handleAssignSubmit = async () => {
        if (!assignTo) { alert('Please select a team or choose self assignment.'); return; }
        try {
            const updatedHistory = appendHistory(selectedLead.history, `Assigned to ${assignTo}`, 'Lead claimed/assigned from global pool.');

            const response = await fetch(`${API_BASE_URL}/leads/${selectedLead.id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedTo: assignTo, status: 'Sales Assigned', history: JSON.stringify(updatedHistory) })
            });
            if (response.ok) { setIsAssignModalOpen(false); fetchJobs(); }
            else alert('Failed to assign.');
        } catch (error) {
            console.error('Assign error:', error);
        }
    };

    const handleMoveToOps = async (leadId) => {
        if (!window.confirm('Are you sure you want to send this to Operations?')) return;
        try {
            const leadToMove = jobs.find(j => j.id === leadId);
            const updatedHistory = appendHistory(leadToMove?.history, 'Moved to Operations', 'Sales process completed, handed over to operations team.');

            const response = await fetch(`${API_BASE_URL}/leads/${leadId}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Move To Operation', history: JSON.stringify(updatedHistory) })
            });
            if (response.ok) fetchJobs();
            else alert('Failed to move to operations.');
        } catch (error) {
            console.error('Move to ops error:', error);
        }
    };

    const categories = [
        { id: 'Jobs', label: 'Jobs', icon: ShoppingCart },
        { id: 'Sales Assigned', label: 'My Jobs', icon: Target },
        { id: 'Itinerary Shared', label: 'Itinerary Shared', icon: Target },
        { id: 'Follow-Up Required', label: 'Followup Required', icon: Target },
        { id: 'Move To Operation', label: 'Operations Desk', icon: Target },
        { id: 'Recycle Bin', label: 'Recycle Bin', icon: Trash2 },
    ];

    const filteredData = jobs.filter(item => {
        const displayId = `LMN${item.id || ''}`.toLowerCase();
        const name = (item.customerName || item.profileName || '').toLowerCase();
        const dest = (item.destination || '').toLowerCase();
        const phoneStr = (item.phone || item.mobileNo || '').toLowerCase();

        const matchName = name.includes(searchName.toLowerCase());
        const matchId = displayId.includes(searchId.toLowerCase());
        const matchPhone = phoneStr.includes(searchPhone.toLowerCase());
        const matchDest = dest.includes(searchDestination.toLowerCase());
        const matchSearch = matchName && matchId && matchPhone && matchDest;

        const matchPlatform = selectedPlatform === 'All' || (item.platform || 'Website') === selectedPlatform;
        
        const itemStatus = item.status || 'Jobs';
        let matchTab = false;
        
        const isRecycleBin = (item.followupCount >= 10 || item.followUpCount >= 10 || itemStatus === 'Recycle Bin');

        if (activeTab === 'Recycle Bin') {
            matchTab = isRecycleBin;
        } else if (isRecycleBin) {
            matchTab = false;
        } else if (activeTab === 'Sales Assigned') {
            matchTab = ['Sales Assigned', 'Itinerary Shared', 'Follow-Up Required', 'Move To Operation', 'Shared to Sales'].includes(itemStatus);
        } else if (activeTab === 'Move To Operation') {
            matchTab = ['Move To Operation', 'Shared to Sales'].includes(itemStatus);
        } else {
            matchTab = itemStatus === activeTab;
        }

        return matchSearch && matchPlatform && matchTab;
    });

    const renderDatePicker = (name, value, label, onChangeHandler, placeholderText = '') => {
        return (
            <div className="w-full">
                {label && <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">{label}</label>}
                <div className="relative bg-slate-900 border border-slate-700 rounded-lg sm:rounded focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all overflow-hidden group flex items-center">
                    <input
                        type="date"
                        name={name}
                        value={value || ''}
                        onChange={onChangeHandler}
                        className="w-full px-3 py-2 sm:py-1.5 bg-transparent text-white text-sm outline-none cursor-pointer appearance-none relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:top-0"
                    />
                    <Calendar size={16} className="absolute right-3 text-slate-400 group-hover:text-cyan-400 z-0 transition-colors pointer-events-none" />
                </div>
                {placeholderText && <p className="text-[9px] text-slate-500 mt-0.5 italic">{placeholderText}</p>}
            </div>
        );
    };

    const renderArrayDropdown = (field, value, index, defaultOption, optionsList) => {
        const optionValues = optionsList.map(opt => typeof opt === 'object' ? opt.value : opt);
        const isCustomValue = value && value !== "" && !optionValues.includes(value);

        const handleSelect = (e) => {
            if (e.target.value === '__MANUAL__') {
                setManualEntryStates(prev => ({ ...prev, [`customisation_${index}_${field}`]: true }));
                handleCustomisationChange(index, field, '');
            } else {
                handleCustomisationChange(index, field, e.target.value);
            }
        };

        if (manualEntryStates[`customisation_${index}_${field}`] || isCustomValue) {
            return (
                <div className="flex items-center gap-1.5 w-full transition-all">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleCustomisationChange(index, field, e.target.value)}
                        placeholder="Manual entry..."
                        className={`${inputCls} flex-1 min-w-[80px]`}
                        autoFocus={manualEntryStates[`customisation_${index}_${field}`] && !isCustomValue}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setManualEntryStates(prev => ({ ...prev, [`customisation_${index}_${field}`]: false }));
                            handleCustomisationChange(index, field, '');
                        }}
                        className="flex items-center justify-center bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded border border-slate-600 transition-colors flex-shrink-0 p-1.5 sm:p-2"
                        title="Cancel manual entry"
                    >
                        <X size={16} />
                    </button>
                </div>
            );
        }

        return (
            <select value={value || ''} onChange={handleSelect} className={selectCls}>
                {defaultOption !== null && <option value="">{defaultOption}</option>}
                {optionsList.map((opt, idx) => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    return <option key={idx} value={optVal}>{optLabel}</option>;
                })}
                <option value="__MANUAL__" className="font-bold text-orange-400 bg-slate-800">+ Add Manual / Other</option>
            </select>
        );
    };

    const renderDropdown = (name, value, defaultOption, optionsList, onChangeHandler, customClass = selectCls) => {
        const optionValues = optionsList.map(opt => typeof opt === 'object' ? opt.value : opt);
        const isCustomValue = value && value !== "" && !optionValues.includes(value);
        const useInlineStyles = customClass.includes('bg-[#091124]') || customClass.includes('inline'); 
        const inputClassName = useInlineStyles ? `${inlineInputCls} w-32 md:w-full` : inputCls;

        const handleSelect = (e) => {
            if (e.target.value === '__MANUAL__') {
                setManualEntryStates(prev => ({ ...prev, [name]: true }));
                onChangeHandler({ target: { name, value: '', type: 'text' } });
            } else {
                onChangeHandler(e);
            }
        };

        if (manualEntryStates[name] || isCustomValue) {
            return (
                <div className="flex items-center gap-1.5 w-full transition-all">
                    <input
                        type="text"
                        name={name}
                        value={value || ''}
                        onChange={onChangeHandler}
                        placeholder="Manual entry..."
                        className={`${inputClassName} flex-1 min-w-[80px]`}
                        autoFocus={manualEntryStates[name] && !isCustomValue}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setManualEntryStates(prev => ({ ...prev, [name]: false }));
                            onChangeHandler({ target: { name, value: '', type: 'text' } });
                        }}
                        className={`flex items-center justify-center bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded border border-slate-600 transition-colors flex-shrink-0 ${useInlineStyles ? 'p-1' : 'p-1.5 sm:p-2'}`}
                        title="Cancel manual entry"
                    >
                        <X size={useInlineStyles ? 14 : 16} />
                    </button>
                </div>
            );
        }

        return (
            <select name={name} value={value || ''} onChange={handleSelect} className={customClass}>
                {defaultOption !== null && <option value="">{defaultOption}</option>}
                {optionsList.map((opt, idx) => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    return <option key={idx} value={optVal}>{optLabel}</option>;
                })}
                <option value="__MANUAL__" className="font-bold text-orange-400 bg-slate-800">+ Add Manual / Other</option>
            </select>
        );
    };

    const probValue = parseInt(editFormData.bookingProbability) || 0;
    const circleRadius = 20;
    const circleCircumference = 2 * Math.PI * circleRadius; // ~125.66
    const circleOffset = circleCircumference - (probValue / 100) * circleCircumference;

    return (
        <div className="p-1 sm:p-4 lg:p-6 pt-20 sm:pt-24 lg:pt-24 w-full bg-[#0f172a] min-h-screen font-sans relative text-white">

            {/* Header */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Sales Dashboard</h1>
                    <p className="text-slate-400 text-sm sm:text-base mt-1">Manage and track your sales pipeline efficiently.</p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenNewLeadModal}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-[#0f172a] font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-200 flex-shrink-0 self-center sm:self-auto"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Add New Lead</span>
                </button>
            </div>

            {/* ── MOBILE-OPTIMIZED CATEGORY TABS ───────────────────────────────── */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeTab === cat.id;
                    const count = jobs.filter(d => {
                        const itemStatus = d.status || 'Jobs';
                        const isRecycleBin = (d.followupCount >= 10 || d.followUpCount >= 10 || itemStatus === 'Recycle Bin');
                        if (cat.id === 'Recycle Bin') return isRecycleBin;
                        if (isRecycleBin) return false;

                        if (cat.id === 'Sales Assigned') {
                            return ['Sales Assigned', 'Itinerary Shared', 'Follow-Up Required', 'Move To Operation', 'Shared to Sales'].includes(itemStatus);
                        }
                        if (cat.id === 'Move To Operation') {
                            return ['Move To Operation', 'Shared to Sales'].includes(itemStatus);
                        }
                        return itemStatus === cat.id;
                    }).length;
                    
                    return (
                        <div
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`relative p-5 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md ${isActive ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-3 rounded-lg ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-800/20 text-slate-300'}`}>
                                    <Icon size={24} strokeWidth={2} />
                                </div>
                                <span className={`text-xl font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>{count}</span>
                            </div>
                            <h3 className={`font-semibold text-base ${isActive ? 'text-white' : 'text-slate-200'}`}>{cat.label}</h3>
                            {isActive && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-slate-700" />}
                        </div>
                    );
                })}
            </div>

            {/* Mobile horizontal scroll strip */}
            <div className="flex items-center gap-1 mb-6 md:hidden">
                <button
                    type="button"
                    onClick={() => scrollTabs(-1)}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 cursor-pointer"
                >
                    <ChevronLeft size={16} />
                </button>
                <div ref={tabScrollRef} className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeTab === cat.id;
                        const count = jobs.filter(d => {
                            const itemStatus = d.status || 'Jobs';
                            const isRecycleBin = (d.followupCount >= 10 || d.followUpCount >= 10 || itemStatus === 'Recycle Bin');
                            if (cat.id === 'Recycle Bin') return isRecycleBin;
                            if (isRecycleBin) return false;

                            if (cat.id === 'Sales Assigned') {
                                return ['Sales Assigned', 'Itinerary Shared', 'Follow-Up Required', 'Move To Operation', 'Shared to Sales'].includes(itemStatus);
                            }
                            if (cat.id === 'Move To Operation') {
                                return ['Move To Operation', 'Shared to Sales'].includes(itemStatus);
                            }
                            return itemStatus === cat.id;
                        }).length;

                        return (
                            <div
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`relative flex-shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${isActive ? 'ring-1 ring-cyan-500 border-cyan-700 bg-[#07202a] text-white' : 'bg-slate-800/30 border-slate-700/30 text-slate-300'}`}
                                style={{ minWidth: '148px' }}
                            >
                                <div className={`p-1.5 rounded-md flex-shrink-0 ${isActive ? 'bg-slate-700 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                                    <Icon size={16} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-xs font-semibold leading-tight truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>{cat.label}</span>
                                    <span className={`text-base font-bold leading-tight ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>{count}</span>
                                </div>
                                {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-b-xl bg-cyan-500" />}
                            </div>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={() => scrollTabs(1)}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 cursor-pointer"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* SEPARATE FILTER SECTION */}
            <div className="flex flex-col gap-3 w-full mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" placeholder="Search Name..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className={`${inputCls} pl-8`} />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" placeholder="Search ID..." value={searchId} onChange={(e) => setSearchId(e.target.value)} className={`${inputCls} pl-8`} />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" placeholder="Search Phone..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className={`${inputCls} pl-8`} />
                    </div>
                   
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className={`${selectCls} pl-8`}>
                            <option value="All">All Platforms</option>
                            {PLATFORM_OPTIONS.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Data Table Wrapper */}
            <div className="bg-transparent sm:bg-slate-900/30 border-none sm:border border-slate-700/30 rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Table Header Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-0 sm:p-5 border-b-0 sm:border-b border-slate-700/20 gap-4 mb-4 sm:mb-0">
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between sm:justify-start">
                        <span className="truncate pr-2">{categories.find(c => c.id === activeTab)?.label || activeTab}</span>
                        <span className="text-slate-400 font-normal text-sm sm:text-base whitespace-nowrap bg-slate-800/50 sm:bg-transparent px-2 py-0.5 rounded-full sm:px-0 sm:ml-2">({filteredData.length} records)</span>
                    </h2>
                </div>

                {/* Main Data View */}
                <div className="overflow-x-auto custom-scrollbar w-full">
                    <table className="w-full text-left text-sm sm:text-base text-slate-200 block md:table">
                        
                        <thead className="bg-slate-900/80 border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400 font-semibold hidden md:table-header-group">
                            {(activeTab === 'Jobs' || activeTab === 'Recycle Bin') && (
                                <tr>
                                    <th className="px-4 py-4">Job Id</th>
                                    <th className="px-4 py-4">Lead Info</th>
                                    <th className="px-4 py-4">Tour Details</th>
                                    <th className="px-4 py-4">Type & Budget</th>
                                    <th className="px-4 py-4">Message from Lead</th>
                                    <th className="px-4 py-4">Source</th>
                                    <th className="px-4 py-4">Lead Date</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            )}
                            {activeTab === 'Sales Assigned' && (
                                <tr>
                                    <th className="px-4 py-4">Job Id</th>
                                    <th className="px-4 py-4">Lead Info</th>
                                    <th className="px-4 py-4">Tour Details</th>
                                    <th className="px-4 py-4">Source</th>
                                    <th className="px-4 py-4">Lead Date</th>
                                    <th className="px-4 py-4">Lead Status</th>
                                    <th className="px-4 py-4">Next Followup</th>
                                    <th className="px-4 py-4">Priority</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            )}
                            {activeTab === 'Itinerary Shared' && (
                                <tr>
                                    <th className="px-4 py-4">Job Id</th>
                                    <th className="px-4 py-4">Lead Info</th>
                                    <th className="px-4 py-4">Tour Details</th>
                                    <th className="px-4 py-4">Shared Date</th>
                                    <th className="px-4 py-4">Sales Stage</th>
                                    <th className="px-4 py-4">Response</th>
                                    <th className="px-4 py-4">Next Followup</th>
                                    <th className="px-4 py-4">Priority</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            )}
                            {activeTab === 'Follow-Up Required' && (
                                <tr>
                                    <th className="px-4 py-4">Job Id</th>
                                    <th className="px-4 py-4">Lead Info</th>
                                    <th className="px-4 py-4">Tour Details</th>
                                    <th className="px-4 py-4">Last Follow-up</th>
                                    <th className="px-4 py-4">Count</th>
                                    <th className="px-4 py-4">Next Follow-Up</th>
                                    <th className="px-4 py-4">Priority</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            )}
                            {activeTab === 'Move To Operation' && (
                                <tr>
                                    <th className="px-4 py-4">Job ID</th>
                                    <th className="px-4 py-4">Customer Info</th>
                                    <th className="px-4 py-4">Trip Details</th>
                                    <th className="px-4 py-4">Package / Budget</th>
                                    <th className="px-4 py-4">Message / Notes</th>
                                    <th className="px-4 py-4">Source</th>
                                    <th className="px-4 py-4">Date Added</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            )}
                        </thead>
                        
                        <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-slate-700/30">
                            {isLoading ? (
                                <tr className="block md:table-row">
                                    <td colSpan="12" className="block md:table-cell px-4 py-12 text-center text-slate-500">Loading records...</td>
                                </tr>
                            ) : filteredData.length > 0 ? filteredData.map(row => (
                                <tr key={row.id} className="block md:table-row bg-[#1e293b] md:bg-transparent border border-slate-700 md:border-none rounded-xl mb-4 md:mb-0 p-3 sm:p-4 md:p-0 hover:bg-slate-800/40 transition-colors shadow-sm md:shadow-none group relative">

                                    {(activeTab === 'Jobs' || activeTab === 'Recycle Bin') && (
                                        <>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Job Id</span>
                                                <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1"><span className="hidden sm:inline">📞</span> {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px] sm:max-w-none">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 truncate max-w-[150px] sm:max-w-none text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Type/Budget</span>
                                                <div className="flex flex-col items-end md:items-start text-sm gap-1.5">
                                                    <span className="text-purple-300 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-900/40 text-[10px] sm:text-xs whitespace-nowrap">{row.typeOfTour || row.packageType || 'Tour'}</span>
                                                    <span className="font-semibold text-slate-200">{row.budgetRange || row.budget || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="flex flex-col md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mb-1">Message</span>
                                                <div className="text-sm text-slate-400 truncate max-w-full md:max-w-[180px] italic" title={row.leadMessage}>{row.leadMessage ? `"${row.leadMessage}"` : '—'}</div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Source</span>
                                                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-pink-950/30 text-pink-400 border border-pink-900/30 whitespace-nowrap">{row.platform || 'Website'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Lead Date</span>
                                                <span className="text-sm text-slate-400 whitespace-nowrap">{formatDateTime(row.createdAt || row.dateAdded)}</span>
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'Sales Assigned' && (
                                        <>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300 align-top">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Job Id</span>
                                                <div className="flex flex-col items-end md:items-start gap-1.5">
                                                    <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                                    {row.status && row.status !== 'Sales Assigned' && row.status !== 'Jobs' && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase whitespace-nowrap ${
                                                            row.status === 'Itinerary Shared' ? 'bg-purple-900/40 text-purple-400 border-purple-800/50' :
                                                            row.status === 'Follow-Up Required' ? 'bg-amber-900/40 text-amber-400 border-amber-800/50' :
                                                            row.status === 'Move To Operation' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' :
                                                            row.status === 'Shared to Sales' ? 'bg-blue-900/40 text-blue-400 border-blue-800/50' :
                                                            'bg-slate-800 text-slate-400 border-slate-700'
                                                        }`}>
                                                            {row.status === 'Move To Operation' ? 'Operations' : row.status === 'Shared to Sales' ? 'Returned to Sales' : row.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px]">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Source</span>
                                                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-pink-950/30 text-pink-400 border border-pink-900/30">{row.platform || 'Website'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Lead Date</span>
                                                <span className="text-sm text-slate-400">{formatDateTime(row.createdAt || row.dateAdded)}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none w-full md:w-auto">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Lead Status</span>
                                                <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[11px] sm:text-xs font-medium whitespace-nowrap">
                                                    {row.leadStatusField || 'Yet to Connect'}
                                                </span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Next Followup</span>
                                                <span className="text-sm text-slate-300">{row.followupDate || row.nextFollowUp || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Priority</span>
                                                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${row.priorityTimeline === 'High' ? 'bg-red-950 text-red-400 border border-red-900/50' : row.priorityTimeline === 'Medium' ? 'bg-amber-950 text-amber-400 border border-amber-900/50' : 'bg-blue-950 text-blue-400 border border-blue-900/50'}`}>
                                                    {row.priorityTimeline || 'Medium'}
                                                </span>
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'Itinerary Shared' && (
                                        <>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Job Id</span>
                                                <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px]">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Shared Date</span>
                                                <span className="text-sm text-slate-300">{row.itinerarySharedDate || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none w-full md:w-auto">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Sales Stage</span>
                                                <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[11px] sm:text-xs font-medium whitespace-nowrap">
                                                    {row.salesStage || '—'}
                                                </span>
                                            </td>
                                            <td className="flex flex-col md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Response</span>
                                                <span className="text-[11px] sm:text-xs text-slate-400 truncate max-w-full md:max-w-[150px]" title={row.voiceMessageNotes}>{row.voiceMessageNotes || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Next Followup</span>
                                                <span className="text-sm text-slate-300">{row.followupDate || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Priority</span>
                                                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${row.priorityTimeline === 'High' ? 'bg-red-950 text-red-400 border border-red-900/50' : 'bg-blue-950 text-blue-400 border border-blue-900/50'}`}>
                                                    {row.priorityTimeline || 'Medium'}
                                                </span>
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'Follow-Up Required' && (
                                        <>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Job Id</span>
                                                <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px]">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Last Followup</span>
                                                <span className="text-sm text-slate-300">{row.lastFollowupDate || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Count</span>
                                                <span className="text-sm text-slate-300">{row.followupCount || 1}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Next Followup</span>
                                                <span className="text-sm text-slate-300">{row.followupDate || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Priority</span>
                                                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${row.priorityTimeline === 'High' ? 'bg-red-950 text-red-400 border border-red-900/50' : 'bg-blue-950 text-blue-400 border border-blue-900/50'}`}>
                                                    {row.priorityTimeline || 'Medium'}
                                                </span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none w-full md:w-auto">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Status</span>
                                                <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[11px] sm:text-xs font-medium whitespace-nowrap">{row.followupStatus || 'Awaiting Response'}</span>
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'Move To Operation' && (
                                        <>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Job Id</span>
                                                <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-none mb-1.5">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <div className="text-xs text-slate-400 flex flex-col gap-0.5">
                                                        <span>📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                        <span className="text-[10px] sm:text-xs text-slate-500">{row.email || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Trip Details</span>
                                                <div className="flex flex-col items-end md:items-start gap-1">
                                                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-sm"><MapPin size={14} className="flex-shrink-0"/><span className="capitalize">{row.destination || 'Bali'}</span></div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400"><Calendar size={12} className="flex-shrink-0"/>{row.travelDates || row.travelDate || 'TBD'}</div>
                                                    <div className="text-[11px] sm:text-xs text-slate-500 md:pl-5">{row.noOfPax || row.travellerCount || '2'} pax</div>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Pkg / Budget</span>
                                                <div className="flex flex-col gap-1.5 items-end md:items-start">
                                                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded bg-purple-950/40 text-purple-300 border border-purple-900/40 whitespace-nowrap">{row.typeOfTour || row.packageType || 'Family Tour'}</span>
                                                    <span className="font-semibold text-slate-200 text-sm">{row.budgetRange || row.budget || row.amount || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="flex flex-col md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none text-xs sm:text-sm text-slate-500">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mb-1">Message / Notes</span>
                                                <div className="flex flex-col gap-1 max-w-full md:max-w-[200px]">
                                                    <div className="truncate italic" title={row.leadMessage}>{row.leadMessage ? `"${row.leadMessage}"` : '—'}</div>
                                                    <div className="truncate text-[10px] sm:text-xs text-emerald-500/80" title={row.opsRemarks}>{row.opsRemarks ? `Ops Note: ${row.opsRemarks}` : ''}</div>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Source</span>
                                                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-pink-950/30 text-pink-400 border border-pink-900/30 whitespace-nowrap">{row.platform || 'Instagram'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Added</span>
                                                <span className="text-sm text-slate-400 font-medium whitespace-nowrap">{formatDateTime(row.createdAt || row.dateAdded)}</span>
                                            </td>
                                        </>
                                    )}

                                    {/* Action Buttons */}
                                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 px-2 md:px-4 mt-1 md:mt-0 md:text-center whitespace-nowrap">
                                        <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Actions</span>
                                        <div className="flex items-center justify-end md:justify-center gap-1.5 sm:gap-2">
                                            <button type="button" onClick={() => { setSelectedLead(row); setIsHistoryModalOpen(true); }}
                                                className="p-2 md:p-1.5 text-purple-400 md:text-slate-400 hover:text-purple-400 bg-purple-500/10 md:bg-transparent hover:bg-purple-900/30 rounded-lg transition-colors" title="View History">
                                                <History size={18} />
                                            </button>
                                            <button type="button" onClick={() => { setSelectedLead(row); setIsViewModalOpen(true); }}
                                                className="p-2 md:p-1.5 text-blue-400 md:text-slate-400 hover:text-blue-300 bg-blue-500/10 md:bg-transparent hover:bg-blue-900/30 rounded-lg transition-colors" title="View Details">
                                                <Eye size={18} />
                                            </button>
                                            {activeTab !== 'Jobs' && activeTab !== 'Recycle Bin' && (
                                                <button type="button" onClick={() => handleOpenEditModal(row)}
                                                    className="p-2 md:p-1.5 text-yellow-400 md:text-slate-400 hover:text-yellow-400 bg-yellow-500/10 md:bg-transparent hover:bg-yellow-900/30 rounded-lg transition-colors" title="Edit Details">
                                                    <Pencil size={18} />
                                                </button>
                                            )}
                                            {activeTab === 'Sales Assigned' && (
                                                <button type="button" onClick={() => handleOpenReassignModal(row)}
                                                    className="p-2 md:p-1.5 text-orange-400 md:text-slate-400 hover:text-orange-400 bg-orange-500/10 md:bg-transparent hover:bg-yellow-900/30 rounded-lg transition-colors" title="Reassign">
                                                    <RefreshCw size={18} />
                                                </button>
                                            )}
                                            {(row.status === 'Sales Assigned' || activeTab === 'Itinerary Shared' || activeTab === 'Follow-Up Required') ? (
                                                <button type="button" onClick={() => handleMoveToOps(row.id)}
                                                    className="flex items-center gap-1.5 px-3 py-2 md:py-1.5 text-[11px] sm:text-xs font-bold md:font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg md:rounded-md transition-colors whitespace-nowrap" title="Send to Operations">
                                                    <Send size={14} className="hidden md:block"/> Send to Ops
                                                </button>
                                            ) : (activeTab === 'Jobs' || activeTab === 'Recycle Bin') ? (
                                                <button type="button" onClick={() => handleOpenAssignModal(row)}
                                                    className="p-2 md:p-1.5 text-orange-400 md:text-slate-400 hover:text-orange-400 bg-orange-500/10 md:bg-transparent hover:bg-orange-900/30 rounded-lg transition-colors" title="Assign">
                                                    <CheckSquare size={18} />
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr className="block md:table-row">
                                    <td colSpan="12" className="block md:table-cell px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Target size={32} className="text-slate-600 mb-2" />
                                            <p className="text-sm sm:text-base font-medium text-slate-400">No records found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* NEW LEAD MODAL */}
            {isNewLeadModalOpen && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100vh-24px)] sm:max-h-[92vh] flex flex-col relative text-slate-100 overflow-hidden">

                        {/* Modal Header */}
                        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                    <UserPlus size={18} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Add New Lead</h2>
                                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Fill in customer details — lead goes to the Jobs pool on submit</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setIsNewLeadModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Form */}
                        <form id="new-lead-form" onSubmit={handleNewLeadSubmit} onKeyDown={handlePreventEnterSubmit} className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 space-y-5 custom-scrollbar">

                            {/* SECTION A — CUSTOMER DETAILS */}
                            <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/10">
                                <h3 className="text-xs sm:text-sm font-bold text-cyan-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                                    <Users size={14} /> Customer Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="sm:col-span-2 md:col-span-1">
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">
                                            Customer Name <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            value={newLeadForm.customerName}
                                            onChange={handleNewLeadInputChange}
                                            required
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">
                                            Phone <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={newLeadForm.phone}
                                                onChange={handleNewLeadInputChange}
                                                required
                                                className={`${inputCls} pl-8`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Email Address</label>
                                        <div className="relative">
                                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={newLeadForm.email}
                                                onChange={handleNewLeadInputChange}
                                                className={`${inputCls} pl-8`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION B — TRIP REQUIREMENTS */}
                            <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/10">
                                <h3 className="text-xs sm:text-sm font-bold text-cyan-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                                    <MapPin size={14} /> Trip Requirements
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Destination</label>
                                        {renderNewLeadDropdown('destination', newLeadForm.destination, '-- Select Destination --', DESTINATION_OPTIONS)}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Package Type</label>
                                        {renderNewLeadDropdown('packageType', newLeadForm.packageType, '-- Select Type --', PACKAGE_TYPES)}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Budget Range</label>
                                        {renderNewLeadDropdown('budget', newLeadForm.budget, '-- Select Budget --', BUDGET_OPTIONS)}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Travel Dates</label>
                                        <div className="relative">
                                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                                            <input
                                                type="text"
                                                name="travelDates"
                                                value={newLeadForm.travelDates}
                                                onChange={handleNewLeadInputChange}
                                                className={`${inputCls} pl-8`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. of Adults</label>
                                        {renderNewLeadDropdown('pax', newLeadForm.pax, '-- Select --', PAX_OPTIONS)}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. of Children</label>
                                        {renderNewLeadDropdown('childrenPax', newLeadForm.childrenPax, null, CHILDREN_OPTIONS)}
                                    </div>
                                </div>
                            </div>

                            {/* SECTION C — LEAD SOURCE */}
                            <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/10">
                                <h3 className="text-xs sm:text-sm font-bold text-cyan-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                                    <Globe size={14} /> Lead Source
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Platform / Source</label>
                                        {renderNewLeadDropdown('platform', newLeadForm.platform, '-- Select Platform --', PLATFORM_OPTIONS)}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Campaign</label>
                                        {campaignOptions.length > 0
                                            ? renderNewLeadDropdown('campaign', newLeadForm.campaign, '-- Select Campaign --', campaignOptions)
                                            : <input
                                                type="text"
                                                name="campaign"
                                                value={newLeadForm.campaign}
                                                onChange={handleNewLeadInputChange}
                                                placeholder="Campaign name / Organic Search"
                                                className={inputCls}
                                            />
                                        }
                                    </div>
                                </div>
                            </div>

                            {/* SECTION D — MESSAGE & NOTES */}
                            <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/10">
                                <h3 className="text-xs sm:text-sm font-bold text-cyan-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                                    <MessageSquare size={14} /> Message & Notes
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Message from Lead</label>
                                        <textarea
                                            name="leadMessage"
                                            value={newLeadForm.leadMessage}
                                            onChange={handleNewLeadInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none custom-scrollbar transition-all placeholder-slate-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Internal Notes</label>
                                        <textarea
                                            name="notes"
                                            value={newLeadForm.notes}
                                            onChange={handleNewLeadInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none custom-scrollbar transition-all placeholder-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-800/20">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
                                <p className="text-[11px] sm:text-xs text-slate-400">
                                    This lead will be created with status <span className="font-semibold text-white">"Jobs"</span> — visible in the global pool for assignment.
                                </p>
                            </div>

                        </form>

                        {/* Sticky Footer */}
                        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                            <button
                                type="submit"
                                form="new-lead-form"
                                disabled={isSubmittingNewLead}
                                className="w-full sm:w-auto sm:flex-1 px-6 py-3 sm:py-2.5 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed border-none cursor-pointer text-[#0f172a] font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-cyan-500/20 transition-all uppercase tracking-wider order-1 sm:order-2 flex items-center justify-center gap-2"
                            >
                                {isSubmittingNewLead ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} strokeWidth={2.5} />
                                        Create Lead
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsNewLeadModalOpen(false)}
                                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 cursor-pointer text-slate-300 text-sm sm:text-base font-semibold rounded-xl transition-colors uppercase tracking-wider order-2 sm:order-1"
                            >
                                Cancel
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col relative text-slate-100 overflow-hidden">

                        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-20 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate pr-4">
                                    <Pencil size={20} className="text-orange-400 flex-shrink-0" />
                                    <span className="truncate hidden sm:inline">Edit Lead</span>
                                    <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-shrink-0">
                                        LMN{String(selectedLead?.id || '').padStart(4, '0')}
                                    </span>
                                </h2>
                                
                                <div className="flex items-center gap-3 pl-4 sm:ml-4 border-l border-slate-700">
                                    <div className="relative w-11 h-11 flex items-center justify-center bg-[#0f172a] rounded-xl shadow-inner border border-slate-700/50">
                                        <svg className="w-9 h-9 transform -rotate-90">
                                            <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                                            <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={87.96} strokeDashoffset={87.96 - (probValue / 100) * 87.96} className="text-cyan-400 transition-all duration-1000 ease-out" strokeLinecap="round" />
                                        </svg>
                                        <span className="absolute text-[10px] font-extrabold text-cyan-400">{probValue}%</span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Booking Probability</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider w-max ${
                                            editFormData.leadTemperature === 'Hot' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                                            editFormData.leadTemperature === 'Warm' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
                                            'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                                        }`}>
                                            {editFormData.leadTemperature || 'Cold'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-auto">
                                <X size={20} />
                            </button>
                        </div>

                        <form id="edit-lead-form" onSubmit={handleSubmitEdit} onKeyDown={handlePreventEnterSubmit} className="px-3 sm:px-5 md:px-6 py-4 sm:py-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1 custom-scrollbar">

                            {/* SECTION 1: LEAD INFO */}
                            <div className={sectionCls} style={{ borderColor: 'rgba(51,65,85,0.8)' }}>
                                <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('leadInfo')}>
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`${sectionHeadCls} m-0`}>Lead Info</h3>
                                            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                                                LMN{String(selectedLead?.id || '').padStart(4, '0')}
                                                <Pencil size={11} className="text-slate-400" />
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] sm:text-xs font-semibold text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded tracking-wider">Read-Only</span>
                                        {expandedSections.leadInfo ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                    </div>
                                </div>
                                {expandedSections.leadInfo && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
                                        {[
                                            { label: 'Lead Date', name: 'leadDate' },
                                            { label: 'Lead Source', name: 'leadSource' },
                                            { label: 'Campaign', name: 'campaign' },
                                            { label: 'Lead Name', name: 'leadName' },
                                            { label: 'Mobile Number', name: 'mobileNumber' },
                                            { label: 'Email Address', name: 'emailAddress' },
                                            { label: 'Package Type', name: 'packageType' },
                                            { label: 'Budget', name: 'budget' },
                                            { label: 'Message From Lead', name: 'messageFromLead' },
                                        ].map(f => (
                                            <div key={f.name}>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                                                <input type="text" name={f.name} value={editFormData[f.name] || ''} readOnly className={readonlyCls} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* SECTION 2: SALES ACTIVITY */}
                            <div className={sectionCls}>
                                <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('salesActivity')}>
                                    <div className="flex items-center gap-3">
                                        <h3 className={`${sectionHeadCls} m-0`}>Sales Activity</h3>
                                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                                            <span className="text-slate-500">Follow-Up Count:</span>
                                            <span className="font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 px-2 py-0.5 rounded-full min-w-[22px] text-center">
                                                {editFormData.noResponseLogs?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                    {expandedSections.salesActivity ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                </div>
                                {expandedSections.salesActivity && (
                                    <div className="mt-4 space-y-4">

                                        <div className="relative">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-semibold text-white tracking-wide">No Response</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-end">
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Lead Response</label>
                                                    {renderDropdown('leadResponse', editFormData.leadResponse, '-- Select --', ['No Response', 'Requirement Collected'], handleInputChange)}
                                                </div>
                                                <div className="flex items-end gap-1.5">
                                                    <div className="flex-1">
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Interaction Type</label>
                                                        {renderDropdown('interactionType', editFormData.interactionType, '-- Select --', ['WhatsApp', 'Call', 'Email'], handleInputChange)}
                                                    </div>
                                                    <div className="flex-shrink-0 pb-[3px]">
                                                        <div className="w-7 h-[34px] sm:h-[30px] rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                                            <ChevronRight size={14} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Action Taken</label>
                                                    {renderDropdown('actionTaken', editFormData.actionTaken, '-- Select --', ['Sample Itinerary Shared', 'Follow-up Scheduled', 'Requirement Message Sent', 'Voice Note Sent','Promotional Offer Sent'], handleInputChange)}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-white mb-1">Next Follow-Up</label>
                                                    <input type="date" name="followupDate" value={editFormData.followupDate || ''} onChange={handleInputChange}
                                                        className={`${inputCls} [color-scheme:dark]`} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Notes</label>
                                                    <div className="flex gap-2">
                                                        <textarea name="salesNotes" value={editFormData.salesNotes} onChange={handleInputChange} rows="1"
                                                            className="w-full px-3 py-2 sm:py-1.5 bg-slate-900 border border-slate-700 rounded-lg sm:rounded text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none custom-scrollbar transition-all placeholder-slate-500"
                                                            placeholder="Notes..." />
                                                        <button type="button" onClick={handleLogNoResponse} className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap cursor-pointer">
                                                            Save Log
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 p-4 bg-[#091124] border border-slate-700/60 rounded-xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Previous Attempts ({editFormData.noResponseLogs?.length || 0})
                                                </p>
                                            </div>
                                            
                                            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                                {editFormData.noResponseLogs && editFormData.noResponseLogs.length > 0 ? (
                                                    [...editFormData.noResponseLogs].reverse().map((log, idx) => (
                                                        <div key={idx} className="flex flex-col text-xs bg-[#0f172a] p-3 rounded-lg border border-slate-700/60 shadow-sm transition-all hover:bg-slate-800/80">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-cyan-400 font-bold tracking-wide">{log.timestamp}</span>
                                                                <span className="text-slate-300 px-2 py-0.5 bg-slate-900 rounded border border-slate-600 text-[10px] font-medium uppercase">
                                                                    {log.interaction || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="text-slate-300 mt-0.5 space-y-1.5">
                                                                <div><span className="text-slate-500 font-medium">Action Taken:</span> <span className="text-slate-200">{log.action || 'None'}</span></div>
                                                                {log.notes && <div><span className="text-slate-500 font-medium">Notes:</span> <span className="text-slate-200">{log.notes}</span></div>}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-4 text-xs text-slate-500 italic border border-dashed border-slate-700/50 rounded-lg">
                                                        No detailed logs recorded yet. Add notes and save to see history here.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        
                                    </div>
                                )}
                            </div>

                            {/* SECTION 4: TRAVEL DETAILS */}
                            <div className={sectionCls}>
                                <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('travelDetails')}>
                                    <div className="flex flex-col gap-0.5">
                                        <h3 className={`${sectionHeadCls} m-0`}>Travel Details</h3>
                                    </div>
                                    {expandedSections.travelDetails ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                </div>
                                {expandedSections.travelDetails && (
                                    editFormData.leadResponse === 'Requirement Collected' ? (
                                        <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Destination</label>
                                                {renderDropdown('destination', editFormData.destination, '-- Select Destination --', DESTINATION_OPTIONS, handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Package Type</label>
                                                {renderDropdown('tourType', editFormData.tourType, '-- Select Tour Type --', ['Honeymoon', 'Family', 'Solo', 'Friends', 'Corporate', 'Group Tour', 'MICE'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-white mb-1">Travel Date</label>
                                                <input type="date" name="travelDate" value={editFormData.travelDate || ''} onChange={handleInputChange}
                                                    className={`${inputCls} [color-scheme:dark]`} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Duration</label>
                                                {renderDropdown('duration', editFormData.duration, '-- Select Duration --', ['2 Nights / 3 Days', '3 Nights / 4 Days', '4 Nights / 5 Days', '5 Nights / 6 Days', '6 Nights / 7 Days', '7 Nights+'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Budget</label>
                                                {renderDropdown('travelBudget', editFormData.travelBudget, '-- Select Budget Tier --', BUDGET_OPTIONS, handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Hotel Category</label>
                                                {renderDropdown('hotelCategory', editFormData.hotelCategory, '-- Select Hotel Tier --', ['Budget / 2-Star', 'Standard / 3-Star', 'Premium / 4-Star', 'Luxury / 5-Star', {value: 'Resort / Villa', label: 'Resort / Luxury Villa'}], handleInputChange)}
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-1/2">
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. Of Pax (Adults)</label>
                                                    <input type="number" name="noOfAdults" value={editFormData.noOfAdults} onChange={handleInputChange} className={inputCls} min="1" />
                                                </div>
                                                <div className="w-1/2">
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. Of Pax (Children)</label>
                                                    <input type="number" name="noOfChildren" value={editFormData.noOfChildren} onChange={handleInputChange} className={inputCls} min="0" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Departure City</label>
                                                <input type="text" name="departureCity" value={editFormData.departureCity} onChange={handleInputChange} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-white mb-1">Offers</label>
                                                {renderDropdown('offers', editFormData.offers, '', [{value: 'None', label: 'No Promo Applied'}, 'Early Bird 10% Discount', 'Free Airport Transfer Upgrade', {value: 'Complimentary Honeymoon Cake & Decor', label: 'Complimentary Honeymoon Cake & Decor'}], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Action Taken</label>
                                                {renderDropdown('actionTaken', editFormData.actionTaken, '-- Select --', [ 'Customisation Required', 'Readymade Required'], handleInputChange)}
                                            </div>
                                        </div>

                                        {(editFormData.actionTaken === 'Customisation Required' || editFormData.customerResponse === 'Needs Revision') && (
                                            <div className="mt-5 pt-4 border-t border-slate-800/60">
                                                <h4 className={`${sectionHeadCls} mb-4`}>Customisation</h4>
                                                <div className="space-y-4">
                                                    {editFormData.customisationRequests.map((req, index) => (
                                                        <div key={index} className="relative p-4 rounded-xl border border-slate-700/50 bg-slate-800/20">
                                                            {editFormData.customisationRequests.length > 1 && (
                                                                <button type="button" onClick={() => removeCustomisationRequest(index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1 bg-transparent border-none cursor-pointer">
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                                                <div>
                                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Destination</label>
                                                                    <input type="text" value={req.destination || ''} onChange={(e) => handleCustomisationChange(index, 'destination', e.target.value)} className={inputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Customisation Type</label>
                                                                    {renderArrayDropdown('customisationType', req.customisationType, index, '-- Select Type --', ['New Itinerary', 'Existing Itinerary Modification', 'Hotel Change', 'Sightseeing Change', 'Budget Optimisation', 'Flight & VISA Assistance','Readymade Validation','Revising Again'])}
                                                                </div>
                                                                <div>
                                                                    {renderDatePicker(`turnoverTime_${index}`, req.turnaroundTime, 'Turn Over Time', (e) => handleCustomisationChange(index, 'turnaroundTime', e.target.value), 'Calendar')}
                                                                </div>
                                                                <div className="md:col-span-3">
                                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Requirements</label>
                                                                    <div className="flex items-center gap-1.5 w-full">
                                                                        <input type="text" value={req.requirements || ''} onChange={(e) => handleCustomisationChange(index, 'requirements', e.target.value)} className={`${inputCls} flex-1`} placeholder="Type..." />
                                                                        <button type="button" onClick={isRecording ? stopRecording : startRecording}
                                                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded whitespace-nowrap flex-shrink-0 transition-colors border-none cursor-pointer h-[38px] sm:h-[34px] ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}>
                                                                            {isRecording ? <><Square size={12} fill="currentColor" /> ({formatTimer(recordingTime)})</> : <><Mic size={14} /> Voice</>}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-3 flex justify-start">
                                                    <button type="button" onClick={addCustomisationRequest} className="text-xs sm:text-sm font-bold text-cyan-400 bg-transparent border-none hover:text-cyan-300 flex items-center gap-1 transition-colors px-2 py-1.5 rounded hover:bg-cyan-950/30 cursor-pointer">
                                                        <Plus size={14} /> Add Destination
                                                    </button>
                                                </div>
                                                {editFormData.voiceRecordings?.length > 0 && (
                                                    <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800/60 rounded-lg space-y-2">
                                                        <p className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 tracking-wider">Audio Feeds Attached ({editFormData.voiceRecordings.length})</p>
                                                        <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                            {editFormData.voiceRecordings.map((audio, index) => (
                                                                <div key={index} className="flex items-center justify-between p-2.5 sm:p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                                                                    <span className="text-xs sm:text-sm text-slate-300">Voice Capture #{index + 1}</span>
                                                                    <div className="flex items-center gap-2 sm:gap-1.5">
                                                                        <button type="button" onClick={() => togglePlayback(index)} className="p-1.5 sm:p-1 rounded-md bg-slate-800 border-none cursor-pointer text-emerald-400 hover:bg-slate-700">
                                                                            {playingIndex === index ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                                                        </button>
                                                                        <button type="button" onClick={() => deleteRecording(index)} className="p-1.5 sm:p-1 rounded-md bg-slate-800 border-none cursor-pointer text-red-400 hover:bg-red-950">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                        <audio ref={el => audioPlayersRef.current[index] = el} src={audio.url} onEnded={() => setPlayingIndex(null)} className="hidden" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        </>
                                    ) : (
                                        <div className="mt-4 px-4 py-5 text-xs sm:text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl text-center">
                                            This section appears when Lead Response is "Requirement Collected".
                                        </div>
                                    )
                                )}
                            </div>

                            {/* SECTION 5: OPERATION RESPONSE */}
                            <div className={sectionCls}>
                                <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('operationResponse')}>
                                    <h3 className={`${sectionHeadCls} m-0`}>OPERATION RESPONSE</h3>
                                    {expandedSections.operationResponse ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                </div>
                                {expandedSections.operationResponse && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
                                        <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Received Date & Time</label>
                                            <input type="text" readOnly value={editFormData.opsCompletedOn || formatDateTime(new Date().toISOString())} className={`${readonlyCls} text-red-400 font-bold`} placeholder="Date & Time - Auto" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Prepared By</label>
                                            <input type="text" readOnly value={editFormData.opsPreparedBy || editFormData.assignedTo || ''} className={`${readonlyCls} text-red-400 text-[10px] sm:text-xs font-bold`} placeholder="Operations Executive name automatically appear" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Ops Review</label>
                                            <textarea name="opsRemarks" value={editFormData.opsRemarks || 'No review notes.'} readOnly className={`${readonlyCls} min-h-[38px] italic`} rows={1} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Action Taken</label>
                                            {renderDropdown('opsActionTaken', editFormData.opsActionTaken, '-- Select --', ['Shared Customized Itinerary', 'Explained Over Call', 'Explained via WhatsApp'], handleInputChange)}
                                        </div>
                                        <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Customer Response</label>
                                            {renderDropdown('customerResponse', editFormData.customerResponse, '-- Select --', ['Yet to Respond', 'Needs Revision', 'Negotiation' ,'Client Follow-Up','Not Interested','Booking Confirmed','Lead Lost'], handleInputChange)}
                                        </div>
                                         <div>
                                            <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Objection Tracking</label>
                                            {renderDropdown('objectionTracking', editFormData.objectionTracking, '-- Select --', ['Price High', 'Comparing Other Agents', 'Flight Cost', 'Hotel Cost', 'VISA Concerns', 'Travel Date Issue', 'Family Approval Pending', 'Need Leave Approval', 'Unexpected Situations', 'Safety Concerns'], handleInputChange)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 7: BOOKING CONFIRMATION */}
                            <div className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 ${editFormData.leadStatusField === 'Booking Confirmed' ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800 bg-slate-900/10'}`}>
                                <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('bookingConfirmation')}>
                                    <div className="flex flex-col gap-0.5">
                                        <h3 className={`text-sm sm:text-base font-bold tracking-wider uppercase m-0 flex items-center gap-2 ${editFormData.leadStatusField === 'Booking Confirmed' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {editFormData.leadStatusField === 'Booking Confirmed' && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />}
                                            Booking Confirmation
                                        </h3>
                                    </div>
                                    {expandedSections.bookingConfirmation ? <ChevronDown size={18} className={editFormData.leadStatusField === 'Booking Confirmed' ? "text-emerald-400" : "text-slate-500"}/> : <ChevronRight size={18} className="text-slate-500"/>}
                                </div>
                                {expandedSections.bookingConfirmation && (
                                    editFormData.leadStatusField === 'Booking Confirmed' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
                                            {renderDatePicker('bookingDate', editFormData.bookingDate, 'Booking Date', handleInputChange)}
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Billing Name</label>
                                                <select name="billingName" value={editFormData.billingName || ''} onChange={handleInputChange} className={selectCls}>
                                                    <option value="">-- Select --</option>
                                                    <option value={editFormData.leadName}>{editFormData.leadName || 'Lead Name (default)'}</option>
                                                    <option value="Direct Customer">Direct Customer</option>
                                                    <option value="B2B Partner">B2B Partner</option>
                                                    <option value="Corporate Client">Corporate Client</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Operations Executive</label>
                                                <input type="text" name="operationExecutive" value={editFormData.operationExecutive} onChange={handleInputChange} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Travel Type</label>
                                                {renderDropdown('confirmedTripType', editFormData.confirmedTripType, '-- Select --', ['International', 'Domestic'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Confirmed Destination</label>
                                                <input type="text" name="confirmedDestination" value={editFormData.confirmedDestination} onChange={handleInputChange} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Duration</label>
                                                <input type="text" name="confirmedDuration" value={editFormData.confirmedDuration} onChange={handleInputChange} className={inputCls} />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-1/2">
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. Of Pax (Adults)</label>
                                                    <input type="number" name="noOfPax" value={editFormData.noOfPax} onChange={handleInputChange} className={inputCls} min="1" />
                                                </div>
                                                <div className="w-1/2">
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. Of Pax (Children)</label>
                                                    <input type="number" name="confirmedNoOfChildren" value={editFormData.confirmedNoOfChildren} onChange={handleInputChange} className={inputCls} min="0" />
                                                </div>
                                            </div>
                                            {renderDatePicker('tourStartDate', editFormData.tourStartDate, 'Travel Start Date', handleInputChange)}
                                            {renderDatePicker('travelEndDate', editFormData.travelEndDate, 'Travel End Date', handleInputChange)}
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Special Offers</label>
                                                <textarea name="specialOffers" value={editFormData.specialOffers} onChange={handleInputChange} className={inputCls} rows={1} />
                                            </div>
                                            {renderDatePicker('departureDate', editFormData.departureDate, 'Departure Date', handleInputChange)}
                                            {renderDatePicker('arrivalDate', editFormData.arrivalDate, 'Arrival Date', handleInputChange)}
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Flight Status</label>
                                                {renderDropdown('flightStatus', editFormData.flightStatus, '-- Select --', ['Booked', 'Pending', 'Not Required'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">VISA Status</label>
                                                {renderDropdown('visaStatus', editFormData.visaStatus, '-- Select --', ['Approved', 'In Process', 'Not Required'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Insurance Status</label>
                                                {renderDropdown('insuranceStatus', editFormData.insuranceStatus, '-- Select --', ['Issued', 'Pending', 'Not Required'], handleInputChange)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 px-4 py-5 text-xs sm:text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl text-center">
                                            This section appears when Lead Status is "Booking Confirmed".
                                        </div>
                                    )
                                )}
                            </div>

                            {/* SECTION 8: PAYMENT INFORMATION */}
                            <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/10 transition-all duration-300">
                                <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('paymentInfo')}>
                                    <h3 className="text-sm sm:text-base font-bold tracking-wider uppercase m-0 text-cyan-400">
                                        Payment Information
                                    </h3>
                                    {expandedSections.paymentInfo ? <ChevronDown size={18} className="text-cyan-400" /> : <ChevronRight size={18} className="text-slate-500"/>}
                                </div>
                                {expandedSections.paymentInfo && (
                                    <div className="mt-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 border-slate-700/50">
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Package Cost</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                                    <input type="text" name="totalPackageCost" value={editFormData.totalPackageCost} onChange={handleInputChange} className={`${inputCls} pl-7`} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">GST Inclusion</label>
                                                {renderDropdown('gstInclusion', editFormData.gstInclusion, '-- Select --', ['Included', 'Excluded'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">TCS Inclusion</label>
                                                {renderDropdown('tcsInclusion', editFormData.tcsInclusion, '-- Select --', ['Included', 'Excluded', 'Not Applicable'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Service</label>
                                                {renderDropdown('paymentService', editFormData.paymentService, '-- Select Service --', ['Flight', 'Hotel', 'Package', 'Visa', 'Transport'], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Amount Received</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                                    <input type="text" name="amountReceived" value={editFormData.amountReceived} onChange={handleInputChange} className={`${inputCls} pl-7`} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Transaction ID</label>
                                                <input type="text" name="transactionId" value={editFormData.transactionId} onChange={handleInputChange} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Payment Mode</label>
                                                {renderDropdown('paymentMode', editFormData.paymentMode, '-- Choose Mode --', [{value: 'UPI / QR', label: 'UPI / QR Transfer'}, {value: 'Net Banking', label: 'Net Banking (NEFT/IMPS)'}, {value: 'Credit Card', label: 'Credit Card Portal'}, {value: 'Cash', label: 'Cash Deposit'}], handleInputChange)}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Status</label>
                                                <select name="paymentStatus" value={editFormData.paymentStatus || 'First Payment'} onChange={handleInputChange} className={selectCls}>
                                                    <option value="First Payment">First Payment</option>
                                                    <option value="Pending Initial Deposit">Pending Initial Deposit</option>
                                                    <option value="Partially Paid Tokens">Partially Paid Tokens</option>
                                                    <option value="Fully Settled Clearance">Fully Settled Clearance</option>
                                                    <option value="Payment Overdue / Declined">Payment Overdue / Declined</option>
                                                </select>
                                            </div>
                                            {renderDatePicker('nextPaymentDate', editFormData.nextPaymentDate, 'Next Payment Date', handleInputChange)}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </form>

                        {/* Edit Modal Sticky Footer */}
                        <div className="px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] z-20 flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                            <button type="submit" form="edit-lead-form" className="w-full sm:w-auto flex-1 px-6 py-3 sm:py-2.5 bg-[#16D3F2] hover:bg-[#16D3F2] active:bg-[#16D3F2] border-none cursor-pointer text-[#0f172a] text-sm sm:text-base font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider order-1 sm:order-2">
                                SUBMIT
                            </button>
                            <button type="button" onClick={() => setIsEditModalOpen(false)}
                                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-transparent border border-cyan-500 hover:bg-slate-800 cursor-pointer text-cyan-400 text-sm sm:text-base font-semibold rounded-lg sm:rounded transition-colors uppercase tracking-wider order-2 sm:order-1">
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL */}
            {isAssignModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
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
                                <input type="text" readOnly value={`LMN${selectedLead.id}`}
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
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Assigned To (Sales Team)</label>
                                {renderDropdown('assignTo', assignTo !== 'Self Assigned' ? assignTo : '', '-- Select Sales Employee --', [...salesStaff],
                                    (e) => setAssignTo(e.target.value),
                                    `w-full px-3 py-3 sm:py-2.5 border rounded-lg sm:rounded-md bg-slate-900 text-white focus:outline-none transition-colors ${assignTo && assignTo !== 'Self Assigned' ? 'border-orange-500 focus:border-orange-500' : 'border-slate-700 focus:border-orange-500'}`
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-2">
                                <button type="button" onClick={handleAssignSubmit} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-orange-500 border-none cursor-pointer hover:bg-orange-600 text-white font-bold rounded-lg sm:rounded shadow transition-colors order-1 sm:order-2">Submit</button>
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-transparent cursor-pointer border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg sm:rounded transition-colors order-2 sm:order-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REASSIGN MODAL */}
            {isReassignModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-slate-700/90 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-5 sm:pt-6 pb-2 flex-shrink-0">
                            <button type="button" onClick={() => setIsReassignModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 pr-6 truncate">
                                <RefreshCw size={20} className="text-orange-400 flex-shrink-0" /> <span className="truncate">Reassign Pipeline Action</span>
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 mb-4 truncate">Configure allocation for Job ID: LMN{selectedLead.id}</p>
                        </div>
                        <div className="px-6 pb-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                                <button type="button" onClick={() => setReassignOption('pool')}
                                    className={`p-3 sm:p-4 rounded-lg border text-left cursor-pointer flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition-all ${reassignOption === 'pool' ? 'bg-[#07202a] border-cyan-500 text-white ring-1 ring-cyan-500' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                                    <ShoppingCart size={20} className={reassignOption === 'pool' ? 'text-cyan-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                                    <div>
                                        <p className="font-bold text-sm">Back to Jobs Pool</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Release to public pool</p>
                                    </div>
                                </button>
                                <button type="button" onClick={() => setReassignOption('employee')}
                                    className={`p-3 sm:p-4 rounded-lg border text-left cursor-pointer flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition-all ${reassignOption === 'employee' ? 'bg-[#07202a] border-orange-500 text-white ring-1 ring-orange-500' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                                    <Users size={20} className={reassignOption === 'employee' ? 'text-orange-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                                    <div>
                                        <p className="font-bold text-sm">To Sales Employee</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Transfer ownership</p>
                                    </div>
                                </button>
                            </div>
                            {reassignOption === 'employee' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Sales Employee</label>
                                        {renderDropdown('reassignTargetEmployee', reassignTargetEmployee, '-- Choose Sales Employee --', [...salesStaff],
                                            (e) => setReassignTargetEmployee(e.target.value),
                                            "w-full px-3 py-2.5 sm:py-2 bg-slate-900 text-white border border-slate-700 rounded-lg sm:rounded-md focus:outline-none focus:border-orange-500 transition-all"
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason for Reassignment</label>
                                        <textarea value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} rows="3"
                                            placeholder="Specify context or reason for transferring this lead..."
                                            className="w-full px-3 py-2 bg-slate-900 text-white border border-slate-700 rounded-lg sm:rounded-md focus:outline-none focus:border-orange-500 transition-all placeholder-slate-500 resize-none custom-scrollbar" />
                                    </div>
                                </div>
                            ) : (
                                <div className="px-3 py-3 rounded-lg bg-cyan-950/20 border border-cyan-900/30 text-xs sm:text-sm text-cyan-300/90 leading-relaxed text-center sm:text-left">
                                    This will reset the assignment and move the lead back to the unassigned global <strong>"Jobs"</strong> pool.
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 mt-4 sm:mt-0">
                                <button type="button" onClick={handleReassignSubmit} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-orange-500 border-none cursor-pointer hover:bg-orange-600 text-white font-bold rounded-lg sm:rounded shadow transition-colors order-1 sm:order-2">Confirm Reassign</button>
                                <button type="button" onClick={() => setIsReassignModalOpen(false)} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-transparent cursor-pointer border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg sm:rounded transition-colors order-2 sm:order-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODAL */}
            {isViewModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-6 pb-3 sm:pb-2 border-b border-slate-700/50 flex-shrink-0">
                            <button type="button" onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-slate-400 bg-transparent border-none cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4 pr-6 truncate">Lead Details (LMN{selectedLead.id})</h2>
                        </div>
                        <div className="px-6 py-5 overflow-y-auto space-y-4 text-slate-300 text-sm sm:text-base flex-1 custom-scrollbar">
                            {[
                                { label: 'Customer', value: selectedLead.customerName || selectedLead.profileName || 'N/A', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Destination', value: selectedLead.destination || 'N/A', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Travel Dates', value: selectedLead.travelDates || selectedLead.dates || 'TBD', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Budget', value: selectedLead.budget || selectedLead.amount || 'N/A', cls: 'font-semibold text-emerald-400 text-right sm:text-left' },
                                { label: 'Phone', value: selectedLead.phone || 'N/A', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Platform', value: selectedLead.platform || 'Website', cls: 'font-medium text-blue-300 text-right sm:text-left' },
                            ].map(f => (
                                <div key={f.label} className="flex flex-row justify-between items-center sm:items-start border-b border-slate-700/50 pb-3 sm:pb-2 gap-2">
                                    <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">{f.label}:</span>
                                    <span className={f.cls}>{f.value}</span>
                                </div>
                            ))}
                            <div className="mt-5 bg-[#07202a] px-4 py-4 rounded-lg border border-slate-700/30 space-y-3">
                                <div>
                                    <span className="block text-xs sm:text-sm text-slate-400 mb-1">Message from Lead:</span>
                                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                                        {selectedLead.leadMessage || selectedLead.message || 'No message provided.'}
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-slate-700/50">
                                    <span className="block text-xs sm:text-sm text-slate-400 mb-1">Internal Notes:</span>
                                    <p className="text-xs sm:text-sm text-emerald-400 leading-relaxed">
                                        {selectedLead.salesNotes || selectedLead.notes || selectedLead.opsRemarks || 'No internal notes.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {isHistoryModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-6 pb-3 sm:pb-2 border-b border-slate-700/50 flex-shrink-0 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-white pr-6 truncate flex items-center gap-2">
                                <History size={20} className="text-purple-400" />
                                Lead History (LMN{selectedLead.id})
                            </h2>
                            <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 bg-transparent border-none cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 py-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                            {(() => {
                                let displayHistory = [];
                                if (selectedLead.history && selectedLead.history.length > 0) {
                                    displayHistory = selectedLead.history;
                                } else {
                                    if (selectedLead.status === 'Move To Operation') {
                                        displayHistory.push({ date: selectedLead.opsCompletedOn || 'Recent', action: 'Moved to Operations', note: `Prepared by: ${selectedLead.opsPreparedBy || 'Ops Team'}` });
                                    }
                                    if (selectedLead.assignedTo && selectedLead.assignedTo !== 'Unassigned') {
                                        displayHistory.push({ date: 'Previously', action: `Assigned to ${selectedLead.assignedTo}`, note: `Current Status: ${selectedLead.status}` });
                                    }
                                    displayHistory.push({ date: formatDateTime(selectedLead.createdAt || selectedLead.dateAdded) || 'Initial', action: 'Lead Captured', note: `Source: ${selectedLead.platform || 'Website'} | Campaign: ${selectedLead.campaign || 'N/A'}` });
                                }
                                return (
                                    <div className="relative border-l border-slate-700 ml-3 space-y-6">
                                        {displayHistory.map((log, index) => (
                                            <div key={index} className="pl-6 relative">
                                                <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-[#0f172a]" />
                                                <p className="text-xs text-slate-400 mb-0.5">{log.date}</p>
                                                <p className="text-sm font-medium text-slate-200">{log.action}</p>
                                                {log.note && <p className="text-xs text-slate-500 mt-1 italic">{log.note}</p>}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
    
            {/* SCROLL TO TOP BUTTON */}
            <button
                type="button"
                onClick={scrollToTop}
                className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-6 p-2.5 sm:p-3 rounded-full text-white bg-slate-700/80 border-none cursor-pointer hover:bg-slate-600 backdrop-blur-sm shadow-xl transition-all duration-300 z-40 ${showScrollButton ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-8 invisible'}`}
                aria-label="Scroll to top"
            >
                <ArrowUp size={20} className="sm:w-[24px] sm:h-[24px]" />
            </button>

        </div>
    );
};

export default SalesDashboard;