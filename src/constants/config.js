// 앱 설정 상수
export const APP_CONFIG = {
    name: '연세대학교재활학교',

    version: '1.0.0',
    homepageUrl: 'https://yonsei.sen.sc.kr/',
};

// 역할별 초대코드 (코드: { role, label, greeting, icon, studentName?, busId? })
export const INVITE_CODES = {
    // ── 학부모 (학생별 고유 코드) ─────────────────────────────
    // 형식: 학생이름 이니셜 + 년도  (실제 배포 시 학교에서 발급)
    'HONG2026': {
        role: 'parent',
        label: '학부모',
        greeting: '홍길동 어머님',
        icon: '👨‍👩‍👧',
        studentName: '홍길동',   // 자녀 이름 (푸시 알림 매핑 키)
        busId: 'bus1',           // 탑승 버스
    },
    'KIM2026': {
        role: 'parent',
        label: '학부모',
        greeting: '김철수 아버님',
        icon: '👨‍👩‍👦',
        studentName: '김철수',
        busId: 'bus1',
    },
    // ── 기존 공용 코드 (테스트용 — 푸시 알림 미지원) ──────────
    'PARENT2026': {
        role: 'parent',
        label: '학부모',
        greeting: '학부모님',
        icon: '👨‍👩‍👧',
        studentName: null,       // 학생 미지정 — 알림 발송 안 됨
        busId: null,
    },
    // ── 교직원 ────────────────────────────────────────────────
    'BUS01-2026': {
        role: 'bus1',
        label: '통학버스 1호차',
        greeting: '1호차 기사님',
        icon: '🚌',
    },
    'BUS02-2026': {
        role: 'bus2',
        label: '통학버스 2호차',
        greeting: '2호차 기사님',
        icon: '🚌',
    },
    'TEACHER2026': { role: 'teacher', label: '교사', greeting: '선생님', icon: '👩‍🏫' },
    'STAFF2026': { role: 'staff', label: '교육실무사', greeting: '선생님', icon: '🧑‍💼' },
    'OPERATOR2026': { role: 'operator', label: '운영자', greeting: '운영자님', icon: '🛠️' },
};


// NEIS 급식 API 설정
export const NEIS_CONFIG = {
    baseUrl: 'https://open.neis.go.kr/hub',
    apiKey: 'b8e4412f51dc4ad8819730ac8084a71c',
    eduOfficeCode: 'B10',       // 서울특별시교육청
    schoolCode: '7010859',      // 연세대학교재활학교
};

// 알레르기 코드 → 이름 변환
export const ALLERGY_CODES = {
    '1': '난류',
    '2': '우유',
    '3': '메밀',
    '4': '땅콩',
    '5': '대두',
    '6': '밀',
    '7': '고등어',
    '8': '게',
    '9': '새우',
    '10': '돼지고기',
    '11': '복숭아',
    '12': '토마토',
    '13': '아황산류',
    '14': '호두',
    '15': '닭고기',
    '16': '쇠고기',
    '17': '오징어',
    '18': '조개류',
};

// 긴급 연락처 (실제 번호로 교체 필요)
export const EMERGENCY_CONTACTS = [
    { id: '1', label: '담임선생님', icon: '👩‍🏫', phone: '010-0000-0000' },
    { id: '2', label: '보건실', icon: '🏥', phone: '02-2123-8141' },
    { id: '3', label: '행정실', icon: '🏫', phone: '02-2123-8141' },
    { id: '4', label: '119', icon: '🚑', phone: '119' },
];
