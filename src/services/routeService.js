import { db } from './firebaseConfig';
import { ref, set, push, remove, onValue, off } from 'firebase/database';

// direction: 'school'(등교) | 'home'(하교)
const today = () => new Date().toISOString().slice(0, 10);
const encode = (name) => name.replace(/[.$#[\]/]/g, '_');

// ── 정류장 CRUD ───────────────────────────────────────────
// /routes/{busId}/{direction}/stops/{stopId}
export const saveStop = async (busId, direction, stopId, data) => {
    const basePath = `routes/${busId}/${direction}/stops`;
    if (stopId) {
        await set(ref(db, `${basePath}/${stopId}`), { ...data, updatedAt: Date.now() });
        return stopId;
    } else {
        const newRef = push(ref(db, basePath));
        await set(newRef, { ...data, updatedAt: Date.now() });
        return newRef.key;
    }
};

export const deleteStop = async (busId, direction, stopId) => {
    await remove(ref(db, `routes/${busId}/${direction}/stops/${stopId}`));
};

export const subscribeStops = (busId, direction, callback) => {
    const r = ref(db, `routes/${busId}/${direction}/stops`);
    const handler = (snap) => {
        const raw = snap.val() || {};
        const arr = Object.entries(raw)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => {
                if (a.stopType === 'departure') return -1;
                if (b.stopType === 'departure') return 1;
                if (a.stopType === 'arrival') return 1;
                if (b.stopType === 'arrival') return -1;
                return (a.order ?? 99) - (b.order ?? 99);
            });
        callback(arr);
    };
    onValue(r, handler);
    return () => off(r, 'value', handler);
};

// 정류장 목록 1회 조회
export const getStopsOnce = async (busId, direction) => {
    const { get } = await import('firebase/database');
    const snap = await get(ref(db, `routes/${busId}/${direction}/stops`));
    const raw = snap.val() || {};
    return Object.entries(raw).map(([id, v]) => ({ id, ...v }));
};

// 출발점/도착점 없을 때 자동 생성
export const initDefaultStops = async (busId, direction) => {
    const existing = await getStopsOnce(busId, direction);
    const hasDeparture = existing.some(s => s.stopType === 'departure');
    const hasArrival = existing.some(s => s.stopType === 'arrival');

    const label = direction === 'school' ? '등교' : '하교';
    if (!hasDeparture) {
        const newRef = push(ref(db, `routes/${busId}/${direction}/stops`));
        await set(newRef, {
            name: `차고지 (${label} 출발)`,
            address: '',
            scheduledTime: direction === 'school' ? '07:30' : '14:00',
            stopType: 'departure',
            order: 0,
            students: [],
            updatedAt: Date.now(),
        });
    }
    if (!hasArrival) {
        const newRef = push(ref(db, `routes/${busId}/${direction}/stops`));
        await set(newRef, {
            name: `학교 (${label} 도착)`,
            address: '',
            scheduledTime: direction === 'school' ? '08:40' : '15:30',
            stopType: 'arrival',
            order: 9999,
            students: [],
            updatedAt: Date.now(),
        });
    }
};


// ── 탑승/미탑승 상태 관리 ──────────────────────────────────
// /dailyStatus/{date}/{busId}/{direction}/{studentName}
const statusRef = (busId, direction, studentName, date = today()) =>
    ref(db, `dailyStatus/${date}/${busId}/${direction}/${encode(studentName)}`);

/**
 * 미탑승 처리
 * @param {string} busId
 * @param {string} direction 'school'|'home'
 * @param {string} studentName
 * @param {'parent'|'driver'|'staff'} byRole
 */
export const markNotBoarded = async (busId, direction, studentName, byRole, date = today()) => {
    await set(statusRef(busId, direction, studentName, date), {
        notBoarded: true, byRole, timestamp: Date.now(), boarded: false,
    });
};

export const markBoarded = async (busId, direction, studentName, date = today()) => {
    await set(statusRef(busId, direction, studentName, date), {
        notBoarded: false, boarded: true, boardedTime: Date.now(),
    });
};

export const clearBoardingStatus = async (busId, direction, studentName, date = today()) => {
    await remove(statusRef(busId, direction, studentName, date));
};

export const subscribeDailyStatus = (busId, direction, callback, date = today()) => {
    const r = ref(db, `dailyStatus/${date}/${busId}/${direction}`);
    onValue(r, (snap) => callback(snap.val() || {}));
    return () => off(r);
};

// ── 운행 상태 (기사가 업데이트하는 현재 정류장 인덱스) ──
// /busOperation/{busId}/{direction}/currentStopIndex
export const subscribeCurrentStop = (busId, direction, callback) => {
    const r = ref(db, `busOperation/${busId}/${direction}/currentStopIndex`);
    const handler = (snap) => {
        const val = snap.val();
        callback(val !== null ? val : -1);
    };
    onValue(r, handler);
    return () => off(r, 'value', handler);
};

// ── 버스 실시간 위치 ──
// /busLocation/{busId}
export const subscribeBusLocation = (busId, callback) => {
    const r = ref(db, `buses/${busId}`);
    const handler = (snap) => {
        callback(snap.val() || null);
    };
    onValue(r, handler);
    return () => off(r, 'value', handler);
};
