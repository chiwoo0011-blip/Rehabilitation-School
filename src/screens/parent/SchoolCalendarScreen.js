import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { subscribeCalendar } from '../../services/calendarService';
import { COLORS } from '../../constants/theme';

const { width: SW } = Dimensions.get('window');

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CATEGORY_COLORS = {
    '행사': '#3B82F6',
    '방학': '#10B981',
    '시험': '#EF4444',
    '기타': '#94A3B8',
};

const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const SchoolCalendarScreen = () => {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
    const [selectedDate, setSelectedDate] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeCalendar((data) => {
            setEvents(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // 해당 월 달력 데이터 계산
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month - 1, 1).getDay(); // 0=일
        const daysInMonth = new Date(year, month, 0).getDate();
        // 앞 공백 + 날짜 채우기
        const cells = Array(firstDay).fill(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        // 7의 배수로 채우기
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [year, month]);

    // 날짜별 이벤트 맵 (dot 표시용)
    const eventDotMap = useMemo(() => {
        const map = {};
        events.forEach((ev) => {
            // startDate ~ endDate 범위의 모든 날짜에 dot
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
                if (!map[key]) map[key] = [];
                map[key].push(ev.category);
            }
        });
        return map;
    }, [events]);

    // 표시할 일정 목록 (선택 날짜 있으면 해당 날짜, 없으면 해당 월 전체)
    const visibleEvents = useMemo(() => {
        if (selectedDate) {
            return events.filter(
                (ev) => ev.startDate <= selectedDate && ev.endDate >= selectedDate
            );
        }
        const monthPrefix = `${year}-${pad(month)}`;
        return events.filter(
            (ev) => ev.startDate.startsWith(monthPrefix) || ev.endDate.startsWith(monthPrefix)
                || (ev.startDate < monthPrefix + '-01' && ev.endDate >= monthPrefix + '-01')
        );
    }, [events, selectedDate, year, month]);

    const prevMonth = () => {
        if (month === 1) { setYear(y => y - 1); setMonth(12); }
        else setMonth(m => m - 1);
        setSelectedDate(null);
    };
    const nextMonth = () => {
        if (month === 12) { setYear(y => y + 1); setMonth(1); }
        else setMonth(m => m + 1);
        setSelectedDate(null);
    };

    const handleDayPress = (day) => {
        if (!day) return;
        const ds = toDateStr(year, month, day);
        setSelectedDate(prev => prev === ds ? null : ds);
    };

    const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const CELL_W = Math.floor((SW - 32) / 7);

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* 월 네비게이션 */}
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>{year}년 {month}월</Text>
                    <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* 요일 헤더 */}
                <View style={styles.weekRow}>
                    {DAYS.map((d, i) => (
                        <Text
                            key={d}
                            style={[styles.weekDay, i === 0 && styles.sun, i === 6 && styles.sat]}
                        >{d}</Text>
                    ))}
                </View>

                {/* 날짜 그리드 */}
                <View style={styles.gridWrap}>
                    {calendarDays.map((day, idx) => {
                        const ds = day ? toDateStr(year, month, day) : null;
                        const isToday = ds === todayStr;
                        const isSelected = ds === selectedDate;
                        const dots = ds ? (eventDotMap[ds] || []) : [];
                        const col = idx % 7;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.cell, { width: CELL_W, height: CELL_W }]}
                                onPress={() => handleDayPress(day)}
                                activeOpacity={day ? 0.7 : 1}
                                disabled={!day}
                            >
                                {day && (
                                    <>
                                        <View style={[
                                            styles.dayCircle,
                                            isToday && styles.todayCircle,
                                            isSelected && styles.selectedCircle,
                                        ]}>
                                            <Text style={[
                                                styles.dayText,
                                                col === 0 && styles.sunText,
                                                col === 6 && styles.satText,
                                                (isToday || isSelected) && styles.circleDayText,
                                            ]}>{day}</Text>
                                        </View>
                                        {/* 이벤트 dots (최대 3개) */}
                                        <View style={styles.dotRow}>
                                            {[...new Set(dots)].slice(0, 3).map((cat, i) => (
                                                <View
                                                    key={i}
                                                    style={[styles.dot, { backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS['기타'] }]}
                                                />
                                            ))}
                                        </View>
                                    </>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 구분선 */}
                <View style={styles.divider} />

                {/* 일정 목록 */}
                <View style={styles.listSection}>
                    <Text style={styles.listTitle}>
                        {selectedDate
                            ? `${selectedDate.replace(/-/g, '.')} 일정`
                            : `${month}월 전체 일정`}
                    </Text>

                    {loading && (
                        <View style={styles.centerBox}>
                            <ActivityIndicator color={COLORS.primary} />
                        </View>
                    )}

                    {!loading && visibleEvents.length === 0 && (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyText}>등록된 일정이 없습니다</Text>
                        </View>
                    )}

                    {visibleEvents.map((ev) => (
                        <View key={ev.id} style={styles.eventCard}>
                            <View style={[styles.categoryBar, { backgroundColor: CATEGORY_COLORS[ev.category] || CATEGORY_COLORS['기타'] }]} />
                            <View style={styles.eventBody}>
                                <View style={styles.eventTop}>
                                    <View style={[styles.categoryChip, { backgroundColor: (CATEGORY_COLORS[ev.category] || CATEGORY_COLORS['기타']) + '22' }]}>
                                        <Text style={[styles.categoryText, { color: CATEGORY_COLORS[ev.category] || CATEGORY_COLORS['기타'] }]}>
                                            {ev.category}
                                        </Text>
                                    </View>
                                    <Text style={styles.eventDate}>
                                        {ev.startDate === ev.endDate
                                            ? ev.startDate.replace(/-/g, '.')
                                            : `${ev.startDate.replace(/-/g, '.')} ~ ${ev.endDate.replace(/-/g, '.')}`}
                                    </Text>
                                </View>
                                <Text style={styles.eventTitle}>{ev.title}</Text>
                                {ev.description ? (
                                    <Text style={styles.eventDesc}>{ev.description}</Text>
                                ) : null}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },

    /* 월 네비게이션 */
    monthNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    navBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    },
    monthTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

    /* 요일 헤더 */
    weekRow: {
        flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4,
    },
    weekDay: {
        flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700',
        color: COLORS.textSecondary, paddingVertical: 4,
    },
    sun: { color: '#EF4444' },
    sat: { color: '#3B82F6' },

    /* 날짜 그리드 */
    gridWrap: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 16,
    },
    cell: {
        justifyContent: 'center', alignItems: 'center',
    },
    dayCircle: {
        width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center',
    },
    todayCircle: { borderWidth: 1.5, borderColor: '#3B82F6' },
    selectedCircle: { backgroundColor: '#3B82F6' },
    dayText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
    sunText: { color: '#EF4444' },
    satText: { color: '#3B82F6' },
    circleDayText: { color: '#fff', fontWeight: '700' },
    dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5 },
    dot: { width: 4, height: 4, borderRadius: 2 },

    /* 구분선 */
    divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16, marginVertical: 12 },

    /* 일정 목록 */
    listSection: { paddingHorizontal: 16, paddingBottom: 32 },
    listTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
    centerBox: { alignItems: 'center', paddingVertical: 24 },
    emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 14, color: COLORS.textSecondary },
    eventCard: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
        marginBottom: 8, overflow: 'hidden',
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    },
    categoryBar: { width: 4 },
    eventBody: { flex: 1, padding: 12 },
    eventTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    categoryChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    categoryText: { fontSize: 11, fontWeight: '700' },
    eventDate: { fontSize: 11, color: COLORS.textSecondary },
    eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
    eventDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
});

export default SchoolCalendarScreen;
