import { db } from './firebaseConfig';
import { ref, set, get, onValue, off, update } from 'firebase/database';

const today = () => new Date().toISOString().slice(0, 10);
const encode = (name) => name.replace(/[.$#[\]/]/g, '_');

// 버스기사가 "학교 도착" 버튼 누를 때 호출
// - 해당 버스의 탑승 완료 학생 전체에 arrived: true 표시
export const markAllArrived = async (busId, date = today()) => {
    const snap = await get(ref(db, `dailyStatus/${date}/${busId}/school`));
    const statusMap = snap.val() || {};
    const updates = {};
    for (const [key, val] of Object.entries(statusMap)) {
        if (val.boarded && !val.arrived) {
            updates[`dailyStatus/${date}/${busId}/school/${key}/arrived`] = true;
            updates[`dailyStatus/${date}/${busId}/school/${key}/arrivedTime`] = Date.now();
        }
    }
    if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
    }
    return Object.keys(updates).length; // 처리된 학생 수 반환
};

// 학부모: 내 아이의 등교 현황 실시간 구독
// user.busId + user.studentName 기반
export const subscribeStudentAttendance = (busId, studentName, callback, date = today()) => {
    const key = encode(studentName);
    const r = ref(db, `dailyStatus/${date}/${busId}/school/${key}`);
    onValue(r, (snap) => callback(snap.val() || null));
    return () => off(r);
};

// 하교 현황 구독 (방향: home)
export const subscribeStudentHomeAttendance = (busId, studentName, callback, date = today()) => {
    const key = encode(studentName);
    const r = ref(db, `dailyStatus/${date}/${busId}/home/${key}`);
    onValue(r, (snap) => callback(snap.val() || null));
    return () => off(r);
};
