import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';

const LoginButton: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Google 로그인
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
    } catch (error) {
      // console.error('로그인 실패:', error);
      alert('로그인에 실패했습니다.');
    }
  };

  // 이메일/비밀번호 로그인
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!email || !password) {
      setEmailError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setEmailError('비밀번호가 일치하지 않습니다.');
          return;
        }
        if (password.length < 6) {
          setEmailError('비밀번호는 6자 이상이어야 합니다.');
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        alert('회원가입이 완료되었습니다!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowLoginModal(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('이메일 로그인 실패:', error);
      if (error.code === 'auth/user-not-found') {
        setEmailError('등록되지 않은 이메일입니다.');
      } else if (error.code === 'auth/wrong-password') {
        setEmailError('비밀번호가 올바르지 않습니다.');
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('이미 사용 중인 이메일입니다.');
      } else if (error.code === 'auth/weak-password') {
        setEmailError('비밀번호가 너무 약합니다.');
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('올바른 이메일 형식이 아닙니다.');
      } else {
        setEmailError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // console.error('로그아웃 실패:', error);
    }
  };

  // 로그인된 상태
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img 
          src={user.photoURL || ''} 
          alt="프로필" 
          className="w-8 h-8 rounded-full border-2 border-gray-300" 
        />
        <span className="text-gray-800 font-semibold text-sm">
          {user.displayName || user.email?.split('@')[0]}
        </span>
        <button 
          onClick={handleLogout}
          className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          로그아웃
        </button>
      </div>
    );
  }

  // 로그인 안된 상태
  return (
    <>
      <button
        onClick={() => setShowLoginModal(true)}
        className="flex flex-col items-center gap-1 bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-white shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-white text-xs font-medium">Login</span>
      </button>
      
      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {isSignUp ? '회원가입' : '로그인'}
              </h2>
              <p className="text-gray-600">AI 프레젠테이션 통역 연습 시스템에 오신 것을 환영합니다</p>
            </div>

            {/* Google 로그인 */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white rounded-lg px-4 py-3 mb-4 hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 로그인
            </button>

            {/* 구분선 */}
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-3 text-gray-500 text-sm">또는</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* 이메일 로그인 폼 */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {isSignUp && (
                <div>
                  <input
                    type="password"
                    placeholder="비밀번호 확인"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              
              {emailError && (
                <div className="text-red-500 text-sm text-center">{emailError}</div>
              )}
              
              <button
                type="submit"
                className="w-full bg-green-600 text-white rounded-lg px-4 py-3 hover:bg-green-700 transition-colors"
              >
                {isSignUp ? '회원가입' : '로그인'}
              </button>
            </form>

            {/* 로그인/회원가입 전환 */}
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setEmailError('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
              </button>
            </div>

            <button
              onClick={() => {
                setShowLoginModal(false);
                setIsSignUp(false);
                setEmailError('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginButton;
