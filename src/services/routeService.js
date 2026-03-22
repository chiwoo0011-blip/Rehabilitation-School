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
            name: `출발`,
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
            name: `도착`,
            address: '',
            scheduledTime: direction === 'school' ? '08:40' : '15:30',
            stopType: 'arrival',
            order: 9999,
            students: [],
            updatedAt: Date.now(),
        });
    }
};

// 출발점/도착점 중복 제거 및 이름 정규화
export const cleanUpDuplicateSpecials = async (busId, direction) => {
    const existing = await getStopsOnce(busId, direction);

    const departures = existing.filter(s => s.stopType === 'departure').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const arrivals = existing.filter(s => s.stopType === 'arrival').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Keep the first departure, delete the rest, and ensure its name is '출발'
    if (departures.length > 0) {
        const [keepDep, ...removeDeps] = departures;
        if (keepDep.name !== '출발') {
            await set(ref(db, `routes/${busId}/${direction}/stops/${keepDep.id}`), { ...keepDep, name: '출발' });
        }
        for (const dep of removeDeps) {
            await deleteStop(busId, direction, dep.id);
        }
    }

    // Keep the first arrival, delete the rest, and ensure its name is '도착'
    if (arrivals.length > 0) {
        const [keepArr, ...removeArrs] = arrivals;
        if (keepArr.name !== '도착') {
            await set(ref(db, `routes/${busId}/${direction}/stops/${keepArr.id}`), { ...keepArr, name: '도착' });
        }
        for (const arr of removeArrs) {
            await deleteStop(busId, direction, arr.id);
        }
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

// ── 수동 정류장 진행 관리 ──────────────────────────────────
// /routes/{busId}/{direction}/currentStop: number (-1=미운행, 0~N=현재정류장)
export const setCurrentStop = async (busId, direction, stopIndex) => {
    await set(ref(db, `routes/${busId}/${direction}/currentStop`), stopIndex);
};

export const subscribeCurrentStop = (busId, direction, callback) => {
    const r = ref(db, `routes/${busId}/${direction}/currentStop`);
    onValue(r, (snap) => callback(snap.val() ?? -1));
    return () => off(r);
};

// ── 백그라운드 GPS 위치 관리 ──────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

export const updateBusLocationBackground = async (location) => {
    try {
        const busId = await AsyncStorage.getItem('activeBusId');
        const direction = await AsyncStorage.getItem('activeDirection');
        if (busId && direction) {
            await set(ref(db, `locations/${busId}`), {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                heading: location.coords.heading || 0,
                speed: location.coords.speed || 0,
                timestamp: Date.now(),
                direction
            });
        }
    } catch(e) {
        // ignore
    }
};

export const startGPS = async (busId, direction) => {
    await AsyncStorage.setItem('activeBusId', busId);
    await AsyncStorage.setItem('activeDirection', direction);
};

export const stopGPS = async () => {
    await AsyncStorage.removeItem('activeBusId');
    await AsyncStorage.removeItem('activeDirection');
};

export const subscribeBusLocation = (busId, callback) => {
    const r = ref(db, `locations/${busId}`);
    const unsub = onValue(r, (snap) => callback(snap.val() || null));
    return unsub;
};
