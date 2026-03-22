import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, StatusBar, ScrollView, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { subscribeStops, subscribeDailyStatus, markBoarded, markNotBoarded, clearBoardingStatus, setCurrentStop, startGPS, stopGPS } from '../../services/routeService';
import { sendBoardingNotification } from '../../services/notificationService';
import { markAllArrived } from '../../services/attendanceService';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';

const LOCATION_TASK_NAME = 'background-location-task';

const BusDriverScreen = () => {
    const { user } = useAuth();
    const busId = user?.role;
    const busLabel = user?.label || '버스';

    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [direction, setDirection] = useState('school');
    const [stops, setStops] = useState([]);
    const [dailyStatus, setDailyStatus] = useState({});
    const [currentStopIdx, setCurrentStopIdx] = useState(-1);

    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const [absentStudents, setAbsentStudents] = useState(new Set());

    const timerInterval = useRef(null);

    useEffect(() => {
        const unsubStops = subscribeStops(busId, direction, setStops);
        const unsubStatus = subscribeDailyStatus(busId, direction, setDailyStatus);
        return () => { unsubStops(); unsubStatus(); clearInterval(timerInterval.current); };
    }, [direction]);

    const handleStart = async () => {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            Alert.alert('권한 오류', '위치 권한이 필요합니다.');
            return;
        }
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            Alert.alert('권한 안내', '백그라운드 위치 권한이 없습니다. 화면이 꺼지면 위치 전송이 멈출 수 있습니다. 설정에서 "항상 허용"으로 변경해주세요.');
            // Proceed anyway for now
        }

        Alert.alert('운행 시작', '운행을 시작하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '시작', onPress: async () => {
                    await startGPS(busId, direction);
                    try {
                        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                            accuracy: Location.Accuracy.BestForNavigation,
                            timeInterval: 5000,
                            distanceInterval: 10,
                            showsBackgroundLocationIndicator: true,
                            foregroundService: {
                                notificationTitle: "통학버스가 운행 중입니다",
                                notificationBody: "실시간 위치를 학부모님께 공유하고 있습니다.",
                                notificationColor: "#3B82F6",
                            }
                        });
                    } catch(e) {
                         console.error("GPS Start Error:", e);
                    }

                    await setCurrentStop(busId, direction, 0);
                    setCurrentStopIdx(0);
                    setElapsedSeconds(0);
                    const startTimestamp = Date.now();
                    timerInterval.current = setInterval(() => {
                        setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
                    }, 1000);
                    setIsRunning(true);
                }
            },
        ]);
    };

    const handleStop = () => {
        Alert.alert('운행 종료', '운행을 종료하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '종료', style: 'destructive', onPress: async () => {
                    clearInterval(timerInterval.current);
                    await stopGPS();
                    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
                    if (hasStarted) {
                        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                    }
                    await setCurrentStop(busId, direction, -1);
                    setCurrentStopIdx(-1);
                    setIsRunning(false);
                    setElapsedSeconds(0);
                }
            },
        ]);
    };

    const handleNextStop = async () => {
        const nextIdx = currentStopIdx + 1;
        if (nextIdx >= stops.length) return;
        await setCurrentStop(busId, direction, nextIdx);
        setCurrentStopIdx(nextIdx);
    };

    const handleBoarded = (studentName, stopName) => {
        Alert.alert('탑승 확인', `${studentName} 탑승 완료로 표시합니까?`, [
            { text: '취소', style: 'cancel' },
            {
                text: '탑승 완료', onPress: () => {
                    markBoarded(busId, direction, studentName);
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

    const handleSchoolArrived = () => {
        setAbsentStudents(new Set());
        setShowArrivalModal(true);
    };

    const confirmArrival = async () => {
        // Collect all expected students
        const allStudents = [];
        stops.forEach(stop => {
            if (stop.students) {
                stop.students.forEach(s => allStudents.push({ name: s, stopName: stop.name }));
            }
        });

        // 1. Mark missing students as not boarded
        for (const stu of allStudents) {
            const status = getStudentStatus(stu.name);
            if (absentStudents.has(stu.name)) {
                 await markNotBoarded(busId, direction, stu.name, 'driver');
            } else if (!status?.notBoarded && !status?.boarded) {
                 // 2. Mark remaining unknown students as boarded
                 await markBoarded(busId, direction, stu.name);
                 await sendBoardingNotification(stu.name, busLabel, stu.stopName).catch(() => { });
            }
        }

        // 3. Mark all arrived to school (changes global status)
        const count = await markAllArrived(busId);
        await setCurrentStop(busId, direction, stops.length - 1);
        setCurrentStopIdx(stops.length - 1);
        Alert.alert('완료', `${count}명 등교 완료, ${absentStudents.size}명 미탑승 처리되었습니다.`);
        setShowArrivalModal(false);
    };

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const getStudentStatus = (name) => {
        const key = name.replace(/[.$#[\]/]/g, '_');
        return dailyStatus[key];
    };

    const currentStop = stops[currentStopIdx];
    const isLastStop = currentStopIdx === stops.length - 1;

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

                {/* 등교/하교 토글 */}
                <View style={styles.dirRow}>
                    {[
                        { id: 'school', label: '🌅 등교', color: '#E67E22' },
                        { id: 'home', label: '🌙 하교', color: '#2980B9' },
                    ].map(d => (
                        <TouchableOpacity
                            key={d.id}
                            style={[styles.dirBtn, direction === d.id && { backgroundColor: d.color, borderColor: d.color }]}
                            onPress={() => { if (!isRunning) { setDirection(d.id); } }}
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
                            <Ionicons name="location-outline" size={26} color={COLORS.success} />
                            <Text style={styles.infoValue} numberOfLines={1}>
                                {isRunning && currentStop ? currentStop.name : '—'}
                            </Text>
                            <Text style={styles.infoLabel}>현재 정류장</Text>
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
                    <TouchableOpacity style={[styles.mainBtn, styles.startBtn]} onPress={handleStart} activeOpacity={0.85}>
                        <Ionicons name="play-circle" size={32} color="#fff" />
                        <Text style={styles.mainBtnText}>운행 시작</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.mainBtn, styles.stopBtn]} onPress={handleStop} activeOpacity={0.85}>
                        <Ionicons name="stop-circle" size={32} color="#fff" />
                        <Text style={styles.mainBtnText}>운행 종료</Text>
                    </TouchableOpacity>
                )}

                {/* 학교 도착 버튼 (등교 운행 중일 때만) */}
                {isRunning && direction === 'school' && (
                    <TouchableOpacity style={[styles.mainBtn, styles.arrivedBtn]} onPress={handleSchoolArrived} activeOpacity={0.85}>
                        <Ionicons name="school" size={24} color="#fff" />
                        <Text style={styles.mainBtnText}>🏫 학교 도착 (등교 완료)</Text>
                    </TouchableOpacity>
                )}

                {/* 정류장별 탑승 체크리스트 */}
                {isRunning && stops.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📍 정류장 진행 현황</Text>
                        {stops.map((stop, idx) => {
                            const isCurrent = idx === currentStopIdx;
                            const isPast = idx < currentStopIdx;
                            return (
                                <View key={stop.id} style={[styles.stopCard, isCurrent && styles.stopCardCurrent]}>
                                    <View style={styles.stopHeader}>
                                        <View style={[styles.stopNumBadge, isPast && styles.stopNumBadgeDone, isCurrent && styles.stopNumBadgeCurrent]}>
                                            <Text style={styles.stopNumText}>
                                                {isPast ? '✓' : idx + 1}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.stopName, isCurrent && { color: COLORS.primary }]}>
                                                {stop.name}
                                                {isCurrent && <Text style={styles.currentBadge}> ● 현재</Text>}
                                            </Text>
                                            <Text style={styles.stopTime}>⏰ {stop.scheduledTime || '—'}</Text>
                                        </View>
                                        <Text style={styles.studentCount}>{stop.students?.length || 0}명</Text>
                                    </View>

                                    {/* 현재 정류장의 학생 체크 */}
                                    {isCurrent && (stop.students || []).map(name => {
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

                                    {/* 다음 정류장 버튼 (현재 정류장, 마지막 아닐 때) */}
                                    {isCurrent && !isLastStop && (
                                        <TouchableOpacity style={styles.nextStopBtn} onPress={handleNextStop} activeOpacity={0.85}>
                                            <Text style={styles.nextStopBtnText}>다음 정류장으로 ▶</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* 일괄 도착 및 예외 처리 모달 */}
            <Modal visible={showArrivalModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>학교 도착 일괄 처리</Text>
                        <Text style={styles.modalSub}>무단으로 안 탄 학생(결석자)만 터치해주세요.{'\n'}학부모가 사전에 결석 신고한 학생은 회색으로 표시됩니다.</Text>
                        
                        <ScrollView style={{ maxHeight: 300, marginVertical: SPACING.md }}>
                            {stops.map(stop => (
                                stop.students && stop.students.map(name => {
                                    const status = getStudentStatus(name);
                                    const isPreAbsent = status?.notBoarded && status?.byRole === 'parent';
                                    const isSelectedAbsent = absentStudents.has(name);
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={name}
                                            style={[
                                                styles.modalStudentRow,
                                                isSelectedAbsent && styles.modalStudentRowAbsent,
                                                isPreAbsent && { opacity: 0.5 }
                                            ]}
                                            disabled={isPreAbsent}
                                            onPress={() => {
                                                setAbsentStudents(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(name)) next.delete(name);
                                                    else next.add(name);
                                                    return next;
                                                });
                                            }}
                                        >
                                            <Text style={styles.modalStudentName}>{name}</Text>
                                            <Text style={styles.modalStudentStatus}>
                                                {isPreAbsent ? '사전 결석' : isSelectedAbsent ? '❌ 미탑승(체크됨)' : '✅ 자동 탑승'}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })
                            ))}
                        </ScrollView>
                        
                        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.border }]} onPress={() => setShowArrivalModal(false)}>
                                <Text style={styles.modalBtnText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={confirmArrival}>
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>제외하고 전원 탑승</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    scroll: { padding: SPACING.md, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: COLORS.textPrimary },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 6 },
    statusActive: { backgroundColor: '#E8F5E9' },
    statusIdle: { backgroundColor: '#F5F5F5' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: FONTS.sizes.sm, fontWeight: '700' },

    dirRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
    dirBtn: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', backgroundColor: COLORS.cardBg, borderWidth: 2, borderColor: COLORS.border },
    dirBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },

    infoCard: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.lg, elevation: 2, marginBottom: SPACING.md },
    infoRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    infoItem: { alignItems: 'center', gap: 4, flex: 1 },
    infoValue: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary },
    infoLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
    infoDivider: { width: 1, height: 44, backgroundColor: COLORS.border },

    mainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.sm, elevation: 4 },
    startBtn: { backgroundColor: COLORS.success },
    stopBtn: { backgroundColor: COLORS.danger },
    arrivedBtn: { backgroundColor: '#7C3AED' },
    mainBtnText: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: '#fff' },

    section: { gap: SPACING.sm, marginTop: SPACING.sm },
    sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },

    stopCard: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.sm, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
    stopCardCurrent: { borderColor: COLORS.primary },
    stopHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
    stopNumBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    stopNumBadgeDone: { backgroundColor: COLORS.success },
    stopNumBadgeCurrent: { backgroundColor: COLORS.primary, elevation: 3 },
    stopNumText: { color: '#fff', fontWeight: 'bold', fontSize: FONTS.sizes.sm },
    stopName: { fontSize: FONTS.sizes.sm, fontWeight: 'bold', color: COLORS.textPrimary },
    currentBadge: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
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

    nextStopBtn: { margin: SPACING.md, marginTop: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
    nextStopBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },

    // 모달 스타일
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.lg },
    modalCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.lg },
    modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    modalSub: { fontSize: FONTS.sizes.sm, color: COLORS.danger, marginBottom: SPACING.sm },
    modalStudentRow: {
        flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, 
        backgroundColor: COLORS.background, borderRadius: RADIUS.md, marginBottom: 8,
        borderWidth: 2, borderColor: 'transparent'
    },
    modalStudentRowAbsent: { borderColor: COLORS.danger, backgroundColor: '#FEF2F2' },
    modalStudentName: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary },
    modalStudentStatus: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
    modalBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
    modalBtnText: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary },
});

export default BusDriverScreen;
