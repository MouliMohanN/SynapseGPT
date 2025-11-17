import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Logo({ size = 'md', showText = true, className = '', onClick }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-sm' },
    md: { icon: 'w-8 h-8', text: 'text-base' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' }
  };

  const { icon, text } = sizes[size];

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      type="button"
    >
      {/* Logo Icon - Neural network synapse design */}
      <div className={`${icon} relative flex items-center justify-center`}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Neural nodes */}
          <circle cx="8" cy="20" r="3" className="fill-purple-600" />
          <circle cx="20" cy="8" r="3" className="fill-purple-500" />
          <circle cx="20" cy="32" r="3" className="fill-purple-500" />
          <circle cx="32" cy="20" r="3" className="fill-purple-600" />
          
          {/* Synaptic connections */}
          <path 
            d="M 11 20 Q 15 14 17 8" 
            className="stroke-purple-400" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            fill="none"
          />
          <path 
            d="M 11 20 Q 15 26 17 32" 
            className="stroke-purple-400" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            fill="none"
          />
          <path 
            d="M 23 8 Q 27 14 29 20" 
            className="stroke-purple-400" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            fill="none"
          />
          <path 
            d="M 23 32 Q 27 26 29 20" 
            className="stroke-purple-400" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Center hub */}
          <circle cx="20" cy="20" r="4" className="fill-purple-600" />
          <circle cx="20" cy="20" r="2.5" className="fill-white" opacity="0.8" />
        </svg>
      </div>
      
      {showText && (
        <div className={`font-bold ${text}`}>
          <span className="bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
            Synapse
          </span>
          <span className="text-slate-900">GPT</span>
        </div>
      )}
    </button>
  );
}
