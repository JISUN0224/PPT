import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text = '로딩 중...',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-[var(--light-brown)] border-t-[var(--primary-brown)]`} />
      {text && (
        <p className="text-[var(--secondary-brown)] font-medium">{text}</p>
      )}
    </div>
  );
};

export default Loading; 