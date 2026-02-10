import React, { useState, useEffect } from 'react';
import { patientService } from '../services/api';
import { Search, Calendar, Clock, MapPin, User, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';

const PatientDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const fetchDoctors = async () => {
            const data = await patientService.getDoctors();
            setDoctors(data);
        };
        fetchDoctors();
    }, []);

    const filteredDoctors = doctors.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBook = async (doctor) => {
        try {
            const response = await patientService.bookAppointment(doctor.id);
            setToken({ number: response.token, doctor: doctor.name, status: response.status });
            setSelectedDoctor(null);
        } catch (error) {
            console.error("Booking failed", error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Welcome back, John</h1>
                <p className="text-slate-500 mt-2">Find a doctor and book your appointment easily.</p>
            </header>

            {/* Current Appointment Card */}
            {token && (
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-xl shadow-teal-500/20 transform transition-all hover:scale-[1.01]">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-teal-100 font-medium mb-1">Current Token</p>
                            <h2 className="text-5xl font-bold mb-4">#{token.number}</h2>
                            <div className="flex items-center gap-2 text-teal-50">
                                <User size={16} />
                                <span>{token.doctor}</span>
                            </div>
                            <div className="flex items-center gap-2 text-teal-50 mt-1">
                                <Clock size={16} />
                                <span>Estimated Wait: 15 mins</span>
                            </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-semibold">
                            {token.status}
                        </div>
                    </div>
                </div>
            )}

            {/* Doctor Search */}
            <div className="space-y-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search doctors, departments..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDoctors.map(doctor => (
                        <div key={doctor.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 font-bold text-lg group-hover:bg-teal-100 transition-colors">
                                    {doctor.name.charAt(0)}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${doctor.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {doctor.status}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg text-slate-900">{doctor.name}</h3>
                            <p className="text-slate-500 text-sm mb-4">{doctor.department}</p>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <MapPin size={14} />
                                    <span>Room 30{doctor.id}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Clock size={14} />
                                    <span>09:00 AM - 05:00 PM</span>
                                </div>
                            </div>

                            <Button
                                onClick={() => handleBook(doctor)}
                                className="w-full justify-center gap-2"
                            >
                                Book Appointment
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
