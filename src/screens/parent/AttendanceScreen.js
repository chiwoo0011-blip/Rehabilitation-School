import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { subscribeStudentAttendance, subscribeStudentHomeAttendance } from '../../services/attendanceService';
import { db } from '../../services/firebaseConfig';
import { ref, onValue, off } from 'firebase/database';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const toDate = (d) => d.toISOString().slice(0, 10);
const encode = (name) => name.replace(/[.$#[\]/]/g, '_');

const fmtTime = (ts) => {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return [0, 1, 2, 3, 4].map(i => {
        const d = new Date(today);
        d.setDate(today.getDate() + mondayOffset + i);
        return toDate(d);
    });
};

const isScheduledOff = (offDays, dateStr) => {
    if (!offDays?.length) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return offDays.includes(d.getDay());
};

const StatusCard = ({ title, icon, statusKey, time }) => {
    const configs = {
        waiting:    { bg: '#F1F5F9', color: '#94A3B8', label: '대기중',     emoji: '⬜' },
        boarded:    { bg: '#ECFDF5', color: '#10B981', label: '탑승 완료',  emoji: '✅' },
        arrived:    { bg: '#EFF6FF', color: '#2563EB', label: '등교 완료',  emoji: '🏫' },
        notBoarded: { bg: '#FEF2F2', color: '#EF4444', label: '미탑승',     emoji: '❌' },
        scheduled:  { bg: '#FFFBEB', color: '#F59E0B', label: '예정 미탑승', emoji: '📅' },
        departed:   { bg: '#ECFDF5', color: '#10B981', label: '하교 출발',  emoji: '🚌' },
    };
    const c = configs[statusKey] || configs.waiting;
    return (
        <View style={[styles.card, { backgroundColor: c.bg }]}>
            <Text style={styles.cardEmoji}>{c.emoji}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={[styles.cardStatus, { color: c.color }]}>{c.label}</Text>
                {time && <Text style={styles.cardTime}>{time}</Text>}
            </View>
            <Ionicons name={icon} size={22} color={c.color} />
        </View>
    );
};

const AttendanceScreen = () => {
    const { user } = useAuth();
    const studentName = user?.studentName;
    const busId = user?.busId;
    const offDays = user?.offDays || [];

    const [schoolStatus, setSchoolStatus] = useState(null);
    const [homeStatus, setHomeStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('today');
    const [weekData, setWeekData] = useState({});

    const today = toDate(new Date());
    const weekDates = getWeekDates();

    useEffect(() => {
        if (!studentName || !busId) return;
        const unsubSchool = subscribeStudentAttendance(busId, studentName, setSchoolStatus);
        const unsubHome = subscribeStudentHomeAttendance(busId, studentName, setHomeStatus);
        return () => { unsubSchool(); unsubHome(); };
    }, [studentName, busId]);

    // 주간 데이터 구독
    useEffect(() => {
        if (!studentName || !busId) return;
        const key = encode(studentName);
        const listeners = [];
        weekDates.forEach(date => {
            const r = ref(db, `dailyStatus/${date}/${busId}/school/${key}`);
            const handler = snap => {
                setWeekData(prev => ({ ...prev, [date]: snap.val() || null }));
            };
            onValue(r, handler);
            listeners.push({ r, handler });
        });
        return () => listeners.forEach(({ r, handler }) => off(r, 'value', handler));
    }, [studentName, busId]);

    const getSchoolStatus = () => {
        if (isScheduledOff(offDays, today)) return 'scheduled';
        if (!schoolStatus) return 'waiting';
        if (schoolStatus.notBoarded) return 'notBoarded';
        if (schoolStatus.arrived) return 'arrived';
        if (schoolStatus.boarded) return 'boarded';
        return 'waiting';
    };

    const getWeekCellStatus = (dateStr) => {
        const isFuture = dateStr > today;
        if (isFuture) return null;
        if (isScheduledOff(offDays, dateStr)) return 'scheduled';
        const st = weekData[dateStr];
        if (!st) return 'waiting';
        if (st.notBoarded) return 'notBoarded';
        if (st.arrived) return 'arrived';
        if (st.boarded) return 'boarded';
        return 'waiting';
    };

    const WEEK_EMOJI = {
        waiting: '⬜', boarded: '✅', arrived: '🏫',
        notBoarded: '❌', scheduled: '📅',
    };

    if (!studentName || !busId) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.empty}>
                    <Text style={{ fontSize: 48 }}>ℹ️</Text>
                    <Text style={styles.emptyText}>학생 정보가 없습니다.</Text>
                    <Text style={styles.emptySub}>운영자에게 문의해주세요.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar backgroundColor="#2563EB" barStyle="light-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>등하교 확인 ✅</Text>
                <Text style={styles.headerSub}>
                    {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </Text>
            </View>

            {/* 탭 */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBarBtn, activeTab === 'today' && styles.tabBarBtnActive]}
                    onPress={() => setActiveTab('today')}
                >
                    <Text style={[styles.tabBarBtnText, activeTab === 'today' && styles.tabBarBtnTextActive]}>오늘</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBarBtn, activeTab === 'week' && styles.tabBarBtnActive]}
                    onPress={() => setActiveTab('week')}
                >
                    <Text style={[styles.tabBarBtnText, activeTab === 'week' && styles.tabBarBtnTextActive]}>이번 주</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'today' ? (
                <ScrollView contentContainerStyle={styles.content}>
                    {/* 학생 정보 */}
                    <View style={styles.studentBadge}>
                        <Ionicons name="person-circle" size={36} color="#2563EB" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{studentName}</Text>
                            <Text style={styles.busLabel}>{busId === 'bus1' ? '1호 버스' : '2호 버스'}</Text>
                        </View>
                        {offDays.length > 0 && (
                            <View style={styles.offDayBadge}>
                                <Text style={styles.offDayBadgeText}>
                                    📅 {offDays.map(d => DAY_LABELS[d]).join('·')} 미탑승
                                </Text>
                            </View>
                        )}
                    </View>

                    {isScheduledOff(offDays, today) ? (
                        <View style={styles.scheduledBox}>
                            <Text style={{ fontSize: 32 }}>📅</Text>
                            <Text style={styles.scheduledText}>오늘은 예정 미탑승일입니다.</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionLabel}>🌅 등교</Text>
                            <StatusCard title="버스 탑승" icon="bus" statusKey={schoolStatus?.notBoarded ? 'notBoarded' : schoolStatus?.boarded ? 'boarded' : 'waiting'} time={fmtTime(schoolStatus?.boardedTime)} />
                            <StatusCard title="학교 도착" icon="school" statusKey={schoolStatus?.arrived ? 'arrived' : 'waiting'} time={fmtTime(schoolStatus?.arrivedTime)} />
                            {schoolStatus?.notBoarded && (
                                <View style={styles.noticeBox}>
                                    <Ionicons name="information-circle" size={16} color="#EF4444" />
                                    <Text style={styles.noticeText}>
                                        미탑승 처리됨 ({schoolStatus.byRole === 'parent' ? '학부모 신청' : '기사 처리'})
                                    </Text>
                                </View>
                            )}

                            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>🌙 하교</Text>
                            <StatusCard title="버스 탑승 (하교)" icon="bus" statusKey={homeStatus?.boarded ? 'departed' : homeStatus?.notBoarded ? 'notBoarded' : 'waiting'} time={fmtTime(homeStatus?.boardedTime)} />
                        </>
                    )}
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.weekTable}>
                        {/* 헤더 */}
                        <View style={styles.weekHeaderRow}>
                            {weekDates.map(date => {
                                const d = new Date(date + 'T00:00:00');
                                const isToday = date === today;
                                return (
                                    <View key={date} style={[styles.weekCell, isToday && styles.weekCellToday]}>
                                        <Text style={[styles.weekDayLabel, isToday && { color: '#2563EB' }]}>
                                            {DAY_LABELS[d.getDay()]}
                                        </Text>
                                        <Text style={[styles.weekDateLabel, isToday && { color: '#2563EB' }]}>
                                            {d.getDate()}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* 결과 행 */}
                        <View style={styles.weekResultRow}>
                            {weekDates.map(date => {
                                const st = getWeekCellStatus(date);
                                const emoji = st ? (WEEK_EMOJI[st] || '⬜') : '—';
                                return (
                                    <View key={date} style={styles.weekCell}>
                                        <Text style={{ fontSize: 22 }}>{emoji}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* 범례 */}
                    <View style={styles.legendRow}>
                        {[['✅', '탑승완료'], ['🏫', '등교완료'], ['❌', '미탑승'], ['📅', '예정미탑승'], ['⬜', '미확인']].map(([emoji, label]) => (
                            <View key={label} style={styles.legendItem}>
                                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                                <Text style={styles.legendLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F0F4FF' },
    header: {
        backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
    },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    tabBar: { flexDirection: 'row', margin: 12, backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3 },
    tabBarBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    tabBarBtnActive: { backgroundColor: '#fff', elevation: 2 },
    tabBarBtnText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
    tabBarBtnTextActive: { color: '#2563EB' },

    content: { padding: 16, paddingBottom: 32 },
    studentBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        marginBottom: 16, elevation: 2, borderWidth: 1.5, borderColor: '#DBEAFE',
    },
    studentName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    busLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
    offDayBadge: { backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    offDayBadgeText: { fontSize: 11, color: '#F59E0B', fontWeight: '700' },

    scheduledBox: { alignItems: 'center', gap: 8, padding: 32 },
    scheduledText: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, marginBottom: 8 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 8 },
    cardEmoji: { fontSize: 22 },
    cardTitle: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
    cardStatus: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    cardTime: { fontSize: 11, color: '#64748B', marginTop: 2 },
    noticeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 6 },
    noticeText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },

    weekTable: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, marginBottom: 16 },
    weekHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 8 },
    weekResultRow: { flexDirection: 'row' },
    weekCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    weekCellToday: { backgroundColor: '#EFF6FF', borderRadius: 8 },
    weekDayLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
    weekDateLabel: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 2 },

    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendLabel: { fontSize: 11, color: '#64748B' },

    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    emptySub: { fontSize: 13, color: '#64748B' },
});

export default AttendanceScreen;
