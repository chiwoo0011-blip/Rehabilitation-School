import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { subscribeStops, deleteStop, saveStop, initDefaultStops } from '../../services/routeService';
import { subscribeStudents } from '../../services/studentService';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';
import RouteTrackView from '../../components/RouteTrackView';
import RouteMapModal from '../../components/RouteMapModal';
import { useAuth } from '../../context/AuthContext';

const BUSES = [
    { id: 'bus1', label: '1호차', color: '#3B82F6' },
    { id: 'bus2', label: '2호차', color: '#8B5CF6' },
];
const DIRECTIONS = [
    { id: 'school', label: '등교', emoji: '🌅', color: '#F59E0B' },
    { id: 'home', label: '하교', emoji: '🌙', color: '#6366F1' },
];

const getTypeLabel = (type) => {
    if (type === 'departure') return '출발';
    if (type === 'arrival') return '도착';
    return '정류장';
};

const getTypeBadgeColor = (type) => {
    if (type === 'departure') return '#F59E0B';
    if (type === 'arrival') return '#10B981';
    return '#64748B';
};

const BusRouteScreen = ({ navigation }) => {
    const [selectedBus, setSelectedBus] = useState('bus1');
    const [selectedDir, setSelectedDir] = useState('school');
    const [stops, setStops] = useState([]);
    const [showMapModal, setShowMapModal] = useState(false);

    // 시범운행 상태
    const [simRunning, setSimRunning] = useState(false);
    const [simStep, setSimStep] = useState(0);
    const simTimer = useRef(null);

    // 학생 데이터 구독
    const [allStudents, setAllStudents] = useState([]);
    useEffect(() => {
        const unsub = subscribeStudents((list) => {
            setAllStudents(list.filter(s => s.busId === selectedBus));
        });
        return unsub;
    }, [selectedBus]);

    useEffect(() => {
        const unsub = subscribeStops(selectedBus, selectedDir, (loadedStops) => {
            setStops(loadedStops);
            // 출발/도소점 없으면 자동 생성
            const hasDep = loadedStops.some(s => s.stopType === 'departure');
            const hasArr = loadedStops.some(s => s.stopType === 'arrival');
            if (!hasDep || !hasArr) {
                initDefaultStops(selectedBus, selectedDir).catch(console.warn);
            }
        });
        setSimRunning(false);
        setSimStep(0);
        return unsub;
    }, [selectedBus, selectedDir]);

    // 시범운행 자동 진행
    useEffect(() => {
        if (!simRunning) { clearTimeout(simTimer.current); return; }
        simTimer.current = setTimeout(() => {
            const next = simStep + 1;
            if (next >= stops.length) {
                setSimRunning(false);
                setSimStep(0);
                Alert.alert('🎉 시범운행 완료', '모든 정류장 순회를 완료했습니다!');
                return;
            }
            setSimStep(next);
        }, 2500);
        return () => clearTimeout(simTimer.current);
    }, [simRunning, simStep, stops.length]);

    const handleStartSim = () => {
        if (stops.length < 2) {
            Alert.alert('정류장 부족', '정류장이 2개 이상 있어야 시범운행이 가능합니다.');
            return;
        }
        setSimStep(0);
        setSimRunning(true);
    };

    const handleDelete = (stop) => {
        if (stop.stopType === 'departure' || stop.stopType === 'arrival') return;
        Alert.alert('정류장 삭제', `"${stop.name}"을 삭제할까요?`, [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => deleteStop(selectedBus, selectedDir, stop.id) },
        ]);
    };

    const handleMoveOrder = async (index, dir) => {
        // 일반 정류장만 이동 가능
        const regularStops = stops.filter(s => !s.stopType || s.stopType === 'stop');
        const regularIdx = regularStops.findIndex(s => s.id === stops[index]?.id);
        if (regularIdx === -1) return;
        const swapIdx = regularIdx + dir;
        if (swapIdx < 0 || swapIdx >= regularStops.length) return;
        const arr = [...regularStops];
        [arr[regularIdx], arr[swapIdx]] = [arr[swapIdx], arr[regularIdx]];
        // 일반 정류장에 1부터 순번 부여 (출발=0, 도소=9999 유지)
        for (let i = 0; i < arr.length; i++)
            await saveStop(selectedBus, selectedDir, arr[i].id, { ...arr[i], order: i + 1 });
    };

    const currentDir = DIRECTIONS.find(d => d.id === selectedDir);
    const busInfo = BUSES.find(b => b.id === selectedBus);

    // 일반 정류장 순번
    const stopNumbers = {};
    let num = 0;
    stops.forEach(s => {
        if (!s.stopType || s.stopType === 'stop') { num++; stopNumbers[s.id] = num; }
    });

    // ── 시범운행 전체화면 ──
    if (simRunning) {
        const curStop = stops[simStep];
        const progress = stops.length > 1 ? simStep / (stops.length - 1) : 0;
        return (
            <SafeAreaView style={styles.simScreen} edges={['top', 'bottom']}>
                <StatusBar backgroundColor="#F0F4FF" barStyle="dark-content" />

                <View style={styles.simHeader}>
                    <View style={styles.simTitleWrap}>
                        <View style={[styles.simLiveDot, { backgroundColor: busInfo.color }]} />
                        <View>
                            <Text style={styles.simHeaderTitle}>시범운행 중</Text>
                            <Text style={styles.simHeaderSub}>{busInfo.label} · {currentDir.emoji} {currentDir.label}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.simStopBtn} onPress={() => { setSimRunning(false); setSimStep(0); }}>
                        <Ionicons name="stop-circle" size={16} color="#fff" />
                        <Text style={styles.simStopText}>중지</Text>
                    </TouchableOpacity>
                </View>
                {/* 진행 상태 카드 */}

                {/* 진행 바 */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {
                        width: `${progress * 100}%`,
                        backgroundColor: busInfo.color,
                    }]} />
                </View>
                <View style={styles.progressStepRow}>
                    <Text style={styles.progressStepText}>{simStep + 1} / {stops.length} 정류장</Text>
                    <Text style={styles.progressStepText}>{Math.round(progress * 100)}%</Text>
                </View>

                {/* 현재 정류장 배너 */}
                {curStop && (
                    <View style={[styles.curStopBanner, { borderLeftColor: busInfo.color }]}>
                        <Text style={styles.curStopLabel}>현재 위치</Text>
                        <Text style={styles.curStopName}>{curStop.name}</Text>
                        {curStop.scheduledTime && <Text style={styles.curStopTime}>⏰ {curStop.scheduledTime}</Text>}
                        {curStop.students?.length > 0 && (
                            <View style={styles.simStudentRow}>
                                <Ionicons name="people" size={13} color="#334155" />
                                <Text style={styles.curStopStudents}>{curStop.students.join(' · ')}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* 노선 트랙 */}
                <View style={{ flex: 1 }}>
                    <RouteTrackView
                        stops={stops}
                        busStopIndex={simStep}
                        busColor={busInfo.color}
                    />
                </View>
            </SafeAreaView>
        );
    }

    // ── 정류장 카드 렌더 ──
    const renderStop = ({ item, index }) => {
        const badgeColor = getTypeBadgeColor(item.stopType);
        const isSpecial = item.stopType === 'departure' || item.stopType === 'arrival';
        return (
            <View style={[styles.stopCard, isSpecial && styles.stopCardSpecial]}>
                {/* 좌측 라인 + 배지 */}
                <View style={styles.stopLeft}>
                    <View style={[styles.orderBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.orderText}>
                            {item.stopType === 'departure' ? '출' : item.stopType === 'arrival' ? '도' : stopNumbers[item.id]}
                        </Text>
                    </View>

                </View>

                {/* 정보 */}
                <View style={styles.stopInfo}>
                    <View style={styles.stopTopRow}>
                        <View style={[styles.typePill, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '50' }]}>
                            <Text style={[styles.typePillText, { color: badgeColor }]}>{getTypeLabel(item.stopType)}</Text>
                        </View>
                        {item.scheduledTime && (
                            <View style={styles.timePill}>
                                <Ionicons name="time-outline" size={11} color="#64748B" />
                                <Text style={styles.timePillText}>{item.scheduledTime}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.stopName}>{item.name}</Text>
                    {item.address ? <Text style={styles.stopMeta}>{item.address}</Text> : null}
                    {item.stopType === 'stop' && item.students?.length ? (
                        <View style={styles.studentPillRow}>
                            {item.students.map((name, i) => (
                                <View key={i} style={styles.studentPill}>
                                    <Text style={styles.studentPillText}>{name}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>

                {/* 액션: 출발/도소는 편집만, 일반 정류장은 전체 표시 */}
                <View style={styles.stopActions}>
                    {isSpecial ? (
                        // 출발/도소점: 편집만 가능
                        <TouchableOpacity style={styles.actionBtn}
                            onPress={() => navigation.navigate('StopForm', { busId: selectedBus, direction: selectedDir, stop: item })}>
                            <Ionicons name="pencil-outline" size={16} color={busInfo.color} />
                        </TouchableOpacity>
                    ) : (
                        // 일반 정류장: 순서이동 + 편집 + 삭제
                        <>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleMoveOrder(index, -1)}>
                                <Ionicons name="chevron-up" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleMoveOrder(index, 1)}>
                                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}
                                onPress={() => navigation.navigate('StopForm', { busId: selectedBus, direction: selectedDir, stop: item })}>
                                <Ionicons name="pencil-outline" size={16} color={busInfo.color} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const ListHeader = () => {
        const assignedStudents = new Set(stops.flatMap(s => s.students || []));
        const unassignedStudents = allStudents.filter(s => !assignedStudents.has(s.studentName));

        return (
            <>
                {/* 버스 탭 */}
                <View style={styles.segmentRow}>
                    {BUSES.map(bus => {
                        const active = selectedBus === bus.id;
                        return (
                            <TouchableOpacity key={bus.id}
                                style={[styles.segmentBtn, active && { backgroundColor: bus.color }]}
                                onPress={() => setSelectedBus(bus.id)}
                            >
                                <Text style={[styles.segmentText, active && { color: '#fff' }]}>🚌 {bus.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 방향 탭 */}
                <View style={[styles.segmentRow, { marginTop: 6 }]}>
                    {DIRECTIONS.map(dir => {
                        const active = selectedDir === dir.id;
                        return (
                            <TouchableOpacity key={dir.id}
                                style={[styles.segmentBtn, active && { backgroundColor: dir.color }]}
                                onPress={() => setSelectedDir(dir.id)}
                            >
                                <Text style={[styles.segmentText, active && { color: '#fff' }]}>{dir.emoji} {dir.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>


                {/* 미배정 학생 경고 */}
                {unassignedStudents.length > 0 && (
                    <View style={styles.unassignedBox}>
                        <Ionicons name="warning" size={16} color="#D97706" />
                        <Text style={styles.unassignedText}>
                            <Text style={{ fontWeight: 'bold' }}>미배정 학생 ({unassignedStudents.length}명)</Text> : {unassignedStudents.map(s => s.studentName).join(', ')}
                        </Text>
                    </View>
                )}

                {/* 정류장 목록 헤더 */}
                <View style={styles.sectionLabel}>
                    <View style={[styles.sectionDot, { backgroundColor: currentDir.color }]} />
                    <Text style={styles.sectionLabelText}>정류장 목록</Text>
                    <Text style={styles.sectionCount}>{stops.length}개</Text>
                </View>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />

            {/* ── 헤더 ── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>노선 관리</Text>
                    <Text style={styles.headerSub}>버스 노선 및 정류장 설정</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: currentDir.color }]}
                    onPress={() => navigation.navigate('StopForm', { busId: selectedBus, direction: selectedDir, stop: null })}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ── 액션 행: 노선도 완성 + 시범운행 ── */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionCard, styles.actionCardMap]} onPress={() => setShowMapModal(true)}>
                    <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
                        <Ionicons name="map" size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.actionCardText}>
                        <Text style={[styles.actionCardTitle, { color: '#3B82F6' }]}>노선도 완성</Text>
                        <Text style={styles.actionCardSub}>지도에서 확인</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionCard, styles.actionCardSim]} onPress={handleStartSim}>
                    <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
                        <Ionicons name="play-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.actionCardText}>
                        <Text style={[styles.actionCardTitle, { color: '#10B981' }]}>시범운행</Text>
                        <Text style={styles.actionCardSub}>노선 순회 확인</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#10B981" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={stops}
                keyExtractor={item => item.id}
                renderItem={renderStop}
                contentContainerStyle={styles.list}
                ListHeaderComponent={<ListHeader />}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIconWrap}>
                            <Text style={{ fontSize: 40 }}>{selectedDir === 'school' ? '🌅' : '🌙'}</Text>
                        </View>
                        <Text style={styles.emptyText}>등록된 정류장이 없습니다</Text>
                        <Text style={styles.emptySub}>우상단 + 버튼으로 추가하세요</Text>
                    </View>
                }
            />

            {/* 노선도 맵 모달 */}
            <RouteMapModal
                visible={showMapModal}
                onClose={() => setShowMapModal(false)}
                stops={stops}
                busColor={busInfo.color}
                busName={`${busInfo.label} · ${currentDir.emoji} ${currentDir.label}`}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },

    // ── 헤더 ──
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    addBtn: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    },

    // ── 액션 행 ──
    actionRow: {
        flexDirection: 'row', gap: 10,
        paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    },
    actionCard: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
        borderWidth: 1,
    },
    actionCardMap: { borderColor: '#3B82F620' },
    actionCardSim: { borderColor: '#10B98120' },
    actionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    actionCardText: { flex: 1 },
    actionCardTitle: { fontSize: 13, fontWeight: '700' },
    actionCardSub: { fontSize: 10, color: '#94A3B8', marginTop: 1 },

    // ── 미배정 학생 ──
    unassignedBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FEF3C7', padding: SPACING.md,
        marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#FDE68A',
    },
    unassignedText: { fontSize: FONTS.sizes.xs, color: '#D97706', flex: 1, lineHeight: 18 },


    // ── 버스/방향 탭 ──
    segmentRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg },
    segmentBtn: {
        flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    segmentText: { fontSize: 14, fontWeight: '700', color: '#64748B' },

    // ── 미리보기 카드 ──
    previewCard: {
        marginHorizontal: SPACING.lg, marginTop: 14, marginBottom: 4,
        backgroundColor: '#0F172A', borderRadius: 16, overflow: 'hidden',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
    },
    previewHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: 14, paddingBottom: 8,
    },
    previewTitle: { fontSize: 13, fontWeight: '700', color: '#E2E8F0' },
    previewSub: { fontSize: 11, color: '#475569', marginTop: 2 },
    previewEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    previewEmptyText: { fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 18 },

    // ── 섹션 라벨 ──
    sectionLabel: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: SPACING.lg, marginTop: 16, marginBottom: 8,
    },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionLabelText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#334155' },
    sectionCount: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

    // ── 정류장 목록 ──
    list: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },

    stopCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#fff', borderRadius: 14,
        padding: 14, marginBottom: 8,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    stopCardSpecial: { borderColor: '#E0F2FE', backgroundColor: '#F0F9FF' },

    stopLeft: { alignItems: 'center', marginRight: 12, width: 28 },
    orderBadge: {
        width: 28, height: 28, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center',
    },
    orderText: { color: '#fff', fontWeight: '800', fontSize: 11 },
    stopConnector: { width: 2, flex: 1, minHeight: 8, marginTop: 4, borderRadius: 1 },

    stopInfo: { flex: 1, gap: 4 },
    stopTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    typePill: {
        borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
        borderWidth: 1,
    },
    typePillText: { fontSize: 10, fontWeight: '700' },
    timePill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    },
    timePillText: { fontSize: 10, color: '#64748B', fontWeight: '600' },

    stopName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    stopMeta: { fontSize: 11, color: '#94A3B8' },

    studentPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
    studentPill: {
        backgroundColor: '#EFF6FF', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#BFDBFE',
    },
    studentPillText: { fontSize: 11, color: '#3B82F6', fontWeight: '600' },

    stopActions: { flexDirection: 'column', gap: 0, marginLeft: 4 },
    actionBtn: { padding: 5, borderRadius: 6 },

    // ── 빈 목록 ──
    emptyWrap: { alignItems: 'center', marginTop: 30, gap: 8 },
    emptyIconWrap: {
        width: 72, height: 72, borderRadius: 20, backgroundColor: '#F1F5F9',
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    emptyText: { fontSize: 15, fontWeight: '700', color: '#334155' },
    emptySub: { fontSize: 12, color: '#94A3B8' },

    // ── 시범운행 전체화면 ──
    simScreen: { flex: 1, backgroundColor: '#F0F4FF' },
    simHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, paddingTop: 12,
        backgroundColor: '#F0F4FF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    simTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    simLiveDot: { width: 10, height: 10, borderRadius: 5 },
    simHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
    simHeaderSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
    simStopBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#EF4444', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8,
        elevation: 2,
    },
    simStopText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    progressBarBg: { height: 4, backgroundColor: '#E2E8F0', marginHorizontal: 16, borderRadius: 2, marginTop: 12 },
    progressBarFill: { height: 4, borderRadius: 2, minWidth: 4 },
    progressStepRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 5 },
    progressStepText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

    curStopBanner: {
        marginHorizontal: 16, marginTop: 12, marginBottom: 4,
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderLeftWidth: 4,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    curStopLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    curStopName: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    curStopTime: { fontSize: 12, color: '#64748B', marginTop: 4 },
    simStudentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    curStopStudents: { fontSize: 14, fontWeight: '600', color: '#334155' },
});

export default BusRouteScreen;
