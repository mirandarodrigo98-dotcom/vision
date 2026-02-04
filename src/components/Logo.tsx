import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className, width = 100, height = 100, ...props }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="100" height="100" rx="24" fill="#0F172A"/>
      <path d="M32 36L50 72L68 36" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="50" cy="24" r="5" fill="#3B82F6"/>
    </svg>
  );
};
