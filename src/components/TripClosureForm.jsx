import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

const TripClosureForm = ({ job, onClose, onRefresh, apiBaseUrl = 'https://crm-backend-2-qlza.onrender.com:5000/api' }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form variables
    const [formData, setFormData] = useState({
        itrNumber: job.itrNumber || job.jobId || '',
        supplierName: job.supplierName || '',
        sellingPrice: job.sellingPrice || '',
        purchaseCost: job.purchaseCost || '',
        gstAmount: job.gstAmount || '',
        balancePending: job.balancePending || ''
    });

    // Sync state if the selected job properties change dynamically
    useEffect(() => {
        if (job) {
            setFormData({
                itrNumber: job.itrNumber || job.jobId || '',
                supplierName: job.supplierName || '',
                sellingPrice: job.sellingPrice || '',
                purchaseCost: job.purchaseCost || '',
                gstAmount: job.gstAmount || '',
                balancePending: job.balancePending || ''
            });
        }
    }, [job]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'supplierName' || name === 'itrNumber' ? value : parseFloat(value) || 0
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Explicitly map operational parameters and drop read-only fields like id, createdAt, and updatedAt
            const payload = {
                jobId: job.jobId,
                profileName: job.profileName,
                customerName: job.customerName,
                destination: job.destination,
                dateOfTravel: job.dateOfTravel,
                duration: job.duration,
                platform: job.platform,
                status: job.status,
                newLeadStatus: job.newLeadStatus,
                message: job.message,

                // Form entry numbers
                itrNumber: formData.itrNumber,
                supplierName: formData.supplierName,
                sellingPrice: Number(formData.sellingPrice) || 0,
                purchaseCost: Number(formData.purchaseCost) || 0,
                gstAmount: Number(formData.gstAmount) || 0,
                balancePending: Number(formData.balancePending) || 0
            };

            const res = await fetch(`${apiBaseUrl}/jobs/${job.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const responseErrorText = await res.text();
                throw new Error(`Server returned error status: ${responseErrorText}`);
            }

            onRefresh();
            onClose();
        } catch (err) {
            console.error("Submission Error Details:", err);
            alert("Could not post updates to database server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d233e] border border-slate-700/50 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

                {/* Header Container */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700/30 bg-[#0f172a]">
                    <div>
                        <h3 className="text-base font-bold text-white">Close Trip Financials</h3>
                        <p className="text-xs text-slate-400 mt-0.5">File parameters for File ID: {job.jobId || 'N/A'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Interactive Data Entry Layer Form */}
                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">LMN Number</label>
                            <input
                                type="text" name="itrNumber" value={formData.itrNumber} onChange={handleChange} required
                                className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">Supplier Name</label>
                            <input
                                type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} placeholder="e.g. Hotel / Vehicle" required
                                className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">Selling Price (₹)</label>
                            <input
                                type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} placeholder="0" required
                                className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">Purchase Cost (₹)</label>
                            <input
                                type="number" name="purchaseCost" value={formData.purchaseCost} onChange={handleChange} placeholder="0" required
                                className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">GST Amount (₹)</label>
                            <input
                                type="number" name="gstAmount" value={formData.gstAmount} onChange={handleChange} placeholder="0" required
                                className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-300">Client Pending (₹)</label>
                            <input
                                type="number" name="balancePending" value={formData.balancePending} onChange={handleChange} placeholder="0" required
                                className="bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    {/* Action Block */}
                    <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-700/30">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit" disabled={isSubmitting}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 font-medium px-5 py-2 rounded-lg transition-colors shadow-md text-sm flex items-center gap-2 text-white"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Parameters'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default TripClosureForm;