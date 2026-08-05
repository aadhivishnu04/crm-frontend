import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Eye, Pencil, Clock, CheckSquare, ArrowUpDown, History,
    Search, SlidersHorizontal, MapPin, Calendar,
    ShoppingCart, Target, X, Send, AlertCircle, CheckCircle2,
    Mic, Trash2, Layers, BookmarkCheck, PlaneTakeoff, Info,
    Briefcase, FileText, Activity, ShieldCheck, Share2, Play, Square, Plus,
    ChevronLeft, ChevronRight, ArrowUp, Copy, ChevronDown, Repeat, DollarSign, Undo2,
    ClipboardList, Wallet, PackageCheck
} from 'lucide-react';
import { getCurrentUser } from '../utils/auth';

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

const getDaysToDeparture = (dateString) => {
    if (!dateString) return 'N/A';
    const depDate = new Date(dateString);
    if (isNaN(depDate)) return 'Invalid Date';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    depDate.setHours(0, 0, 0, 0);
    const diffTime = depDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Departed';
    if (diffDays === 0) return 'Today';
    return `${diffDays} Days`;
};

// ─── SHARED DATE DISPLAY FORMATTER (DD-MM-YYYY, numeric) ───────────────────────
const formatDisplayDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal); // not a parseable date — show raw value instead of "Invalid Date"
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

// ─── LEAD JOURNEY / FULL HISTORY ENGINE ───────────────────────────────────────
// Kept in sync with SalesDashboard.jsx so the "Lead History" popup renders
// an identical, unbroken Sales → Operations → Accounts → Fulfillment story
// no matter which dashboard it's opened from.

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

// Splits a "Label: Value" style string into { label, value } so the label can
// render in plain bold text and the dynamic value can render highlighted,
// same as the DD_Month_YYYY mockups (black label, red dynamic value).
const splitLabelValue = (text) => {
    if (!text) return null;
    const idx = text.indexOf(':');
    if (idx === -1) return { label: text.trim(), value: null };
    return { label: text.slice(0, idx).trim(), value: text.slice(idx + 1).trim() };
};

// Stage config used for the "Complete Record by Stage" accordion below the
// timeline.
const STAGE_CONFIG = [
    { key: 'lead', label: 'Lead Captured', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', icon: Target },
    { key: 'sales', label: 'Sales', color: 'text-white-400 bg-purple-500/10 border-purple-500/20', icon: Briefcase },
    { key: 'operations', label: 'Operations', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: ClipboardList },
    { key: 'accounts', label: 'Accounts / Billing', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Wallet },
    { key: 'fulfillment', label: 'Fulfillment', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: PackageCheck },
];

// Classifies one raw `history` log entry into the exact mockup step titles:
// Lead Assigned, Lead Response Status, Lead Response Status - Requirement
// Collected, Readymade Shared - Followup, Sales Followup. Returns null for
// entries that don't correspond to a Lead Journey row (e.g. "Lead Created",
// which feeds the header's "Lead Created" date instead).
const classifySalesEntry = (h, lead) => {
    const action = h.action || '';
    const note = h.note || '';

    if (/^Lead Created$/i.test(action)) return null;
    if (/^Auto-Moved to Recycle Bin$/i.test(action) || /^Archived Cycle:/i.test(action)) return null;

    // Lead Assigned
    const assignMatch = action.match(/^(?:Recovered & )?Assigned to (.+)$/i);
    if (assignMatch) {
        return { title: 'Lead Assigned', parts: [{ label: 'Assigned by', value: assignMatch[1].trim() }] };
    }

    // Follow-up (before Requirement Collected) → Lead Response Status
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

    // Outcome Update (after Requirement Collected) → Readymade Shared -
    // Followup / Sales Followup, both rendered as "Sales Track -
    // Customer Response | Next Followup: Date"
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

    // Lead Profile Updated → only surfaced when it captures Requirement
    // Collected (readymade / customisation), matching the mockup's
    // "Lead Response Status - Requirement Collected" rows
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

    // Fallback — show whatever was actually logged rather than dropping it
    return { title: action, parts: [splitLabelValue(note)].filter(Boolean) };
};

// Builds the full, oldest → newest chronological journey for one lead/job.
const buildLeadTimeline = (lead) => {
    if (!lead) return [];

    // 1) Sales-side explicit log — oldest first, classified into mockup titles
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

    // 2) Sent to Operations
    const custReqs = safeParseArr(lead.customisationRequests);
    if (lead.status === 'Move To Operation' || lead.sentToOperationsDate || custReqs.length) {
        const destinations = custReqs.map(r => r.destination || r.destinationRequest).filter(Boolean).join(', ')
            || lead.destinationRequest || lead.destination;
        push('operations', 'Sent To Operations', lead.sentToOperationsDate || lead.movedToOpsDate, [
            { label: 'Destination', value: destinations || 'N/A' }
        ]);
    }

    // 3) Ops assignment / per-destination work updates (repeats — one per
    // customisation request / vendor destination touched by Operations)
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

    // 4) Back to Sales Board
    if (lead.sharedWithSales) {
        push('operations', 'Back to Sales Board', lead.sharedWithSalesDate, [
            { label: 'Destination shared by ops', value: lead.destinationRequest || lead.destination }
        ]);
    }

    // 5) Sales follow-up after itinerary return (customer response / booking confirmed)
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

    // 6) Accounts — payment stages
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

    // 7) Fulfillment — briefing, vendor payment, travel ready, trip completed
    if (lead.briefingDateVal || lead.briefedByVal) {
        push('fulfillment', 'Briefing Completed', lead.briefingDateVal, [
            { label: 'by', value: lead.briefedByVal }
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

// Curated per-stage field maps so the "Complete Record" section can show
// every populated data point captured about the lead at each stage.
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

// ─── DYNAMIC MESSAGE GENERATOR FOR VENDOR ASSISTANCE ──────────────────────────
const generateVendorMessage = (req, lead) => {
    const contact = req.vendorContactPerson || '[Contact Person - Vendor Assistance]';
    const dest = lead.destination || '[Destination - Vendor Assistance]';
    const pkg = lead.packageType || lead.tourType || '[Package Type - Lead Info]';
    const tDate = (lead.travelDate || lead.travelDates) ? formatDisplayDate(lead.travelDate || lead.travelDates).replace(/-/g, '/') : '[Travel Date - Destination Request]';
    const dur = lead.duration || '[Duration - Destination Request]';
    const paxA = lead.noOfAdults || '[No. of Adults - Destination Request]';
    const paxC = lead.noOfChildren || '[No. of Children - Destination Request]';
    const hotel = lead.hotelCategory || '[Hotel Category - Destination Request]';
    const vType = req.vendorVisaType || '[VISA Type]';
    const srv = req.vendorService;

    const checkIn = req.vendorCheckInDate ? formatDisplayDate(req.vendorCheckInDate) : '[Check-in Date - Vendor Assistance]';
    const checkOut = req.vendorCheckOutDate ? formatDisplayDate(req.vendorCheckOutDate) : '[Check-out Date - Vendor Assistance]';
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
    
    } else if (srv === 'Rate Modification') {
        msg += `We have an existing itinerary for the below travel requirement. Kindly verify the availability and share your best updated B2B rates for the same itinerary.\n\n`;
        
        msg += `TRAVEL REQUIREMENTS\n\n`;
        msg += `Destination: ${dest}\n`;
        msg += `Package Type: ${pkg}\n`;
        msg += `Travel Dates: ${tDate}\n`;
        msg += `Duration: ${dur}\n`;
        msg += `Travellers: ${paxA} Adults\n`;
        msg += `Hotel Category: ${hotel}\n\n`;

        msg += `RATE VERIFICATION\n\n`;
        msg += `The ready-made itinerary is attached for your reference. Kindly verify the availability and share your best updated B2B rates for the same itinerary.\n\n`;
        msg += `Please verify:\n\n`;
        msg += `• Hotel availability for the requested travel dates\n`;
        msg += `• Current hotel rates\n`;
        msg += `• Airport and local transfer rates\n`;
        msg += `• Sightseeing rates\n`;
        msg += `• Any seasonal or date-specific surcharges\n`;
        msg += `• Validity of the existing package inclusions\n\n`;
        
        msg += `If any hotel or service mentioned in the attached itinerary is unavailable, kindly suggest a suitable alternative separately.\n\n`;
        msg += `Kindly Share\n\n`;
        msg += `• Updated B2B Quotation\n`;
        msg += `• Availability Status\n`;
        msg += `• Applicable Surcharges, if any\n`;
        msg += `• Changes in Existing Inclusions or Exclusions, if any\n\n`;
        
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
// COMPONENT – Voice Recorder
// ─────────────────────────────────────────────
const VoiceRecorderBlock = ({ recordings = [], onUpdate }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const [playingIndex, setPlayingIndex] = useState(null);
    const audioPlayersRef = useRef({});

    const startRecording = async () => {
        audioChunksRef.current = [];
        setRecordingTime(0);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    onUpdate([...recordings, { url, base64: reader.result }]);
                };
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) { alert('Microphone access denied. Please verify your browser settings.'); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const togglePlayback = (idx) => {
        const player = audioPlayersRef.current[idx];
        if (!player) return;
        if (playingIndex === idx) { player.pause(); setPlayingIndex(null); }
        else {
            if (playingIndex !== null && audioPlayersRef.current[playingIndex]) {
                audioPlayersRef.current[playingIndex].pause();
            }
            player.play(); setPlayingIndex(idx);
        }
    };

    const removeRecording = (idx) => {
        if (playingIndex === idx) setPlayingIndex(null);
        const newRecs = [...recordings];
        newRecs.splice(idx, 1);
        onUpdate(newRecs);
    };

    const formatTimer = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    return (
        <div className="flex flex-col gap-2 w-full mt-2">
            <button type="button" onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded whitespace-nowrap w-fit transition-colors border-none cursor-pointer ${isRecording ? 'bg-red-500 animate-pulse text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-slate-700'}`}>
                {isRecording ? <><Square size={12} fill="currentColor" /> Stop Recording ({formatTimer(recordingTime)})</> : <><Mic size={14} /> Record Voice Note</>}
            </button>
            {recordings.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                    {recordings.map((rec, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 w-full max-w-sm">
                            <span className="text-[11px] text-slate-300 font-medium">Voice Note #{idx + 1}</span>
                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => togglePlayback(idx)} className="p-1.5 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 cursor-pointer border-none shadow-sm">
                                    {playingIndex === idx ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                </button>
                                <button type="button" onClick={() => removeRecording(idx)} className="p-1.5 rounded bg-slate-800 text-red-400 hover:bg-red-950 cursor-pointer border-none shadow-sm">
                                    <Trash2 size={12} />
                                </button>
                                <audio ref={el => audioPlayersRef.current[idx] = el} src={rec.url} onEnded={() => setPlayingIndex(null)} className="hidden" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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
    const Icon = type === 'time' ? Clock : Calendar;

    return (
        <div className="relative w-full flex items-center group">
            <input
                type={type}
                value={value || ''}
                onChange={onChange}
                readOnly={readOnly}
                className={`${className} ${readOnly ? '' : 'cursor-pointer'} relative z-10 appearance-none outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer bg-transparent`}
                style={{ colorScheme: 'dark' }} 
            />
            <Icon size={15} className={`absolute right-3 pointer-events-none z-0 ${readOnly ? 'text-slate-600' : 'text-white group-hover:text-cyan-400 transition-colors'}`} />
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
// CUSTOMER PAYMENT / TRANSACTION DETAILS POPUP
// Mirrors the Accounts Dashboard "View" popup so Ops sees the exact
// same customer payment summary + transaction history for a lead.
// ─────────────────────────────────────────────
function CustomerPaymentDetailsModal({ lead, onClose }) {
    if (!lead) return null;
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";
    const txns = Array.isArray(lead.paymentHistoryDetails) ? lead.paymentHistoryDetails : [];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl custom-scrollbar">
                {/* HEADER */}
                <div className="sticky top-0 px-5 sm:px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] rounded-t-xl">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 m-0">
                        <DollarSign size={18} className="text-cyan-400 flex-shrink-0" />
                        Customer Payment
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            LMN{String(lead.id || '').padStart(4, '0')}
                        </span>
                    </h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer border-none bg-transparent">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-5 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Customer Name</label>
                            <input type="text" readOnly value={lead.customerName || lead.profileName || 'N/A'} className={readonlyCls} />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Client Paid</label>
                            <input type="text" readOnly value={lead.amountReceived || '0'} className={`${readonlyCls} text-emerald-400`} />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Client Balance</label>
                            <input type="text" readOnly value={lead.balancePending || '0'} className={`${readonlyCls} text-red-400`} />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-3">
                            <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase m-0">Transaction Details</h3>
                            <span className="text-[10px] text-orange-400 font-bold italic bg-orange-950/30 px-2 py-1 rounded">History of Payment Entry Given by Sales</span>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded overflow-hidden overflow-x-auto">
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
                                    {txns.length > 0 ? (
                                        txns.map((hist, i) => (
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
                                            <td className="px-4 py-3">{lead.nextPaymentDate || 'N/A'}</td>
                                            <td className="px-4 py-3">Package</td>
                                            <td className="px-4 py-3 font-mono text-emerald-400">{lead.amountReceived || '0'}</td>
                                            <td className="px-4 py-3">{lead.paymentMode || 'N/A'}</td>
                                            <td className="px-4 py-3 font-mono">{lead.transactionId || 'N/A'}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="sticky bottom-0 px-5 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] flex justify-end rounded-b-xl">
                    <button type="button" onClick={onClose}
                        className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 cursor-pointer text-white text-sm font-bold rounded shadow transition-colors uppercase tracking-wider border-none">
                        Close
                    </button>
                </div>
            </div>
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
    const [historyLead, setHistoryLead] = useState(null); // Lead History modal (Jobs / My Jobs)
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [expandedStage, setExpandedStage] = useState(null);
    const [openJourneySections, setOpenJourneySections] = useState({ sales: false, operations: true, accounts: false, fulfillment: false });
    const [customerPaymentPopupLead, setCustomerPaymentPopupLead] = useState(null); // DMC Details "View" popup
    const [leadToFulfill, setLeadToFulfill] = useState(null);
    
    const [operationsStaff, setOperationsStaff] = useState([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTo, setAssignTo] = useState('');
    const [selectedLeadForAssign, setSelectedLeadForAssign] = useState(null);

    const [leadToComplete, setLeadToComplete] = useState(null);
    const [completeForm, setCompleteForm] = useState({ packagePreparedFor: '', packageCost: '', operationNotes: '' });


    // Recording global state for Main Note Logger
    const [isRecording, setIsRecording] = useState(false);

    // Accordion State for Operations Pipeline Edit
    const [openSections, setOpenSections] = useState({
        leadInfo: false,
        destinationRequest: false,
        operationsActivity: true, // Open by default
        operationsAcknowledgement: true, 
        vendorAssistance: false,
        itineraryPreparation: false,
        qualityCheck: false
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
        if (['New Requests', 'Move To Operation', 'Customization Required', 'Pending'].includes(rawStatus)) return 'New Requests';
        // 'Customisation Ready' = already shared back to Sales, but it should still stay
        // visible in Operations' own "My Jobs" (Follow-Up) as a copy, not disappear.
        if (['Ops Assigned', 'Follow-Up', 'Customisation Ready'].includes(rawStatus)) return 'Follow-Up';
        if (['Upcoming Departure', 'Upcoming Bookings'].includes(rawStatus)) return 'Upcoming Bookings';
        if (['Confirmed Bookings'].includes(rawStatus)) return 'Confirmed Bookings';
        return rawStatus || 'New Requests';
    };

    const expandedLeads = leads.flatMap(item => {
        let parsedRequests = [];
        if (item.customisationRequests) {
            try { 
                const raw = typeof item.customisationRequests === 'string' 
                    ? JSON.parse(item.customisationRequests) 
                    : item.customisationRequests; 
                if (Array.isArray(raw)) parsedRequests = raw;
                else if (raw && typeof raw === 'object') parsedRequests = [raw]; // legacy single-object shape — wrap instead of dropping
            } catch { parsedRequests = []; }
        }

        // "Booking Confirmed" is the tag Sales sets on the lead (customerResponse). It should
        // only push the row into Confirmed Bookings once Operations has actually assigned it —
        // until then it stays visible (with the tag shown) in New Requests / My Jobs so someone
        // in Ops can pick it up. See handleAssignSubmit for where the actual routing happens.
        const bookingConfirmedTag = item.customerResponse === 'Booking Confirmed';

        if (parsedRequests && parsedRequests.length > 0) {
            return parsedRequests.map((req, index) => {
                let rawRowStatus = (req.status && req.status !== 'Pending') ? req.status : 'Pending';
                const isAssigned = !!(req.assignedTo || item.operationExecutive);
                return {
                    ...item,
                    uniqueKey: `${item.id}-${index}`,
                    reqIndex: index,
                    bookingConfirmedTag,
                    rawRowStatus: (bookingConfirmedTag && isAssigned) ? 'Confirmed Bookings' : (rawRowStatus || 'New Requests'),
                    destination: req.destination || item.destination,
                    customisationType: req.customisationType || item.customisationType,
                    requirements: req.requirements || item.requirements,
                    turnaroundTime: req.turnaroundTime || req.requiredByDate || item.turnaroundTime,
                    assignedOps: req.assignedTo || item.operationExecutive || '',
                    // Per-request Ops tracking fields. Legacy leads only ever had these saved at the
                    // lead level (one value shared for the whole lead), so we can't know what each
                    // destination's real individual value was. Rather than showing that one old value
                    // on EVERY destination (which is misleading), only the first request inherits it —
                    // every other destination shows blank/"Not Set" until someone fills in its own data.
                    workType: req.workType || (index === 0 ? item.workType : ''),
                    opsCustomisationStatus: req.opsCustomisationStatus || (index === 0 ? item.opsCustomisationStatus : ''),
                    opsExpectedCompletionDate: req.opsExpectedCompletionDate || (index === 0 ? item.opsExpectedCompletionDate : ''),
                    opsExpectedCompletionTime: req.opsExpectedCompletionTime || (index === 0 ? item.opsExpectedCompletionTime : ''),
                    opsCompletedOn: req.opsCompletedOn || (index === 0 ? item.opsCompletedOn : ''),
                    packagePreparedFor: req.packagePreparedFor || (index === 0 ? item.packagePreparedFor : ''),
                    packageCost: req.packageCost || (index === 0 ? (item.packageCost || item.totalPackageCost) : ''),
                    operationNotes: req.operationNotes || (index === 0 ? item.operationNotes : '')
                };
            });
        }

        return [{ 
            ...item, 
            uniqueKey: `${item.id}-0`, 
            reqIndex: 0, 
            bookingConfirmedTag,
            rawRowStatus: (bookingConfirmedTag && item.operationExecutive) ? 'Confirmed Bookings' : (item.status || 'New Requests'),
            assignedOps: item.operationExecutive || ''
        }];
    });

    const isAuthorizedForOps = (l) => isAdmin || l.assignedOps === loggedInUserName || l.opsPreparedBy === loggedInUserName;

    const countNew = expandedLeads.filter(l => getTabStatus(l.rawRowStatus) === 'New Requests').length; 
    // "My Jobs" (Follow-Up) keeps counting an assigned item for the rest of its life in
    // Operations — even after it moves on to Confirmed Bookings or Upcoming Bookings — so
    // it stays visible in both places at once. Only the unassigned "Jobs" (New Requests)
    // pool ever drops an item purely because it got assigned.
    const countFollow = expandedLeads.filter(l => getTabStatus(l.rawRowStatus) !== 'New Requests' && isAuthorizedForOps(l)).length;
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

        const originalLead = leads.find(l => l.id === leadId);
        if (!originalLead) return;

        // If Sales already tagged this lead "Booking Confirmed", assigning it here sends it
        // straight to Confirmed Bookings; otherwise it goes to My Jobs (Follow-Up) as usual.
        const targetStatus = originalLead.customerResponse === 'Booking Confirmed' ? 'Confirmed Bookings' : 'Follow-Up';

        let parsedRequests = [];
        try {
            const raw = typeof originalLead.customisationRequests === 'string'
                ? JSON.parse(originalLead.customisationRequests)
                : (originalLead.customisationRequests || []);
            parsedRequests = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
        } catch(e) { parsedRequests = []; }

        if (parsedRequests.length > 0 && parsedRequests[reqIndex]) {
            parsedRequests[reqIndex].status = targetStatus;
            parsedRequests[reqIndex].assignedTo = finalAssignee;
        }

        const allProcessed = parsedRequests.every(r => r.status === 'Follow-Up' || r.status === 'Customisation Ready' || r.status === 'Confirmed Bookings');

        const updatedData = {
            customisationRequests: JSON.stringify(parsedRequests),
            operationExecutive: finalAssignee,
            opsPreparedBy: finalAssignee,
            status: allProcessed ? targetStatus : originalLead.status
        };

        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedData } : l));

        try {
            const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) {
                // The server rejected the update — don't report success, and don't call
                // fetchLeads() here, or the optimistic update above gets silently
                // overwritten with the old (unchanged) data, making the lead appear to
                // snap back into My Jobs with no visible error.
                const err = await response.json().catch(() => ({}));
                triggerNotification('error', `Failed to move to Confirmed Bookings: ${err.message || 'Server rejected the update.'}`);
                setLeads(prev => prev.map(l => l.id === leadId ? originalLead : l));
            } else {
                triggerNotification('success', `Request assigned to ${finalAssignee}.`);
                fetchLeads();
            }
        } catch (err) {
            // Genuine network failure — the optimistic UI update never made it to the
            // server either, so reflect that instead of claiming success.
            triggerNotification('error', 'Network error — assignment was not saved. Please try again.');
            setLeads(prev => prev.map(l => l.id === leadId ? originalLead : l));
        }
        setIsAssignModalOpen(false);
        setSelectedLeadForAssign(null);
    };

    // --- Send a job from "My Jobs" (Follow-Up) back to "Jobs" (New Requests) ---
    // Unlike Re-assign (which just changes who it's assigned to and keeps it in Follow-Up),
    // this un-assigns the request and drops its status back to Pending so it reappears
    // in the New Requests queue for anyone to pick up again.
    const handleSendBackToJobs = async (row) => {
        const leadId = row.id;
        const reqIndex = row.reqIndex;
        const requestStatus = 'Pending';
        // Lead-level status uses Sales's own vocabulary ('Move To Operation' = "with Operations,
        // awaiting pickup") rather than 'Pending', so the lead still shows up correctly badged
        // in SalesDashboard.jsx (which doesn't recognize 'Pending' at all) instead of vanishing.
        const leadLevelStatus = 'Move To Operation';

        const originalLead = leads.find(l => l.id === leadId);
        if (!originalLead) return;

        let parsedRequests = [];
        try {
            const raw = typeof originalLead.customisationRequests === 'string'
                ? JSON.parse(originalLead.customisationRequests)
                : (originalLead.customisationRequests || []);
            parsedRequests = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
        } catch(e) { parsedRequests = []; }

        if (parsedRequests.length > 0 && parsedRequests[reqIndex]) {
            parsedRequests[reqIndex].status = requestStatus;
            parsedRequests[reqIndex].assignedTo = '';
        }

        // If other requests on this same lead are still actively assigned, don't drag the
        // whole lead's top-level status backwards — only this specific request goes back.
        const anyStillFollowUp = parsedRequests.some(r => r.status === 'Follow-Up' || r.status === 'Customisation Ready');

        const updatedData = {
            customisationRequests: JSON.stringify(parsedRequests),
            status: anyStillFollowUp ? originalLead.status : leadLevelStatus
        };

        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedData } : l));

        try {
            await fetch(`${API_BASE_URL}/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            triggerNotification('success', 'Job sent back to New Requests.');
            fetchLeads();
        } catch (err) {
            triggerNotification('success', 'Job sent back to New Requests (Simulation mode).');
        }
    };

    const handleOpenCompleteModal = (row) => {
        setLeadToComplete(row);
        setCompleteForm({
            packagePreparedFor: row.packagePreparedFor || row.customerName || row.profileName || '',
            packageCost: row.packageCost || row.totalPackageCost || row.budget || '',
            operationNotes: ''
        });
    };

    const handleCloseCompleteModal = () => {
        setLeadToComplete(null);
        setCompleteForm({ packagePreparedFor: '', packageCost: '', operationNotes: '' });
    };

    const handleSendToSalesReady = async (row, responseData = {}) => {
        const leadId = row.id;
        const reqIndex = row.reqIndex;
        const targetStatus = 'Customisation Ready'; 

        const originalLead = leads.find(l => l.id === leadId);
        if (!originalLead) return;

        let parsedRequests = [];
        try {
            const raw = typeof originalLead.customisationRequests === 'string'
                ? JSON.parse(originalLead.customisationRequests)
                : (originalLead.customisationRequests || []);
            parsedRequests = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
        } catch(e) { parsedRequests = []; }

        if (parsedRequests.length > 0 && parsedRequests[reqIndex]) {
            // Package details go on THIS destination's request, not the whole lead — a lead with
            // 5 destinations sent to Sales one at a time each keeps its own cost/notes instead of
            // the last one submitted overwriting all the others.
            parsedRequests[reqIndex] = {
                ...parsedRequests[reqIndex],
                status: targetStatus,
                opsCompletedOn: new Date().toISOString(),
                opsPreparedBy: loggedInUserName,
                packagePreparedFor: responseData.packagePreparedFor || '',
                packageCost: responseData.packageCost || '',
                operationNotes: responseData.operationNotes || ''
            };
        }

        // Only bump the lead's overall status to "Customisation Ready" (which is what pulls it
        // into Sales's queue) once EVERY destination on this lead has been sent — a single
        // destination being done shouldn't yank the whole lead over while others are still
        // in Follow-Up.
        // A lead with no per-destination requests array has nothing else to wait on,
        // so sending it to Sales should complete immediately. Only leads that actually
        // have multiple destinations need to wait for every one to reach targetStatus.
        const allSentToSales = parsedRequests.length === 0 || parsedRequests.every(r => r.status === targetStatus);

        const updatedData = {
            customisationRequests: JSON.stringify(parsedRequests),
            status: allSentToSales ? targetStatus : originalLead.status,
            // SalesDashboard.jsx has no per-destination view — it only ever reads these fields
            // at the lead level (read-only summary). So keep mirroring the latest submission up
            // top too, or Sales would just see blank package details.
            opsCompletedOn: new Date().toISOString(),
            opsPreparedBy: loggedInUserName,
            packagePreparedFor: responseData.packagePreparedFor || '',
            packageCost: responseData.packageCost || '',
            operationNotes: responseData.operationNotes || ''
        };

        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedData } : l));

        try {
            const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!res.ok) throw new Error('Update failed');
            triggerNotification('success', allSentToSales ? 'All destinations ready — lead pushed to Sales.' : `Destination sent to Sales — waiting on ${parsedRequests.filter(r => r.status !== targetStatus).length} more.`);
            fetchLeads();
        } catch (err) {
            triggerNotification('success', `Pushed back to Sales (Simulation mode).`);
        }
    };

    const handleSubmitCompleteModal = async () => {
        if (!leadToComplete) return;
        if (!completeForm.packageCost || !String(completeForm.packageCost).trim()) {
            alert('Please enter the package cost before sending to Sales.');
            return;
        }
        await handleSendToSalesReady(leadToComplete, completeForm);
        handleCloseCompleteModal();
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
    // Some records store array-backed fields (like vendorRequests) as a raw
    // JSON string instead of an already-parsed array. Every read site should
    // go through this instead of assuming the value is already an array.
    const toArr = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string' && val.trim()) {
            try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; }
        }
        return [];
    };

    const handleArrayChange = (arrayName, index, field, value) => {
        const newArray = [...toArr(selectedLeadForEdit[arrayName])];
        newArray[index] = { ...newArray[index], [field]: value };
        setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const addArrayItem = (arrayName, defaultObj) => {
        setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: [...toArr(prev[arrayName]), defaultObj] }));
    };

    const removeArrayItem = (arrayName, index) => {
        const newArray = [...toArr(selectedLeadForEdit[arrayName])];
        newArray.splice(index, 1);
        setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const updateDomTransport = (index, field, value) => {
        const newTrans = [...selectedLeadForEdit.domTransports];
        newTrans[index] = { ...newTrans[index], [field]: value };
        setSelectedLeadForEdit({ ...selectedLeadForEdit, domTransports: newTrans });
    };

    const safeParseArray = (val, defaultItem) => {
        let arr = [];
        if (val) {
            try { arr = typeof val === 'string' ? JSON.parse(val) : val; } catch(e){}
        }
        if (Array.isArray(arr) && arr.length > 0) return arr;
        // Legacy/corrupted shape: a single stringified object instead of an array.
        // Wrap it so existing saved data isn't silently discarded on next edit.
        if (arr && typeof arr === 'object' && !Array.isArray(arr) && Object.keys(arr).length > 0) return [arr];
        return defaultItem !== null ? [defaultItem] : [];
    };

    // --- DIRECT FILE UPLOADER LOGIC ---
    const handleFileUpload = (e, arrayName, index, field) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        Promise.all(files.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => resolve({ name: file.name, base64: reader.result, type: file.type });
        }))).then(newFiles => {
            const newArray = [...selectedLeadForEdit[arrayName]];
            const currentFiles = newArray[index][field] || [];
            newArray[index][field] = [...currentFiles, ...newFiles];
            setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: newArray }));
        });
    };

    const removeFile = (arrayName, index, field, fileIndex) => {
        const newArray = [...selectedLeadForEdit[arrayName]];
        newArray[index][field] = newArray[index][field].filter((_, i) => i !== fileIndex);
        setSelectedLeadForEdit(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const renderFileUploader = (label, arrayName, index, field) => {
        const files = selectedLeadForEdit[arrayName]?.[index]?.[field] || [];
        return (
            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                <div className="relative flex items-center justify-center bg-slate-900 border border-slate-700 border-dashed rounded px-3 py-2 cursor-pointer hover:border-cyan-500 transition-colors">
                    <span className="text-cyan-400 text-xs font-medium flex items-center gap-2">
                        <Plus size={14} /> Upload Files
                    </span>
                    <input type="file" multiple onChange={(e) => handleFileUpload(e, arrayName, index, field)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                {files.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center p-1.5 bg-slate-800/40 rounded border border-slate-700/50">
                                <span className="text-[10px] text-slate-300 truncate max-w-[80%]" title={file.name}>{file.name}</span>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button type="button" onClick={() => window.open(file.base64 || file.url, '_blank')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-blue-400 hover:bg-slate-700" title="View"><Eye size={12}/></button>
                                    <button type="button" onClick={() => removeFile(arrayName, index, field, idx)} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-red-400 hover:bg-red-950" title="Delete"><Trash2 size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // --- MAIN VOICE RECORDER ---
    const handleVoiceRecord = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            triggerNotification('error', 'Voice recognition is not supported in this browser.');
            return;
        }

        if (isRecording) {
            setIsRecording(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsRecording(true);
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const currentMsg = selectedLeadForEdit.opsUpdateToSalesMessage || '';
            setSelectedLeadForEdit({
                ...selectedLeadForEdit,
                opsUpdateToSalesMessage: currentMsg ? `${currentMsg} ${transcript}` : transcript
            });
            setIsRecording(false);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            triggerNotification('error', `Microphone error: ${event.error}`);
        };
        
        recognition.onend = () => setIsRecording(false);

        recognition.start();
    };

    const handleAddNoteToLog = () => {
        if (!selectedLeadForEdit.opsUpdateToSalesMessage?.trim()) {
            triggerNotification('error', 'Please enter a message or use the voice recorder first.');
            return;
        }

        const timestamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        
        let currentRecords = [];
        try { 
            currentRecords = typeof selectedLeadForEdit.updateRecords === 'string' 
                ? JSON.parse(selectedLeadForEdit.updateRecords) 
                : (Array.isArray(selectedLeadForEdit.updateRecords) ? selectedLeadForEdit.updateRecords : []); 
        } catch(err) {
            currentRecords = [];
        }

        const newRecords = [{
            date: timestamp,
            message: selectedLeadForEdit.opsUpdateToSalesMessage.trim(),
            status: selectedLeadForEdit.opsCustomisationStatus || 'Status Not Updated',
            author: loggedInUserName
        }, ...currentRecords];

        setSelectedLeadForEdit({
            ...selectedLeadForEdit,
            updateRecords: newRecords,
            opsUpdateToSalesMessage: '' 
        });
        
        triggerNotification('success', 'Note appended! Click main SUBMIT at the bottom to save permanently.');
    };

    const handleEditClick = (lead) => {
        let parsedCustomisationRequests = [];
        if (lead.customisationRequests) {
            try { 
                const raw = typeof lead.customisationRequests === 'string' 
                    ? JSON.parse(lead.customisationRequests) 
                    : lead.customisationRequests; 
                if (Array.isArray(raw)) parsedCustomisationRequests = raw;
                else if (raw && typeof raw === 'object') parsedCustomisationRequests = [raw]; // legacy single-object shape — wrap instead of dropping
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
                    vendorMessage: lead.vendorMessage || '',
                    finalItineraryFiles: [],
                    dmcConfirmationFiles: [],
                    invoiceFiles: [],
                    voiceNotes: []
                }];
            } else {
                parsedVendorRequests = [{ 
                    vendorService: '', vendorDmcName: '', vendorContactPerson: '', contactMethod: '', vendorVisaType: '',
                    vendorCheckInDate: '', vendorCheckOutDate: '', vendorRoomsRequired: '', vendorVehicleType: '', vendorPickupLocation: '', vendorDropLocation: '', 
                    vendorMessage: '', finalItineraryFiles: [], dmcConfirmationFiles: [], invoiceFiles: [], voiceNotes: [] 
                }];
            }
        }

        const passengers = safeParseArray(lead.passengers, { fullName: '', dob: '', gender: '', aadharNumber: '', panNumber: '', passportNumber: '', passportIssueDate: '', passportExpiryDate: '', passportIssuePlace: '', mobileNumber: '', emergencyContact: '' });
        const flights = safeParseArray(lead.flights, { flightType: '', flightResponsibility: '', bookingStatus: '', airline: '', pnr: '', bookedThrough: '', category: '', departureDateTime: '', boardingPoint: '', ticketShared: '', ticketSharedDate: '', deboardingPoint: '', flightCost: '', markupCost: '', attachedFiles: [] });
        const visas = safeParseArray(lead.visas, { destination: '', visaType: '', transitVisaReq: '', arrivalCardApplicable: '', arrivalCardDetails: '', appliedBy: '', docsPending: '', visaStatus: '', visaCopyShared: '', visaApprovalDate: '', visaExpiryDate: '', visaCost: '', markupCost: '', voiceNotes: [] });
        const domTransports = safeParseArray(lead.domTransports, { transportType: '', bookedBy: '', bookingStatus: '', ticketSharedToClient: '', sharedDate: '', attachedFiles: [], voiceNotes: [], flight: { onward: {}, return: null }, train: { onward: {}, return: null }, bus: { onward: {}, return: null } });
        const domHotels = safeParseArray(lead.domHotels, { location: '', hotelName: '', hotelCategory: '', bookedBy: '', refNo: '', status: '', roomCategory: '', noOfRooms: '', addMattress: '', specifications: '', mealPlan: '', earlyCheckIn: '', checkInDateTime: '', checkOutDateTime: '', refreshmentRoom: '', cost: '', markup: '', paymentDueDate: '', attachVoucher: '', specialArrangements: '', notes: '' });
        const domLocalTransports = safeParseArray(lead.domLocalTransports, { serviceProvider: '', vehicleType: '', contactPerson: '', driverName: '', vehicleNumber: '', status: '', pickupPoint: '', pickupDate: '', duration: '', dropPoint: '', dropDate: '', tollParking: '', cost: '', markup: '', paymentDueDate: '', notes: '' });
        const paymentRequests = safeParseArray(lead.paymentRequests, { serviceType: 'Complete Package', providerName: '', paymentDueDate: '', paymentType: '', amountToPay: '' });

        let parsedServiceCosts = {};
        if (lead.serviceCosts) {
            try { parsedServiceCosts = typeof lead.serviceCosts === 'string' ? JSON.parse(lead.serviceCosts) : lead.serviceCosts; } catch (e) { parsedServiceCosts = {}; }
        }

        const editReqIndex = typeof lead.reqIndex === 'number' ? lead.reqIndex : 0;
        const currentReq = parsedCustomisationRequests[editReqIndex] || {};

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
            turnaroundTime: lead.turnaroundTime || '', salesRemarks: lead.salesRemarks || '', voiceNote: lead.voiceNote || '', destination: lead.destination || '', workType: currentReq.workType || lead.workType || '',
            reqIndex: editReqIndex,
            opsCustomisationStatus: currentReq.opsCustomisationStatus || lead.opsCustomisationStatus || '',
            opsExpectedCompletionDate: currentReq.opsExpectedCompletionDate || lead.opsExpectedCompletionDate || '',
            opsExpectedCompletionTime: currentReq.opsExpectedCompletionTime || lead.opsExpectedCompletionTime || '',
            rateSource: lead.rateSource || '', priority: calculatedPriority, status: lead.status || '', activityType: lead.activityType || '', activityOutcome: lead.activityOutcome || '', notes: lead.notes || '',
            nextActionRequired: lead.nextActionRequired || '', nextActionDate: lead.nextActionDate || '', 
            
            preparationMethod: lead.preparationMethod || '', itineraryVersion: lead.itineraryVersion || '', workingNotes: lead.workingNotes || '', itineraryPrepDate: lead.itineraryPrepDate || '',
            qcStatus: lead.qcStatus || '', qcRemarks: lead.qcRemarks || '', reviewedBy: lead.reviewedBy || '', qcDate: lead.qcDate || '', salesAcknowledged: lead.salesAcknowledged || '', finalStatus: lead.finalStatus || '',
            salesFunnelLeadStatus: lead.salesFunnelLeadStatus || 'Pipeline Active', salesFunnelNotes: lead.salesFunnelNotes || '', localVoiceRecordings: lead.localVoiceRecordings || [], bookingDate: lead.bookingDate || '',
            packageCost: lead.packageCost || lead.amount || '', confirmationDate: lead.confirmationDate || '', 
            passengers, flights, visas, domTransports, domHotels, domLocalTransports, paymentRequests, serviceCosts: parsedServiceCosts,
            docAadhar: lead.docAadhar || '', docPan: lead.docPan || '', docPhoto: lead.docPhoto || '', docPassport: lead.docPassport || '', docDriveLink: lead.docDriveLink || '', documentStatus: lead.documentStatus || '', docRemarks: lead.docRemarks || '',
            domTransportType: lead.domTransportType || lead.transportMode || '', specialOffers: lead.specialOffers || lead.offers || '', arrivalDate: lead.arrivalDate || '', departureDate: lead.departureDate || '', returnDate: lead.returnDate || '',
            insRequired: lead.insRequired || '', insProvider: lead.insProvider || '', insPolicyNo: lead.insPolicyNo || '', insCost: lead.insCost || '', insMarkup: lead.insMarkup || '', insStatus: lead.insStatus || '', insPolicyShared: lead.insPolicyShared || '',
            reqVeg: lead.reqVeg || false, reqWheelchair: lead.reqWheelchair || false, reqSenior: lead.reqSenior || false, reqHoneymoon: lead.reqHoneymoon || false, reqCandlelight: lead.reqCandlelight || false,
            reqFloating: lead.reqFloating || false, reqDecor: lead.reqDecor || false, reqBirthday: lead.reqBirthday || false, reqAnniversary: lead.reqAnniversary || false, reqManualAdd: lead.reqManualAdd || false, reqManualAddText: lead.reqManualAddText || '',
            
            // State for voice notes
            updateRecords: lead.updateRecords || []
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const timestamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

        // --- Route to Sales when Ops marks the itinerary as shared with Sales ---
        // NOTE: this only flags the lead for Sales (sharedWithSales / sharedWithSalesDate) —
        // it does NOT touch req.status / lead.status, so the lead is not pulled out of
        // Operations' own "My Jobs" (Follow-Up) tab. It shows up in both places.
        const isSharedWithSales = selectedLeadForEdit.opsCustomisationStatus === 'Itinerary Shared with Sales';
        
        let currentHistory = [];
        try { 
            currentHistory = typeof selectedLeadForEdit.history === 'string' ? JSON.parse(selectedLeadForEdit.history) : (Array.isArray(selectedLeadForEdit.history) ? selectedLeadForEdit.history : []); 
        } catch(err){}
        const updatedHistory = [
            { date: timestamp, action: 'Operations Profile Updated', note: 'Data synchronized and saved from Operations Dashboard.' },
            ...(isSharedWithSales ? [{ date: timestamp, action: 'Itinerary Shared with Sales', note: `Operations (${loggedInUserName}) marked the itinerary ready and shared it with Sales.` }] : []),
            ...currentHistory
        ];

        // --- Save the sales update note (Catch trailing input if Submit is clicked before "Add Note") ---
        let updateRecords = [];
        try { 
            updateRecords = typeof selectedLeadForEdit.updateRecords === 'string' ? JSON.parse(selectedLeadForEdit.updateRecords) : (Array.isArray(selectedLeadForEdit.updateRecords) ? selectedLeadForEdit.updateRecords : []); 
        } catch(err) {}

        if (selectedLeadForEdit.opsUpdateToSalesMessage?.trim()) {
            updateRecords = [{
                date: timestamp,
                message: selectedLeadForEdit.opsUpdateToSalesMessage.trim(),
                status: selectedLeadForEdit.opsCustomisationStatus || 'Status Not Updated',
                author: loggedInUserName
            }, ...updateRecords];
        }
        // ---------------------------------------------

        // ─── SAFE AUTO-SAVE TO LOCAL STORAGE (RUNS ONLY ON SUBMIT) ───
        try {
            const stored = localStorage.getItem('saved_vendor_directory');
            let directory = stored ? JSON.parse(stored) : {};
            let changed = false;

            toArr(selectedLeadForEdit.vendorRequests).forEach(req => {
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

        // --- Write per-destination Ops fields (workType, status, expected completion) onto
        // the SPECIFIC customisation request being edited, not the whole lead — a lead can
        // have multiple destinations/requests and each needs its own tracking data. ---
        const editReqIdx = typeof selectedLeadForEdit.reqIndex === 'number' ? selectedLeadForEdit.reqIndex : 0;
        const updatedCustomisationRequests = (selectedLeadForEdit.customisationRequests || []).map((req, idx) =>
            idx === editReqIdx ? {
                ...req,
                workType: selectedLeadForEdit.workType,
                opsCustomisationStatus: selectedLeadForEdit.opsCustomisationStatus,
                opsExpectedCompletionDate: selectedLeadForEdit.opsExpectedCompletionDate,
                opsExpectedCompletionTime: selectedLeadForEdit.opsExpectedCompletionTime,
                ...(isSharedWithSales ? { opsCompletedOn: new Date().toISOString() } : {})
            } : req
        );

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
            customisationRequests: JSON.stringify(updatedCustomisationRequests),
            history: JSON.stringify(updatedHistory),
            updateRecords: JSON.stringify(updateRecords),
            opsUpdateToSalesMessage: '',
            ...(isSharedWithSales ? {
                sharedWithSales: true,
                sharedWithSalesDate: new Date().toISOString(),
                sharedWithSalesBy: loggedInUserName
            } : {})
        };
        
        updateLead(selectedLeadForEdit.id, payloadToSave);
        triggerNotification('success', isSharedWithSales ? 'Itinerary shared — lead directed to Sales for review.' : 'Job details saved successfully!');
        setSelectedLeadForEdit(null); 
    };

    // --- FILTER & DISPLAY DATA ---
    const filtered = expandedLeads.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || `LMN${item.id}`.toLowerCase().includes(q) || (item.customerName || '').toLowerCase().includes(q) || (item.destination || '').toLowerCase().includes(q);
        
        let tabMatchedStatus = getTabStatus(item.rawRowStatus);
        let matchTab = tabMatchedStatus === activeTab;
        // "My Jobs" (Follow-Up) keeps listing an assigned item even after it progresses to
        // Confirmed Bookings / Upcoming Bookings, so it appears in both tabs at once. Only
        // the unassigned "Jobs" (New Requests) pool ever loses an item purely because it
        // got assigned.
        if (activeTab === 'Follow-Up') {
            matchTab = tabMatchedStatus !== 'New Requests';
        }
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

    try {
        const storedDirectory = JSON.parse(localStorage.getItem('saved_vendor_directory') || '{}');
        Object.keys(storedDirectory).forEach(dmc => {
            if (!dmcToContactsMap[dmc]) dmcToContactsMap[dmc] = new Set();
            storedDirectory[dmc].forEach(c => dmcToContactsMap[dmc].add(c));
        });
    } catch(e) {}

    if (selectedLeadForEdit && selectedLeadForEdit.vendorRequests) {
        toArr(selectedLeadForEdit.vendorRequests).forEach(req => {
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
                        <div className="py-5  ">
                            <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">Operations Dashboard</h1>
                            {/* <p className="text-slate-400 text-sm sm:text-base mt-1">Manage, allocate, and process active operational pipeline handovers.</p> */}
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
                                            {activeTab === 'New Requests' && (
                                                <>
                                                    <th className="px-6 py-4">Job ID</th>
                                                    <th className="px-6 py-4">Lead Name</th>
                                                    <th className="px-6 py-4">Travel Details</th>
                                                    <th className="px-6 py-4">Customisation Type</th>
                                                    <th className="px-6 py-4">Sale Executive</th>
                                                    <th className="px-6 py-4">Received On</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </>
                                            )}
                                            {activeTab === 'Follow-Up' && (
                                                <>
                                                    <th className="px-6 py-4">Job ID</th>
                                                    <th className="px-6 py-4">Lead Name</th>
                                                    <th className="px-6 py-4">Travel Details</th>
                                                    <th className="px-6 py-4">Work Details</th>
                                                    <th className="px-6 py-4">Expected By</th>
                                                    <th className="px-6 py-4">Sale Executive</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </>
                                            )}
                                            {activeTab === 'Confirmed Bookings' && (
                                                <>
                                                    <th className="px-6 py-4">Job ID</th>
                                                    <th className="px-6 py-4">Lead Details</th>
                                                    <th className="px-6 py-4">Travel Details</th>
                                                    <th className="px-6 py-4">Travel Dates</th>
                                                    <th className="px-6 py-4">Services</th>
                                                    <th className="px-6 py-4">Sale Executive</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </>
                                            )}
                                            {activeTab === 'Upcoming Bookings' && (
                                                <>
                                                    <th className="px-6 py-4">Job ID</th>
                                                    <th className="px-6 py-4">Lead Details</th>
                                                    <th className="px-6 py-4">Travel Details</th>
                                                    <th className="px-6 py-4">Travel Dates</th>
                                                    <th className="px-6 py-4">Days to Departure</th>
                                                    <th className="px-6 py-4">Sale Executive</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/20">
                                        {isLoading ? (
                                            <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">Querying database records...</td></tr>
                                        ) : paginated.length > 0 ? paginated.map(row => (
                                            <tr key={row.uniqueKey} className="hover:bg-slate-800/30 transition-colors">
                                                
                                                {/* ===================== TAB 1: JOBS (New Requests) ===================== */}
                                                {activeTab === 'New Requests' && (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4 font-bold text-white">{row.customerName || row.profileName || 'N/A'}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-emerald-400 font-medium">{row.destination || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">{row.travelDates || row.travelDate || 'TBD'}</span>
                                                                <span className="text-xs text-slate-500">{row.duration || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <span>{row.customisationType || 'N/A'}</span>
                                                                {row.bookingConfirmedTag && (
                                                                    <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 rounded font-bold text-[10px] whitespace-nowrap">Booking Confirmed</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">{row.salesExecutive || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-400">{row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</td>
                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button type="button" onClick={() => { setHistoryLead(row); setExpandedStage(null); setOpenJourneySections({ sales: false, operations: true, accounts: false, fulfillment: false }); setIsHistoryModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-900/30 rounded-md transition-colors flex flex-col items-center" title="View History"><History size={16} /><span className="text-[10px]">History</span></button>
                                                                <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-md transition-colors flex flex-col items-center" title="View"><Eye size={16} /><span className="text-[10px]">View</span></button>
                                                                <button type="button" onClick={() => handleOpenAssignModal(row)} className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-900/30 rounded-md transition-colors flex flex-col items-center" title="Assign"><CheckSquare size={16} /><span className="text-[10px]">Assign</span></button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {/* ===================== TAB 2: MY JOBS (Follow-Up) ===================== */}
                                                {activeTab === 'Follow-Up' && (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4 font-bold text-white">{row.customerName || row.profileName || 'N/A'}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-emerald-400 font-medium">{row.destination || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">{row.travelDates || row.travelDate || 'TBD'}</span>
                                                                <span className="text-xs text-slate-500">{row.duration || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-cyan-400">{row.workType || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">{row.opsCustomisationStatus || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-amber-400">
                                                            {row.opsExpectedCompletionDate ? `${row.opsExpectedCompletionDate} ${row.opsExpectedCompletionTime || ''}` : 'Not Set'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">{row.salesExecutive || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button type="button" onClick={() => { setHistoryLead(row); setExpandedStage(null); setOpenJourneySections({ sales: false, operations: true, accounts: false, fulfillment: false }); setIsHistoryModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-900/30 rounded-md transition-colors flex flex-col items-center" title="View History"><History size={16} /><span className="text-[10px]">History</span></button>
                                                                <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-md transition-colors flex flex-col items-center" title="View"><Eye size={16} /><span className="text-[10px]">View</span></button>
                                                                <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/20 rounded-md transition-colors flex flex-col items-center" title="Edit"><Pencil size={16} /><span className="text-[10px]">Edit</span></button>
                                                                <button type="button" onClick={() => handleOpenAssignModal(row)} className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-900/20 rounded-md transition-colors flex flex-col items-center" title="Re-assign"><Repeat size={16} /><span className="text-[10px]">Re-assign</span></button>
                                                                <button type="button" onClick={() => handleSendBackToJobs(row)} className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-900/20 rounded-md transition-colors flex flex-col items-center" title="Send back to New Requests (Jobs)"><Undo2 size={16} /><span className="text-[10px]">Back to Jobs</span></button>
                                                                <button type="button" onClick={() => handleOpenCompleteModal(row)} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-md transition-colors flex flex-col items-center" title="Complete & Send to Sales"><Send size={16} /><span className="text-[10px]">To Sales</span></button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {/* ===================== TAB 3: CONFIRMED BOOKINGS ===================== */}
                                                {activeTab === 'Confirmed Bookings' && (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-bold">{row.customerName || row.profileName || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">{row.phone || row.mobileNo || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-emerald-400 font-medium">{row.destination || row.confirmedDestination || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">{row.packageType || row.tourType || 'N/A'}</span>
                                                                <span className="text-xs text-slate-500">{row.duration || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-slate-300">{row.tourStartDate || row.travelDate || 'TBD'}</span>
                                                                <span className="text-xs text-slate-500">{row.tourEndDate || row.returnDate || 'TBD'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">{row.services || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-sm">{row.salesExecutive || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-md transition-colors flex flex-col items-center" title="View"><Eye size={16} /><span className="text-[10px]">View</span></button>
                                                                <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/20 rounded-md transition-colors flex flex-col items-center" title="Edit"><Pencil size={16} /><span className="text-[10px]">Edit</span></button>
                                                                <button type="button" onClick={() => setLeadToFulfill(row)} className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-900/30 rounded-md transition-colors flex flex-col items-center" title="Send to Fulfillment"><Send size={16} /><span className="text-[10px]">Fulfill</span></button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {/* ===================== TAB 4: UPCOMING BOOKINGS ===================== */}
                                                {activeTab === 'Upcoming Bookings' && (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-bold">{row.customerName || row.profileName || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">{row.phone || row.mobileNo || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-emerald-400 font-medium">{row.confirmedDestination || row.destination || 'N/A'}</span>
                                                                <span className="text-xs text-slate-400">{row.packageType || row.tourType || 'N/A'}</span>
                                                                <span className="text-xs text-slate-500">{row.duration || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-sm">
                                                                <span className="text-slate-300">{row.tourStartDate || row.travelDate || 'TBD'}</span>
                                                                <span className="text-xs text-slate-500">{row.tourEndDate || row.returnDate || 'TBD'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 bg-red-950/50 text-red-400 border border-red-900/50 rounded font-bold text-xs">
                                                                {getDaysToDeparture(row.tourStartDate || row.travelDate)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">{row.salesExecutive || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-md transition-colors flex flex-col items-center" title="View"><Eye size={16} /><span className="text-[10px]">View</span></button>
                                                                <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/20 rounded-md transition-colors flex flex-col items-center" title="Edit"><Pencil size={16} /><span className="text-[10px]">Edit</span></button>
                                                                <button type="button" onClick={() => setLeadToFulfill(row)} className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-900/30 rounded-md transition-colors flex flex-col items-center" title="Send to Fulfillment"><Send size={16} /><span className="text-[10px]">Fulfill</span></button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
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
                                                {activeTab === 'Upcoming Bookings' && (
                                                    <span className="px-2 py-0.5 bg-red-950/50 text-red-400 border border-red-900/50 rounded font-bold text-[10px]">
                                                        {getDaysToDeparture(row.tourStartDate || row.travelDate)}
                                                    </span>
                                                )}
                                                {activeTab === 'New Requests' && row.bookingConfirmedTag && (
                                                    <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 rounded font-bold text-[10px]">
                                                        Booking Confirmed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {activeTab === 'New Requests' ? (
                                                    <>
                                                        <button type="button" onClick={() => { setHistoryLead(row); setExpandedStage(null); setOpenJourneySections({ sales: false, operations: true, accounts: false, fulfillment: false }); setIsHistoryModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-purple-400 bg-slate-800 rounded-md border border-slate-700" title="View History"><History size={15} /></button>
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 bg-slate-800 rounded-md border border-slate-700" title="View"><Eye size={15} /></button>
                                                        <button type="button" onClick={() => handleOpenAssignModal(row)} className="p-1.5 text-slate-400 hover:text-orange-400 bg-slate-800 rounded-md border border-slate-700" title="Assign"><CheckSquare size={15} /></button>
                                                    </>
                                                ) : activeTab === 'Follow-Up' ? (
                                                    <>
                                                        <button type="button" onClick={() => { setHistoryLead(row); setExpandedStage(null); setOpenJourneySections({ sales: false, operations: true, accounts: false, fulfillment: false }); setIsHistoryModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-purple-400 bg-slate-800 rounded-md border border-slate-700" title="View History"><History size={15} /></button>
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 bg-slate-800 rounded-md border border-slate-700" title="View"><Eye size={15} /></button>
                                                        <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 bg-slate-800 rounded-md border border-slate-700" title="Edit"><Pencil size={15} /></button>
                                                        <button type="button" onClick={() => handleOpenAssignModal(row)} className="p-1.5 text-slate-400 hover:text-purple-400 bg-slate-800 rounded-md border border-slate-700" title="Re-assign"><Repeat size={15} /></button>
                                                        <button type="button" onClick={() => handleSendBackToJobs(row)} className="p-1.5 text-slate-400 hover:text-orange-400 bg-slate-800 rounded-md border border-slate-700" title="Send back to New Requests (Jobs)"><Undo2 size={15} /></button>
                                                        <button type="button" onClick={() => handleOpenCompleteModal(row)} className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-800 rounded-md border border-slate-700" title="Complete & Send to Sales"><Send size={15} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="p-1.5 text-slate-400 hover:text-blue-300 bg-slate-800 rounded-md border border-slate-700" title="View"><Eye size={15} /></button>
                                                        <button type="button" onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-yellow-400 bg-slate-800 rounded-md border border-slate-700" title="Edit"><Pencil size={15} /></button>
                                                        <button type="button" onClick={() => setLeadToFulfill(row)} className="p-1.5 text-slate-400 hover:text-orange-400 bg-slate-800 rounded-md border border-slate-700" title="Send to Fulfillment"><Send size={15} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 mb-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-semibold text-sm">{row.customerName || row.profileName || 'N/A'}</span>
                                                <span className="text-slate-400 text-xs">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-emerald-400 text-xs font-medium flex items-center gap-1"><MapPin size={11} />{row.destination || row.confirmedDestination || 'N/A'}</span>
                                                <span className="text-slate-500 text-xs">📅 {activeTab === 'Confirmed Bookings' || activeTab === 'Upcoming Bookings' ? (row.tourStartDate || row.travelDate) : (row.travelDates || row.travelDate)}</span>
                                            </div>
                                        </div>
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
                                    ? 'Booking Details'
                                    : 'Operations'}
                            </span>
                            <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-shrink-0">
                                LMN{String(selectedLeadForEdit.id || '').padStart(4, '0')} | {selectedLeadForEdit.customerName || selectedLeadForEdit.profileName || 'N/A'}
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
                                            {/* 1. BOOKING CONFIRMATION (Fetched from Sales - Read Only) */}
                                            <div className={sectionCls} style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                                                <h3 className={`${sectionHeadCls} text-sky-400 border-sky-900/50 mb-4`}>INTERNATIONAL - Booking Confirmation</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmed Method</label><input type="text" readOnly value={selectedLeadForEdit.confirmedMethod || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmed Date</label><input type="text" readOnly value={selectedLeadForEdit.confirmedDate || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Operations Executive</label><input type="text" readOnly value={selectedLeadForEdit.operationExecutive || ''} className={readonlyCls} /></div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination Type</label><input type="text" readOnly value={selectedLeadForEdit.confirmedTripType || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination</label><input type="text" readOnly value={selectedLeadForEdit.confirmedDestination || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Duration</label><input type="text" readOnly value={selectedLeadForEdit.confirmedDuration || ''} className={readonlyCls} /></div>

                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">No. of Pax (Adults | Children)</label>
                                                        <div className="flex gap-2">
                                                            <input type="text" readOnly value={selectedLeadForEdit.noOfPax || '0'} className={readonlyCls} placeholder="Adults" />
                                                            <input type="text" readOnly value={selectedLeadForEdit.confirmedNoOfChildren || '0'} className={readonlyCls} placeholder="Children" />
                                                        </div>
                                                    </div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Departure Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.departureDate} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Return Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.returnDate} className={readonlyCls} /></div>

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Tour Start Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.tourStartDate} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Tour End Date</label><DatePickerField type="date" readOnly value={selectedLeadForEdit.tourEndDate} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Services</label><input type="text" readOnly value={selectedLeadForEdit.confirmedServices || ''} className={readonlyCls} /></div>

                                                    {/* Service Costs (Dynamic - mirrors Sales exactly, one field per selected service) */}
                                                    {(() => {
                                                        const servicesArr = selectedLeadForEdit.confirmedServices ? selectedLeadForEdit.confirmedServices.split(', ').filter(Boolean) : [];
                                                        return servicesArr.map((srv, idx) => (
                                                            <div key={idx}>
                                                                <label className="block text-xs font-medium text-slate-400 mb-1">{srv} Cost</label>
                                                                <input type="text" readOnly value={(selectedLeadForEdit.serviceCosts && selectedLeadForEdit.serviceCosts[srv]) || selectedLeadForEdit[`service${idx+1}Cost`] || ''} className={readonlyCls} />
                                                            </div>
                                                        ));
                                                    })()}

                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">GST</label><input type="text" readOnly value={selectedLeadForEdit.gst || ''} className={readonlyCls} /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">TCS</label><input type="text" readOnly value={selectedLeadForEdit.tcs || ''} className={readonlyCls} /></div>
                                                </div>
                                            </div>

                                            {/* 2. PASSENGER DETAILS (Fetched from Sales - Read Only) */}
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} mb-4`}>Passenger Details</h3>
                                                <div className="overflow-x-auto border border-slate-700/50 rounded-lg custom-scrollbar">
                                                    <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                                                        <thead className="bg-slate-800/80 border-b border-slate-700/50">
                                                            <tr>
                                                                <th className="p-2.5 font-medium">Passenger Name</th><th className="p-2.5 font-medium">DOB</th><th className="p-2.5 font-medium">Gender</th>
                                                                <th className="p-2.5 font-medium">Aadhar Number</th><th className="p-2.5 font-medium">PAN Number</th><th className="p-2.5 font-medium">Passport Number</th>
                                                                <th className="p-2.5 font-medium">Passport Issue Place</th><th className="p-2.5 font-medium">Issue Date</th><th className="p-2.5 font-medium">Expiry Date</th>
                                                                <th className="p-2.5 font-medium">Mobile Number</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedLeadForEdit.passengers && selectedLeadForEdit.passengers.length > 0 ? (
                                                                selectedLeadForEdit.passengers.map((p, idx) => (
                                                                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/40">
                                                                        <td className="p-2.5">{p.fullName}</td><td className="p-2.5">{p.dob}</td><td className="p-2.5">{p.gender}</td>
                                                                        <td className="p-2.5">{p.aadharNumber}</td><td className="p-2.5">{p.panNumber}</td><td className="p-2.5">{p.passportNumber}</td>
                                                                        <td className="p-2.5">{p.passportIssuePlace}</td><td className="p-2.5">{p.passportIssueDate}</td><td className="p-2.5">{p.passportExpiryDate}</td>
                                                                        <td className="p-2.5">{p.mobileNumber}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr><td colSpan="10" className="p-4 text-center text-slate-500 italic">No passengers recorded.</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* 2.1 DOCUMENT COLLECTION (Fetched from Sales - Read Only) */}
                                            <div className={sectionCls}>
                                                <h3 className={`${sectionHeadCls} mb-4`}>Document Collection</h3>
                                                
                                                {/* Sequence: Aadhar | Passport, Pan | Photograph, View Document | Remarks */}
                                                <div className="grid grid-cols-1 gap-4 max-w-3xl">

                                                    {/* Row 1: Aadhar + Passport */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-700/30 pb-3">
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" checked={selectedLeadForEdit.docAadhar === 'Received'} readOnly className="w-5 h-5 accent-emerald-500 cursor-not-allowed" />
                                                            <label className="text-sm font-medium text-slate-300">Aadhar Copy Received</label>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" checked={selectedLeadForEdit.docPassport === 'Received'} readOnly className="w-5 h-5 accent-emerald-500 cursor-not-allowed" />
                                                            <label className="text-sm font-medium text-slate-300">Passport Copy Received</label>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: PAN + Photograph */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-700/30 pb-3">
                                                        
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" checked={selectedLeadForEdit.docPhoto === 'Received'} readOnly className="w-5 h-5 accent-emerald-500 cursor-not-allowed" />
                                                            <label className="text-sm font-medium text-slate-300">Photographs</label>
                                                        </div>
                                                    </div>

                                                    {/* Row 3: View Document + Remarks */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">View Documents</label>
                                                            <input type="text" readOnly value={selectedLeadForEdit.docDriveLink || ''} className={readonlyCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Remarks</label>
                                                            <input type="text" readOnly value={selectedLeadForEdit.docRemarks || ''} className={readonlyCls} />
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                            {/* 3. FLIGHT DETAILS */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Flight Details</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.flights?.map((flight, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">FLIGHT {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('flights', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booking Handled By</label>
                                                                    <CustomSelect value={flight.flightResponsibility} onChange={(v) => handleArrayChange('flights', index, 'flightResponsibility', v)} className={selectCls} options={['In-House', 'Client', 'Vendor']} hideDefaultManual />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label>
                                                                    <CustomSelect value={flight.bookingStatus} onChange={(v) => handleArrayChange('flights', index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Confirmed','Ticket Issued', 'Cancelled','Rescheduled']} hideDefaultManual />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Booking Date</label><DatePickerField type="date" value={flight.bookingDate} onChange={(e) => handleArrayChange('flights', index, 'bookingDate', e.target.value)} className={inputCls} /></div>

                                                                {/* Conditional Rendering based on "red instructions" */}
                                                                {['In-House','Vendor'].includes(flight.flightResponsibility) && (
                                                                    <>
                                                                        <div className="sm:col-span-3 border-t border-slate-700/30 my-1 pt-3"></div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-400 mb-1">Flight Type</label>
                                                                            <CustomSelect value={flight.flightType} onChange={(v) => handleArrayChange('flights', index, 'flightType', v)} className={selectCls} options={['One Way', 'Round Trip', 'Multi City']} hideDefaultManual />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-400 mb-1">Booking Through</label>
                                                                            <CustomSelect value={flight.bookedThrough} onChange={(v) => handleArrayChange('flights', index, 'bookedThrough', v)} className={selectCls} options={['Airline Website', 'Vendor Website','Other']} hideDefaultManual />
                                                                        </div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">PNR Number</label><input type="text" value={flight.pnr} onChange={(e) => handleArrayChange('flights', index, 'pnr', e.target.value)} className={inputCls} /></div>
                                                                        
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-400 mb-1">Flight Route</label>
                                                                            <div className="flex items-center gap-2">
                                                                                <input type="text" value={flight.boardingPoint} onChange={(e) => handleArrayChange('flights', index, 'boardingPoint', e.target.value)} className={inputCls} placeholder="From" />
                                                                                <span className="text-slate-500">→</span>
                                                                                <input type="text" value={flight.deboardingPoint} onChange={(e) => handleArrayChange('flights', index, 'deboardingPoint', e.target.value)} className={inputCls} placeholder="To" />
                                                                            </div>
                                                                        </div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Departure Date & Time</label><DatePickerField type="datetime-local" value={flight.departureDateTime} onChange={(e) => handleArrayChange('flights', index, 'departureDateTime', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Arrival Date & Time</label><DatePickerField type="datetime-local" value={flight.arrivalDateTime} onChange={(e) => handleArrayChange('flights', index, 'arrivalDateTime', e.target.value)} className={inputCls} /></div>

                                                                        <div>
                                                                            {renderFileUploader('Upload Ticket Copy', 'flights', index, 'attachedFiles')}
                                                                        </div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Flight Cost</label><input type="text" value={flight.flightCost} onChange={(e) => handleArrayChange('flights', index, 'flightCost', e.target.value)} className={inputCls} /></div>
                                                                        <div className="flex items-center gap-2 mt-6">
                                                                            <input type="checkbox" checked={flight.ticketShared === 'Yes'} onChange={(e) => handleArrayChange('flights', index, 'ticketShared', e.target.checked ? 'Yes' : 'No')} className="w-4 h-4 accent-cyan-500" />
                                                                            <label className="text-xs font-medium text-slate-300">Ticket Shared With Client</label>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('flights', { flightResponsibility: '', bookingStatus: '', bookingDate: '', flightType: '', bookedThrough: '', pnr: '', boardingPoint: '', deboardingPoint: '', departureDateTime: '', arrivalDateTime: '', attachedFiles: [], flightCost: '', ticketShared: 'No' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md cursor-pointer"><Plus size={14} /> Add Flight</button>
                                                </div>
                                            </div>

                                            {/* 4. VISA DETAILS */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>VISA Details</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.visas?.map((visa, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">VISA {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('visas', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Destination</label><input type="text" value={visa.destination || selectedLeadForEdit.confirmedDestination || selectedLeadForEdit.destination || ''} onChange={(e) => handleArrayChange('visas', index, 'destination', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">VISA Type</label>
                                                                    <CustomSelect hideDefaultManual={true} value={visa.visaType} onChange={v => handleArrayChange('visas', index, 'visaType', v)} className={selectCls} options={['VISA-Free', 'VISA-On-Arrival', 'Traditional', 'e-VISA']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Applied By</label>
                                                                    <CustomSelect hideDefaultManual={true} value={visa.appliedBy} onChange={v => handleArrayChange('visas', index, 'appliedBy', v)} className={selectCls} options={['In-House', 'Client', 'VISA Partner']} />
                                                                </div>

                                                                {visa.visaType !== 'VISA-Free' && (
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Application Status</label>
                                                                        <CustomSelect hideDefaultManual={true} value={visa.applicationStatus} onChange={v => handleArrayChange('visas', index, 'applicationStatus', v)} className={selectCls} options={['Not Started', 'Documents Pending', 'Applied', 'Under Process','Approved','Rejected','Cancelled']} />
                                                                    </div>
                                                                )}
                                                                {visa.visaType !== 'VISA-Free' && (
                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Application Date</label><DatePickerField type="date" value={visa.applicationDate} onChange={(e) => handleArrayChange('visas', index, 'applicationDate', e.target.value)} className={inputCls} /></div>
                                                                )}
                                                                {visa.visaType === 'Traditional' && (
                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Appointment Date</label><DatePickerField type="date" value={visa.appointmentDate} onChange={(e) => handleArrayChange('visas', index, 'appointmentDate', e.target.value)} className={inputCls} /></div>
                                                                )}

                                                                {visa.visaType !== 'VISA-Free' && (
                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Issue Date</label><DatePickerField type="date" value={visa.visaApprovalDate} onChange={(e) => handleArrayChange('visas', index, 'visaApprovalDate', e.target.value)} className={inputCls} /></div>
                                                                )}
                                                                {visa.visaType !== 'VISA-Free' && (
                                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">VISA Expiry Date</label><DatePickerField type="date" value={visa.visaExpiryDate} onChange={(e) => handleArrayChange('visas', index, 'visaExpiryDate', e.target.value)} className={inputCls} /></div>
                                                                )}
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Remarks</label>
                                                                    <input type="text" value={visa.remarks || ''} onChange={(e) => handleArrayChange('visas', index, 'remarks', e.target.value)} className={inputCls} />
                                                                    <VoiceRecorderBlock recordings={visa.voiceNotes} onUpdate={(recs) => handleArrayChange('visas', index, 'voiceNotes', recs)} />
                                                                </div>

                                                                {/* Arrival Card */}
                                                                <div className="sm:col-span-3 border-t border-slate-700/50 mt-2 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Card Required</label>
                                                                        <CustomSelect hideDefaultManual={true} value={visa.arrivalCardApplicable} onChange={v => handleArrayChange('visas', index, 'arrivalCardApplicable', v)} className={selectCls} options={['Yes', 'No']} />
                                                                    </div>
                                                                    {visa.arrivalCardApplicable === 'Yes' && (
                                                                        <>
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Card Status</label>
                                                                                <CustomSelect hideDefaultManual={true} value={visa.arrivalCardStatus} onChange={v => handleArrayChange('visas', index, 'arrivalCardStatus', v)} className={selectCls} options={['Pending', 'Completed']} />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Completed By</label>
                                                                                <CustomSelect hideDefaultManual={true} value={visa.arrivalCardCompletedBy} onChange={v => handleArrayChange('visas', index, 'arrivalCardCompletedBy', v)} className={selectCls} options={['Client', 'Vendor', 'Team']} />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {/* Transit VISA */}
                                                                <div className="sm:col-span-3 border-t border-slate-700/50 mt-2 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Transit VISA Required</label>
                                                                        <CustomSelect hideDefaultManual={true} value={visa.transitVisaReq} onChange={v => handleArrayChange('visas', index, 'transitVisaReq', v)} className={selectCls} options={['Yes', 'No']} />
                                                                    </div>
                                                                    {visa.transitVisaReq === 'Yes' && (
                                                                        <>
                                                                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Transit Country</label><input type="text" value={visa.transitCountry} onChange={(e) => handleArrayChange('visas', index, 'transitCountry', e.target.value)} className={inputCls} /></div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Transit VISA Status</label>
                                                                                <CustomSelect hideDefaultManual={true} value={visa.transitVisaStatus} onChange={v => handleArrayChange('visas', index, 'transitVisaStatus', v)} className={selectCls} options={['Pending', 'Approved']} />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('visas', { destination: '', visaType: '', appliedBy: '', applicationStatus: '', applicationDate: '', appointmentDate: '', visaApprovalDate: '', visaExpiryDate: '', remarks: '', arrivalCardApplicable: 'No', transitVisaReq: 'No', voiceNotes: [] })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md cursor-pointer"><Plus size={14} /> Add Another VISA</button>
                                                </div>
                                            </div>

                                            {/* 5. TRAVEL INSURANCE */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Travel Insurance</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Insurance Taken</label>
                                                        <CustomSelect hideDefaultManual={true} value={selectedLeadForEdit.insRequired} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insRequired: v })} className={selectCls} options={['Yes', 'No']} />
                                                    </div>
                                                    {selectedLeadForEdit.insRequired === 'Yes' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Insurance Status</label>
                                                                <CustomSelect hideDefaultManual={true} value={selectedLeadForEdit.insStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insStatus: v })} className={selectCls} options={['Pending', 'Issued']} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Taken By</label>
                                                                <CustomSelect hideDefaultManual={true} value={selectedLeadForEdit.insTakenBy || ''} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insTakenBy: v })} className={selectCls} options={['Client', 'Agency']} />
                                                            </div>
                                                            <div className="sm:col-span-3">
                                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Upload Policy Document</label>
                                                                <div className="relative flex items-center justify-center bg-slate-900 border border-slate-700 border-dashed rounded px-3 py-2 cursor-pointer hover:border-cyan-500 transition-colors w-full sm:w-1/3">
                                                                    <span className="text-cyan-400 text-xs font-medium flex items-center gap-2">
                                                                        <Plus size={14} /> Attach Policy File
                                                                    </span>
                                                                    <input type="file" onChange={e => {
                                                                        const file = e.target.files[0];
                                                                        if(!file) return;
                                                                        const r = new FileReader();
                                                                        r.readAsDataURL(file);
                                                                        r.onloadend = () => setSelectedLeadForEdit({...selectedLeadForEdit, insPolicyNo: r.result});
                                                                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                                </div>
                                                                {selectedLeadForEdit.insPolicyNo && selectedLeadForEdit.insPolicyNo.startsWith('data:') && (
                                                                    <div className="mt-2 flex items-center justify-between p-1.5 bg-slate-800/40 rounded border border-slate-700/50 w-full sm:w-1/3">
                                                                        <span className="text-[10px] text-slate-300">Policy Document Attached</span>
                                                                        <div className="flex gap-1">
                                                                            <button type="button" onClick={() => window.open(selectedLeadForEdit.insPolicyNo, '_blank')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-blue-400"><Eye size={12}/></button>
                                                                            <button type="button" onClick={() => setSelectedLeadForEdit({...selectedLeadForEdit, insPolicyNo: ''})} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-red-400"><Trash2 size={12}/></button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 6. DMC DETAILS */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>DMC Details</h3>
                                                <div className="space-y-6">
                                                    {toArr(selectedLeadForEdit.vendorRequests).map((dmc, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <div className="absolute top-2 left-4 text-xs font-bold text-cyan-400">DMC-{index + 1}</div>
                                                            <div className="absolute top-2 right-2 flex items-center gap-2">
                                                                <button type="button" onClick={() => setCustomerPaymentPopupLead(selectedLeadForEdit)}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded cursor-pointer"
                                                                    title="View Customer Payment / Transaction Details">
                                                                    <Eye size={13} /> View
                                                                </button>
                                                                {index > 0 && <button type="button" onClick={() => removeArrayItem('vendorRequests', index)} className="text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">DMC Name</label><CustomSelect value={dmc.vendorDmcName} onChange={v => handleArrayChange('vendorRequests', index, 'vendorDmcName', v)} className={selectCls} options={finalDmcOptions} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label><CustomSelect value={dmc.vendorContactPerson} onChange={v => handleArrayChange('vendorRequests', index, 'vendorContactPerson', v)} className={selectCls} options={getContactsForDMC(dmc.vendorDmcName)} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" value={dmc.vendorContactMobile || ''} onChange={e => handleArrayChange('vendorRequests', index, 'vendorContactMobile', e.target.value)} className={inputCls} /></div>
                                                                
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Purchase Cost</label><input type="text" value={dmc.serviceCost || ''} onChange={e => handleArrayChange('vendorRequests', index, 'serviceCost', e.target.value)} className={inputCls} /></div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label>
                                                                    <CustomSelect value={dmc.bookingStatus || ''} onChange={v => handleArrayChange('vendorRequests', index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Confirmed', 'Cancelled']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmation Date</label><DatePickerField type="date" value={dmc.confirmationDate || ''} onChange={e => handleArrayChange('vendorRequests', index, 'confirmationDate', e.target.value)} className={inputCls} /></div>

                                                                {/* Service Confirmed Checkboxes */}
                                                                <div className="sm:col-span-3 mt-2 border-t border-slate-700/30 pt-3">
                                                                    <label className="block text-xs font-medium text-slate-300 mb-2">Services Included</label>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                        {['Tour Package', 'Hotel', 'Airport Transfer', 'Local Transfer', 'Sightseeing', 'Activities', 'Refreshment Room', 'All', 'Others'].map(service => {
                                                                            const servicesArr = dmc.servicesConfirmed ? dmc.servicesConfirmed.split(', ') : [];
                                                                            const isChecked = servicesArr.includes(service);
                                                                            const allServiceNames = ['Tour Package', 'Hotel', 'Airport Transfer', 'Local Transfer', 'Sightseeing', 'Activities', 'Refreshment Room' ];
                                                                            return (
                                                                                <label key={service} className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                                                                                    <input type="checkbox" checked={isChecked} onChange={(e) => {
                                                                                        let newArr = [...servicesArr];
                                                                                        if (service === 'All') {
                                                                                            newArr = e.target.checked ? ['All', ...allServiceNames] : [];
                                                                                        } else {
                                                                                            if (e.target.checked) newArr.push(service);
                                                                                            else newArr = newArr.filter(s => s !== service);
                                                                                            if (!e.target.checked) newArr = newArr.filter(s => s !== 'All');
                                                                                            else if (allServiceNames.every(s => newArr.includes(s))) newArr.push('All');
                                                                                        }
                                                                                        handleArrayChange('vendorRequests', index, 'servicesConfirmed', [...new Set(newArr)].join(', '));
                                                                                    }} className="w-4 h-4 accent-cyan-500" /> {service}
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {(dmc.servicesConfirmed || '').split(', ').includes('Others') && (
                                                                        <input type="text" value={dmc.servicesOthersText || ''} onChange={e => handleArrayChange('vendorRequests', index, 'servicesOthersText', e.target.value)} className={`${inputCls} mt-2`} placeholder="Specify other service" />
                                                                    )}
                                                                </div>

                                                                <div className="sm:col-span-3 mt-2 border-t border-slate-700/30 pt-3">
                                                                    <label className="block text-xs font-medium text-slate-400 mb-2">Upload Documents</label>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                        {renderFileUploader('Final Itinerary', 'vendorRequests', index, 'finalItineraryFiles')}
                                                                        {renderFileUploader('DMC Confirmation', 'vendorRequests', index, 'dmcConfirmationFiles')}
                                                                        {renderFileUploader('Invoice', 'vendorRequests', index, 'invoiceFiles')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('vendorRequests', { vendorDmcName: '', vendorContactPerson: '', vendorContactMobile: '', vendorService: '', bookingStatus: '', confirmationDate: '', serviceCost: '', remarks: '', servicesConfirmed: '', finalItineraryFiles: [], dmcConfirmationFiles: [], invoiceFiles: [] })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md cursor-pointer"><Plus size={14} /> Add Another Vendor</button>
                                                </div>
                                            </div>

                                            {/* 8. CLIENT SPECIAL REQUIREMENTS */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Client Special Requirements</h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-2 pt-2">
                                                    {[
                                                        { id: 'reqVeg', label: 'Veg Meal' },
                                                        { id: 'reqFloating', label: 'Floating Breakfast' },
                                                        { id: 'reqDecor', label: 'Special Decoration' },
                                                        { id: 'reqHoneymoon', label: 'Honeymoon Perks' },
                                                        { id: 'reqCandlelight', label: 'Candlelight Dinner' },
                                                        { id: 'reqWheelchair', label: 'Wheel Chair Assistance' },
                                                        { id: 'reqManualAdd', label: 'Other Requirements' },
                                                    ].map(chk => (
                                                        <label key={chk.id} className="flex items-center gap-2 cursor-pointer group">
                                                            <input type="checkbox" checked={selectedLeadForEdit[chk.id]} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, [chk.id]: e.target.checked })}
                                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer" />
                                                            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{chk.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {selectedLeadForEdit.reqManualAdd && (
                                                    <input type="text" value={selectedLeadForEdit.reqManualAddText || ''} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, reqManualAddText: e.target.value })} className={`${inputCls} mt-3`} placeholder="Specify other requirement" />
                                                )}
                                            </div>

                                            {/* 9. VENDOR PAYMENT REQUEST */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Vendor Payment Request</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.paymentRequests?.map((req, index) => {
                                                        const matchedVendor = toArr(selectedLeadForEdit.vendorRequests).find(v => v.vendorDmcName === req.providerName);
                                                        return (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">PAYMENT {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('paymentRequests', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Vendor / DMC Name</label>
                                                                    <select value={req.providerName} onChange={(e) => handleArrayChange('paymentRequests', index, 'providerName', e.target.value)} className={selectCls}>
                                                                        <option value="" disabled hidden>Select Vendor</option>
                                                                        {toArr(selectedLeadForEdit.vendorRequests).map((v, i) => (
                                                                            <option key={i} value={v.vendorDmcName || ''}>{v.vendorDmcName || 'DMC Record'}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Service</label>
                                                                    <input type="text" value={req.service ?? (matchedVendor?.servicesConfirmed || '')} onChange={(e) => handleArrayChange('paymentRequests', index, 'service', e.target.value)} className={inputCls} placeholder="e.g. Hotel, Airport Transfer" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label>
                                                                    <input type="text" readOnly value={matchedVendor?.serviceCost || ''} className={readonlyCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Payment Type</label>
                                                                    <CustomSelect value={req.paymentType} onChange={(v) => handleArrayChange('paymentRequests', index, 'paymentType', v)} className={selectCls} options={['Full Payment', 'Advance', 'Balance']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
                                                                    <CustomSelect value={req.currency || ''} onChange={(v) => handleArrayChange('paymentRequests', index, 'currency', v)} className={selectCls} options={['INR', 'USD', 'EUR', 'AED', 'THB']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount To Pay</label><input type="text" value={req.amountToPay} onChange={(e) => handleArrayChange('paymentRequests', index, 'amountToPay', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={req.paymentDueDate} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Details</label><input type="text" value={req.paymentAccountDetails} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentAccountDetails', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    )})}
                                                    <button type="button" onClick={() => addArrayItem('paymentRequests', { service: '', providerName: '', paymentType: '', currency: '', amountToPay: '', paymentDueDate: '', paymentAccountDetails: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer"><Plus size={14} /> Add Payment Request</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                       /* ───────────────────────────────────────────── */
                                       /* STANDARD DOMESTIC CONFIRMED BOOKING VIEW      */
                                       /* ───────────────────────────────────────────── */
                                       <div className="space-y-6">
                                           {/* 1. BOOKING CONFIRMATION SECTION */}
                                           <div className={sectionCls} style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                                               <div className="flex justify-between items-end mb-4 border-b border-sky-900/50 pb-2">
                                                   <h3 className="text-sm font-bold text-sky-400 tracking-wider uppercase m-0">BOOKING CONFIRMATION</h3>
                                               </div>
                                               
                                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Confirmed Method</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.confirmedMethod || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Confirmed Date</label>
                                                       <DatePickerField type="date" readOnly value={selectedLeadForEdit.confirmedDate || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Operations Executive</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.operationExecutive || ''} className={readonlyCls} />
                                                   </div>
                                       
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Destination Type</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.confirmedTripType || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Destination</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.confirmedDestination || selectedLeadForEdit.destination || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Duration</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.confirmedDuration || selectedLeadForEdit.duration || ''} className={readonlyCls} />
                                                   </div>
                                       
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">No. of Pax (Adults | Children)</label>
                                                       <div className="flex gap-2">
                                                           <input type="text" readOnly value={selectedLeadForEdit.noOfAdults || ''} className={readonlyCls} placeholder="Adults" />
                                                           <input type="text" readOnly value={selectedLeadForEdit.confirmedNoOfChildren || ''} className={readonlyCls} placeholder="Children" />
                                                       </div>
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Departure Date</label>
                                                       <DatePickerField type="date" readOnly value={selectedLeadForEdit.departureDate || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Return Date</label>
                                                       <DatePickerField type="date" readOnly value={selectedLeadForEdit.returnDate || ''} className={readonlyCls} />
                                                   </div>
                                       
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Tour Start Date</label>
                                                       <DatePickerField type="date" readOnly value={selectedLeadForEdit.tourStartDate || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Tour End Date</label>
                                                       <DatePickerField type="date" readOnly value={selectedLeadForEdit.tourEndDate || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">Services</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.confirmedServices || selectedLeadForEdit.services || ''} className={readonlyCls} />
                                                   </div>
                                       
                                                   {(() => {
                                                       const servicesArr = (selectedLeadForEdit.confirmedServices || selectedLeadForEdit.services) ? (selectedLeadForEdit.confirmedServices || selectedLeadForEdit.services).split(', ').filter(Boolean) : [];
                                                       return servicesArr.map((srv, idx) => (
                                                           <div key={idx}>
                                                               <label className="block text-xs font-medium text-slate-400 mb-1">{srv} Cost</label>
                                                               <input type="text" readOnly value={(selectedLeadForEdit.serviceCosts && selectedLeadForEdit.serviceCosts[srv]) || selectedLeadForEdit[`service${idx+1}Cost`] || ''} className={readonlyCls} />
                                                           </div>
                                                       ));
                                                   })()}
                                       
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">GST</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.gst || ''} className={readonlyCls} />
                                                   </div>
                                                   <div>
                                                       <label className="block text-xs font-medium text-slate-400 mb-1">TCS</label>
                                                       <input type="text" readOnly value={selectedLeadForEdit.tcs || ''} className={readonlyCls} />
                                                   </div>
                                               </div>
                                           </div>

                                           {/* 2. PASSENGER DETAILS TABLE VIEW */}
                                           <div className={sectionCls}>
                                               <div className="flex justify-between items-end mb-4 border-b border-slate-700/50 pb-2">
                                                   <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase m-0">PASSENGER DETAILS</h3>
                                               </div>
                                               <div className="overflow-x-auto border border-slate-700/50 rounded-lg custom-scrollbar">
                                                   <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                                                       <thead className="bg-slate-800/80 border-b border-slate-700/50">
                                                           <tr>
                                                               <th className="p-2.5 font-bold uppercase tracking-wider">Passenger Name</th>
                                                               <th className="p-2.5 font-bold uppercase tracking-wider">DOB</th>
                                                               <th className="p-2.5 font-bold uppercase tracking-wider">Gender</th>
                                                               <th className="p-2.5 font-bold uppercase tracking-wider">Aadhar Card Number</th>
                                                               <th className="p-2.5 font-bold uppercase tracking-wider">Mobile Number</th>
                                                               <th className="p-2.5 font-bold uppercase tracking-wider">Emergency Contact Number</th>
                                                           </tr>
                                                       </thead>
                                                       <tbody>
                                                           {selectedLeadForEdit.passengers && selectedLeadForEdit.passengers.length > 0 ? (
                                                               selectedLeadForEdit.passengers.map((p, idx) => (
                                                                   <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/40">
                                                                       <td className="p-2.5 font-medium text-white">{p.fullName || '—'}</td>
                                                                       <td className="p-2.5">{p.dob || '—'}</td>
                                                                       <td className="p-2.5">{p.gender || '—'}</td>
                                                                       <td className="p-2.5 font-mono">{p.aadharNumber || '—'}</td>
                                                                       <td className="p-2.5">{p.mobileNumber || '—'}</td>
                                                                       <td className="p-2.5">{p.emergencyContact || '—'}</td>
                                                                   </tr>
                                                               ))
                                                           ) : (
                                                               <tr><td colSpan="6" className="p-4 text-center text-slate-500 italic">No dynamic passenger records extracted.</td></tr>
                                                           )}
                                                       </tbody>
                                                   </table>
                                               </div>
                                           </div>

                                           {/* 3. DOCUMENT COLLECTION VERIFICATION */}
                                           <div className={sectionCls}>
                                               <div className="flex justify-between items-end mb-4 border-b border-slate-700/50 pb-2">
                                                   <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase m-0">Document Collection</h3>
                                               </div>
                                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                   <div className="space-y-4">
                                                       <div className="flex items-start gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                                                           <input type="checkbox" checked={selectedLeadForEdit.docAadhar === 'Received'} readOnly className="w-5 h-5 mt-0.5 accent-emerald-500 border-slate-700 cursor-not-allowed bg-slate-950 shrink-0" />
                                                           <div className="flex flex-col gap-1">
                                                               <span className="text-sm font-medium text-slate-200">Aadhar Copy Received</span>
                                                           </div>
                                                       </div>
                                                       <div className="grid grid-cols-2 gap-3">
                                                           <div>
                                                               <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Remarks</label>
                                                               <input type="text" readOnly value={selectedLeadForEdit.docRemarks || ''} className={readonlyCls} />
                                                           </div>
                                                           <div>
                                                               <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">View documents</label>
                                                               <input type="text" readOnly value={selectedLeadForEdit.docDriveLink || ''} className={readonlyCls} />
                                                           </div>
                                                       </div>
                                                   </div>

                                                   <div className="flex items-start gap-3 bg-slate-900/40 p-4 rounded-lg border border-slate-800 h-fit">
                                                       <span className="text-sm font-medium text-slate-200 flex-1">Photographs</span>
                                                       <input type="checkbox" checked={selectedLeadForEdit.docPhoto === 'Received'} readOnly className="w-5 h-5 accent-emerald-500 border-slate-700 cursor-not-allowed bg-slate-950" />
                                                   </div>
                                               </div>
                                           </div>

                                           {/* 4. DYNAMIC TRANSPORT PIPELINE */}
                                           <div className={sectionCls}>
                                               <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase mb-4 pb-2 border-b border-slate-800">TRANSPORT DETAILS</h3>
                                               <div className="space-y-6">
                                                   {selectedLeadForEdit.domTransports?.map((trans, index) => (
                                                       <div key={index} className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 relative space-y-4 shadow-inner">
                                                           {index > 0 && (
                                                               <button type="button" onClick={() => removeArrayItem('domTransports', index)} className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer">
                                                                   <Trash2 size={16} />
                                                               </button>
                                                           )}
                                                           
                                                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                               <div>
                                                                   <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Transport Type</label>
                                                                   <CustomSelect value={trans.transportType} onChange={(v) => updateDomTransport(index, 'transportType', v)} className={selectCls} options={['Flight', 'Train', 'Bus']} hideDefaultManual />
                                                               </div>
                                                               <div>
                                                                   <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Booking Handled By</label>
                                                                   <CustomSelect value={trans.bookedBy || 'In-House'} onChange={(v) => updateDomTransport(index, 'bookedBy', v)} className={selectCls} options={['In-House', 'Client']} hideDefaultManual />
                                                               </div>
                                                               <div>
                                                                   <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Booking Status</label>
                                                                   <CustomSelect value={trans.bookingStatus} onChange={(v) => updateDomTransport(index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Confirmed', 'Cancelled','Ticket Issued','Rescheduled','RAC','Waitlisted']} hideDefaultManual />
                                                               </div>
                                                           </div>

                                                           {/* ─── CONDITIONAL RENDER: FLIGHT PATH ─── */}
                                                           {trans.transportType === 'Flight' && (
                                                               <div className="border-t border-slate-800/80 pt-4 mt-2 animate-in fade-in slide-in-from-top-2">
                                                                   <div className="flex justify-between items-center mb-3">
                                                                   </div>
                                                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Flight Type</label>
                                                                           <CustomSelect value={trans.flightType} onChange={(v) => updateDomTransport(index, 'flightType', v)} className={selectCls} options={['One Way', 'Round Trip']} hideDefaultManual />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">PNR No.</label>
                                                                           <input type="text" value={trans.pnr || ''} onChange={(e) => updateDomTransport(index, 'pnr', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Booking Date</label>
                                                                           <DatePickerField type="date" value={trans.bookingDate || ''} onChange={(e) => updateDomTransport(index, 'bookingDate', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Flight Route</label>
                                                                           <div className="flex items-center gap-2">
                                                                               <input type="text" value={trans.boardingPoint || ''} onChange={(e) => updateDomTransport(index, 'boardingPoint', e.target.value)} className={inputCls} placeholder="From" />
                                                                               <span className="text-slate-500 text-xs font-bold">→</span>
                                                                               <input type="text" value={trans.deboardingPoint || ''} onChange={(e) => updateDomTransport(index, 'deboardingPoint', e.target.value)} className={inputCls} placeholder="To" />
                                                                           </div>
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Departure Date & Time</label>
                                                                           <DatePickerField type="datetime-local" value={trans.departureDateTime || ''} onChange={(e) => updateDomTransport(index, 'departureDateTime', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Date & Time</label>
                                                                           <DatePickerField type="datetime-local" value={trans.arrivalDateTime || ''} onChange={(e) => updateDomTransport(index, 'arrivalDateTime', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           {renderFileUploader('Upload Ticket Copy', 'domTransports', index, 'attachedFiles')}
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Flight Cost</label>
                                                                           <input type="text" value={trans.flightCost || ''} onChange={(e) => updateDomTransport(index, 'flightCost', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div className="flex items-center gap-2.5 pt-5">
                                                                           <input type="checkbox" checked={trans.ticketSharedToClient === 'Yes'} onChange={(e) => updateDomTransport(index, 'ticketSharedToClient', e.target.checked ? 'Yes' : 'No')} className="w-4 h-4 accent-cyan-500" />
                                                                           <label className="text-xs font-medium text-slate-300">Ticket Shared With Client</label>
                                                                       </div>
                                                                   </div>
                                                                   
                                                               </div>
                                                           )}

                                                           {/* ─── CONDITIONAL RENDER: TRAIN PATH ─── */}
                                                           {trans.transportType === 'Train' && (
                                                               <div className="border-t border-slate-700/60 pt-4 mt-2 animate-in fade-in slide-in-from-top-2">
                                                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Train Name</label>
                                                                           <input type="text" value={trans.trainName || ''} onChange={(e) => updateDomTransport(index, 'trainName', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">PNR No.</label>
                                                                           <input type="text" value={trans.pnr || ''} onChange={(e) => updateDomTransport(index, 'pnr', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Booking Date</label>
                                                                           <DatePickerField type="date" value={trans.bookingDate || ''} onChange={(e) => updateDomTransport(index, 'bookingDate', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Train Route</label>
                                                                           <div className="flex items-center gap-2">
                                                                               <input type="text" value={trans.boardingPoint || ''} onChange={(e) => updateDomTransport(index, 'boardingPoint', e.target.value)} className={inputCls} placeholder="From" />
                                                                               <span className="text-slate-500 text-xs font-bold">→</span>
                                                                               <input type="text" value={trans.deboardingPoint || ''} onChange={(e) => updateDomTransport(index, 'deboardingPoint', e.target.value)} className={inputCls} placeholder="To" />
                                                                           </div>
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Train Class</label>
                                                                           <CustomSelect value={trans.trainClass} onChange={(v) => updateDomTransport(index, 'trainClass', v)} className={selectCls} options={['First AC (1A)', 'AC 2-Tier (2A)', 'AC 3-Tier (3A)', 'AC 3-Tier Economy (3E)', 'AC Chair Car (CC)', 'Executive Chair Car (EC)','Non-AC SL']} hideDefaultManual />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Seat / Berth Details</label>
                                                                           <input type="text" value={trans.seatDetails || ''} onChange={(e) => updateDomTransport(index, 'seatDetails', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Departure Date & Time</label>
                                                                           <DatePickerField type="datetime-local" value={trans.departureDateTime || ''} onChange={(e) => updateDomTransport(index, 'departureDateTime', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Date & Time</label>
                                                                           <DatePickerField type="datetime-local" value={trans.arrivalDateTime || ''} onChange={(e) => updateDomTransport(index, 'arrivalDateTime', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Train Cost</label>
                                                                           <input type="text" value={trans.trainCost || ''} onChange={(e) => updateDomTransport(index, 'trainCost', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           {renderFileUploader('Upload Ticket Copy', 'domTransports', index, 'attachedFiles')}
                                                                       </div>
                                                                       <div className="flex items-center gap-2.5 pt-5 sm:col-span-2">
                                                                           <input type="checkbox" checked={trans.ticketSharedToClient === 'Yes'} onChange={(e) => updateDomTransport(index, 'ticketSharedToClient', e.target.checked ? 'Yes' : 'No')} className="w-4 h-4 accent-cyan-500" />
                                                                           <label className="text-xs font-medium text-slate-300">Ticket Shared With Client</label>
                                                                       </div>
                                                                   </div>
                                                               </div>
                                                           )}

                                                           {/* ─── CONDITIONAL RENDER: BUS PATH ─── */}
                                                           {trans.transportType === 'Bus' && (
                                                               <div className="border-t border-slate-700/60 pt-4 mt-2 animate-in fade-in slide-in-from-top-2">
                                                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Bus Operator</label>
                                                                           <input type="text" value={trans.busOperator || ''} onChange={(e) => updateDomTransport(index, 'busOperator', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Bus Type</label>
                                                                           <CustomSelect value={trans.busType} onChange={(v) => updateDomTransport(index, 'busType', v)} className={selectCls} options={['AC Sleeper', 'Non-AC Sleeper', 'AC Seater', 'Non-AC Seater', 'Volvo','Semi Sleeper']} hideDefaultManual />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Booking Date</label>
                                                                           <DatePickerField type="date" value={trans.bookingDate || ''} onChange={(e) => updateDomTransport(index, 'bookingDate', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Reference Number</label>
                                                                           <input type="text" value={trans.referenceNumber || ''} onChange={(e) => updateDomTransport(index, 'referenceNumber', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Bus Route</label>
                                                                           <div className="flex items-center gap-2">
                                                                               <input type="text" value={trans.boardingPoint || ''} onChange={(e) => updateDomTransport(index, 'boardingPoint', e.target.value)} className={inputCls} placeholder="From" />
                                                                               <span className="text-slate-500 text-xs font-bold">→</span>
                                                                               <input type="text" value={trans.deboardingPoint || ''} onChange={(e) => updateDomTransport(index, 'deboardingPoint', e.target.value)} className={inputCls} placeholder="To" />
                                                                           </div>
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Seat Numbers</label>
                                                                           <input type="text" value={trans.seatNumbers || ''} onChange={(e) => updateDomTransport(index, 'seatNumbers', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Boarding Point</label>
                                                                           <input type="text" value={trans.pickupPoint || ''} onChange={(e) => updateDomTransport(index, 'pickupPoint', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Departure Date & Time</label>
                                                                           <DatePickerField type="datetime-local" value={trans.departureDateTime || ''} onChange={(e) => updateDomTransport(index, 'departureDateTime', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Text Area / Notes</label>
                                                                           <input type="text" value={trans.textArea || ''} onChange={(e) => updateDomTransport(index, 'textArea', e.target.value)} className={inputCls} />
                                                                           <VoiceRecorderBlock recordings={trans.voiceNotes} onUpdate={(recs) => updateDomTransport(index, 'voiceNotes', recs)} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Dropping Point</label>
                                                                           <input type="text" value={trans.dropPoint || ''} onChange={(e) => updateDomTransport(index, 'dropPoint', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Date & Time</label>
                                                                           <DatePickerField type="datetime-local" value={trans.arrivalDateTime || ''} onChange={(e) => updateDomTransport(index, 'arrivalDateTime', e.target.value)} className={inputCls} />
                                                                       </div>
                                                                       <div>
                                                                           {renderFileUploader('Upload Ticket Copy', 'domTransports', index, 'attachedFiles')}
                                                                       </div>
                                                                   </div>
                                                               </div>
                                                           )}
                                                       </div>
                                                   ))}
                                                   
                                                   <div className="pt-2">
                                                       <button type="button" onClick={() => addArrayItem('domTransports', { transportType: 'Flight', bookedBy: 'In-House', bookingStatus: 'Pending', flightType: 'One Way', attachedFiles: [], voiceNotes: [] })} className="text-cyan-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:text-cyan-300 transition-colors bg-transparent border-none cursor-pointer">
                                                           <Plus size={16} /> Add Another Transport Details
                                                       </button>
                                                   </div>
                                               </div>
                                           </div>

                                            {/* 5. TRAVEL INSURANCE */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Travel Insurance</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Insurance Taken</label>
                                                        <CustomSelect hideDefaultManual={true} value={selectedLeadForEdit.insRequired} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insRequired: v })} className={selectCls} options={['Yes', 'No' ]} />
                                                    </div>
                                                    {selectedLeadForEdit.insRequired === 'Yes' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Insurance Status</label>
                                                                <CustomSelect hideDefaultManual={true} value={selectedLeadForEdit.insStatus} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insStatus: v })} className={selectCls} options={['Pending', 'Completed']} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Taken By</label>
                                                                <CustomSelect hideDefaultManual={true} value={selectedLeadForEdit.insTakenBy || ''} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, insTakenBy: v })} className={selectCls} options={['Client', 'In House (Vendor Support)']} />
                                                            </div>
                                                            <div className="sm:col-span-3">
                                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Upload Policy Document</label>
                                                                <div className="relative flex items-center justify-center bg-slate-900 border border-slate-700 border-dashed rounded px-3 py-2 cursor-pointer hover:border-cyan-500 transition-colors w-full sm:w-1/3">
                                                                    <span className="text-cyan-400 text-xs font-medium flex items-center gap-2">
                                                                        <Plus size={14} /> Attach Policy File
                                                                    </span>
                                                                    <input type="file" onChange={e => {
                                                                        const file = e.target.files[0];
                                                                        if(!file) return;
                                                                        const r = new FileReader();
                                                                        r.readAsDataURL(file);
                                                                        r.onloadend = () => setSelectedLeadForEdit({...selectedLeadForEdit, insPolicyNo: r.result});
                                                                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                                </div>
                                                                {selectedLeadForEdit.insPolicyNo && selectedLeadForEdit.insPolicyNo.startsWith('data:') && (
                                                                    <div className="mt-2 flex items-center justify-between p-1.5 bg-slate-800/40 rounded border border-slate-700/50 w-full sm:w-1/3">
                                                                        <span className="text-[10px] text-slate-300">Policy Document Attached</span>
                                                                        <div className="flex gap-1">
                                                                            <button type="button" onClick={() => window.open(selectedLeadForEdit.insPolicyNo, '_blank')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-blue-400"><Eye size={12}/></button>
                                                                            <button type="button" onClick={() => setSelectedLeadForEdit({...selectedLeadForEdit, insPolicyNo: ''})} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-red-400"><Trash2 size={12}/></button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 6. VENDOR DETAILS */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Vendor Details</h3>
                                                <div className="space-y-6">
                                                    {toArr(selectedLeadForEdit.vendorRequests).map((dmc, index) => (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <div className="absolute top-2 left-4 text-xs font-bold text-cyan-400">Vendor-{index + 1}</div>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('vendorRequests', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            
                                                            <div className="mb-4 mt-6">
                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Service Type</label>
                                                                <CustomSelect hideDefaultManual={true} value={dmc.vendorService || ''} onChange={v => handleArrayChange('vendorRequests', index, 'vendorService', v)} className={`${selectCls} w-full sm:w-1/3`} options={['Complete Package', 'Hotel Only', 'Vehicle Only']} />
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                {dmc.vendorService === 'Complete Package' && (
                                                                    <>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">DMC Name</label><CustomSelect hideDefaultManual={true} value={dmc.vendorDmcName} onChange={v => handleArrayChange('vendorRequests', index, 'vendorDmcName', v)} className={selectCls} options={finalDmcOptions} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label><CustomSelect hideDefaultManual={true} value={dmc.vendorContactPerson} onChange={v => handleArrayChange('vendorRequests', index, 'vendorContactPerson', v)} className={selectCls} options={getContactsForDMC(dmc.vendorDmcName)} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile Number</label><input type="text" value={dmc.vendorContactMobile || ''} onChange={e => handleArrayChange('vendorRequests', index, 'vendorContactMobile', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label><input type="text" value={dmc.serviceCost || ''} onChange={e => handleArrayChange('vendorRequests', index, 'serviceCost', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label><CustomSelect hideDefaultManual={true} value={dmc.bookingStatus || ''} onChange={v => handleArrayChange('vendorRequests', index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Booking Requested', 'Confirmed','Partially Confirmed','Cancelled']} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmation Date</label><DatePickerField type="date" value={dmc.confirmationDate || ''} onChange={e => handleArrayChange('vendorRequests', index, 'confirmationDate', e.target.value)} className={inputCls} /></div>

                                                                        <div className="sm:col-span-3 mt-2 border-t border-slate-700/30 pt-3">
                                                                            <label className="block text-xs font-medium text-slate-300 mb-2">Services Included</label>
                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                                {['Tour Package', 'Hotel', 'Airport Transfer', 'Local Transfer', 'Sightseeing', 'Activities', 'Refreshment Room', 'All', 'Others'].map(service => {
                                                                                    const servicesArr = dmc.servicesConfirmed ? dmc.servicesConfirmed.split(', ') : [];
                                                                                    const isChecked = servicesArr.includes(service);
                                                                                    const allServiceNames = ['Tour Package', 'Hotel', 'Airport Transfer', 'Local Transfer', 'Sightseeing', 'Activities', 'Refreshment Room', 'Others'];
                                                                                    return (
                                                                                        <label key={service} className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                                                                                            <input type="checkbox" checked={isChecked} onChange={(e) => {
                                                                                                let newArr = [...servicesArr];
                                                                                                if (service === 'All') {
                                                                                                    newArr = e.target.checked ? ['All', ...allServiceNames] : [];
                                                                                                } else {
                                                                                                    if (e.target.checked) newArr.push(service);
                                                                                                    else newArr = newArr.filter(s => s !== service);
                                                                                                    if (!e.target.checked) newArr = newArr.filter(s => s !== 'All');
                                                                                                    else if (allServiceNames.every(s => newArr.includes(s))) newArr.push('All');
                                                                                                }
                                                                                                handleArrayChange('vendorRequests', index, 'servicesConfirmed', [...new Set(newArr)].join(', '));
                                                                                            }} className="w-4 h-4 accent-cyan-500" /> {service}
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            {(dmc.servicesConfirmed || '').split(', ').includes('Others') && (
                                                                                <input type="text" value={dmc.servicesOthersText || ''} onChange={e => handleArrayChange('vendorRequests', index, 'servicesOthersText', e.target.value)} className={`${inputCls} mt-2`} placeholder="Specify other service" />
                                                                            )}
                                                                        </div>
                                                                        <div className="sm:col-span-3 mt-2 border-t border-slate-700/30 pt-3">
                                                                            <label className="block text-xs font-medium text-slate-400 mb-2">Upload Documents</label>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                                {renderFileUploader('Final Itinerary', 'vendorRequests', index, 'finalItineraryFiles')}
                                                                                {renderFileUploader('Invoice', 'vendorRequests', index, 'invoiceFiles')}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {dmc.vendorService === 'Hotel Only' && (
                                                                    <>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Hotel Name</label><input type="text" value={dmc.vendorDmcName || ''} onChange={e => handleArrayChange('vendorRequests', index, 'vendorDmcName', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Location</label><input type="text" value={dmc.hotelLocation || ''} onChange={e => handleArrayChange('vendorRequests', index, 'hotelLocation', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Hotel Category</label><input type="text" value={dmc.hotelCategory || ''} onChange={e => handleArrayChange('vendorRequests', index, 'hotelCategory', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Number</label><input type="text" value={dmc.vendorContactMobile || ''} onChange={e => handleArrayChange('vendorRequests', index, 'vendorContactMobile', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label><CustomSelect hideDefaultManual={true} value={dmc.bookingStatus || ''} onChange={v => handleArrayChange('vendorRequests', index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Booking Requested','Confirmed','Partially Confirmed', 'Cancelled']} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmed / Booked Date</label><DatePickerField type="date" value={dmc.confirmationDate || ''} onChange={e => handleArrayChange('vendorRequests', index, 'confirmationDate', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Additional Requirements</label><CustomSelect hideDefaultManual={true} value={dmc.additionalRequirements || ''} onChange={v => handleArrayChange('vendorRequests', index, 'additionalRequirements', v)} className={selectCls} options={['Early Check-In Required', 'Late Check-out Required', 'Additional Mattress','Add Others']} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Meal Plan</label><CustomSelect hideDefaultManual={true} value={dmc.mealPlan || ''} onChange={v => handleArrayChange('vendorRequests', index, 'mealPlan', v)} className={selectCls} options={['Breakfast Only (CP)', 'Full Board (AP)', 'Breakfast & Dinner (MAP)', 'Room Only (EP)']} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label><input type="text" value={dmc.serviceCost || ''} onChange={e => handleArrayChange('vendorRequests', index, 'serviceCost', e.target.value)} className={inputCls} /></div>
                                                                    </>
                                                                )}

                                                                {dmc.vendorService === 'Vehicle Only' && (
                                                                    <>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Provider Name</label><input type="text" value={dmc.vendorDmcName || ''} onChange={e => handleArrayChange('vendorRequests', index, 'vendorDmcName', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Type</label><CustomSelect hideDefaultManual={true} value={dmc.vendorVehicleType || ''} onChange={v => handleArrayChange('vendorRequests', index, 'vendorVehicleType', v)} className={selectCls} options={['Sedan', 'SUV', 'MUV', 'Tempo Traveller','Mini Bus','Coach Bus','Any']} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label><input type="text" value={dmc.vendorContactPerson || ''} onChange={e => handleArrayChange('vendorRequests', index, 'vendorContactPerson', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Booking Status</label><CustomSelect hideDefaultManual={true} value={dmc.bookingStatus || ''} onChange={v => handleArrayChange('vendorRequests', index, 'bookingStatus', v)} className={selectCls} options={['Pending', 'Booking Requested', 'Confirmed','Partially Confirmed','Cancelled']} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Confirmed / Booked Date</label><DatePickerField type="date" value={dmc.confirmationDate || ''} onChange={e => handleArrayChange('vendorRequests', index, 'confirmationDate', e.target.value)} className={inputCls} /></div>
                                                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label><input type="text" value={dmc.serviceCost || ''} onChange={e => handleArrayChange('vendorRequests', index, 'serviceCost', e.target.value)} className={inputCls} /></div>
                                                                        <div className="sm:col-span-3 mt-2 border-t border-slate-700/30 pt-3">
                                                                            {renderFileUploader('Upload Invoice', 'vendorRequests', index, 'invoiceFiles')}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addArrayItem('vendorRequests', { vendorService: 'Complete Package', vendorDmcName: '', vendorContactPerson: '', vendorContactMobile: '', bookingStatus: '', confirmationDate: '', serviceCost: '', servicesConfirmed: '', finalItineraryFiles: [], invoiceFiles: [] })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md cursor-pointer"><Plus size={14} /> Add Another Vendor</button>
                                                </div>
                                            </div>

                                            {/* 7. CLIENT SPECIAL REQUIREMENTS */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Client Special Requirements</h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-2 pt-2">
                                                    {[
                                                        { id: 'reqVeg', label: 'Veg Meal' },
                                                        { id: 'reqFloating', label: 'Floating Breakfast' },
                                                        { id: 'reqDecor', label: 'Special Decoration' },
                                                        { id: 'reqHoneymoon', label: 'Honeymoon Perks' },
                                                        { id: 'reqCandlelight', label: 'Candlelight Dinner' },
                                                        { id: 'reqWheelchair', label: 'Wheel Chair Assistance' },
                                                        { id: 'reqManualAdd', label: 'Other Requirements' },
                                                    ].map(chk => (
                                                        <label key={chk.id} className="flex items-center gap-2 cursor-pointer group">
                                                            <input type="checkbox" checked={selectedLeadForEdit[chk.id]} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, [chk.id]: e.target.checked })}
                                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer" />
                                                            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{chk.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {selectedLeadForEdit.reqManualAdd && (
                                                    <input type="text" value={selectedLeadForEdit.reqManualAddText || ''} onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, reqManualAddText: e.target.value })} className={`${inputCls} mt-3`} placeholder="Specify other requirement" />
                                                )}
                                            </div>

                                            {/* 8. VENDOR PAYMENT REQUEST */}
                                            <div className={sectionCls}>
                                                <h3 className={sectionHeadCls}>Vendor Payment Request</h3>
                                                <div className="space-y-6">
                                                    {selectedLeadForEdit.paymentRequests?.map((req, index) => {
                                                        const matchedVendor = toArr(selectedLeadForEdit.vendorRequests).find(v => v.vendorDmcName === req.providerName);
                                                        return (
                                                        <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-700/50 relative">
                                                            <span className="absolute -top-2.5 left-3 bg-[#0f172a] px-2 text-xs font-bold text-slate-400 border border-slate-700 rounded">PAYMENT {index + 1}</span>
                                                            {index > 0 && <button type="button" onClick={() => removeArrayItem('paymentRequests', index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-transparent border-none cursor-pointer"><Trash2 size={16} /></button>}
                                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-2">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Service Type</label>
                                                                    <CustomSelect hideDefaultManual={true} value={req.serviceType || ''} onChange={(v) => handleArrayChange('paymentRequests', index, 'serviceType', v)} className={selectCls} options={['Complete Package', 'Hotel Only', 'Vehicle Only']} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Vendor / DMC / Hotel Name</label>
                                                                    <select value={req.providerName} onChange={(e) => handleArrayChange('paymentRequests', index, 'providerName', e.target.value)} className={selectCls}>
                                                                        <option value="" disabled hidden>Select Vendor</option>
                                                                        {toArr(selectedLeadForEdit.vendorRequests).map((v, i) => (
                                                                            <option key={i} value={v.vendorDmcName || ''}>{v.vendorDmcName || 'DMC Record'}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Service Cost</label>
                                                                    <input type="text" readOnly value={matchedVendor?.serviceCost || ''} className={readonlyCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Payment Type</label>
                                                                    <CustomSelect hideDefaultManual={true} value={req.paymentType} onChange={(v) => handleArrayChange('paymentRequests', index, 'paymentType', v)} className={selectCls} options={['Advance', 'Partial Payment', 'Final Payment','Balance Payment']} />
                                                                </div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount To Pay</label><input type="text" value={req.amountToPay} onChange={(e) => handleArrayChange('paymentRequests', index, 'amountToPay', e.target.value)} className={inputCls} /></div>
                                                                <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment Due Date</label><DatePickerField type="date" value={req.paymentDueDate} onChange={(e) => handleArrayChange('paymentRequests', index, 'paymentDueDate', e.target.value)} className={inputCls} /></div>
                                                            </div>
                                                        </div>
                                                    )})}
                                                    <button type="button" onClick={() => addArrayItem('paymentRequests', { serviceType: 'Complete Package', providerName: '', paymentType: '', amountToPay: '', paymentDueDate: '' })} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md transition-colors cursor-pointer"><Plus size={14} /> Add Payment Request</button>
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
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Lead Date</label><input type="text" readOnly value={formatDisplayDate(selectedLeadForEdit.dateAdded || selectedLeadForEdit.createdAt || selectedLeadForEdit.date)} className={readonlyCls} /></div>
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
                                                    <div><label className="block text-xs font-bold text-slate-400 mb-1">Required By</label><input type="text" readOnly value={formatDisplayDate(selectedLeadForEdit.customisationRequests?.[0]?.requiredByDate || selectedLeadForEdit.customisationRequests?.[0]?.turnaroundTime)} className={readonlyCls} /></div>
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
                                                        <CustomSelect hideDefaultManual={true} 
                                                            value={selectedLeadForEdit.destination} 
                                                            onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, destination: v })} 
                                                            className={selectCls} 
                                                            options={destinationOptions} 
                                                            placeholder=" "
                                                            hideDefaultManual={true}
                                                        />
                                                    </div>
                                                
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Work Type</label>
                                                        <CustomSelect value={selectedLeadForEdit.workType} onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, workType: v })} className={selectCls} options={[  'Vendor Assistance', 'Self Preparation','Rate Modification']} hideDefaultManual={true} />
                                                    </div>

                                                    {selectedLeadForEdit.workType === 'Rate Modification' && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Rate Source</label>
                                                            <CustomSelect hideDefaultManual={true} 
                                                                value={selectedLeadForEdit.rateSource || ''} 
                                                                onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, rateSource: v })} 
                                                                className={selectCls} 
                                                                options={['Existing Rate Available', 'Vendor Verification Required' ]} 
                                                                placeholder=" "
                                                                hideDefaultManual={true}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>


                                        {/* Section 4: VENDOR ASSISTANCE */}
                                        {(selectedLeadForEdit.workType === 'Vendor Assistance' || (selectedLeadForEdit.workType === 'Rate Modification' && selectedLeadForEdit.rateSource !== 'Existing Rate Available')) && (
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
                                                        {toArr(selectedLeadForEdit.vendorRequests).map((req, index) => (
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
                                                                        <CustomSelect hideDefaultManual={true} 
                                                                            value={req.vendorService} 
                                                                            onChange={v => {
                                                                                const newReqs = [...selectedLeadForEdit.vendorRequests];
                                                                                newReqs[index].vendorService = v;
                                                                                newReqs[index].vendorMessage = generateVendorMessage(newReqs[index], selectedLeadForEdit);
                                                                                setSelectedLeadForEdit({ ...selectedLeadForEdit, vendorRequests: newReqs });
                                                                            }} 
                                                                            className={selectCls} 
                                                                            options={['Complete Package', 'Land Only', 'VISA', 'Insurance', 'Hotel Only', 'Vehicle Only','Rate Modification', 'Others']} 
                                                                            hideDefaultManual={true}
                                                                            manualTrigger="Others"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">DMC Name</label>
                                                                        <CustomSelect hideDefaultManual={true} 
                                                                            value={req.vendorDmcName} 
                                                                            onChange={v => handleArrayChange('vendorRequests', index, 'vendorDmcName', v)} 
                                                                            className={selectCls} 
                                                                            options={finalDmcOptions} 
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Contact Person</label>
                                                                        <CustomSelect hideDefaultManual={true} 
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
                                                                        <CustomSelect hideDefaultManual={true} 
                                                                            value={req.contactMethod} 
                                                                            onChange={v => handleArrayChange('vendorRequests', index, 'contactMethod', v)} 
                                                                            className={selectCls} 
                                                                            options={['Email ', 'WhatsApp ', ' Call']} 
                                                                        />
                                                                    </div>

                                                                    {req.vendorService === 'VISA' && (
                                                                        <div>
                                                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">VISA Type</label>
                                                                            <CustomSelect hideDefaultManual={true} 
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
                                                                                <CustomSelect hideDefaultManual={true} 
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
                                                                                <CustomSelect hideDefaultManual={true} value={req.vendorVehicleType || ''} onChange={v => {
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
                                                                                <label className="block text-sm font-bold text-slate-200">  <label htmlFor="">Note: Attach the ready-made itinerary before sharing</label><span className="text-orange-100 ml-1"> ({req.vendorService || 'Custom'})</span></label>
                                                                                <button type="button" onClick={() => copyToClipboard(req.vendorMessage)} className="px-4 py-1.5 bg-[#16D3F2]/10 hover:bg-[#16D3F2]/20 text-[#16D3F2] rounded text-xs font-bold transition-colors cursor-pointer border border-[#16D3F2]/30 flex items-center gap-1.5 shadow-sm"><Copy size={14}/> Copy </button>
                                                                            </div>
                                                                            <div className="p-1">
                                                                                <textarea rows="16" value={req.vendorMessage} onChange={e => handleArrayChange('vendorRequests', index, 'vendorMessage', e.target.value)} className="w-full bg-transparent border-none text-slate-300 text-[13px] leading-relaxed p-4 focus:ring-0 outline-none custom-scrollbar resize-y" spellCheck="false" />
                                                                                <div className="px-4 pb-4">
                                                                                    <VoiceRecorderBlock recordings={req.voiceNotes} onUpdate={(recs) => handleArrayChange('vendorRequests', index, 'voiceNotes', recs)} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <div className="sm:col-span-3 mt-4 flex justify-end">
                                                            <button type="button" onClick={() => addArrayItem('vendorRequests', { vendorService: '', vendorDmcName: '', vendorContactPerson: '', contactMethod: '', vendorVisaType: '', vendorMessage: '', voiceNotes: [] })} className="text-xs font-bold text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 rounded-md px-4 py-2 transition-colors flex items-center gap-1.5 cursor-pointer">
                                                                <Plus size={14}/> Add Another Vendor
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}


                                        {/* Section 3.5: OPERATIONS ACKNOWLEDGEMENT */}
                                        <div className={sectionCls}>
                                            <div className="flex justify-between items-center mb-2 border-b border-slate-800/60 pb-3 cursor-pointer hover:bg-slate-800/20 transition-colors"
                                                 onClick={(e) => handleHeaderClick(e, 'operationsAcknowledgement')}>
                                                <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase m-0 flex items-center gap-2">
                                                    OPERATIONS ACKNOWLEDGEMENT
                                                    <ChevronDown size={16} className={`transition-transform duration-200 ${openSections.operationsAcknowledgement ? 'rotate-180' : ''}`} />
                                                </h3>
                                            </div>
                                            
                                            {openSections.operationsAcknowledgement && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 animate-in slide-in-from-top-2 fade-in">
                                                    
                                                    {/* Customisation Status */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Customisation Status</label>
                                                        <CustomSelect hideDefaultManual={true} 
                                                            value={selectedLeadForEdit.opsCustomisationStatus} 
                                                            onChange={v => setSelectedLeadForEdit({ ...selectedLeadForEdit, opsCustomisationStatus: v })} 
                                                            className={selectCls} 
                                                            options={['Requirement Shared with Vendor', 'Awaiting Vendor Response', 'Comparing with other vendors', 'Itinerary Preparation Started','Itinerary Shared with Sales']} 
                                                        />
                                                    </div>

                                                    {/* Expected Completion By */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Expected Completion By</label>
                                                        <div className="flex gap-2">
                                                            <DatePickerField 
                                                                type="date" 
                                                                value={selectedLeadForEdit.opsExpectedCompletionDate} 
                                                                onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, opsExpectedCompletionDate: e.target.value })} 
                                                                className={inputCls} 
                                                            />
                                                            <DatePickerField 
                                                                type="time" 
                                                                value={selectedLeadForEdit.opsExpectedCompletionTime} 
                                                                onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, opsExpectedCompletionTime: e.target.value })} 
                                                                className={inputCls} 
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Update to Sales (Voice or Text) */}
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Update to Sales</label>
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                            <input 
                                                                type="text" 
                                                                value={selectedLeadForEdit.opsUpdateToSalesMessage || ''} 
                                                                onChange={e => setSelectedLeadForEdit({ ...selectedLeadForEdit, opsUpdateToSalesMessage: e.target.value })} 
                                                                placeholder="Type Message or tap Voice Recorder..." 
                                                                className={`${inputCls} max-w-md flex-1`} 
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={handleVoiceRecord}
                                                                    className={`flex items-center justify-center gap-1.5 px-3 py-2 border rounded text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-sm ${
                                                                        isRecording 
                                                                        ? 'bg-red-900/40 text-red-400 border-red-700 animate-pulse ring-2 ring-red-900/50' 
                                                                        : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                                                                    }`}>
                                                                    <Mic size={14} className={isRecording ? 'animate-bounce' : ''} /> 
                                                                    {isRecording ? 'Listening...' : 'Voice'}
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={handleAddNoteToLog}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/50 rounded text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-sm"
                                                                >
                                                                    <Plus size={14} /> Add Note
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Auto-generated Summary Block (Records History) */}
                                                    <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-700/50">
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Previous Notes & Records</h4>
                                                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                                            {safeParseArray(selectedLeadForEdit.updateRecords, null)
                                                                .filter(Boolean)
                                                                .map((rec, idx) => (
                                                                <div key={idx} className="bg-slate-900/80 border border-slate-700/50 p-3.5 rounded-lg text-xs shadow-inner">
                                                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700/50">
                                                                        <span className="font-bold text-cyan-400 flex items-center gap-1.5"><History size={12}/> {rec.author || 'Operations Team'}</span>
                                                                        <span className="text-slate-500 font-mono text-[10px]">{rec.date}</span>
                                                                    </div>
                                                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{rec.message}</p>
                                                                    {rec.status && (
                                                                        <div className="mt-2.5 inline-block px-2.5 py-1 bg-slate-800/80 rounded-md text-[10px] text-slate-400 border border-slate-700/50">
                                                                            Status at time of note: <span className="font-semibold text-slate-300">{rec.status}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            
                                                            {(!selectedLeadForEdit.updateRecords || safeParseArray(selectedLeadForEdit.updateRecords, null).filter(Boolean).length === 0) && (
                                                                <div className="text-slate-500 text-xs text-center py-6 bg-slate-900/30 rounded border border-slate-800 border-dashed">
                                                                    No previous records 
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

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

            {/* ─── COMPLETE & SEND TO SALES MODAL ────────────────────────────────────── */}
            {leadToComplete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4">
                    <div className="bg-[#1e293b] border-0 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Complete & Send to Sales</h3>
                            <button type="button" onClick={handleCloseCompleteModal} className="text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"><X size={18} /></button>
                        </div>
                        <p className="text-slate-400 mb-4 text-xs">LMN{leadToComplete.id} — {leadToComplete.customerName || leadToComplete.profileName || 'N/A'}</p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-300 mb-1">Package Prepared For</label>
                                <input type="text" value={completeForm.packagePreparedFor} onChange={(e) => setCompleteForm(f => ({ ...f, packagePreparedFor: e.target.value }))} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-slate-300 mb-1">Package Cost</label>
                                <input type="text" value={completeForm.packageCost} onChange={(e) => setCompleteForm(f => ({ ...f, packageCost: e.target.value }))} className={inputCls} placeholder="₹" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-slate-300 mb-1">Operation Notes</label>
                                <textarea value={completeForm.operationNotes} onChange={(e) => setCompleteForm(f => ({ ...f, operationNotes: e.target.value }))} className={`${inputCls} min-h-[70px] resize-none`} placeholder="Notes for Sales..." />
                            </div>
                        </div>

                        <div className="flex justify-center gap-2 mt-5">
                            <button type="button" onClick={handleCloseCompleteModal} className="flex-1 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer">Cancel</button>
                            <button type="button" onClick={handleSubmitCompleteModal} className="flex-1 py-2 rounded bg-emerald-500 text-slate-900 font-black text-xs cursor-pointer">Send to Sales</button>
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

            {customerPaymentPopupLead && (
                <CustomerPaymentDetailsModal lead={customerPaymentPopupLead} onClose={() => setCustomerPaymentPopupLead(null)} />
            )}

            {/* LEAD HISTORY MODAL — Lead Journey, matching the mockup exactly (Jobs / My Jobs) */}
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
                                                    {historyLead.finalStatus || historyLead.status || 'Jobs'}
                                                </span>
                                                {historyLead.assignedTo && historyLead.assignedTo !== 'Unassigned' && (
                                                    <span className="text-xs text-slate-400">Handled By: <span className="text-slate-200 font-semibold">{historyLead.assignedTo}</span></span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-slate-100">{historyLead.leadResponse || historyLead.status || 'N/A'}</p>
                                            <div className="text-xs text-slate-400 space-y-0.5">
                                                <p>Lead Created: <span className="text-slate-300">{leadCreated || 'N/A'}</span></p>
                                                <p>Lead Updated: <span className="text-slate-300">{leadUpdated || 'N/A'}</span></p>
                                            </div>
                                        </div>

                                        {/* Lead Journey — grouped by stage; Operations open by default, others as dropdowns */}
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
        </div>
    );  
}