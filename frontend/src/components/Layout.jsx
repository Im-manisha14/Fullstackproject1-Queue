import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = localStorage.getItem('userRole');

    const handleLogout = () => {
        localStorage.removeItem('userRole');
        navigate('/');
    };

    if (location.pathname === '/') return <Outlet />;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                Q
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent">
                                QueueFree
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-500 capitalize px-3 py-1 bg-slate-100 rounded-full">
                                {userRole} Portal
                            </span>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
