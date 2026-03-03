import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INVITE_CODES } from '../constants/config';
import { registerPushToken } from '../services/notificationService';
import { getStudentByCode } from '../services/studentService';

const AuthContext = createContext(null);

const STORAGE_KEY = '@auth_user';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);       // { role, label, greeting, icon }
    const [isLoading, setIsLoading] = useState(true); // 앱 시작 시 저장된 로그인 확인

    // 앱 시작 시 저장된 로그인 정보 불러오기
    useEffect(() => {
        loadStoredUser();
    }, []);

    const loadStoredUser = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch (e) {
            console.warn('저장된 로그인 정보 로드 실패:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // 초대코드로 로그인
    const login = async (code) => {
        const trimmedCode = code.trim().toUpperCase();

        // 1차: config.js 정적 코드 확인 (기사님, 교사, 운영자 등)
        let found = INVITE_CODES[trimmedCode];

        // 2차: Firebase 동적 코드 확인 (운영자가 앱에서 생성한 학부모 코드)
        if (!found) {
            try {
                const fromDB = await getStudentByCode(trimmedCode);
                if (fromDB) found = fromDB;
            } catch (e) {
                console.warn('[Auth] Firebase 코드 조회 실패:', e);
            }
        }

        if (!found) {
            return { success: false, message: '올바르지 않은 초대코드입니다.\n관리자에게 문의해주세요.' };
        }

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(found));
            setUser(found);
            // 학부모이고 학생 이름이 있을 때만 푸시 토큰 등록
            if (found.role === 'parent' && found.studentName) {
                registerPushToken(found.studentName).catch((e) =>
                    console.warn('[Push] 토큰 등록 실패:', e)
                );
            }
            return { success: true };
        } catch (e) {
            return { success: false, message: '로그인 처리 중 오류가 발생했습니다.' };
        }
    };

    // 로그아웃
    const logout = async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('로그아웃 오류:', e);
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// 커스텀 훅
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용 가능합니다.');
    return ctx;
};
