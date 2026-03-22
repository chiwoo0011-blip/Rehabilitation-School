import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getMonthlyStatus } from '../../services/routeService';
import { subscribeStudents } from '../../services/studentService';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const getYearMonth = (offset = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const getMonthLabel = (ym) => {
    const [y, m] = ym.split('-');
    return `${y}년 ${parseInt(m)}월`;
};

const getCalendarDays = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const lastDate = new Date(y, m, 0).getDate();
    const days = [];
    // 앞쪽 빈칸
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(d);
    return days;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const BUSES = [
    { id: 'bus1', label: '1호차' },
    { id: 'bus2', label: '2호차' },
];

const AttendanceCalendarScreen = ({ navigation }) => {
    const { user } = useAuth();
    const isParent = user?.role === 'parent';

    const [monthOffset, setMonthOffset] = useState(0);
    const [direction, setDirection] = useState('school');
    const [selectedBus, setSelectedBus] = useState(user?.busId || 'bus1');
    const [selectedStudent, setSelectedStudent] = useState(isParent ? user?.studentName : null);
    const [students, setStudents] = useState([]);
    const [monthlyData, setMonthlyData] = useState({});
    const [loading, setLoading] = useState(false);

    const yearMonth = getYearMonth(monthOffset);
    const calendarDays = getCalendarDays(yearMonth);
    const today = todayStr();

    // 교사/운영자: 학생 목록 구독
    useEffect(() => {
        if (isParent) return;
        const unsub = subscribeStudents((list) => {
            // 선택된 버스의 학생만 필터
            const filtered = list.filter(s => s.busId === selectedBus);
            setStudents(filtered);
            if (!selectedStudent && filtered.length > 0) {
                setSelectedStudent(filtered[0].studentName);
            }
        });
        return unsub;
    }, [selectedBus]);

    // 월간 데이터 조회
    const fetchData = useCallback(async () => {
        if (!selectedStudent || !selectedBus) return;
        setLoading(true);
        try {
            const data = await getMonthlyStatus(selectedBus, direction, selectedStudent, yearMonth);
            setMonthlyData(data);
        } catch (e) {
            console.warn('월간 데이터 조회 실패:', e);
            setMonthlyData({});
        } finally {
            setLoading(false);
        }
    }, [selectedBus, direction, selectedStudent, yearMonth]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getCellStatus = (day) => {
        if (!day) return null;
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
        if (dateStr > today) return 'future';
        const dow = new Date(dateStr + 'T00:00:00').getDay();
        if (dow === 0 || dow === 6) return 'weekend';
        const st = monthlyData[dateStr];
        if (!st) return 'none';
        if (st.notBoarded) return 'notBoarded';
        if (st.boarded) return 'boarded';
        return 'none';
    };

    const STATUS_STYLE = {
        boarded:    { bg: '#DCFCE7', color: '#16A34A', emoji: '✅' },
        notBoarded: { bg: '#FEE2E2', color: '#DC2626', emoji: '❌' },
        none:       { bg: '#F1F5F9', color: '#94A3B8', emoji: '—' },
        weekend:    { bg: '#F8FAFC', color: '#CBD5E1', emoji: '' },
        future:     { bg: '#F8FAFC', color: '#CBD5E1', emoji: '' },
    };

    // 월간 요약 계산
    const summary = Object.values(monthlyData).reduce((acc, st) => {
        if (st.boarded) acc.boarded++;
        else if (st.notBoarded) acc.notBoarded++;
        return acc;
    }, { boarded: 0, notBoarded: 0 });

    // 학생 순환 선택 (간단한 이전/다음)
    const studentIndex = students.findIndex(s => s.studentName === selectedStudent);
    const prevStudent = () => {
        if (studentIndex > 0) setSelectedStudent(students[studentIndex - 1].studentName);
    };
    const nextStudent = () => {
        if (studentIndex < students.length - 1) setSelectedStudent(students[studentIndex + 1].studentName);
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>월간 출결 현황</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* 등교/하교 + 버스 선택 */}
                <View style={styles.filterRow}>
                    {[{ id: 'school', label: '🌅 등교' }, { id: 'home', label: '🌙 하교' }].map(d => (
                        <TouchableOpacity
                            key={d.id}
                            style={[styles.filterBtn, direction === d.id && styles.filterBtnActive]}
                            onPress={() => setDirection(d.id)}
                        >
                            <Text style={[styles.filterBtnText, direction === d.id && styles.filterBtnTextActive]}>{d.label}</Text>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.filterDivider} />
                    {BUSES.map(bus => (
                        <TouchableOpacity
                            key={bus.id}
                            style={[styles.filterBtn, selectedBus === bus.id && styles.filterBtnActive]}
                            onPress={() => { setSelectedBus(bus.id); if (isParent) return; setSelectedStudent(null); }}
                            disabled={isParent && !!user?.busId}
                        >
                            <Text style={[styles.filterBtnText, selectedBus === bus.id && styles.filterBtnTextActive]}>{bus.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 학생 선택 (교사/운영자용) */}
                {!isParent && students.length > 0 && (
                    <View style={styles.studentSelector}>
                        <TouchableOpacity onPress={prevStudent} disabled={studentIndex <= 0}>
                            <Ionicons name="chevron-back" size={22} color={studentIndex <= 0 ? '#CBD5E1' : '#2563EB'} />
                        </TouchableOpacity>
                        <View style={styles.studentInfo}>
                            <Ionicons name="person-circle" size={28} color="#2563EB" />
                            <Text style={styles.studentName}>{selectedStudent || '학생 선택'}</Text>
                            <Text style={styles.studentCount}>{studentIndex + 1}/{students.length}</Text>
                        </View>
                        <TouchableOpacity onPress={nextStudent} disabled={studentIndex >= students.length - 1}>
                            <Ionicons name="chevron-forward" size={22} color={studentIndex >= students.length - 1 ? '#CBD5E1' : '#2563EB'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 학부모: 학생 이름 표시 */}
                {isParent && selectedStudent && (
                    <View style={styles.studentSelector}>
                        <Ionicons name="person-circle" size={28} color="#2563EB" />
                        <Text style={styles.studentName}>{selectedStudent}</Text>
                    </View>
                )}

                {/* 월 이동 */}
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={styles.monthArrow}>
                        <Ionicons name="chevron-back" size={24} color="#2563EB" />
                    </TouchableOpacity>
                    <Text style={styles.monthLabel}>{getMonthLabel(yearMonth)}</Text>
                    <TouchableOpacity
                        onPress={() => setMonthOffset(o => o + 1)}
                        style={styles.monthArrow}
                        disabled={monthOffset >= 0}
                    >
                        <Ionicons name="chevron-forward" size={24} color={monthOffset >= 0 ? '#CBD5E1' : '#2563EB'} />
                    </TouchableOpacity>
                </View>

                {/* 달력 */}
                <View style={styles.calendarCard}>
                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color="#2563EB" />
                        </View>
                    )}

                    {/* 요일 헤더 */}
                    <View style={styles.calRow}>
                        {DAY_LABELS.map((label, i) => (
                            <View key={i} style={styles.calHeaderCell}>
                                <Text style={[styles.calHeaderText, i === 0 && { color: '#EF4444' }, i === 6 && { color: '#3B82F6' }]}>
                                    {label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* 날짜 셀 */}
                    {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIdx) => (
                        <View key={rowIdx} style={styles.calRow}>
                            {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                                const status = getCellStatus(day);
                                const st = status ? STATUS_STYLE[status] : null;
                                const dateStr = day ? `${yearMonth}-${String(day).padStart(2, '0')}` : '';
                                const isToday = dateStr === today;
                                return (
                                    <View key={colIdx} style={[styles.calCell, st && { backgroundColor: st.bg }, isToday && styles.calCellToday]}>
                                        {day && (
                                            <>
                                                <Text style={[styles.calDayNum, isToday && styles.calDayNumToday, st && { color: st.color }]}>
                                                    {day}
                                                </Text>
                                                {st?.emoji ? <Text style={styles.calEmoji}>{st.emoji}</Text> : null}
                                            </>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>

                {/* 월간 요약 */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>📊 월간 요약</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryEmoji}>✅</Text>
                            <Text style={styles.summaryValue}>{summary.boarded}일</Text>
                            <Text style={styles.summaryLabel}>탑승</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryEmoji}>❌</Text>
                            <Text style={styles.summaryValue}>{summary.notBoarded}일</Text>
                            <Text style={styles.summaryLabel}>미탑승</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryEmoji}>📈</Text>
                            <Text style={styles.summaryValue}>
                                {summary.boarded + summary.notBoarded > 0
                                    ? Math.round((summary.boarded / (summary.boarded + summary.notBoarded)) * 100)
                                    : 0}%
                            </Text>
                            <Text style={styles.summaryLabel}>출석률</Text>
                        </View>
                    </View>
                </View>

                {/* 범례 */}
                <View style={styles.legendRow}>
                    {[['✅', '탑승'], ['❌', '미탑승'], ['—', '기록없음']].map(([emoji, label]) => (
                        <View key={label} style={styles.legendItem}>
                            <Text style={{ fontSize: 14 }}>{emoji}</Text>
                            <Text style={styles.legendLabel}>{label}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F0F4FF' },
    header: {
        backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10,
        borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
    },
    backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    content: { padding: 16, paddingBottom: 32 },

    filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
    filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E2E8F0' },
    filterBtnActive: { backgroundColor: '#2563EB' },
    filterBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    filterBtnTextActive: { color: '#fff' },
    filterDivider: { width: 1, height: 28, backgroundColor: '#CBD5E1', marginHorizontal: 2 },

    studentSelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 12,
        elevation: 2, gap: 8,
    },
    studentInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    studentName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    studentCount: { fontSize: 11, color: '#94A3B8' },

    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
    monthArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 1 },
    monthLabel: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },

    calendarCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 2, marginBottom: 16, position: 'relative' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 16 },
    calRow: { flexDirection: 'row' },
    calHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    calHeaderText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    calCell: { flex: 1, alignItems: 'center', paddingVertical: 6, marginVertical: 2, marginHorizontal: 1, borderRadius: 8, minHeight: 48, justifyContent: 'center' },
    calCellToday: { borderWidth: 2, borderColor: '#2563EB' },
    calDayNum: { fontSize: 12, fontWeight: '600', color: '#334155' },
    calDayNumToday: { color: '#2563EB', fontWeight: 'bold' },
    calEmoji: { fontSize: 14, marginTop: 1 },

    summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, marginBottom: 16 },
    summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center', gap: 4 },
    summaryEmoji: { fontSize: 22 },
    summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
    summaryLabel: { fontSize: 11, color: '#64748B' },
    summaryDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0' },

    legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendLabel: { fontSize: 11, color: '#64748B' },
});

export default AttendanceCalendarScreen;
