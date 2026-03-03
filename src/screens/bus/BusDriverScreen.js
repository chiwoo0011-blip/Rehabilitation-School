import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, StatusBar, ActivityIndicator, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { uploadBusLocation, stopBusTracking } from '../../services/busService';
import { subscribeStops, subscribeDailyStatus, markBoarded, markNotBoarded, clearBoardingStatus } from '../../services/routeService';
import { sendBoardingNotification, sendApproachingNotification } from '../../services/notificationService';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';

const UPLOAD_INTERVAL_MS = 10000;

const BusDriverScreen = () => {
    const { user } = useAuth();
    const busId = user?.role;
    const busLabel = user?.label || '버스';

    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeed] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [loading, setLoading] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [direction, setDirection] = useState('school'); // 'school'=등교 | 'home'=하교
    const [stops, setStops] = useState([]);
    const [dailyStatus, setDailyStatus] = useState({});
    const [expandedStop, setExpandedStop] = useState(null);

    const uploadInterval = useRef(null);
    const timerInterval = useRef(null);
    const notifiedStop = useRef(null); // 도착 예정 알림 중복 방지

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setPermissionGranted(status === 'granted');
        })();
        const unsubStops = subscribeStops(busId, direction, setStops);
        const unsubStatus = subscribeDailyStatus(busId, direction, setDailyStatus);
        return () => { unsubStops(); unsubStatus(); stopAllTracking(); };
    }, []);

    const stopAllTracking = () => {
        clearInterval(uploadInterval.current);
        clearInterval(timerInterval.current);
    };

    const handleStart = async () => {
        if (!permissionGranted) { Alert.alert('권한 없음', '위치 권한을 허용해주세요.'); return; }
        setLoading(true);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            await uploadBusLocation(busId, { latitude: loc.coords.latitude, longitude: loc.coords.longitude, speed: 0 });
            uploadInterval.current = setInterval(async () => {
                const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                const kmh = Math.round((l.coords.speed ?? 0) * 3.6);
                setSpeed(kmh);
                await uploadBusLocation(busId, { latitude: l.coords.latitude, longitude: l.coords.longitude, speed: kmh });

                // ── 도착 예정 알림: 미탑승 정류장 중 가장 가까운 곳이 1km 이내면 발송 ──
                const lat = l.coords.latitude;
                const lng = l.coords.longitude;
                setStops((currentStops) => {
                    const nextStop = currentStops.find((s) => s.stopType === 'stop' && s.students?.length > 0);
                    if (!nextStop || notifiedStop.current === nextStop.id) return currentStops;
                    if (!nextStop.latitude || !nextStop.longitude) return currentStops;
                    const dist = getDistanceKm(lat, lng, nextStop.latitude, nextStop.longitude);
                    if (dist < 1.0) {
                        notifiedStop.current = nextStop.id;
                        // 각 학생에게 도착 예정 알림 발송
                        nextStop.students?.forEach((name) => {
                            const eta = Math.max(1, Math.round(dist / 0.4)); // 시속 24km 가정
                            sendApproachingNotification(name, busLabel, nextStop.name, eta).catch(() => { });
                        });
                    }
                    return currentStops;
                });
            }, UPLOAD_INTERVAL_MS);
            setElapsedSeconds(0);
            timerInterval.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
            setIsRunning(true);
        } catch (e) {
            Alert.alert('오류', '위치를 가져올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleStop = () => {
        Alert.alert('운행 종료', '운행을 종료하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '종료', style: 'destructive', onPress: async () => {
                    stopAllTracking();
                    await stopBusTracking(busId);
                    setIsRunning(false);
                    setElapsedSeconds(0);
                    setSpeed(0);
                }
            },
        ]);
    };

    const handleBoarded = (studentName, stopName) => {
        Alert.alert('탑승 확인', `${studentName} 탑승 완료로 표시합니까?`, [
            { text: '취소', style: 'cancel' },
            {
                text: '탑승 완료', onPress: () => {
                    markBoarded(busId, direction, studentName);
                    // 학부모에게 탑승 완료 푸시 알림 발송
                    sendBoardingNotification(studentName, busLabel, stopName).catch(() => { });
                }
            },
        ]);
    };

    const handleNotBoarded = (studentName) => {
        Alert.alert('미탑승 처리', `${studentName}을 미탑승으로 처리합니까?`, [
            { text: '취소', style: 'cancel' },
            { text: '미탑승', style: 'destructive', onPress: () => markNotBoarded(busId, direction, studentName, user?.role) },
        ]);
    };

    const handleClearStatus = (studentName) => {
        clearBoardingStatus(busId, direction, studentName);
    };

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // ── 두 좌표 간 거리(km) 계산 (Haversine)
    const getDistanceKm = (lat1, lng1, lat2, lng2) => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const getStudentStatus = (name) => {
        const key = name.replace(/[.$#[\]/]/g, '_');
        return dailyStatus[key];
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{busLabel} 운행 관리</Text>
                    <View style={[styles.statusBadge, isRunning ? styles.statusActive : styles.statusIdle]}>
                        <View style={[styles.statusDot, { backgroundColor: isRunning ? COLORS.success : '#ccc' }]} />
                        <Text style={[styles.statusText, { color: isRunning ? COLORS.success : COLORS.textSecondary }]}>
                            {isRunning ? '운행중' : '대기중'}
                        </Text>
                    </View>
                </View>

                <View style={styles.dirRow}>
                    {[
                        { id: 'school', label: '🌅 등교', color: '#E67E22' },
                        { id: 'home', label: '🌙 하교', color: '#2980B9' },
                    ].map((d) => (
                        <TouchableOpacity
                            key={d.id}
                            style={[styles.dirBtn, direction === d.id && { backgroundColor: d.color, borderColor: d.color }]}
                            onPress={() => { setDirection(d.id); setExpandedStop(null); }}
                        >
                            <Text style={[styles.dirBtnText, direction === d.id && { color: '#fff' }]}>{d.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 정보 카드 */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="time-outline" size={26} color={COLORS.primary} />
                            <Text style={styles.infoValue}>{formatTime(elapsedSeconds)}</Text>
                            <Text style={styles.infoLabel}>운행 시간</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoItem}>
                            <Ionicons name="speedometer-outline" size={26} color={COLORS.success} />
                            <Text style={styles.infoValue}>{speed}</Text>
                            <Text style={styles.infoLabel}>km/h</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoItem}>
                            <Ionicons name="people-outline" size={26} color={COLORS.warning} />
                            <Text style={styles.infoValue}>{stops.reduce((s, st) => s + (st.students?.length || 0), 0)}</Text>
                            <Text style={styles.infoLabel}>탑승 예정</Text>
                        </View>
                    </View>
                </View>

                {/* 시작/종료 버튼 */}
                {!isRunning ? (
                    <TouchableOpacity style={[styles.mainBtn, styles.startBtn, loading && styles.btnDisabled]}
                        onPress={handleStart} disabled={loading} activeOpacity={0.85}>
                        {loading ? <ActivityIndicator color="#fff" size="large" /> : <>
                            <Ionicons name="play-circle" size={32} color="#fff" />
                            <Text style={styles.mainBtnText}>운행 시작</Text>
                        </>}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.mainBtn, styles.stopBtn]} onPress={handleStop} activeOpacity={0.85}>
                        <Ionicons name="stop-circle" size={32} color="#fff" />
                        <Text style={styles.mainBtnText}>운행 종료</Text>
                    </TouchableOpacity>
                )}

                {/* 정류장별 탑승 체크리스트 */}
                {stops.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📍 탑승 체크리스트</Text>
                        {stops.map((stop, idx) => (
                            <View key={stop.id} style={styles.stopCard}>
                                <TouchableOpacity
                                    style={styles.stopHeader}
                                    onPress={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.stopNumBadge}>
                                        <Text style={styles.stopNumText}>{idx + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stopName}>{stop.name}</Text>
                                        <Text style={styles.stopTime}>⏰ {stop.scheduledTime || '—'}</Text>
                                    </View>
                                    <Text style={styles.studentCount}>{stop.students?.length || 0}명</Text>
                                    <Ionicons
                                        name={expandedStop === stop.id ? 'chevron-up' : 'chevron-down'}
                                        size={18} color={COLORS.textSecondary}
                                    />
                                </TouchableOpacity>

                                {expandedStop === stop.id && (stop.students || []).map((name) => {
                                    const status = getStudentStatus(name);
                                    return (
                                        <View key={name} style={styles.studentRow}>
                                            <Text style={styles.studentName}>
                                                {status?.notBoarded ? '❌' : status?.boarded ? '✅' : '⬜'} {name}
                                            </Text>
                                            {status?.notBoarded && (
                                                <Text style={styles.notBoardedTag}>
                                                    미탑승 ({status.byRole === 'parent' ? '학부모 신청' : '기사 처리'})
                                                </Text>
                                            )}
                                            <View style={styles.studentBtns}>
                                                {!status?.boarded && !status?.notBoarded && (<>
                                                    <TouchableOpacity style={styles.boardedBtn} onPress={() => handleBoarded(name, stop.name)}>
                                                        <Text style={styles.boardedBtnText}>탑승</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.notBoardedBtn} onPress={() => handleNotBoarded(name)}>
                                                        <Text style={styles.notBoardedBtnText}>미탑승</Text>
                                                    </TouchableOpacity>
                                                </>)}
                                                {(status?.boarded || status?.notBoarded) && (
                                                    <TouchableOpacity style={styles.clearBtn} onPress={() => handleClearStatus(name)}>
                                                        <Text style={styles.clearBtnText}>취소</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    dirRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
    dirBtn: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', backgroundColor: COLORS.cardBg, borderWidth: 2, borderColor: COLORS.border },
    dirBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
    safe: { flex: 1, backgroundColor: COLORS.background },
    scroll: { padding: SPACING.md, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: COLORS.textPrimary },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 6 },
    statusActive: { backgroundColor: '#E8F5E9' },
    statusIdle: { backgroundColor: '#F5F5F5' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
    infoCard: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.lg, elevation: 2, marginBottom: SPACING.md },
    infoRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    infoItem: { alignItems: 'center', gap: 4 },
    infoValue: { fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: COLORS.textPrimary },
    infoLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
    infoDivider: { width: 1, height: 44, backgroundColor: COLORS.border },
    mainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md, elevation: 4 },
    startBtn: { backgroundColor: COLORS.success },
    stopBtn: { backgroundColor: COLORS.danger },
    btnDisabled: { opacity: 0.5 },
    mainBtnText: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: '#fff' },
    section: { gap: SPACING.sm },
    sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    stopCard: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.sm, elevation: 2 },
    stopHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
    stopNumBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    stopNumText: { color: '#fff', fontWeight: 'bold', fontSize: FONTS.sizes.sm },
    stopName: { fontSize: FONTS.sizes.sm, fontWeight: 'bold', color: COLORS.textPrimary },
    stopTime: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
    studentCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginRight: 4 },
    studentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap', gap: 4 },
    studentName: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary },
    notBoardedTag: { fontSize: FONTS.sizes.xs, color: COLORS.danger, fontWeight: '600' },
    studentBtns: { flexDirection: 'row', gap: 4 },
    boardedBtn: { backgroundColor: COLORS.success + '20', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
    boardedBtnText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontWeight: '700' },
    notBoardedBtn: { backgroundColor: COLORS.danger + '20', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
    notBoardedBtnText: { color: COLORS.danger, fontSize: FONTS.sizes.xs, fontWeight: '700' },
    clearBtn: { backgroundColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
    clearBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
});

export default BusDriverScreen;
