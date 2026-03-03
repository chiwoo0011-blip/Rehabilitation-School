/**
 * studentService.js
 * Firebase에 학생(부모 초대코드) 데이터 저장/조회/삭제
 *
 * Firebase 경로: /parentCodes/{code} → { studentName, busId, greeting, createdAt }
 */
import { db } from './firebaseConfig';
import { ref, set, remove, onValue, off, get } from 'firebase/database';

const CODES_PATH = 'parentCodes';

// 학생 이름 → 초대코드 자동 생성 (예: 홍길동 → HGD2026-XXXX)
export const generateCode = (studentName) => {
    // 이름 초성 추출 (영문 대문자 변환)
    const initials = studentName
        .split('')
        .map((ch) => ch.charCodeAt(0).toString(16).slice(-2).toUpperCase())
        .join('')
        .slice(0, 4);
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4자리 랜덤
    return `STU${initials}${suffix}`;
};

// 학생 추가 (코드 자동 생성 후 Firebase 저장)
export const addStudent = async ({ studentName, busId, parentName }) => {
    const code = generateCode(studentName);
    const data = {
        studentName,
        busId,          // 'bus1' | 'bus2'
        parentName: parentName || `${studentName} 학부모`,
        role: 'parent',
        label: '학부모',
        greeting: `${parentName || studentName} 학부모님`,
        icon: '👨‍👩‍👧',
        createdAt: Date.now(),
    };
    console.log('[StudentService] 학생 추가 시도:', code, studentName, busId);
    try {
        await set(ref(db, `${CODES_PATH}/${code}`), data);
        console.log('[StudentService] Firebase 저장 성공:', code);
    } catch (e) {
        console.error('[StudentService] Firebase 저장 실패:', e.code, e.message);
        throw e;
    }
    return { code, ...data };
};

// 학생(코드) 삭제
export const removeStudent = async (code) => {
    await remove(ref(db, `${CODES_PATH}/${code}`));
};

// 전체 학생 목록 실시간 구독
export const subscribeStudents = (callback) => {
    const r = ref(db, CODES_PATH);

    const handler = (snap) => {
        const raw = snap.val() || {};
        const list = Object.entries(raw)
            .map(([code, data]) => ({ code, ...data }))
            .filter(item => item.studentName) // studentName 있는 항목만
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        console.log('[StudentService] 학생 목록 수신:', list.length, '명', list.map(s => s.studentName));
        callback(list);
    };

    const errorHandler = (error) => {
        console.error('[StudentService] Firebase 읽기 오류:', error.code, error.message);
        callback([]); // 에러 시 빈 배열
    };

    onValue(r, handler, errorHandler);

    // ⚠️ callback을 지정해서 이 리스너만 제거 (다른 화면의 리스너는 유지)
    return () => off(r, 'value', handler);
};


// 특정 초대코드 조회 (AuthContext에서 사용)
export const getStudentByCode = async (code) => {
    const snap = await get(ref(db, `${CODES_PATH}/${code.toUpperCase()}`));
    return snap.exists() ? snap.val() : null;
};
