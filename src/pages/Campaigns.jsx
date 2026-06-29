import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Pencil, Save, X, Search, AlertCircle, Check } from 'lucide-react';

const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

const Campaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // Form State
    const [campaignName, setCampaignName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // ─── FETCH CAMPAIGNS ───
    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/campaigns`);
            if (response.ok) {
                const data = await response.json();
                setCampaigns(data);
            } else {
                setCampaigns([]);
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
            setCampaigns([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── ADD CAMPAIGN ───
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!campaignName.trim()) return;

        try {
            const response = await fetch(`${API_BASE_URL}/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: campaignName.trim() })
            });

            if (response.ok) {
                fetchCampaigns();
                showToast("Campaign created successfully!");
            } else {
                showToast("Failed to create. Campaign might already exist.", "error");
            }
            setCampaignName('');
        } catch (error) {
            console.error(error);
            showToast("Network error.", "error");
        }
    };

    // ─── UPDATE CAMPAIGN ───
    const handleUpdate = async (id) => {
        if (!editName.trim()) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName.trim() })
            });

            if (response.ok) {
                fetchCampaigns();
                showToast("Campaign updated!");
            } else {
                showToast("Failed to update campaign.", "error");
            }
            setEditingId(null);
        } catch (error) {
            console.error(error);
        }
    };

    // ─── DELETE CAMPAIGN ───
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;

        try {
            const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchCampaigns();
                showToast("Campaign deleted!", "error");
            } else {
                showToast("Failed to delete campaign.", "error");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredCampaigns = campaigns.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ─── HELPER: FORMAT DATE ───
    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 pt-20 sm:pt-24 min-h-screen bg-[#0f172a] text-slate-200 font-sans relative">
            
            {/* ── TOAST NOTIFICATION ── */}
            {toast.show && (
                <div className={`fixed top-4 right-4 sm:top-8 sm:right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all ${toast.type === 'success' ? 'bg-[#064e3b]/90 border-emerald-500/50 text-emerald-100' : 'bg-[#7f1d1d]/90 border-red-500/50 text-red-100'}`}>
                    {toast.type === 'success' ? <Check size={20} className="text-emerald-400" /> : <AlertCircle size={20} className="text-red-400" />}
                    <p className="text-sm font-medium pr-4">{toast.message}</p>
                    <button onClick={() => setToast({ ...toast, show: false })} className="p-1 rounded-md hover:bg-black/20 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Megaphone className="text-blue-500" size={28} />
                        Campaign Master
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Create and manage marketing campaign identifiers for lead tracking.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                
                {/* ── CREATE CAMPAIGN CARD (Left Column) ── */}
                <div className="lg:col-span-1">
                    <div className="bg-[#132033] border border-slate-700/60 rounded-xl p-5 sm:p-6 shadow-sm sticky top-28">
                        <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700/50 pb-3">Create New Campaign</h2>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    Campaign Name *
                                </label>
                                <input 
                                    type="text" 
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="e.g., Summer Promo 2026"
                                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-white transition-all"
                                    required
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={!campaignName.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg transition-colors mt-2"
                            >
                                <Plus size={18} /> Submit Campaign
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── CAMPAIGNS LIST (Right Column) ── */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                        
                        {/* Table Tool Bar */}
                        <div className="p-4 border-b border-slate-700/50 bg-[#132033] flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-slate-200">Active Campaigns <span className="text-slate-500 font-normal ml-2">({filteredCampaigns.length})</span></h3>
                            <div className="relative w-full sm:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text"
                                    placeholder="Search campaigns..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                                />
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-800/50 border-b border-slate-700/50 text-slate-400">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold w-16">ID</th>
                                        <th className="py-3 px-4 font-semibold">Campaign Name</th>
                                        <th className="py-3 px-4 font-semibold">Created On</th>
                                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="4" className="py-12 text-center text-slate-500">Loading campaigns...</td>
                                        </tr>
                                    ) : filteredCampaigns.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-12 text-center text-slate-500">No campaigns found.</td>
                                        </tr>
                                    ) : (
                                        filteredCampaigns.map((camp, index) => (
                                            <tr key={camp.id} className="hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3 px-4 font-mono text-slate-500">#{index + 1}</td>
                                                <td className="py-3 px-4 font-bold text-white">
                                                    {editingId === camp.id ? (
                                                        <input 
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate(camp.id)}
                                                            className="bg-[#0f172a] border border-blue-500 rounded px-2 py-1 outline-none text-white w-full max-w-xs"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        camp.name
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-400">
                                                    {/* 👇 Formatting applied right here */}
                                                    {formatDate(camp.createdAt)}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {editingId === camp.id ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-white bg-slate-700/50 rounded"><X size={16}/></button>
                                                            <button onClick={() => handleUpdate(camp.id)} className="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/30 rounded"><Save size={16}/></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => { setEditingId(camp.id); setEditName(camp.name); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil size={16}/></button>
                                                            <button onClick={() => handleDelete(camp.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16}/></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Campaigns;