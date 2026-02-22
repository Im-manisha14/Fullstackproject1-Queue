import React from 'react';
import { FileText } from 'lucide-react';

const EmptyState = ({
    title = 'No Data Found',
    description = 'There is nothing to display here right now.',
    icon: Icon = FileText,
    actionButton = null
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-xl border border-dashed border-gray-300">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
                <Icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-500 max-w-sm mb-6">{description}</p>

            {actionButton && (
                <div className="mt-2">
                    {actionButton}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
