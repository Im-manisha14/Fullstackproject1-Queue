import React, { useState, useEffect } from 'react';
import { doctorService } from '../services/api';
import { CheckCircle, Clock, User, ArrowRight, XCircle } from 'lucide-react';

const DoctorDashboard = () => {
    const [queue, setQueue] = useState([]);
    const [currentPatient, setCurrentPatient] = useState(null);

    useEffect(() => {
        const fetchQueue = async () => {
            const data = await doctorService.getQueue();
            setQueue(data);
        };
        fetchQueue();
    }, []);

    const callNext = () => {
        const next = queue.find(p => p.status === 'Waiting');
        if (next) {
            setCurrentPatient(next);
            setQueue(queue.map(p =>
                p.token === next.token ? { ...p, status: 'In Progress' } : p
            ));
        }
    };

    const completeConsultation = () => {
        if (currentPatient) {
            setQueue(queue.map(p =>
                p.token === currentPatient.token ? { ...p, status: 'Completed' } : p
            ));
            setCurrentPatient(null);
        }
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Main Consultation Area */}
            <div className="lg:col-span-2 space-y-6">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Consultation Room</h1>
                    <p className="text-slate-500">Manage your patient flow efficiently.</p>
                </header>

                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                    {currentPatient ? (
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-6">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                                </span>
                                In Consultation
                            </div>

                            <div className="flex items-baseline gap-4 mb-2">
                                <h2 className="text-4xl font-bold text-slate-900">{currentPatient.patient}</h2>
                                <span className="text-2xl text-slate-400 font-medium">#{currentPatient.token}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8 mb-8">
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Age</span>
                                    <p className="text-lg font-medium text-slate-900">32 Years</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Gender</span>
                                    <p className="text-lg font-medium text-slate-900">Male</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={completeConsultation}
                                    className="flex-1 bg-teal-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={20} />
                                    Complete & Prescribe
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <User size={32} />
                            </div>
                            <h3 className="text-xl font-medium text-slate-900 mb-2">No Patient Selected</h3>
                            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Ready to see the next patient? Click the button below to call the next token.</p>
                            <button
                                onClick={callNext}
                                className="bg-slate-900 text-white py-3 px-8 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 mx-auto"
                            >
                                Call Next Patient
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Queue Sidebar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 h-fit shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-teal-600" />
                    Today's Queue
                </h3>
                <div className="space-y-3">
                    {queue.map((p) => (
                        <div
                            key={p.token}
                            className={`flex justify-between items-center p-4 rounded-xl border transition-all ${p.status === 'In Progress'
                                ? 'bg-teal-50 border-teal-200 shadow-sm'
                                : p.status === 'Completed'
                                    ? 'bg-gray-50 border-gray-100 opacity-60'
                                    : 'bg-white border-slate-100 hover:border-teal-200'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.status === 'In Progress' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {p.token}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{p.patient}</p>
                                    <p className="text-xs text-slate-500">{p.status}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
