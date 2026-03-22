import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../services/firebaseConfig';
import { ref, onValue, off, get } from 'firebase/database';
import { subscribeStudents } from '../../services/studentService';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const toDate = (d) => d.toISOString().slice(0, 10);
const encode = (name) => name.replace(/[.$#[\]/]/g, '_');
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';

// 이번 주 월~금 날짜 배열
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

const isScheduledOff = (student, dateStr) => {
    if (!student?.offDays?.length) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return student.offDays.includes(d.getDay());
};

const getStatus = (statusObj, student, dateStr) => {
    if (isScheduledOff(student, dateStr)) return 'scheduled';
    if (!statusObj) return 'waiting';
    if (statusObj.notBoarded) return 'notBoarded';
    if (statusObj.arrived) return 'arrived';
    if (statusObj.boarded) return 'boarded';
    return 'waiting';
};

const STATUS_CONFIG = {
    waiting:   { emoji: '⬜', label: '미확인',    color: '#94A3B8', bg: '#F1F5F9' },
    boarded:   { emoji: '✅', label: '탑승완료',  color: '#10B981', bg: '#ECFDF5' },
    arrived:   { emoji: '🏫', label: '등교완료',  color: '#2563EB', bg: '#EFF6FF' },
    notBoarded:{ emoji: '❌', label: '미탑승',    color: '#EF4444', bg: '#FEF2F2' },
    scheduled: { emoji: '📅', label: '예정미탑승', color: '#F59E0B', bg: '#FFFBEB' },
};

// ── 오늘 결과 탭 ─────────────────────────────────────────────
const TodayTab = ({ students, bus1Status, bus2Status }) => {
    const today = toDate(new Date());
    const todayDay = new Date().getDay();

    const getStatusForStudent = (student) => {
        const statusMap = student.busId === 'bus1' ? bus1Status : bus2Status;
        const st = statusMap[encode(student.studentName)];
        return getStatus(st, student, today);
    };

    const counts = students.reduce((acc, s) => {
        const st = getStatusForStudent(s);
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, {});

    const bus1 = students.filter(s => s.busId === 'bus1');
    const bus2 = students.filter(s => s.busId === 'bus2');

    const renderStudent = (student) => {
        const statusMap = student.busId === 'bus1' ? bus1Status : bus2Status;
        const st = statusMap[encode(student.studentName)];
        const statusKey = getStatus(st, student, today);
        const cfg = STATUS_CONFIG[statusKey];
        const timeStr = st?.arrivedTime ? fmtTime(st.arrivedTime) : st?.boardedTime ? fmtTime(st.boardedTime) : '';

        return (
            <View key={student.code} style={[styles.studentRow, { backgroundColor: cfg.bg }]}>
                <Text style={styles.studentEmoji}>{cfg.emoji}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{student.studentName}</Text>
                    {timeStr ? <Text style={styles.timeText}>{timeStr}</Text> : null}
                    {statusKey === 'scheduled' && student.offDays?.length > 0 && (
                        <Text style={styles.offDayText}>
                            {student.offDays.map(d => DAY_LABELS[d]).join('·')} 미탑승
                        </Text>
                    )}
                </View>
                <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
        );
    };

    const renderBusSection = (busStudents, label, color) => (
        <View style={styles.busSection}>
            <View style={[styles.busSectionHeader, { backgroundColor: color }]}>
                <Ionicons name="bus" size={16} color="#fff" />
                <Text style={styles.busSectionTitle}>{label}</Text>
                <Text style={styles.busSectionCount}>{busStudents.length}명</Text>
            </View>
            {busStudents.length === 0
                ? <Text style={styles.emptyBus}>등록된 학생 없음</Text>
                : busStudents.map(renderStudent)}
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.tabContent}>
            {/* 요약 */}
            <View style={styles.summaryRow}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    counts[key] > 0 ? (
                        <View key={key} style={[styles.summaryBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={styles.summaryEmoji}>{cfg.emoji}</Text>
                            <Text style={[styles.summaryCount, { color: cfg.color }]}>{counts[key]}</Text>
                        </View>
                    ) : null
                ))}
            </View>
            {renderBusSection(bus1, '1호차', '#1D4ED8')}
            {renderBusSection(bus2, '2호차', '#7C3AED')}
        </ScrollView>
    );
};

// ── 주간 현황 탭 ─────────────────────────────────────────────
const WeekTab = ({ students }) => {
    const weekDates = getWeekDates();
    const today = toDate(new Date());
    const [weekData, setWeekData] = useState({});

    useEffect(() => {
        const listeners = [];
        weekDates.forEach(date => {
            ['bus1', 'bus2'].forEach(busId => {
                const r = ref(db, `dailyStatus/${date}/${busId}/school`);
                const handler = snap => {
                    setWeekData(prev => ({
                        ...prev,
                        [date]: { ...(prev[date] || {}), [busId]: snap.val() || {} }
                    }));
                };
                onValue(r, handler);
                listeners.push({ r, handler });
            });
        });
        return () => listeners.forEach(({ r, handler }) => off(r, 'value', handler));
    }, []);

    const getCellStatus = (student, dateStr) => {
        const isFuture = dateStr > today;
        if (isFuture) return null;
        const busData = weekData[dateStr]?.[student.busId] || {};
        const st = busData[encode(student.studentName)];
        return getStatus(st, student, dateStr);
    };

    const getCellDisplay = (statusKey) => {
        if (statusKey === null) return { emoji: '—', color: '#CBD5E1' };
        return { emoji: STATUS_CONFIG[statusKey]?.emoji || '⬜', color: STATUS_CONFIG[statusKey]?.color || '#94A3B8' };
    };

    return (
        <ScrollView contentContainerStyle={styles.tabContent} horizontal={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    {/* 헤더 */}
                    <View style={styles.weekHeaderRow}>
                        <View style={styles.weekNameCell} />
                        {weekDates.map(date => {
                            const d = new Date(date + 'T00:00:00');
                            const isToday = date === today;
                            return (
                                <View key={date} style={[styles.weekDayCell, isToday && styles.weekDayCellToday]}>
                                    <Text style={[styles.weekDayLabel, isToday && { color: '#2563EB' }]}>
                                        {DAY_LABELS[d.getDay()]}
                                    </Text>
                                    <Text style={[styles.weekDayDate, isToday && { color: '#2563EB' }]}>
                                        {d.getDate()}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* 학생 행 */}
                    {students.map((student, idx) => (
                        <View key={student.code} style={[styles.weekStudentRow, idx % 2 === 0 && { backgroundColor: '#F8FAFF' }]}>
                            <View style={styles.weekNameCell}>
                                <Text style={styles.weekStudentName} numberOfLines={1}>{student.studentName}</Text>
                                <Text style={styles.weekBusLabel}>{student.busId === 'bus1' ? '1호차' : '2호차'}</Text>
                            </View>
                            {weekDates.map(date => {
                                const st = getCellStatus(student, date);
                                const { emoji, color } = getCellDisplay(st);
                                return (
                                    <View key={date} style={styles.weekDayCell}>
                                        <Text style={{ fontSize: 16, color }}>{emoji}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}

                    {/* 범례 */}
                    <View style={styles.legendRow}>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <View key={key} style={styles.legendItem}>
                                <Text style={{ fontSize: 12 }}>{cfg.emoji}</Text>
                                <Text style={styles.legendLabel}>{cfg.label}</Text>
                            </View>
                        ))}
                        <View style={styles.legendItem}>
                            <Text style={{ fontSize: 12, color: '#CBD5E1' }}>—</Text>
                            <Text style={styles.legendLabel}>미래</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ScrollView>
    );
};

// ── 메인 ─────────────────────────────────────────────────────
const TeacherAttendanceScreen = () => {
    const navigation = useNavigation();
    const [students, setStudents] = useState([]);
    const [bus1Status, setBus1Status] = useState({});
    const [bus2Status, setBus2Status] = useState({});
    const [activeTab, setActiveTab] = useState('today');
    const today = toDate(new Date());

    useEffect(() => {
        const unsubStudents = subscribeStudents(setStudents);
        const r1 = ref(db, `dailyStatus/${today}/bus1/school`);
        const r2 = ref(db, `dailyStatus/${today}/bus2/school`);
        onValue(r1, snap => setBus1Status(snap.val() || {}));
        onValue(r2, snap => setBus2Status(snap.val() || {}));
        return () => { unsubStudents(); off(r1); off(r2); };
    }, []);

    const totalBoarded = students.filter(s => {
        const st = (s.busId === 'bus1' ? bus1Status : bus2Status)[encode(s.studentName)];
        return st?.boarded || st?.arrived;
    }).length;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar backgroundColor="#1D4ED8" barStyle="light-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>등하교 현황 ✅</Text>
                <Text style={styles.headerSub}>
                    {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    {'  '}전체 {students.length}명 · 탑승 {totalBoarded}명
                </Text>
            </View>

            {/* 탭 */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabBarBtn, activeTab === 'today' && styles.tabBarBtnActive]}
                    onPress={() => setActiveTab('today')}
                >
                    <Text style={[styles.tabBarBtnText, activeTab === 'today' && styles.tabBarBtnTextActive]}>오늘 결과</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBarBtn, activeTab === 'week' && styles.tabBarBtnActive]}
                    onPress={() => setActiveTab('week')}
                >
                    <Text style={[styles.tabBarBtnText, activeTab === 'week' && styles.tabBarBtnTextActive]}>이번 주</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.calendarBtn}
                    onPress={() => navigation.navigate('AttendanceCalendar')}
                >
                    <Ionicons name="calendar" size={14} color="#1D4ED8" />
                    <Text style={styles.calendarBtnText}>월간</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'today'
                ? <TodayTab students={students} bus1Status={bus1Status} bus2Status={bus2Status} />
                : <WeekTab students={students} />
            }
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F0F4FF' },
    header: {
        backgroundColor: '#1D4ED8', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomLeftRadius: 18, borderBottomRightRadius: 18, gap: 4,
    },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },

    tabBar: { flexDirection: 'row', margin: 12, backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3 },
    tabBarBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    tabBarBtnActive: { backgroundColor: '#fff', elevation: 2 },
    tabBarBtnText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
    tabBarBtnTextActive: { color: '#1D4ED8' },
    calendarBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#DBEAFE', marginLeft: 4 },
    calendarBtnText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },

    tabContent: { paddingHorizontal: 12, paddingBottom: 32, gap: 12 },

    summaryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    summaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    summaryEmoji: { fontSize: 14 },
    summaryCount: { fontSize: 15, fontWeight: '800' },

    busSection: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2 },
    busSectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    busSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', flex: 1 },
    busSectionCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },

    studentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    studentEmoji: { fontSize: 18 },
    studentName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
    timeText: { fontSize: 11, color: '#64748B', marginTop: 1 },
    offDayText: { fontSize: 10, color: '#F59E0B', fontWeight: '600', marginTop: 1 },
    statusLabel: { fontSize: 12, fontWeight: '700' },
    emptyBus: { padding: 16, textAlign: 'center', color: '#94A3B8', fontSize: 13 },

    // 주간
    weekHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingBottom: 6, marginBottom: 2 },
    weekNameCell: { width: 80, paddingHorizontal: 8, justifyContent: 'center' },
    weekDayCell: { width: 50, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    weekDayCellToday: { backgroundColor: '#EFF6FF', borderRadius: 8 },
    weekDayLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
    weekDayDate: { fontSize: 13, fontWeight: '800', color: '#334155' },
    weekStudentRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    weekStudentName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    weekBusLabel: { fontSize: 10, color: '#94A3B8' },

    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingHorizontal: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendLabel: { fontSize: 10, color: '#64748B' },
});

export default TeacherAttendanceScreen;
