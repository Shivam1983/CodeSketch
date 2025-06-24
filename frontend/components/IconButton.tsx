import React from 'react';

interface IconButtonProps {
  onClick: () => void;
  activated: boolean;
  icon: React.ReactNode;
  label?: string;
  className?: string;
}

export function IconButton({ onClick, activated, icon, label, className = "" }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        activated ? "bg-gray-700 text-white" : "bg-gray-600 text-gray-200"
      } hover:bg-gray-500 ${className}`}
      title={label}
    >
      {icon}
    </button>
  );
}