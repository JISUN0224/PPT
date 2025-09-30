import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginButton from '../auth/LoginButton';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  return (
    <header className="bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 홈 버튼 (왼쪽) */}
          <div className="flex items-center">
            <button
              onClick={handleHomeClick}
              className="flex flex-col items-center gap-1 bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-white shadow-lg"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-white text-xs font-medium">Home</span>
            </button>
          </div>

          {/* 제목 (가운데) */}
          <div className="flex items-center space-x-3 absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-2xl font-bold text-black">
              5.3.3&nbsp;&nbsp;AI&nbsp;&nbsp;프레젠테이션 통역 연습 시스템
            </h1>
          </div>


          {/* 오른쪽 메뉴 */}
          <div className="flex items-center space-x-2">
            {/* 로그인 버튼 */}
            <LoginButton />
            
            {/* 대시보드 버튼 */}
            {location.pathname !== '/dashboard' && (
              <button
                onClick={handleDashboardClick}
                className="flex flex-col items-center gap-1 bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-white shadow-lg"
              >
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-white text-xs font-medium">Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
