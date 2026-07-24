import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ListTree, Users, Briefcase, FileText as FileTextIcon,
    Search, FileSpreadsheet, AlertCircle, Loader2, X, CheckCircle2,
    Globe, MapPin, Download, FileOutput
} from 'lucide-react';
import TripClosureForm from '../components/TripClosureForm';

const API_BASE_URL = "https://crm-backend-f9n8.onrender.com/api";
// ─── INDIA DESTINATION MATCHER ────────────────────────────────────────────────
const INDIA_KEYWORDS = [
    'india', 'chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi',
    'goa', 'kerala', 'jaipur', 'agra', 'kolkata', 'hyderabad', 'pune', 'ahmedabad',
    'varanasi', 'amritsar', 'shimla', 'manali', 'ooty', 'coorg', 'kodaikanal',
    'andaman', 'lakshadweep', 'pondicherry', 'madurai', 'kochi', 'trivandrum',
    'mysore', 'mysuru', 'coimbatore', 'vijayawada', 'vizag', 'visakhapatnam',
    'udaipur', 'jodhpur', 'pushkar', 'rishikesh', 'haridwar', 'dehradun',
    'darjeeling', 'gangtok', 'sikkim', 'arunachal', 'assam', 'nagaland',
    'leh', 'ladakh', 'kashmir', 'srinagar', 'jammu', 'dharamsala', 'mcleod',
    'gurgaon', 'noida', 'chandigarh', 'ludhiana', 'indore', 'bhopal', 'nagpur',
    'surat', 'baroda', 'vadodara', 'rajasthan', 'maharashtra', 'karnataka',
    'tamilnadu', 'tamil nadu', 'andhra', 'telangana', 'gujarat', 'rajasthan',
    'uttarakhand', 'himachal', 'west bengal', 'odisha', 'bhubaneswar', 'puri',
    'mp', 'madhya pradesh', 'chhattisgarh', 'jharkhand', 'bihar', 'patna',
    'lucknow', 'varanasi', 'allahabad', 'prayagraj', 'kanpur', 'agra', 'mathura'
];

const isIndiaDestination = (destination) => {
    if (!destination) return false;
    const dest = destination.toLowerCase().trim();
    return INDIA_KEYWORDS.some(kw => dest.includes(kw));
};

const Reports = () => {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('Sales Report');
    const [leads, setLeads] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedJobForClosure, setSelectedJobForClosure] = useState(null);
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });

    // --- FILTER STATES ---
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [appliedDateFilter, setAppliedDateFilter] = useState({ from: '', to: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedExecutive, setSelectedExecutive] = useState('');
    const [reportType, setReportType] = useState('');
    const [tripRegionFilter, setTripRegionFilter] = useState('all'); 

    // --- TRIGGER CUSTOM UI NOTIFICATION ---
    const triggerNotification = (type, message) => {
        setNotification({ show: true, type, message });
    };

    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => {
                setNotification(prev => ({ ...prev, show: false }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification.show]);

    // --- FETCH DATA FROM BACKEND ---
    const fetchAllReportData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [leadsRes, jobsRes, employeesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/leads`),
                fetch(`${API_BASE_URL}/jobs`),
                fetch(`${API_BASE_URL}/employees`)
            ]);

            if (!leadsRes.ok || !jobsRes.ok || !employeesRes.ok) {
                throw new Error('Failed to fetch one or more report data sources.');
            }

            const leadsData = await leadsRes.json();
            const jobsData = await jobsRes.json();
            const employeesData = await employeesRes.json();

            setLeads(Array.isArray(leadsData) ? leadsData : []);
            setJobs(Array.isArray(jobsData) ? jobsData : []);
            setEmployees(Array.isArray(employeesData) ? employeesData : []);
        } catch (err) {
            console.error('Error loading reports database data:', err);
            setError(err.message);
            triggerNotification('error', 'Failed to pull live record sets from server.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllReportData();
    }, []);

    // --- RESET ON TAB CHANGE ---
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setCurrentPage(1);
        setSearchQuery('');
        setFromDate('');
        setToDate('');
        setAppliedDateFilter({ from: '', to: '' });
        setSelectedExecutive('');
        setReportType('');
        setTripRegionFilter('all'); 
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        setAppliedDateFilter({ from: fromDate, to: toDate });
        setCurrentPage(1);
        triggerNotification('success', 'Date threshold filters applied successfully.');
    };

    const matchesDateRange = useCallback((dateString) => {
        if (!appliedDateFilter.from && !appliedDateFilter.to) return true;
        if (!dateString) return false;
        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);
        if (appliedDateFilter.from) {
            const from = new Date(appliedDateFilter.from);
            from.setHours(0, 0, 0, 0);
            if (targetDate < from) return false;
        }
        if (appliedDateFilter.to) {
            const to = new Date(appliedDateFilter.to);
            to.setHours(23, 59, 59, 999);
            if (targetDate > to) return false;
        }
        return true;
    }, [appliedDateFilter]);

    // ─── FIELD CATEGORIZATION ENGINE ─────────────────────────────────────────
    const safeParse = (val) => {
        if (!val) return null;
        if (typeof val === 'object') return val;
        try { return JSON.parse(val); } catch (e) { return null; }
    };

    const formatHeader = (key) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    const categorizeField = (key) => {
        const salesKeys = ['budget', 'packageType', 'tourType', 'salesStage', 'salesNotes', 'activityType', 'activityOutcome', 'salesOutcomes', 'leadStatusField', 'nextActionRequired', 'nextActionType', 'followupDate', 'customisationType', 'requirements', 'requiredByDate', 'customisationAssignedTo', 'raiseRequest', 'customisationStatus', 'leadTemperature', 'bookingProbability', 'objectionTracking', 'offers', 'assignedTo'];
        const opsKeys = ['opsPreparedBy', 'opsCompletedOn', 'opsRemarks', 'opsVerificationStatus', 'opsSharedWithClient', 'hotelName', 'hotelCategoryDom', 'hotelBookedBy', 'hotelConfirmation', 'hotelStatus', 'hotelVoucherLink', 'domTransportType', 'domTransportBookedBy', 'domTransportStatus', 'domTransportRef', 'domTransportDriveLink', 'locTransVendor', 'locTransVehicle', 'locTransContact', 'locTransDriver', 'locTransVehicleNo', 'locTransStatus', 'visaRequired', 'visaProcessedBy', 'visaStatus', 'visaNumber', 'visaDriveLink', 'insRequired', 'insTakenBy', 'insStatus', 'insProvider', 'insPolicyNo', 'insDriveLink', 'dmcVendor', 'dmcContact', 'dmcWhatsapp', 'dmcCost', 'dmcStatus', 'dmcDeliverables', 'docAadhar', 'docPan', 'docPhoto', 'docPassport', 'docDriveLink'];
        const financeKeys = ['totalPackageCost', 'paymentDueDate', 'transactionId', 'amountReceived', 'paymentMode', 'nextPaymentDate', 'paymentStatus', 'paymentHistoryDetails', 'billingName', 'purchasePrice', 'sellingPrice', 'gstStatus', 'tcsStatus', 'budgetRange', 'discountedPrice'];
        const specialReqKeys = ['reqVeg', 'reqWheelchair', 'reqSenior', 'reqHoneymoon', 'reqCandlelight', 'reqFloating', 'reqDecor', 'reqBirthday', 'reqAnniversary', 'specialRequest'];
        const contactKeys = ['customerName', 'profileName', 'phone', 'mobileNo', 'email', 'destination', 'travelDates', 'travelDate', 'duration', 'pax', 'noOfPax', 'platform', 'leadSource', 'campaign', 'leadMessage', 'messageFromLead', 'notes', 'status', 'jobId', 'createdAt', 'updatedAt', 'dateAdded'];
        
        if (contactKeys.includes(key)) return "Lead & Contact Details";
        if (salesKeys.includes(key)) return "Sales Team Details";
        if (opsKeys.includes(key)) return "Operations Team Details";
        if (financeKeys.includes(key)) return "Financials & Payments";
        if (specialReqKeys.includes(key)) return "Special Requirements";
        return "Additional Data";
    };

    const getGroupedFields = (record) => {
        const groups = {
            "Lead & Contact Details": {},
            "Sales Team Details": {},
            "Operations Team Details": {},
            "Financials & Payments": {},
            "Special Requirements": {},
            "Additional Data": {}
        };
        const ignoreKeys = ['passengers', 'flights', 'intTransports', 'flightChecklist', 'trainChecklist', 'hotelChecklist', 'transportChecklist', 'visaChecklist', 'voiceBinaryFile', 'localVoiceRecordings', 'id', 'rawRecord'];

        Object.entries(record).forEach(([key, val]) => {
            if (ignoreKeys.includes(key) || typeof val === 'object' || val === null || val === '') return;
            const cat = categorizeField(key);
            groups[cat][key] = val;
        });

        Object.keys(groups).forEach(k => {
            if (Object.keys(groups[k]).length === 0) delete groups[k];
        });
        return groups;
    };

    // ─── 1. PDF GENERATOR ENGINE (PRINT TO PDF) ──────────────────────────────
    const generateLeadPDF = (leadRecord) => {
        if (!leadRecord) return;
        const printId = leadRecord.jobId || `LMN${leadRecord.id || 'Export'}`;
        
        const groupedFlatData = getGroupedFields(leadRecord);

        const pass = safeParse(leadRecord.passengers) || [];
        const flts = safeParse(leadRecord.flights) || [];
        const trns = safeParse(leadRecord.intTransports) || [];
        
        const checklists = [
            { title: "Flight Checklist", data: safeParse(leadRecord.flightChecklist) || {} },
            { title: "Train Checklist", data: safeParse(leadRecord.trainChecklist) || {} },
            { title: "Hotel Checklist", data: safeParse(leadRecord.hotelChecklist) || {} },
            { title: "Transport Checklist", data: safeParse(leadRecord.transportChecklist) || {} },
            { title: "Visa & Passport Checklist", data: safeParse(leadRecord.visaChecklist) || {} }
        ];

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dossier - ${printId}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 20px; font-size: 12px; }
                    .header { background-color: #0f172a; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
                    .header p { margin: 5px 0 0 0; color: #94a3b8; font-size: 14px; }
                    .section { margin-bottom: 25px; }
                    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; background-color: #f1f5f9; padding: 8px; border-left: 4px solid #3b82f6; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;}
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: avoid; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 11px;}
                    th { background-color: #e2e8f0; color: #334155; font-weight: 700; }
                    .label { background-color: #f8fafc; font-weight: 600; width: 25%; color: #475569; }
                    .val { width: 25%; color: #0f172a; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>MASTER LEAD DOSSIER</h1>
                    <p>Job ID: ${printId} | Generated On: ${new Date().toLocaleString()}</p>
                </div>
        `;

        const generateTable = (dataObj) => {
            let tHtml = '<table><tbody>';
            const keys = Object.keys(dataObj);
            for (let i = 0; i < keys.length; i += 2) {
                const k1 = keys[i], v1 = dataObj[k1];
                const k2 = keys[i+1], v2 = k2 ? dataObj[k2] : '';
                tHtml += `<tr><td class="label">${formatHeader(k1)}</td><td class="val">${v1}</td>`;
                if (k2) tHtml += `<td class="label">${formatHeader(k2)}</td><td class="val">${v2}</td></tr>`;
                else tHtml += `<td class="label"></td><td class="val"></td></tr>`;
            }
            tHtml += '</tbody></table>';
            return tHtml;
        };

        // 1. Grouped Flat Fields (Lead, Sales, Ops, Finance, Special Reqs)
        Object.entries(groupedFlatData).forEach(([groupName, groupData]) => {
            html += `<div class="section"><div class="section-title">${groupName}</div>`;
            html += generateTable(groupData);
            html += `</div>`;
        });

        // 2. Dynamic Arrays (Passengers, Flights, Transfers)
        if (pass.length > 0) {
            html += `<div class="section"><div class="section-title">Passengers</div><table><thead><tr><th>Name</th><th>DOB</th><th>Gender</th><th>Aadhar</th><th>Passport</th></tr></thead><tbody>`;
            pass.forEach(p => { html += `<tr><td>${p.fullName||''}</td><td>${p.dob||''}</td><td>${p.gender||''}</td><td>${p.aadhar||''}</td><td>${p.passportNumber||''}</td></tr>`; });
            html += `</tbody></table></div>`;
        }
        if (flts.length > 0) {
            html += `<div class="section"><div class="section-title">Flight Schedule</div><table><thead><tr><th>Type</th><th>Sector</th><th>Departure</th><th>Status</th></tr></thead><tbody>`;
            flts.forEach(f => { html += `<tr><td>${f.flightType||''}</td><td>${f.sector||''}</td><td>${f.departureDateTime||''}</td><td>${f.bookingStatus||''}</td></tr>`; });
            html += `</tbody></table></div>`;
        }
        if (trns.length > 0) {
            html += `<div class="section"><div class="section-title">Logistics & Transfers</div><table><thead><tr><th>Transfer Type</th><th>Vehicle</th><th>Driver</th><th>Status</th></tr></thead><tbody>`;
            trns.forEach(t => { html += `<tr><td>${t.transferType||''}</td><td>${t.vehicleType||''}</td><td>${t.driverName||''}</td><td>${t.status||''}</td></tr>`; });
            html += `</tbody></table></div>`;
        }

        // 3. Fulfillment Checklists
        checklists.forEach(chk => {
            if (Object.keys(chk.data).length > 0) {
                html += `<div class="section"><div class="section-title">Fulfillment - ${chk.title}</div>`;
                html += generateTable(chk.data);
                html += `</div>`;
            }
        });

        html += `</body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);

        triggerNotification('success', `PDF Dossier generated for ${printId}.`);
    };

    // ─── 2. CSV GENERATOR ENGINE ─────────────────────────────────────────────
    const downloadLeadCSV = (leadRecord) => {
        if (!leadRecord) return;

        let csvContent = "Information Category,Data Field,Value\n";
        const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const addRow = (category, field, val) => { csvContent += `${escapeCSV(category)},${escapeCSV(field)},${escapeCSV(val)}\n`; };

        // Flat Properties sorted by Category
        const groupedFlatData = getGroupedFields(leadRecord);
        Object.entries(groupedFlatData).forEach(([groupName, groupData]) => {
            Object.entries(groupData).forEach(([key, value]) => {
                addRow(groupName, formatHeader(key), value);
            });
        });

        // Nested Standard Arrays
        const parseArray = (arr, categoryPrefix) => {
            if (Array.isArray(arr)) {
                arr.forEach((item, idx) => {
                    Object.entries(item).forEach(([k, v]) => addRow(`${categoryPrefix} ${idx + 1}`, formatHeader(k), v));
                });
            }
        };
        parseArray(safeParse(leadRecord.passengers), 'Passenger');
        parseArray(safeParse(leadRecord.flights), 'Flight Schedule');
        parseArray(safeParse(leadRecord.intTransports), 'Logistics');

        // Nested Operational Checklists Objects
        const parseChecklist = (obj, category) => {
            if (obj && typeof obj === 'object') {
                Object.entries(obj).forEach(([k, v]) => addRow(category, formatHeader(k), v));
            }
        };
        parseChecklist(safeParse(leadRecord.flightChecklist), 'Fulfillment: Flight Checklist');
        parseChecklist(safeParse(leadRecord.trainChecklist), 'Fulfillment: Train Checklist');
        parseChecklist(safeParse(leadRecord.hotelChecklist), 'Fulfillment: Hotel Checklist');
        parseChecklist(safeParse(leadRecord.transportChecklist), 'Fulfillment: Transport Checklist');
        parseChecklist(safeParse(leadRecord.visaChecklist), 'Fulfillment: Visa Checklist');

        // Download Blob
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const printId = leadRecord.jobId || `LMN${leadRecord.id || 'Export'}`;
        a.download = `Master_Dossier_${printId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        triggerNotification('success', `CSV Spreadsheet generated for ${printId}.`);
    };

    // ─── UNIFY DATA: PULL FULFILLMENT "TRIP CLOSED" LEADS INTO JOBS PIPELINE ───
    const combinedClosedTrips = useMemo(() => {
        const closedLeads = leads
            .filter(l => l?.status === 'Trip Closed')
            .map(lead => ({
                jobId: `LMN${lead.id}`,
                profileName: lead.customerName || 'N/A',
                destination: lead.destination || 'N/A',
                platform: lead.platform || 'Website',
                mobileNo: lead.phone || 'N/A',
                message: lead.leadMessage || lead.notes || 'Handed over from Fulfillment Pipeline',
                sellingPrice: lead.budget || lead.totalPackageCost || 0,
                supplierName: 'Pending Info',
                purchaseCost: 0,
                gstAmount: 0,
                balancePending: 0,
                createdAt: lead.updatedAt || lead.createdAt, 
                rawRecord: lead
            }));

        const closedLeadIds = new Set(closedLeads.map(l => l.jobId));
        const distinctJobs = jobs
            .map(j => ({ ...j, jobId: j.jobId || `LMN${j.id}`, rawRecord: j }))
            .filter(j => !closedLeadIds.has(j.jobId));

        return [...closedLeads, ...distinctJobs];
    }, [leads, jobs]);

    // --- DYNAMIC TAB CONFIGURATION ---
    const tabConfigs = useMemo(() => {
        const dateFilteredLeads = leads.filter(l => matchesDateRange(l?.createdAt));
        const dateFilteredJobs = combinedClosedTrips.filter(j => matchesDateRange(j?.createdAt));

        const execFilteredLeads = dateFilteredLeads.filter(l => {
            if (!l.assignedTo || l.assignedTo === 'Unassigned / New') return false; 
            if (selectedExecutive && l.assignedTo !== selectedExecutive) return false;
            return true;
        });

        const regionFilteredJobs = dateFilteredJobs.filter(job => {
            const isIndia = isIndiaDestination(job.destination);
            if (tripRegionFilter === 'india') return isIndia;
            if (tripRegionFilter === 'international') return !isIndia;
            return true;
        });

        return [
            { id: 'Sales Report', label: 'Sales Report', icon: ListTree, count: dateFilteredLeads.length },
            { id: 'Sales Executive Report', label: 'Sales Executive Report', icon: Users, count: execFilteredLeads.length },
            { id: 'Trip Closure', label: 'Trip Closure', icon: Briefcase, count: regionFilteredJobs.length },
            { id: 'Trip Closure Report', label: 'Trip Closure Report', icon: FileTextIcon, count: dateFilteredJobs.length },
        ];
    }, [leads, combinedClosedTrips, matchesDateRange, selectedExecutive, tripRegionFilter]);

    // ─── TRIP CLOSURE REGION COUNTS ──────────────────────────────────────────
    const tripRegionCounts = useMemo(() => {
        const dateFilteredJobs = combinedClosedTrips.filter(j => matchesDateRange(j?.createdAt));
        const india = dateFilteredJobs.filter(j => isIndiaDestination(j.destination)).length;
        const international = dateFilteredJobs.length - india;
        return { india, international, all: dateFilteredJobs.length };
    }, [combinedClosedTrips, matchesDateRange]);

    // --- DYNAMIC REPORT PROCESSING ENGINE ---
    const processedReportData = useMemo(() => {
        switch (activeTab) {
            case 'Sales Report': {
                const counts = {};
                leads.forEach(lead => {
                    if (lead && matchesDateRange(lead.createdAt)) {
                        const exec = lead.assignedTo || 'Unassigned / New';
                        counts[exec] = (counts[exec] || 0) + 1;
                    }
                });
                return Object.entries(counts).map(([assignedBy, count]) => ({ assignedBy, count }));
            }

            case 'Sales Executive Report': {
                return leads.filter(lead => {
                    if (!lead) return false;
                    const matchesExec = !selectedExecutive || lead.assignedTo === selectedExecutive;
                    return matchesExec && matchesDateRange(lead.createdAt);
                }).map(lead => ({
                    id: `LMN${lead.id}`,
                    campaign: lead.campaign || 'Organic / Direct',
                    client: lead.customerName || 'N/A',
                    platform: lead.platform || 'Website',
                    enterDate: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A',
                    lastUpdate: lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : 'N/A',
                    status: lead.status || 'New',
                    assignedBy: lead.assignedTo || 'Not Assigned',
                    story: lead.leadMessage || lead.notes || 'No notes added',
                    rawRecord: lead
                }));
            }

            case 'Trip Closure': {
                return combinedClosedTrips
                    .map(job => {
                        const isIndia = isIndiaDestination(job.destination);
                        return {
                            id: job.jobId,
                            profileName: job.profileName,
                            destination: job.destination,
                            category: isIndia ? 'National (India)' : 'International',
                            isIndia,
                            platform: job.platform,
                            mobile: job.mobileNo,
                            message: job.message,
                            rawRecord: job.rawRecord || job,
                            createdAt: job.createdAt
                        };
                    })
                    .filter(row => matchesDateRange(row.createdAt))
                    .filter(row => {
                        if (tripRegionFilter === 'india') return row.isIndia;
                        if (tripRegionFilter === 'international') return !row.isIndia;
                        return true; 
                    });
            }

            case 'Trip Closure Report': {
                return combinedClosedTrips
                    .filter(job => matchesDateRange(job.createdAt))
                    .map((job) => ({
                        itr: job.itrNumber || job.jobId,
                        supplier: job.supplierName,
                        selling: job.sellingPrice !== undefined && job.sellingPrice !== null ? `${job.sellingPrice}` : '0',
                        purchase: job.purchaseCost !== undefined && job.purchaseCost !== null ? `${job.purchaseCost}` : '0',
                        gst: job.gstAmount !== undefined && job.gstAmount !== null ? `${job.gstAmount}` : '0',
                        pending: job.balancePending !== undefined && job.balancePending !== null ? `${job.balancePending}` : '0',
                        rawRecord: job.rawRecord || job
                    }));
            }

            default: return [];
        }
    }, [activeTab, leads, combinedClosedTrips, matchesDateRange, selectedExecutive, tripRegionFilter]);

    // --- SEARCH AND FILTER ---
    const filteredData = useMemo(() => {
        if (!searchQuery) return processedReportData;
        const lowerQuery = searchQuery.toLowerCase();
        return processedReportData.filter(item =>
            item && Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerQuery)
            )
        );
    }, [processedReportData, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / entriesPerPage));
    const startIndex = (currentPage - 1) * entriesPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + entriesPerPage);

    const getTableHeaderArray = () => {
        switch (activeTab) {
            case 'Sales Report': return ['Assigned by', 'Number Of Counts'];
            case 'Sales Executive Report': return ['Job Id', 'Campaign Name', 'Client Name', 'Platform', 'Lead Enterdate', 'Lead LastUpdate', 'New Lead Status', 'Assigned by', 'Story', 'Export Options'];
            case 'Trip Closure': return ['Job ID', 'Profile Name', 'Destination', 'Category', 'Platform', 'Mobile No', 'Message From Lead', 'Actions & Exports'];
            case 'Trip Closure Report': return ['LMN', 'Supplier Name', 'Selling', 'Purchase', 'GST Amount', 'Client Pending', 'Export Options'];
            default: return [];
        }
    };

    // --- EXCEL BULK EXPORT ---
    const handleExportExcel = () => {
        if (filteredData.length === 0) {
            triggerNotification('error', 'No dataset lines available to write into spreadsheet format.');
            return;
        }
        const headers = getTableHeaderArray().filter(h => !h.includes('Action') && !h.includes('Export')); 
        const csvRows = [];
        csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
        filteredData.forEach(item => {
            if (!item) return;
            const properties = Object.values(item).filter((_, i) => {
                const keys = Object.keys(item);
                return keys[i] !== 'isIndia' && keys[i] !== 'rawRecord' && keys[i] !== 'createdAt';
            });
            const rowValues = properties.slice(0, headers.length).map(val => {
                const stringValue = String(val ?? '');
                return `"${stringValue.replace(/"/g, '""')}"`;
            });
            csvRows.push(rowValues.join(','));
        });
        const csvContent = csvRows.join('\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.setAttribute('download', `${activeTab.replace(/\s+/g, '_')}_Bulk_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        triggerNotification('success', `Spreadsheet downloaded with ${filteredData.length} records successfully.`);
    };

    return (
        <div className="p-6 min-h-screen bg-[#0f172a] font-sans text-slate-200 relative">

            {/* FLOATING NOTIFICATION BANNER */}
            {notification.show && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 bg-[#0d233e] 
                    ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' :
                        notification.type === 'error' ? 'border-red-500 text-red-400' : 'border-cyan-500 text-cyan-400'}`}
                >
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-[14px] font-medium text-slate-200">{notification.message}</span>
                    <button onClick={() => setNotification(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Reports Panel</h1>
                <p className="text-slate-200 text-base mt-1">Review live performance analytics metrics and logs directly from database streams.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> Error pooling source entries: {error}
                </div>
            )}

            {/* TAB NAVIGATION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {tabConfigs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`relative p-5 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md ${isActive ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-lg ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-800/20 text-slate-300'}`}>
                                    <Icon size={24} strokeWidth={2} />
                                </div>
                                <span className={`text-xl font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                                    {isLoading ? '...' : tab.count}
                                </span>
                            </div>
                            <h3 className={`font-semibold text-base ${isActive ? 'text-white' : 'text-slate-200'}`}>{tab.label}</h3>
                            {isActive && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-slate-700"></div>}
                        </div>
                    );
                })}
            </div>

            {/* MAIN DATA PANEL */}
            <div className="bg-transparent border border-slate-700/30 rounded-xl shadow-sm flex flex-col overflow-hidden">

                {/* Panel Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700/20">
                    <div>
                        <h2 className="text-lg font-bold text-white">View {activeTab}</h2>
                        <p className="text-sm text-slate-400 mt-0.5">Manage and output pipeline reports parameters</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-all border border-emerald-500/20"
                            title="Export Bulk Table Data"
                        >
                            <FileSpreadsheet size={16} /> Export View
                        </button>
                    </div>
                </div>

                {/* ─── TRIP CLOSURE REGION FILTER TABS ─────────────────────── */}
                {activeTab === 'Trip Closure' && (
                    <div className="px-5 pt-5 pb-3 border-b border-slate-700/20">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by Region:</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setTripRegionFilter('all'); setCurrentPage(1); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${tripRegionFilter === 'all' ? 'bg-slate-700 border-slate-500 text-white' : 'bg-transparent border-slate-700/40 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}>
                                    All <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tripRegionFilter === 'all' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{isLoading ? '—' : tripRegionCounts.all}</span>
                                </button>
                                <button onClick={() => { setTripRegionFilter('india'); setCurrentPage(1); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${tripRegionFilter === 'india' ? 'bg-orange-500/20 border-orange-500/60 text-orange-400' : 'bg-transparent border-slate-700/40 text-slate-400 hover:border-orange-500/40 hover:text-orange-400/70'}`}>
                                    <MapPin size={14} /> National (India) <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tripRegionFilter === 'india' ? 'bg-orange-500/30 text-orange-300' : 'bg-slate-800 text-slate-400'}`}>{isLoading ? '—' : tripRegionCounts.india}</span>
                                </button>
                                <button onClick={() => { setTripRegionFilter('international'); setCurrentPage(1); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${tripRegionFilter === 'international' ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400' : 'bg-transparent border-slate-700/40 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400/70'}`}>
                                    <Globe size={14} /> International <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tripRegionFilter === 'international' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>{isLoading ? '—' : tripRegionCounts.international}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FILTERS ROW */}
                {activeTab !== 'Trip Closure' && (
                    <div className="p-5 border-b border-slate-700/20">
                        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4 p-4 bg-slate-800/20 rounded-xl border border-slate-700/20">
                            {activeTab === 'Sales Executive Report' && (
                                <div className="flex flex-col gap-1.5 w-full sm:w-48">
                                    <label className="text-xs font-medium text-slate-400">Executive Name</label>
                                    <select value={selectedExecutive} onChange={e => setSelectedExecutive(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500">
                                        <option value="">--Select--</option>
                                        {employees.map(emp => emp && <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                                    </select>
                                </div>
                            )}
                            {activeTab === 'Trip Closure Report' && (
                                <div className="flex flex-col gap-1.5 w-full sm:w-48">
                                    <label className="text-xs font-medium text-slate-400">Type of Report</label>
                                    <select value={reportType} onChange={e => setReportType(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500">
                                        <option value="">--Select--</option><option value="Daily Ledger">Daily Audit</option><option value="Monthly Overview">Monthly Overview</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5 w-full sm:w-40"><label className="text-xs font-medium text-slate-400">From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500"/></div>
                            <div className="flex flex-col gap-1.5 w-full sm:w-40"><label className="text-xs font-medium text-slate-400">To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500"/></div>
                            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white font-medium px-6 py-2 rounded-lg transition-colors shadow-sm text-sm h-9">Submit</button>
                        </form>
                    </div>
                )}

                {/* ENTRIES & SEARCH CONTROLS */}
                <div className="flex flex-col sm:flex-row justify-between items-center p-5 gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>Show per page : Show</span>
                        <select value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none focus:border-cyan-500 cursor-pointer">
                            <option className="bg-[#0f172a]" value={5}>5</option><option className="bg-[#0f172a]" value={10}>10</option><option className="bg-[#0f172a]" value={25}>25</option>
                        </select>
                        <span>entries</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm text-slate-400 whitespace-nowrap">Search:</span>
                        <div className="relative w-full">
                            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="bg-transparent border border-slate-600 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500 w-full sm:w-48" placeholder="Keyword match query..." />
                            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                    </div>
                </div>

                {/* DATA TABLE */}
                <div className="overflow-x-auto min-h-[250px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="animate-spin text-cyan-500" size={32} />
                            <p className="text-slate-400 text-sm">Parsing backend logs and database records...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-transparent text-xs uppercase font-semibold text-slate-300 border-b border-slate-700/20 tracking-wider">
                                <tr>
                                    {getTableHeaderArray().map((header, idx) => (
                                        <th key={idx} className={`px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 whitespace-nowrap ${header.includes('Export') || header.includes('Action') ? 'text-right' : ''}`}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/20 text-base">
                                {paginatedData.length === 0 ? (
                                    <tr><td colSpan={10} className="px-5 py-8 text-center text-slate-500 text-sm font-medium">No data available in table</td></tr>
                                ) : (
                                    paginatedData.map((row, index) => {
                                        if (!row) return null;
                                        let cells = [];

                                        // Render Export Buttons Reusable Component
                                        const ExportButtons = ({ record }) => (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => generateLeadPDF(record)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors text-xs font-semibold border border-rose-500/20" title="Print to PDF">
                                                    <FileOutput size={13} /> PDF
                                                </button>
                                                <button onClick={() => downloadLeadCSV(record)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors text-xs font-semibold border border-emerald-500/20" title="Download Spreadhseet (CSV)">
                                                    <FileSpreadsheet size={13} /> Sheet
                                                </button>
                                            </div>
                                        );

                                        if (activeTab === 'Sales Report') {
                                            cells = [row.assignedBy || 'Unassigned', row.count ?? 0];
                                        } else if (activeTab === 'Sales Executive Report') {
                                            cells = [
                                                row.id, row.campaign, row.client, row.platform, row.enterDate, row.lastUpdate, row.status, row.assignedBy, row.story,
                                                <ExportButtons key="export" record={row.rawRecord} />
                                            ];
                                        } else if (activeTab === 'Trip Closure') {
                                            cells = [
                                                row.id, row.profileName, row.destination,
                                                <span key="cat" className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${row.isIndia ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'}`}>
                                                    {row.isIndia ? <MapPin size={11} /> : <Globe size={11} />}{row.category}
                                                </span>,
                                                row.platform, row.mobile, row.message,
                                                <div key="actions" className="flex items-center justify-end gap-4">
                                                    <button onClick={() => setSelectedJobForClosure(row.rawRecord)} className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-wider transition-colors">
                                                        Edit / Close
                                                    </button>
                                                    <ExportButtons record={row.rawRecord} />
                                                </div>
                                            ];
                                        } else if (activeTab === 'Trip Closure Report') {
                                            cells = [
                                                row.itr, row.supplier, row.selling, row.purchase, row.gst, row.pending,
                                                <ExportButtons key="export" record={row.rawRecord} />
                                            ];
                                        }

                                        return (
                                            <tr key={index} className="hover:bg-slate-800/30 transition-colors border-b border-slate-700/20 last:border-0">
                                                {cells.map((cell, idx) => (
                                                    <td key={idx} className={`px-5 py-4 text-sm text-slate-300 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis ${idx === cells.length - 1 && (getTableHeaderArray().includes('Export Options') || getTableHeaderArray().includes('Actions & Exports')) ? 'text-right' : ''}`}>
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* PAGINATION FOOTER */}
                {!isLoading && (
                    <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm border-t border-slate-700/20 text-slate-400">
                        <span>Showing {filteredData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredData.length)} of {filteredData.length} entries</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-1.5 border border-slate-700/30 rounded-lg bg-transparent text-slate-300 hover:bg-slate-800/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Previous</button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-1.5 border border-slate-700/30 rounded-lg bg-transparent text-slate-300 hover:bg-slate-800/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* TRIP CLOSURE MODAL */}
            {selectedJobForClosure && (
                <TripClosureForm
                    job={selectedJobForClosure}
                    onClose={() => setSelectedJobForClosure(null)}
                    onRefresh={fetchAllReportData}
                    apiBaseUrl={API_BASE_URL}
                />
            )}
        </div>
    );
};

export default Reports;