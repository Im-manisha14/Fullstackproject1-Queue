import React, { useState, useEffect } from 'react';
import { pharmacyService } from '../services/api';
import { Pill, Check, Clock, Search } from 'lucide-react';

const PharmacyDashboard = () => {
    const [prescriptions, setPrescriptions] = useState([]);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            const data = await pharmacyService.getPrescriptions();
            setPrescriptions(data);
        };
        fetchPrescriptions();
    }, []);

    const dispense = (id) => {
        setPrescriptions(prescriptions.map(p =>
            p.id === id ? { ...p, status: 'Dispensed' } : p
        ));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex justify-between items-end mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pharmacy Operations</h1>
                    <p className="text-slate-500 mt-1">Manage and dispense prescriptions.</p>
                </div>
                <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-lg font-medium text-sm">
                    {prescriptions.filter(p => p.status === 'Pending').length} Pending Requests
                </div>
            </header>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by patient name..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Patient</th>
                                <th className="px-6 py-4 font-semibold">Medicine</th>
                                <th className="px-6 py-4 font-semibold">Dosage</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {prescriptions.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{p.patient}</div>
                                        <div className="text-xs text-slate-400">#{p.id + 202400}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <Pill size={16} />
                                            </span>
                                            <span className="text-slate-700">{p.medicine}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{p.dosage}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'Pending'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                            : 'bg-green-50 text-green-700 border border-green-100'
                                            }`}>
                                            {p.status === 'Pending' ? <Clock size={12} /> : <Check size={12} />}
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {p.status === 'Pending' && (
                                            <button
                                                onClick={() => dispense(p.id)}
                                                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-all shadow-sm active:scale-95"
                                            >
                                                Dispense
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PharmacyDashboard;
