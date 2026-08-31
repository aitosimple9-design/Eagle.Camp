import React from 'react';

export default function Toggle({ id, checked, onChange, label, className = '' }) {
  return (
    <label htmlFor={id} className={`flex items-center gap-3 cursor-pointer group ${className}`}>
      <div className="relative flex items-center">
        <input 
          type="checkbox" 
          id={id} 
          className="peer sr-only" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="toggle-track w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/30"></div>
      </div>
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{label}</span>}
    </label>
  );
}
