import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Eye, Pencil, Trash2, ArrowUpDown, Plus, X, ChevronDown, Settings } from 'lucide-react';

// ─── NETWORK CONFIGURATION ───────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

// ─── STYLING CONFIGURATIONS ───────────────────────────────────────────────────
const STATUS_STYLES = {
    online: { dot: 'bg-emerald-500', glow: 'shadow-emerald-400/60', label: 'Active' },
    offline: { dot: 'bg-slate-400', glow: 'shadow-slate-500/20', label: 'Inactive' },
};

const StatusDot = ({ status }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.offline;
    return <span className={`w-2.5 h-2.5 rounded-full shadow-[0_0_6px_1px] ${s.dot} ${s.glow} flex-shrink-0`} />;
};

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [liveMembers, setLiveMembers] = useState([]); 
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);

    // --- Configuration Panel Toggle State ---
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);

    // --- Dynamic Table Headers State with Local Storage Persistence ---
    const defaultHeaders = [
        { id: 'status', title: 'Status', sortKey: 'status' },
        { id: 'employeeId', title: 'Employee Id', sortKey: 'employeeId' },
        { id: 'name', title: 'Employee Name', sortKey: 'name' },
        { id: 'designation', title: 'Designation', sortKey: 'designation' },
        { id: 'phone', title: 'Phone', sortKey: 'phone' },
        { id: 'email', title: 'Email Id', sortKey: 'email' },
        { id: 'password', title: 'Password', sortKey: 'password' },
        { id: 'dateOfJoining', title: 'Date of Joining', sortKey: 'dateOfJoining' }
    ];

    const [tableHeaders, setTableHeaders] = useState(() => {
        const savedHeaders = localStorage.getItem('crm_employee_columns');
        if (savedHeaders) {
            try {
                return JSON.parse(savedHeaders);
            } catch (e) {
                console.error("Failed to parse headers", e);
                return defaultHeaders;
            }
        }
        return defaultHeaders;
    });

    // Save to local storage whenever headers change
    useEffect(() => {
        localStorage.setItem('crm_employee_columns', JSON.stringify(tableHeaders));
    }, [tableHeaders]);

    // New Header Construction Form State
    const [newHeaderTitle, setNewHeaderTitle] = useState('');

    // --- State for Sorting ---
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // --- State for Add Employee Form ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        employeeId: '', name: '', designation: '', phone: '', email: '', password: '', dateOfJoining: '',
        gender: '', dob: '', bloodGroup: '', maritalStatus: '', emergencyContact: '', address: '', aadhaarNumber: '', panNumber: ''
    });

    // --- State for Edit Employee Form ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    // --- State for View Employee Modal ---
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingEmployee, setViewingEmployee] = useState(null);

    // ─── 1. FETCH DATA & LIVE TELEMETRY ───────────────────────────────────────
    useEffect(() => {
        fetchEmployees();
        fetchLiveStatus();

        const intervalId = setInterval(fetchLiveStatus, 2000);
        return () => clearInterval(intervalId);
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employees`);
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error("Failed to fetch employees:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLiveStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/members`);
            if (response.ok) {
                const data = await response.json();
                setLiveMembers(data);
            }
        } catch (error) {
            console.error("Telemetry context syncing failure:", error);
        }
    };

    // ─── HEADER MANAGEMENT HANDLERS ──────────────────────────────────────────
    const handleHeaderTitleChange = (id, newTitle) => {
        setTableHeaders(prev => prev.map(header => 
            header.id === id ? { ...header, title: newTitle } : header
        ));
    };

    const handleAddNewHeader = (e) => {
        e.preventDefault();
        if (!newHeaderTitle.trim()) return;

        const customId = newHeaderTitle.trim()
            .toLowerCase()
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
            .replace(/\s+/g, "");

        if (tableHeaders.some(h => h.id === customId)) {
            alert("A column field identifier mapping to this name setup already exists.");
            return;
        }

        const updatedHeader = {
            id: customId,
            title: newHeaderTitle.trim(),
            sortKey: customId
        };

        setTableHeaders([...tableHeaders, updatedHeader]);
        setNewEmployee(prev => ({ ...prev, [customId]: '' }));
        setNewHeaderTitle('');
    };

    // Removes the total section label matching that column reference permanently
    const handleRemoveHeader = (id) => {
        setTableHeaders(prev => prev.filter(header => header.id !== id));
        if (sortConfig.key === id) {
            setSortConfig({ key: null, direction: 'asc' });
        }
    };

    // ─── 2. SORTING HANDLER ───────────────────────────────────────────────────
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig({ key: null, direction: 'asc' }); 
            return;
        }
        setSortConfig({ key, direction });
    };

    // ─── 3. ACTION FUNCTIONS ──────────────────────────────────────────────────
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEmployee)
            });

            if (response.ok) {
                await fetchEmployees();
                setIsAddModalOpen(false);
                
                const freshEmployeeObj = {
                    employeeId: '', name: '', designation: '', phone: '', email: '', password: '', dateOfJoining: '',
                    gender: '', dob: '', bloodGroup: '', maritalStatus: '', emergencyContact: '', address: '', aadhaarNumber: '', panNumber: ''
                };
                tableHeaders.forEach(h => {
                    if(!freshEmployeeObj.hasOwnProperty(h.id)) freshEmployeeObj[h.id] = '';
                });
                setNewEmployee(freshEmployeeObj);
            } else {
                alert("Failed to add employee.");
            }
        } catch (error) {
            console.error("Add Error:", error);
        }
    };

    const handleView = (employee) => {
        setViewingEmployee(employee);
        setIsViewModalOpen(true);
    };

    const handleEditClick = (employee) => {
        setEditingEmployee(employee);
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/employees/${editingEmployee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingEmployee)
            });

            if (response.ok) {
                await fetchEmployees();
                setIsEditModalOpen(false);
                setEditingEmployee(null);
            } else {
                alert("Failed to update in database.");
            }
        } catch (error) {
            console.error("Edit Error:", error);
        }
    };

    const handleDelete = async (id, employeeId) => {
        if (window.confirm(`Are you sure you want to delete employee ${employeeId}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== id));
                } else {
                    alert("Failed to delete.");
                }
            } catch (error) {
                console.error("Delete Error:", error);
            }
        }
    };

    const handleExport = () => {
        if (filteredAndSortedEmployees.length === 0) {
            alert("No data to export!");
            return;
        }

        const headers = tableHeaders.map(h => h.title);
        const csvRows = filteredAndSortedEmployees.map(emp =>
            tableHeaders.map(h => {
                if (h.id === 'status') return `"${emp.status === 'online' ? 'Active' : 'Inactive'}"`;
                return `"${emp[h.id] || ''}"`;
            }).join(",")
        );
        const csvContent = [headers.join(","), ...csvRows].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "employee_list.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ─── 4. MERGE LIVE STATUS, FILTER AND SORT PIPELINE ───────────────────────
    const employeesWithLiveStatus = useMemo(() => {
        return employees.map(emp => {
            const liveData = liveMembers.find(m => {
                // Pull the live identifier from either employeeId or standard id
                const liveId = String(m.employeeId || m.id || '').trim().toLowerCase();
                
                // Pull both possible identifiers from the main database record
                const dbEmployeeId = String(emp.employeeId || '').trim().toLowerCase();
                const dbRecordId = String(emp.id || '').trim().toLowerCase();

                // Match if the live ID matches either the database Employee ID (e.g., "105") or the record ID
                return liveId !== '' && (liveId === dbEmployeeId || liveId === dbRecordId);
            });

            return {
                ...emp,
                status: liveData && liveData.status === 'online' ? 'online' : 'offline'
            };
        });
    }, [employees, liveMembers]);

    const filteredAndSortedEmployees = useMemo(() => {
        let result = employeesWithLiveStatus.filter(emp => {
            const searchLower = searchQuery.toLowerCase();
            return tableHeaders.some(h => {
                if (h.id === 'status') return (emp.status === 'online' ? 'active' : 'inactive').includes(searchLower);
                return (emp[h.id] || '').toString().toLowerCase().includes(searchLower);
            });
        });

        if (sortConfig.key !== null) {
            result.sort((a, b) => {
                const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
                const bValue = (b[sortConfig.key] || '').toString().toLowerCase();

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [employeesWithLiveStatus, searchQuery, sortConfig, tableHeaders]);

    // ─── 5. SUB-COMPONENTS ────────────────────────────────────────────────────
    const SortableHeader = ({ title, sortKey }) => {
        const isActive = sortConfig.key === sortKey;

        return (
            <th
                onClick={() => requestSort(sortKey)}
                className={`py-4 px-4 font-semibold text-sm sm:text-base whitespace-nowrap group cursor-pointer transition-colors select-none ${isActive ? 'bg-slate-800/40 text-blue-400' : 'hover:bg-slate-800/30'}`}
            >
                <div className="flex items-center gap-2">
                    {title}
                    <ArrowUpDown size={14} className={`transition-transform duration-150 ${isActive ? 'text-blue-400 ' + (sortConfig.direction === 'desc' ? 'rotate-180' : '') : 'text-slate-400 group-hover:text-slate-200'}`} />
                </div>
            </th>
        );
    };

    return (
        <div className="p-3 sm:p-4 lg:p-6 pt-20 sm:pt-24 lg:pt-24 w-full bg-[#0f172a] min-h-screen font-sans relative text-white">

            {/* DYNAMIC CONFIGURATION PANEL CONTAINER */}
            {isConfigPanelOpen && (
                <div className="bg-[#132033] border border-blue-500/20 rounded-xl p-4 mb-6 flex flex-col gap-4 shadow-lg relative transition-all">
                    <button 
                        onClick={() => setIsConfigPanelOpen(false)} 
                        className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                    
                    <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm sm:text-base whitespace-nowrap">
                        <Settings size={18} />
                        <span>Configuration Panel: Column Headers</span>
                    </div>
                    
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Edit Table Label Headings Directly</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {tableHeaders.map((header) => (
                                <div key={header.id} className="bg-[#0f172a] p-2.5 rounded-lg border border-slate-700/50 flex flex-col gap-1 relative group hover:border-slate-600 transition-all">
                                    <div className="flex justify-between items-center select-none">
                                        <span className="text-[10px] text-slate-500 font-mono">{header.id}</span>
                                        {/* DELETE BUTTON: Removes the total label header section */}
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveHeader(header.id)}
                                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                                            title={`Delete total "${header.title}" section`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <input 
                                            type="text"
                                            value={header.title}
                                            onChange={(e) => handleHeaderTitleChange(header.id, e.target.value)}
                                            className="bg-transparent text-sm font-bold text-white focus:outline-none focus:text-blue-400 w-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleAddNewHeader} className="flex flex-col sm:flex-row gap-2 items-end sm:items-center mt-2 pt-2 border-t border-slate-700/30">
                        <div className="w-full sm:w-auto flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Create New Column Title</label>
                            <input 
                                type="text" 
                                placeholder="e.g., Department, Work Location" 
                                value={newHeaderTitle}
                                onChange={(e) => setNewHeaderTitle(e.target.value)}
                                className="bg-[#0f172a] border border-slate-600/50 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-white w-full sm:w-64"
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 mt-1 sm:mt-4 h-[32px]"
                        >
                            <Plus size={14} /> Add New Column Label
                        </button>
                    </form>
                </div>
            )}

            {/* PAGE HEADER LAYER */}
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Employee List</h1>
                    <p className="text-slate-300 text-sm sm:text-base mt-1">Manage corporate directory listings and metadata</p>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 border px-4 py-2.5 rounded-lg shadow-sm transition-all text-sm sm:text-base font-semibold ${isConfigPanelOpen ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-200'}`}
                    >
                        <Settings size={18} />
                        Configure Columns
                    </button>
                    
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm sm:text-base font-semibold"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        Add Employee
                    </button>
                    
                    <button
                        onClick={handleExport}
                        className="bg-slate-800/50 hover:bg-slate-700 text-slate-100 p-2.5 rounded-lg shadow-sm border border-slate-600/40 transition-colors flex items-center justify-center flex-shrink-0"
                        title="Export to CSV"
                    >
                        <FileSpreadsheet size={20} strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* FILTER AND DATA TABLE OVERVIEW SHEET */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center p-4 gap-4">
                    <div className="flex items-center justify-between md:justify-start gap-2 text-sm sm:text-base text-slate-300 order-2 md:order-1">
                        <span>Show</span>
                        <input
                            type="number"
                            min="1"
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(Number(e.target.value) || 1)}
                            className="w-16 px-2 py-1.5 bg-[#132033] border border-slate-600/50 rounded-lg focus:outline-none focus:border-blue-500 text-center text-slate-100 text-sm sm:text-base transition-all"
                        />
                        <span>entries</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 text-sm sm:text-base text-slate-300 order-1 md:order-2 w-full md:w-auto">
                        <span className="hidden sm:block whitespace-nowrap">Search:</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search directory..."
                            className="w-full md:w-64 px-3.5 py-2.5 sm:py-2 bg-[#132033] border border-slate-600/50 rounded-lg focus:outline-none focus:border-blue-500 text-slate-100 placeholder-slate-500 text-sm sm:text-base transition-all"
                        />
                    </div>
                </div>

                <div className="w-full custom-scrollbar border-t border-slate-700/50 overflow-x-auto">
                    <table className="w-full text-left text-sm sm:text-base border-collapse min-w-[1100px]">
                        <thead className="bg-slate-800/50 border-b border-slate-700/50 text-xs sm:text-sm">
                            <tr>
                                {tableHeaders.map(h => (
                                    <SortableHeader key={h.id} title={h.title} sortKey={h.sortKey} />
                                ))}
                                {tableHeaders.length > 0 && <th className="py-4 px-4 font-semibold text-slate-100 whitespace-nowrap">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={tableHeaders.length + 1} className="py-12 text-center text-slate-400">Loading index database...</td>
                                </tr>
                            ) : filteredAndSortedEmployees.length > 0 ? (
                                filteredAndSortedEmployees.slice(0, entriesPerPage).map((employee) => (
                                    <tr key={employee.id} className="hover:bg-slate-800/40 transition-colors">
                                        {tableHeaders.map((h) => {
                                            if (h.id === 'status') {
                                                return (
                                                    <td key={h.id} className="py-2.5 md:py-3 px-2 md:px-4">
                                                        <div className="flex items-center gap-2">
                                                            <StatusDot status={employee.status} />
                                                            <span className={`text-sm font-semibold ${employee.status === 'online' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                                {employee.status === 'online' ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (h.id === 'name') {
                                                return (
                                                    <td key={h.id} className="py-2.5 md:py-3 px-2 md:px-4 text-white font-bold">
                                                        {employee.name}
                                                    </td>
                                                );
                                            }
                                            if (h.id === 'password') {
                                                return (
                                                    <td key={h.id} className="py-2.5 md:py-3 px-2 md:px-4 text-slate-400 font-mono text-sm">
                                                        {employee.password}
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td key={h.id} className="py-2.5 md:py-3 px-2 md:px-4 text-slate-200">
                                                    {employee[h.id] || '-'}
                                                </td>
                                            );
                                        })}
                                        {tableHeaders.length > 0 && (
                                            <td className="py-3 px-2 md:px-4">
                                                <div className="flex items-center gap-1.5 sm:gap-2">
                                                    <button onClick={() => handleView(employee)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors p-1.5 rounded-lg" title="View"><Eye size={18} /></button>
                                                    <button onClick={() => handleEditClick(employee)} className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors p-1.5 rounded-lg" title="Edit"><Pencil size={18} /></button>
                                                    <button onClick={() => handleDelete(employee.id, employee.employeeId)} className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors p-1.5 rounded-lg" title="Delete"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={tableHeaders.length + 1} className="py-12 text-center text-slate-400">No matching entries isolated.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── VIEW EMPLOYEE MODAL ─── */}
            {isViewModalOpen && viewingEmployee && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-[#1e3a52] rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        
                        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#1e3a52] bg-[#0f172a] z-10 flex-shrink-0">
                            <h2 className="text-lg sm:text-xl font-bold text-white">Full Identity Dossier</h2>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#132033]"><X size={20} /></button>
                        </div>

                        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {tableHeaders.some(h => h.id === 'status') && (
                                <div className="bg-[#132033] p-3.5 rounded-xl border border-[#1e3a52] flex items-center justify-between sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Telemetry System Status</label>
                                    <div className="flex items-center gap-2.5 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-[#1e3a52]">
                                        <StatusDot status={viewingEmployee.status} />
                                        <span className={`text-sm font-bold ${viewingEmployee.status === 'online' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {viewingEmployee.status === 'online' ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {tableHeaders.filter(h => h.id !== 'status').map((h) => (
                                <div key={h.id} className="bg-[#132033] p-3.5 rounded-xl border border-[#1e3a52]">
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{h.title}</label>
                                    <div className={`text-sm text-slate-100 font-medium truncate ${h.id === 'password' ? 'font-mono text-slate-300' : ''}`}>
                                        {viewingEmployee[h.id] || 'Not Configured'}
                                    </div>
                                </div>
                            ))}

                            {[
                                { label: 'Gender', value: viewingEmployee.gender },
                                { label: 'Date of Birth', value: viewingEmployee.dob },
                                { label: 'Blood Group', value: viewingEmployee.bloodGroup },
                                { label: 'Marital Status', value: viewingEmployee.maritalStatus },
                                { label: 'Emergency Contact No', value: viewingEmployee.emergencyContact },
                                { label: 'PAN Identity Reference', value: viewingEmployee.panNumber },
                            ].map((field, idx) => (
                                <div key={idx} className="bg-[#132033] p-3.5 rounded-xl border border-[#1e3a52]">
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{field.label}</label>
                                    <div className="text-sm text-slate-100 font-medium truncate">
                                        {field.value || 'Not Configured'}
                                    </div>
                                </div>
                            ))}

                            <div className="bg-[#132033] p-3.5 rounded-xl border border-[#1e3a52] sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Permanent Residential Address</label>
                                <div className="text-sm text-slate-100 font-medium whitespace-pre-wrap break-words">
                                    {viewingEmployee.address || 'Not Configured'}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5 border-t border-[#1e3a52] bg-[#0f172a] z-10 flex justify-end flex-shrink-0">
                            <button onClick={() => setIsViewModalOpen(false)} className="w-full sm:w-auto px-6 py-2.5 text-white bg-slate-700 hover:bg-slate-600 rounded-lg font-bold transition-colors text-sm">
                                Close File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── ADD EMPLOYEE MODAL ─── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-[#1e3a52] rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        
                        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#1e3a52] bg-[#0f172a] z-10 flex-shrink-0">
                            <h2 className="text-lg sm:text-xl font-bold text-white">Provision New Employee File</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#132033]"><X size={20} /></button>
                        </div>
                        
                        <form id="add-employee-form" onSubmit={handleAddSubmit} className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {tableHeaders.some(h => h.id === 'employeeId') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Employee ID *</label>
                                    <input type="text" required value={newEmployee.employeeId} onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'name') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name *</label>
                                    <input type="text" required value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'designation') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Designation *</label>
                                    <div className="relative">
                                        <select required value={newEmployee.designation || ""} onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm appearance-none cursor-pointer">
                                            <option value="" disabled>Select Designation</option>
                                            {['Admin', 'Sales', 'Operation', 'Marketing', 'Employee'].map((role) => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"><ChevronDown size={16} /></div>
                                    </div>
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'phone') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary Contact Line</label>
                                    <input type="text" value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'email') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                                    <input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'password') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Portal Access Password *</label>
                                    <input type="text" required value={newEmployee.password} onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'dateOfJoining') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Date of Joining</label>
                                    <input type="date" value={newEmployee.dateOfJoining} onChange={(e) => setNewEmployee({ ...newEmployee, dateOfJoining: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm [color-scheme:dark]" />
                                </div>
                            )}

                            {/* Custom Column inputs render section */}
                            {tableHeaders.filter(h => !['status', 'employeeId', 'name', 'designation', 'phone', 'email', 'password', 'dateOfJoining'].includes(h.id)).map((h) => (
                                <div key={h.id}>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">{h.title}</label>
                                    <input 
                                        type="text" 
                                        value={newEmployee[h.id] || ''} 
                                        onChange={(e) => setNewEmployee({ ...newEmployee, [h.id]: e.target.value })} 
                                        className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" 
                                    />
                                </div>
                            ))}

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Gender Identification</label>
                                <div className="relative">
                                    <select value={newEmployee.gender} onChange={(e) => setNewEmployee({ ...newEmployee, gender: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm appearance-none cursor-pointer">
                                        <option value="">Select Gender</option>
                                        {['Male', 'Female', 'Non-Binary', 'Prefer not to disclose'].map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"><ChevronDown size={16} /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Date of Birth</label>
                                <input type="date" value={newEmployee.dob} onChange={(e) => setNewEmployee({ ...newEmployee, dob: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm [color-scheme:dark]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Blood Group Matrix</label>
                                <input type="text" placeholder="e.g., O+, A-" value={newEmployee.bloodGroup} onChange={(e) => setNewEmployee({ ...newEmployee, bloodGroup: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Marital Status</label>
                                <div className="relative">
                                    <select value={newEmployee.maritalStatus} onChange={(e) => setNewEmployee({ ...newEmployee, maritalStatus: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm appearance-none cursor-pointer">
                                        <option value="">Select Status</option>
                                        {['Single', 'Married', 'Separated', 'Widowed'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"><ChevronDown size={16} /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Emergency Contact Number</label>
                                <input type="text" value={newEmployee.emergencyContact} onChange={(e) => setNewEmployee({ ...newEmployee, emergencyContact: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">PAN Account Reference</label>
                                <input type="text" value={newEmployee.panNumber} onChange={(e) => setNewEmployee({ ...newEmployee, panNumber: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Permanent Residential Address</label>
                                <textarea rows="2" value={newEmployee.address} onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-blue-500 text-sm resize-none custom-scrollbar" />
                            </div>
                        </form>

                        <div className="p-4 sm:p-5 border-t border-[#1e3a52] bg-[#0f172a] z-10 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full sm:flex-1 px-4 py-2 text-sm text-slate-300 bg-transparent border border-[#1e3a52] hover:bg-[#132033] rounded-lg font-semibold order-2 sm:order-1">Cancel</button>
                            <button type="submit" form="add-employee-form" className="w-full sm:flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-bold order-1 sm:order-2 shadow-lg">Commit Records</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── EDIT EMPLOYEE MODAL ─── */}
            {isEditModalOpen && editingEmployee && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-[#1e3a52] rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        
                        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#1e3a52] bg-[#0f172a] z-10 flex-shrink-0">
                            <h2 className="text-lg sm:text-xl font-bold text-white">Modify Employee Parameters</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#132033]"><X size={20} /></button>
                        </div>
                        
                        <form id="edit-employee-form" onSubmit={handleEditSubmit} className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {tableHeaders.some(h => h.id === 'employeeId') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Employee ID *</label>
                                    <input type="text" required value={editingEmployee.employeeId} onChange={(e) => setEditingEmployee({ ...editingEmployee, employeeId: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'name') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Name *</label>
                                    <input type="text" required value={editingEmployee.name} onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'designation') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Designation *</label>
                                    <div className="relative">
                                        <select required value={editingEmployee.designation || ""} onChange={(e) => setEditingEmployee({ ...editingEmployee, designation: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm appearance-none cursor-pointer">
                                            <option value="" disabled>Select Designation</option>
                                            {['Admin', 'Sales', 'Operation', 'Marketing', 'Employee'].map((role) => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"><ChevronDown size={16} /></div>
                                    </div>
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'phone') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone</label>
                                    <input type="text" value={editingEmployee.phone || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'email') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Id</label>
                                    <input type="email" value={editingEmployee.email || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'password') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Password *</label>
                                    <input type="text" required value={editingEmployee.password} onChange={(e) => setEditingEmployee({ ...editingEmployee, password: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                                </div>
                            )}
                            {tableHeaders.some(h => h.id === 'dateOfJoining') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Date of Joining</label>
                                    <input type="date" value={editingEmployee.dateOfJoining || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, dateOfJoining: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm [color-scheme:dark]" />
                                </div>
                            )}

                            {/* Custom Column inputs update section */}
                            {tableHeaders.filter(h => !['status', 'employeeId', 'name', 'designation', 'phone', 'email', 'password', 'dateOfJoining'].includes(h.id)).map((h) => (
                                <div key={h.id}>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">{h.title}</label>
                                    <input 
                                        type="text" 
                                        value={editingEmployee[h.id] || ''} 
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, [h.id]: e.target.value })} 
                                        className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" 
                                    />
                                </div>
                            ))}

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Gender Identification</label>
                                <div className="relative">
                                    <select value={editingEmployee.gender || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, gender: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm appearance-none cursor-pointer">
                                        <option value="">Select Gender</option>
                                        {['Male', 'Female', 'Non-Binary', 'Prefer not to disclose'].map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"><ChevronDown size={16} /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Date of Birth</label>
                                <input type="date" value={editingEmployee.dob || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, dob: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm [color-scheme:dark]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Blood Group Matrix</label>
                                <input type="text" value={editingEmployee.bloodGroup || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, bloodGroup: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Marital Status</label>
                                <div className="relative">
                                    <select value={editingEmployee.maritalStatus || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, maritalStatus: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm appearance-none cursor-pointer">
                                        <option value="">Select Status</option>
                                        {['Single', 'Married', 'Separated', 'Widowed'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"><ChevronDown size={16} /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Emergency Contact Number</label>
                                <input type="text" value={editingEmployee.emergencyContact || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, emergencyContact: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">PAN Account Reference</label>
                                <input type="text" value={editingEmployee.panNumber || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, panNumber: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Permanent Residential Address</label>
                                <textarea rows="2" value={editingEmployee.address || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, address: e.target.value })} className="w-full px-3 py-2 bg-[#132033] text-slate-100 border border-[#1e3a52] rounded-lg focus:outline-none focus:border-emerald-500 text-sm resize-none custom-scrollbar" />
                            </div>
                        </form>

                        <div className="p-4 sm:p-5 border-t border-[#1e3a52] bg-[#0f172a] z-10 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full sm:flex-1 px-4 py-2 text-sm text-slate-300 bg-transparent border border-[#1e3a52] hover:bg-[#132033] rounded-lg font-semibold order-2 sm:order-1">Cancel</button>
                            <button type="submit" form="edit-employee-form" className="w-full sm:flex-1 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold order-1 sm:order-2 shadow-lg">Push Modifications</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;