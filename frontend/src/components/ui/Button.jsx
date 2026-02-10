import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
    children,
    variant = 'primary',
    disabled = false,
    loading = false,
    className = '',
    type = 'button',
    ...props
}) => {

    const baseStyles = "relative flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-500/30 hover:shadow-red-500/40",
    };

    const sizes = {
        default: "py-3 px-4 text-sm",
        icon: "p-2", // For usage with icons only if needed later
    };

    return (
        <button
            type={type}
            className={`${baseStyles} ${variants[variant]} ${sizes.default} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                </>
            ) : (
                children
            )}
        </button>
    );
};

export default Button;
