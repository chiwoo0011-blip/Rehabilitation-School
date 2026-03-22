import { db } from './firebaseConfig';
import { ref, set, onValue, off, serverTimestamp } from 'firebase/database';

// 버스 위치 데이터 경로: /buses/{busId}/location
const getBusRef = (busId) => ref(db, `buses/${busId}`);

/**
 * 버스 위치 업로드 (기사용)
 * @param {string} busId - 'bus1' | 'bus2'
 * @param {object} coords - { latitude, longitude, speed }
 */
export const uploadBusLocation = async (busId, coords) => {
    try {
        await set(getBusRef(busId), {
            latitude: coords.latitude,
            longitude: coords.longitude,
            speed: coords.speed ?? 0,
            isActive: true,
            updatedAt: Date.now(),
        });
    } catch (e) {
        console.error('위치 업로드 실패:', e);
    }
};

/**
 * 운행 종료 처리
 */
export const stopBusTracking = async (busId) => {
    try {
        await set(getBusRef(busId), {
            isActive: false,
            updatedAt: Date.now(),
            latitude: null,
            longitude: null,
            speed: 0,
        });
    } catch (e) {
        console.error('운행 종료 처리 실패:', e);
    }
};

/**
 * 버스 위치 실시간 구독 (학부모용)
 * @param {string} busId
 * @param {function} callback - (data) => void
 * @returns {function} unsubscribe 함수
 */
export const subscribeBusLocation = (busId, callback) => {
    const busRef = getBusRef(busId);
    onValue(busRef, (snapshot) => {
        callback(snapshot.val());
    });
    return () => off(busRef);
};
