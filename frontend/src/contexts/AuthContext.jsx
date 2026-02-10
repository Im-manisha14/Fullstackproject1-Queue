import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for existing session
        const storedRole = localStorage.getItem('userRole');
        const storedName = localStorage.getItem('userName');

        if (storedRole) {
            setUser({ role: storedRole, name: storedName });
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userName', userData.name);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
