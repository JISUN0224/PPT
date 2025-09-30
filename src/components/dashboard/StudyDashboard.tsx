import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { getUserTranslationSessions, getUserProfile } from '../../utils/firebaseUtils';
import type { TranslationSession, UserProfile } from '../../utils/firebaseUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 예시 데이터 생성
const createDemoData = () => ({
  totalSections: 156,
  averageAccuracy: 87.3,
  totalStudyTime: 12540, // 초단위 (3시간 29분)
  totalSessions: 28,
  streakDays: 12,
  weeklyGoal: 85,
  dailyStudyTime: [45, 32, 55, 48, 67, 72, 38],
  weeklyProgress: [
    { week: '1월 1주차', averageScore: 82, totalSections: 24, studyTime: 120, improvement: '+8%' },
    { week: '1월 2주차', averageScore: 85, totalSections: 32, studyTime: 135, improvement: '+4%' },
    { week: '1월 3주차', averageScore: 88, totalSections: 38, studyTime: 145, improvement: '+3%' },
    { week: '1월 4주차', averageScore: 91, totalSections: 42, studyTime: 158, improvement: '+3%' }
  ],
  contentTypeRanking: [
    { contentType: 'PPT', averageScore: 92.5, sectionCount: 78, rank: 1 },
    { contentType: '설명서', averageScore: 89.2, sectionCount: 65, rank: 2 },
    { contentType: '브로슈어', averageScore: 85.8, sectionCount: 52, rank: 3 }
  ],
  recentActivities: [
    { contentType: 'PPT 번역', language: 'ko-zh', sectionCount: 15, studyTime: 1260, averageScore: 94, date: '2025-01-20T14:30:00' },
    { contentType: '설명서 번역', language: 'ko-zh', sectionCount: 8, studyTime: 1850, averageScore: 88, date: '2025-01-20T10:15:00' },
    { contentType: 'PPT 번역', language: 'zh-ko', sectionCount: 12, studyTime: 900, averageScore: 91, date: '2025-01-19T16:45:00' },
    { contentType: '설명서 번역', language: 'ko-zh', sectionCount: 20, studyTime: 1560, averageScore: 85, date: '2025-01-19T09:20:00' }
  ],
  insights: [
    'PPT 번역에서 탁월한 성과를 보이고 있어요! 평균 92.5점을 달성했습니다.',
    '12일 연속 학습! 꾸준함이 실력 향상의 비결입니다.',
    '최근 성과가 15% 향상되었어요! 노력의 결과가 나타나고 있습니다.'
  ]
});

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
};

const getActivityIcon = (contentType: string) => {
  if (contentType.includes('PPT'))
    return { icon: '📊', bg: 'linear-gradient(135deg, #667eea, #764ba2)' };
  if (contentType.includes('설명서'))
    return { icon: '📝', bg: 'linear-gradient(135deg, #f093fb, #f5576c)' };
  if (contentType.includes('브로슈어'))
    return { icon: '📋', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)' };
  return { icon: '📝', bg: 'linear-gradient(135deg, #667eea, #764ba2)' };
};

const StudyDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<TranslationSession[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setShowLoginPrompt(true);
        setLoading(false);
      } else {
        setShowLoginPrompt(false);
        loadUserData();
      }
    });
    return () => unsubscribe();
  }, []);

  // 사용자 데이터 로드
  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userSessions, profile] = await Promise.all([
        getUserTranslationSessions(100),
        getUserProfile()
      ]);
      setSessions(userSessions);
      setUserProfile(profile);
    } catch (error) {
      // console.error('사용자 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // Google 로그인
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginPrompt(false);
    } catch (error) {
      // console.error('로그인 실패:', error);
    }
  };

  // 실제 데이터 또는 예시 데이터 사용
  const stats = useMemo(() => {
    if (user) {
      // 로그인한 사용자는 실제 데이터 또는 초기값 사용
      // 실제 사용자 데이터 계산
      const totalSections = userProfile?.totalSections || 0;
      const averageAccuracy = userProfile?.averageScore || 0;
      const totalStudyTime = userProfile?.totalStudyTime || 0;
      const totalSessions = userProfile?.totalSessions || 0;
      
      // 연속 학습일 계산
      const uniqueDays = [...new Set(sessions.map(s => s.date.split('T')[0]))];
      uniqueDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      let streakDays = 0;
      const today = new Date().toISOString().split('T')[0];
      let currentDate = new Date(today);
      for (let i = 0; i < uniqueDays.length; i++) {
        const sessionDate = currentDate.toISOString().split('T')[0];
        if (uniqueDays.includes(sessionDate)) {
          streakDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      // 주간 목표 진행도 (이번 주 세션 수)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const thisWeekSessions = sessions.filter(s => new Date(s.date) >= weekStart);
      const weeklyGoal = Math.min((thisWeekSessions.length / 5) * 100, 100);

      // 일일 학습 시간 (최근 7일)
      const dailyStudyTime = Array(7).fill(0);
      sessions.forEach(session => {
        const sessionDate = new Date(session.date);
        const daysDiff = Math.floor((new Date().getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff < 7) {
          dailyStudyTime[6 - daysDiff] += Math.round(session.studyTime / 60);
        }
      });

      // 주간 성과 추이
      const weeklyData: Record<string, { scores: number[]; sections: number; time: number }> = {};
      sessions.forEach(session => {
        const date = new Date(session.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { scores: [], sections: 0, time: 0 };
        }
        weeklyData[weekKey].scores.push(session.averageScore);
        weeklyData[weekKey].sections += session.sectionCount;
        weeklyData[weekKey].time += session.studyTime;
      });

      const weeklyProgress = Object.entries(weeklyData)
        .map(([week, data]) => ({
          week: `${new Date(week).getMonth() + 1}월 ${Math.ceil(new Date(week).getDate() / 7)}주차`,
          averageScore: Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length * 10) / 10,
          totalSections: data.sections,
          studyTime: data.time,
          improvement: '+3%' // 간단히 고정값 사용
        }))
        .sort((a, b) => b.week.localeCompare(a.week))
        .slice(0, 4);

      // 콘텐츠 타입별 성과
      const contentTypeStats = sessions.reduce((acc, session) => {
        if (!acc[session.contentType]) {
          acc[session.contentType] = { scores: [], sectionCount: 0 };
        }
        acc[session.contentType].scores.push(session.averageScore);
        acc[session.contentType].sectionCount += session.sectionCount;
        return acc;
      }, {} as Record<string, { scores: number[]; sectionCount: number }>);

      const contentTypeRanking = Object.entries(contentTypeStats).map(([contentType, data]) => ({
        contentType: contentType === 'ppt' ? 'PPT' : contentType === 'manual' ? '설명서' : '브로슈어',
        averageScore: Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length * 10) / 10,
        sectionCount: data.sectionCount,
        rank: 0
      })).sort((a, b) => b.averageScore - a.averageScore);

      contentTypeRanking.forEach((item, index) => {
        item.rank = index + 1;
      });

      // 최근 활동 (세션이 있으면 실제 데이터, 없으면 빈 배열)
      const recentActivities = sessions.length > 0 ? sessions.slice(0, 4).map(session => ({
        contentType: `${session.contentType === 'ppt' ? 'PPT' : session.contentType === 'manual' ? '설명서' : '브로슈어'} 번역`,
        language: session.language,
        sectionCount: session.sectionCount,
        studyTime: session.studyTime,
        averageScore: session.averageScore,
        date: session.date
      })) : [];

      // 인사이트 (사용자 맞춤)
      const insights = sessions.length > 0 ? [
        `총 ${totalSections}개 섹션을 번역하셨네요! 꾸준한 학습이 인상적입니다.`,
        `${streakDays}일 연속 학습! 꾸준함이 실력 향상의 비결입니다.`,
        contentTypeRanking.length > 0 ? `${contentTypeRanking[0].contentType}에서 가장 좋은 성과를 보이고 있어요!` : '다양한 콘텐츠로 번역 연습을 계속해보세요.'
      ] : [
        `${user.displayName || '사용자'}님, 환영합니다! 첫 번째 번역을 시작해보세요.`,
        '다양한 콘텐츠로 번역 실력을 키워보세요.',
        'AI가 생성한 콘텐츠로 효과적인 학습이 가능합니다.'
      ];

      return {
        totalSections,
        averageAccuracy,
        totalStudyTime,
        totalSessions,
        streakDays,
        weeklyGoal,
        dailyStudyTime,
        weeklyProgress,
        contentTypeRanking,
        recentActivities,
        insights
      };
    } else {
      // 예시 데이터 사용 (로그인 안했거나 데이터 없음)
      return createDemoData();
    }
  }, [user, sessions, userProfile]);

  // 차트 데이터
  const dailyChartData = useMemo(() => ({
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    datasets: [
      {
        label: '학습 시간',
        data: stats.dailyStudyTime,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        pointRadius: 6,
      },
    ],
  }), [stats]);

  const weeklyChartData = useMemo(() => ({
    labels: stats.weeklyProgress.map(w => w.week),
    datasets: [
      {
        label: '번역 정확도',
        data: stats.weeklyProgress.map(w => w.averageScore),
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        label: '학습 시간',
        data: stats.weeklyProgress.map(w => Math.round(w.studyTime / 60)),
        backgroundColor: 'rgba(118, 75, 162, 0.8)',
        borderColor: '#764ba2',
        borderWidth: 2,
        borderRadius: 8,
        yAxisID: 'y1',
      },
    ],
  }), [stats]);

  const userName = user?.displayName || user?.email?.split('@')[0] || '학습자';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-blue-600 text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-purple-100 py-8">
      {/* 로그인 안내 오버레이 */}
      {showLoginPrompt && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
            <div className="text-5xl mb-5">🔒</div>
            <h2 className="text-3xl text-gray-800 mb-4 font-bold">
              아직 로그인을 안 하셨네요?
            </h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              아래 화면은 대시보드 예시입니다.<br/>
              로그인하시면 <strong>사용자 맞춤형 대시보드</strong>가 제공됩니다.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 rounded-xl px-8 py-4 text-lg font-semibold cursor-pointer shadow-lg transition-all duration-300 hover:transform hover:-translate-y-1"
                onClick={handleGoogleLogin}
              >
                🚀 지금 로그인하기
              </button>
              <button 
                className="bg-transparent text-blue-600 border-2 border-blue-600 rounded-xl px-8 py-4 text-lg font-semibold cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:text-white"
                onClick={() => setShowLoginPrompt(false)}
              >
                👀 예시 먼저 보기
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-5">
              💡 팁: 로그인하면 학습 진도, 성과 분석, 개인별 추천 등 더 많은 기능을 이용할 수 있어요!
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white bg-opacity-95 rounded-3xl p-8 shadow-2xl backdrop-blur-lg" id="dashboard-root">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-5 pb-4 border-b-2 border-gray-100">
          <div>
            <h1 className="text-3xl text-gray-800 mb-2 font-bold">안녕하세요, {userName}님! 👋</h1>
            <p className="text-gray-600 text-sm">오늘의 번역 학습 현황을 확인해보세요</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-4 py-3 rounded-xl text-center shadow-lg">
              <div className="text-xl font-bold mb-1">{stats.streakDays}</div>
              <div className="text-xs opacity-90">연속 학습일</div>
            </div>
          </div>
        </div>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* 통계 카드들 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-xl mb-3 text-white">📚</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{stats.totalSections}</div>
              <div className="text-gray-600 text-xs">번역한 섹션</div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-xl mb-3 text-white">🎯</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{stats.averageAccuracy}%</div>
              <div className="text-gray-600 text-xs">번역 정확도</div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-xl mb-3 text-white">⏱️</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{formatTime(stats.totalStudyTime)}</div>
              <div className="text-gray-600 text-xs">총 학습 시간</div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-xl mb-3 text-white">🏆</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{stats.totalSessions}</div>
              <div className="text-gray-600 text-xs">완료한 연습</div>
            </div>
          </div>

          {/* 주간 목표 진행도 */}
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 주간 목표 진행도</h3>
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-40 h-40 transform -rotate-90">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r="70" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                <circle cx="80" cy="80" r="70" stroke="url(#progressGradient)" strokeWidth="10" fill="none" 
                  strokeDasharray={2 * Math.PI * 70} 
                  strokeDashoffset={2 * Math.PI * 70 * (1 - stats.weeklyGoal / 100)} 
                  strokeLinecap="round" />
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(stats.weeklyGoal)}%</div>
                <div className="text-xs text-gray-600 mt-1">목표 달성</div>
              </div>
            </div>
          </div>

          {/* 일일 학습 시간 차트 */}
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 일일 학습 시간</h3>
            <div className="h-48">
              <Line data={dailyChartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                  y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#718096' } }, 
                  x: { grid: { display: false }, ticks: { color: '#718096' } } 
                } 
              }} />
            </div>
          </div>
        </div>

        {/* 성과 분석 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 주간 성과 추이</h3>
            <div className="h-72">
              <Bar data={weeklyChartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, color: '#718096' } } }, 
                scales: { 
                  y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#718096' } }, 
                  y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#718096' } }, 
                  x: { grid: { display: false }, ticks: { color: '#718096' } } 
                } 
              }} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 콘텐츠 타입별 성과 랭킹</h3>
            {stats.contentTypeRanking.map((item, i) => (
              <div key={i} className="flex items-center py-3 border-b border-gray-100 last:border-b-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 text-sm ${
                  item.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-800' :
                  item.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700' :
                  item.rank === 3 ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {item.rank}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">{item.contentType}</div>
                  <div className="text-xs text-gray-600">{item.sectionCount}섹션 완료</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{item.averageScore}</div>
                  <div className="text-xs text-gray-600">%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 활동 & AI 인사이트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 최근 번역 활동</h3>
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((item, i) => {
                const { icon, bg } = getActivityIcon(item.contentType);
                return (
                  <div key={i} className="flex items-center py-3 border-b border-gray-100 last:border-b-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mr-3 text-white" style={{ background: bg }}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">{item.contentType}</div>
                      <div className="text-xs text-gray-600">{item.language} • {item.sectionCount}섹션 • {formatTime(item.studyTime)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">{item.averageScore}점</div>
                      <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                  🚀
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">첫 번째 번역을 시작해보세요!</h4>
                <p className="text-gray-600 mb-4">
                  AI가 생성한 다양한 콘텐츠로 번역 실력을 키워보세요.
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  번역 연습 시작하기
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 학습 인사이트</h3>
            {stats.insights.map((text, i) => (
              <div key={i} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-3 relative overflow-hidden">
                <div className="text-xs leading-relaxed mb-3 relative z-10">{text}</div>
                <button className="bg-white bg-opacity-20 border-0 text-white px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 relative z-10 hover:bg-opacity-30">
                  자세히 보기
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 다시 로그인 버튼 (로그인 안된 경우에만) */}
        {!user && (
          <div className="mt-8 text-center p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
            <h3 className="text-xl text-gray-700 mb-2 font-semibold">
              🎯 더 정확한 분석이 필요하신가요?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              지금 로그인하시면 개인별 맞춤 학습 분석과 진도 관리를 받을 수 있어요!
            </p>
            <button 
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 rounded-xl px-6 py-3 text-lg font-semibold cursor-pointer shadow-lg transition-all duration-300 hover:transform hover:-translate-y-1"
              onClick={() => setShowLoginPrompt(true)}
            >
              💫 나만의 대시보드 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyDashboard;
