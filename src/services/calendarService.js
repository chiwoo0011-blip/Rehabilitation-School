import { db } from './firebaseConfig';
import { ref, set, push, remove, onValue, off } from 'firebase/database';

const CALENDAR_PATH = 'schoolCalendar';

/**
 * 학사일정 실시간 구독
 * @param {function} callback - (events: array) => void
 * @returns {function} unsubscribe
 */
export const subscribeCalendar = (callback) => {
    const r = ref(db, CALENDAR_PATH);
    const handler = (snap) => {
        const val = snap.val() || {};
        const events = Object.entries(val).map(([id, data]) => ({ id, ...data }));
        // startDate 기준 오름차순 정렬
        events.sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
        callback(events);
    };
    onValue(r, handler);
    return () => off(r, 'value', handler);
};

/**
 * 학사일정 추가
 * @param {{ title, startDate, endDate, category, description }} eventData
 */
export const addCalendarEvent = async (eventData) => {
    const newRef = push(ref(db, CALENDAR_PATH));
    await set(newRef, {
        ...eventData,
        createdAt: Date.now(),
    });
};

/**
 * 여러 학사일정 한 번에 추가
 * @param {Array} eventsArray 
 */
export const addMultipleCalendarEvents = async (eventsArray) => {
    const promises = eventsArray.map(async (eventData) => {
        const newRef = push(ref(db, CALENDAR_PATH));
        await set(newRef, {
            ...eventData,
            createdAt: Date.now(),
        });
    });
    await Promise.all(promises);
};

/**
 * 학사일정 삭제
 * @param {string} id
 */
export const deleteCalendarEvent = async (id) => {
    await remove(ref(db, `${CALENDAR_PATH}/${id}`));
};
