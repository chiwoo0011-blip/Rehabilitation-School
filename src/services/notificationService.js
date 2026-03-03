/**
 * notificationService.js
 * Expo Push Notifications 서버리스 방식 (Firebase Cloud Functions 불필요)
 *
 * 흐름:
 *  학부모 로그인 → registerPushToken(studentName) → Firebase에 토큰 저장
 *  기사님 탑승 버튼 → sendBoardingNotification(studentName) → Expo Push API 호출 → 학부모 폰 알림
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from './firebaseConfig';
import { ref, set, get } from 'firebase/database';

// 포그라운드 알림 표시 설정
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Firebase에 토큰 저장 경로: /pushTokens/{encodedStudentName}
const encode = (name) => name.replace(/[.$#[\]/]/g, '_');
const tokenRef = (studentName) => ref(db, `pushTokens/${encode(studentName)}`);

/**
 * 학부모 앱 시작 시 호출
 * - 알림 권한 요청
 * - Expo Push Token 발급
 * - Firebase에 저장 (studentName 키로)
 */
export const registerPushToken = async (studentName) => {
    if (!studentName) return;

    // Android 알림 채널 설정
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('bus', {
            name: '통학버스 알림',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4F8EF7',
        });
    }

    // 권한 요청
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.warn('[Push] 알림 권한이 거부되었습니다.');
        return;
    }

    // Expo Push Token 발급 (Expo Go에서도 동작)
    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined, // app.json의 easProjectId 자동 참조
    });
    const token = tokenData.data;
    console.log('[Push] Token registered for', studentName, ':', token);

    // Firebase에 저장
    await set(tokenRef(studentName), {
        token,
        updatedAt: Date.now(),
    });
};

/**
 * 특정 학생의 Expo Push Token을 Firebase에서 조회
 */
const fetchToken = async (studentName) => {
    const snap = await get(tokenRef(studentName));
    return snap.exists() ? snap.val().token : null;
};

/**
 * Expo Push API로 알림 전송 (서버 불필요)
 */
const sendPush = async (token, title, body, data = {}) => {
    if (!token) return;
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                to: token,
                channelId: 'bus',
                title,
                body,
                data,
                sound: 'default',
                priority: 'high',
            }),
        });
    } catch (e) {
        console.warn('[Push] 전송 실패:', e.message);
    }
};

/**
 * 탑승 완료 알림
 * @param {string} studentName  학생 이름 (Firebase 토큰 조회 키)
 * @param {string} busLabel     버스 이름 (예: '통학버스 1호차')
 * @param {string} stopName     정류장 이름 (예: '롯데마트 앞')
 */
export const sendBoardingNotification = async (studentName, busLabel, stopName) => {
    const token = await fetchToken(studentName);
    await sendPush(
        token,
        `✅ ${studentName} 탑승 완료`,
        `${stopName}에서 ${busLabel}에 탑승했습니다.`,
        { type: 'boarded', studentName, stopName }
    );
};

/**
 * 버스 도착 예정 알림
 * @param {string} studentName  학생 이름
 * @param {string} busLabel     버스 이름
 * @param {string} stopName     곧 도착할 정류장 이름
 * @param {number} minutes      예상 도착 분 (optional)
 */
export const sendApproachingNotification = async (studentName, busLabel, stopName, minutes) => {
    const token = await fetchToken(studentName);
    const eta = minutes ? `약 ${minutes}분 후` : '곧';
    await sendPush(
        token,
        `🚌 버스 도착 예정`,
        `${busLabel}이 ${stopName}에 ${eta} 도착합니다.`,
        { type: 'approaching', studentName, stopName }
    );
};
