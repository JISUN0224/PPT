import { doc, setDoc, addDoc, collection, updateDoc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface TranslationSession {
  id?: string;
  date: string;
  contentType: string; // 'ppt', 'manual', 'brochure'
  totalScore: number;
  sectionCount: number;
  studyTime: number;
  averageScore: number;
  language: string; // 'ko-zh', 'zh-ko', etc.
  sections?: Array<{
    sectionId: string;
    originalText: string;
    translatedText: string;
    score: number;
    timeUsed: number;
    feedback?: {
      accuracy: number;
      fluency: number;
      appropriateness: number;
    };
  }>;
  metadata?: {
    difficulty: string;
    topic: string;
    aiGenerated: boolean;
  };
}

export interface UserProfile {
  displayName: string;
  email: string;
  joinDate: string;
  totalStudyTime: number;
  totalSections: number;
  totalSessions: number;
  averageScore: number;
  lastLogin: string;
}

// 사용자 프로필 저장/업데이트
export const saveUserProfile = async (profile: Partial<UserProfile>) => {
  if (!auth.currentUser) {
    throw new Error('사용자가 로그인되지 않았습니다.');
  }

  const userId = auth.currentUser.uid;
  const userRef = doc(db, 'users', userId);
  
  await setDoc(userRef, {
    ...profile,
    lastLogin: new Date().toISOString(),
  }, { merge: true });
};

// 번역 세션 저장
export const saveTranslationSession = async (session: TranslationSession) => {
  if (!auth.currentUser) {
    throw new Error('사용자가 로그인되지 않았습니다.');
  }

  const userId = auth.currentUser.uid;
  const sessionsRef = collection(db, 'users', userId, 'translationSessions');
  
  const docRef = await addDoc(sessionsRef, {
    ...session,
    createdAt: new Date().toISOString(),
  });

  // 사용자 프로필 통계 업데이트
  await updateUserStats(userId, session);

  return docRef.id;
};

// 사용자 통계 업데이트
const updateUserStats = async (userId: string, session: TranslationSession) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const currentData = userDoc.data();
    const newStats = {
      totalStudyTime: (currentData.totalStudyTime || 0) + session.studyTime,
      totalSections: (currentData.totalSections || 0) + session.sectionCount,
      totalSessions: (currentData.totalSessions || 0) + 1,
      averageScore: calculateNewAverage(
        currentData.averageScore || 0,
        currentData.totalSessions || 0,
        session.averageScore
      ),
    };
    
    await updateDoc(userRef, newStats);
  } else {
    // 첫 번째 세션인 경우 프로필 생성
    const userProfile = {
      displayName: auth.currentUser?.displayName || 'Unknown User',
      email: auth.currentUser?.email || '',
      joinDate: new Date().toISOString(),
      totalStudyTime: session.studyTime,
      totalSections: session.sectionCount,
      totalSessions: 1,
      averageScore: session.averageScore,
      lastLogin: new Date().toISOString(),
    };
    
    await setDoc(userRef, userProfile);
  }
};

// 새로운 평균 점수 계산
const calculateNewAverage = (currentAvg: number, currentCount: number, newScore: number): number => {
  if (currentCount === 0) return newScore;
  return (currentAvg * currentCount + newScore) / (currentCount + 1);
};

// 사용자 번역 세션 가져오기
export const getUserTranslationSessions = async (limitCount: number = 50) => {
  if (!auth.currentUser) {
    throw new Error('사용자가 로그인되지 않았습니다.');
  }

  const userId = auth.currentUser.uid;
  const sessionsRef = collection(db, 'users', userId, 'translationSessions');
  const q = query(sessionsRef, orderBy('date', 'desc'), limit(limitCount));
  
  const querySnapshot = await getDocs(q);
  const sessions: TranslationSession[] = [];
  
  querySnapshot.forEach((doc) => {
    sessions.push({ id: doc.id, ...doc.data() } as TranslationSession);
  });
  
  return sessions;
};

// 사용자 프로필 가져오기
export const getUserProfile = async () => {
  if (!auth.currentUser) {
    throw new Error('사용자가 로그인되지 않았습니다.');
  }

  const userId = auth.currentUser.uid;
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  }
  
  return null;
};

// 번역 세션 시작 시간 기록
export const startTranslationSession = () => {
  const startTime = Date.now();
  localStorage.setItem('translationStartTime', startTime.toString());
  return startTime;
};

// 번역 세션 종료 및 시간 계산
export const endTranslationSession = () => {
  const startTime = localStorage.getItem('translationStartTime');
  if (!startTime) return 0;
  
  const endTime = Date.now();
  const studyTime = Math.floor((endTime - parseInt(startTime)) / 1000); // 초 단위
  
  localStorage.removeItem('translationStartTime');
  return studyTime;
};

// 현재 번역 활동 세션 데이터 생성
export const createTranslationSessionData = (
  contentType: string,
  language: string,
  sections: Array<{
    originalText: string;
    translatedText: string;
    score: number;
    feedback?: any;
  }>,
  metadata?: any
): TranslationSession => {
  const studyTime = endTranslationSession();
  const totalScore = sections.reduce((sum, section) => sum + section.score, 0);
  const averageScore = sections.length > 0 ? totalScore / sections.length : 0;

  return {
    date: new Date().toISOString(),
    contentType,
    language,
    sectionCount: sections.length,
    studyTime,
    totalScore,
    averageScore,
    sections: sections.map((section, index) => ({
      sectionId: `section_${index}`,
      originalText: section.originalText,
      translatedText: section.translatedText,
      score: section.score,
      timeUsed: Math.floor(studyTime / sections.length), // 평균 시간
      feedback: section.feedback,
    })),
    metadata: {
      aiGenerated: true,
      ...metadata,
    },
  };
};
