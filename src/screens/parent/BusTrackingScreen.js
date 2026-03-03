import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, TextInput, Alert, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { subscribeBusLocation } from '../../services/busService';
import { subscribeStops, subscribeDailyStatus, markNotBoarded, clearBoardingStatus } from '../../services/routeService';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';
import RouteTrackView from '../../components/RouteTrackView';
import RouteMapModal from '../../components/RouteMapModal';

const BUSES = [
    { id: 'bus1', label: '1호차', color: '#3B82F6' },
    { id: 'bus2', label: '2호차', color: '#8B5CF6' },
];
const CHILD_STORAGE_KEY = '@child_info';

// Haversine 거리(km)
const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// GPS 기준으로 버스가 가장 가까운 정류장 인덱스 찾기
const findNearestStopIndex = (busLat, busLng, stops) => {
    let minDist = Infinity;
    let minIdx = -1;
    stops.forEach((s, i) => {
        if (!s.latitude || !s.longitude) return;
        const d = haversine(busLat, busLng, s.latitude, s.longitude);
        if (d < minDist) { minDist = d; minIdx = i; }
    });
    return minIdx;
};

const BusTrackingScreen = () => {
    const { user } = useAuth();
    const [selectedBus, setSelectedBus] = useState('bus1');
    const [direction, setDirection] = useState('school');
    const [busData, setBusData] = useState({ bus1: null, bus2: null });
    const [stops, setStops] = useState([]);
    const [dailyStatus, setDailyStatus] = useState({});
    const [childInfo, setChildInfo] = useState(null);
    const [childName, setChildName] = useState('');
    const [childBus, setChildBus] = useState('bus1');
    const [showSetup, setShowSetup] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);

    // ETA
    const [etaMinutes, setEtaMinutes] = useState(null);
    const etaAlertSent = useRef(false);

    // 탑승 축하 애니메이션
    const boardedAnim = useRef(new Animated.Value(0)).current;
    const [showBoarded, setShowBoarded] = useState(false);
    const prevBoarded = useRef(false);

    // ── 아이 정보 로드 + 버스 자동 선택 ──
    useEffect(() => {
        AsyncStorage.getItem(CHILD_STORAGE_KEY).then(v => {
            if (v) {
                const info = JSON.parse(v);
                setChildInfo(info);
                // 학부모는 자녀가 타는 버스로 자동 선택
                if (user?.role === 'parent' && info.busId) {
                    setSelectedBus(info.busId);
                }
            } else if (user?.role === 'parent') {
                setShowSetup(true);
            }
        });
    }, []);

    // ── 버스 위치 구독 ──
    useEffect(() => {
        const u1 = subscribeBusLocation('bus1', d => setBusData(p => ({ ...p, bus1: d })));
        const u2 = subscribeBusLocation('bus2', d => setBusData(p => ({ ...p, bus2: d })));
        return () => { u1(); u2(); };
    }, []);

    // ── 정류장 & 탑승 현황 구독 ──
    useEffect(() => {
        const u1 = subscribeStops(selectedBus, direction, setStops);
        const u2 = subscribeDailyStatus(selectedBus, direction, setDailyStatus);
        return () => { u1(); u2(); };
    }, [selectedBus, direction]);

    const currentBus = busData[selectedBus];
    const busInfo = BUSES.find(b => b.id === selectedBus);

    // 학부모는 자녀 버스만 표시, 교사/실무사는 전체 표시
    const visibleBuses = (user?.role === 'parent' && childInfo?.busId)
        ? BUSES.filter(b => b.id === childInfo.busId)
        : BUSES;

    // 현재 버스 정류장 인덱스 (GPS 기반)
    const busStopIndex = (currentBus?.isActive && currentBus?.latitude)
        ? findNearestStopIndex(currentBus.latitude, currentBus.longitude, stops)
        : -1;

    // ── ETA 계산 ──
    useEffect(() => {
        if (!currentBus?.latitude || !childInfo) return;
        const childStop = stops.find(s => (s.students || []).includes(childInfo.name));
        if (!childStop?.latitude) { setEtaMinutes(null); return; }
        const dist = haversine(currentBus.latitude, currentBus.longitude, childStop.latitude, childStop.longitude);
        const speed = Math.max(currentBus.speed || 20, 5);
        const eta = Math.round(dist / speed * 60);
        setEtaMinutes(eta);
        if (eta <= 10 && eta > 0 && !etaAlertSent.current) {
            etaAlertSent.current = true;
            Alert.alert('🚌 버스 곧 도착!', `${childInfo.name}의 정류장에\n약 ${eta}분 후 도착 예정입니다!\n탑승 준비해주세요.`, [{ text: '확인' }]);
        }
        if (eta > 15) etaAlertSent.current = false;
    }, [currentBus?.latitude, currentBus?.longitude, currentBus?.speed, stops, childInfo]);

    // ── 탑승 축하 애니메이션 ──
    const myChildKey = childInfo?.name?.replace(/[.$#[\]/]/g, '_');
    const myChildStatus = myChildKey ? dailyStatus[myChildKey] : null;
    useEffect(() => {
        const isBoarded = !!myChildStatus?.boarded;
        if (isBoarded && !prevBoarded.current) {
            prevBoarded.current = true;
            setShowBoarded(true);
            Animated.sequence([
                Animated.spring(boardedAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
                Animated.delay(3000),
                Animated.timing(boardedAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start(() => setShowBoarded(false));
        }
        if (!isBoarded) { prevBoarded.current = false; boardedAnim.setValue(0); }
    }, [myChildStatus?.boarded]);

    const handleSaveChild = async () => {
        if (!childName.trim()) { Alert.alert('오류', '이름을 입력하세요.'); return; }
        const info = { name: childName.trim(), busId: childBus };
        await AsyncStorage.setItem(CHILD_STORAGE_KEY, JSON.stringify(info));
        setChildInfo(info); setShowSetup(false);
    };

    const handleParentNotBoarded = () => {
        if (!childInfo) { setShowSetup(true); return; }
        const key = childInfo.name.replace(/[.$#[\]/]/g, '_');
        const s = dailyStatus[key];
        if (s?.notBoarded) {
            Alert.alert('미탑승 취소', `${childInfo.name}의 신청을 취소할까요?`, [
                { text: '아니오', style: 'cancel' },
                { text: '취소', onPress: () => clearBoardingStatus(childInfo.busId, direction, childInfo.name) },
            ]);
        } else {
            Alert.alert('미탑승 신청', `오늘 ${childInfo.name}이 미탑승합니다.`, [
                { text: '취소', style: 'cancel' },
                { text: '신청', style: 'destructive', onPress: () => markNotBoarded(childInfo.busId, direction, childInfo.name, 'parent') },
            ]);
        }
    };

    // ── 아이 등록 화면 ──
    if (showSetup) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
                <ScrollView contentContainerStyle={styles.setupWrap}>
                    <Text style={styles.setupTitle}>🚌 아이 정보 등록</Text>
                    <Text style={styles.setupSub}>탑승 현황 확인을 위해{'\n'}아이 정보를 등록해주세요</Text>
                    <Text style={styles.label}>아이 이름</Text>
                    <TextInput style={styles.input} value={childName} onChangeText={setChildName} placeholder="예: 홍길동" placeholderTextColor="#475569" />
                    <Text style={styles.label}>탑승 버스</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {BUSES.map(b => (
                            <TouchableOpacity key={b.id} style={[styles.busPickBtn, childBus === b.id && { backgroundColor: b.color, borderColor: b.color }]} onPress={() => setChildBus(b.id)}>
                                <Text style={[styles.busPickText, childBus === b.id && { color: '#fff' }]}>🚌 {b.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: BUSES.find(b => b.id === childBus)?.color }]} onPress={handleSaveChild}>
                        <Text style={styles.saveBtnText}>등록 완료</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

            {/* ── 헤더 ── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>통학버스 노선</Text>
                    <Text style={styles.headerSub}>
                        {busInfo.label} · {direction === 'school' ? '🌅 등교' : '🌙 하교'}
                        {currentBus?.isActive ? `  🟢 ${currentBus.speed ?? 0}km/h` : '  ⚫ 운행 전'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {etaMinutes !== null && (
                        <View style={[styles.etaChip, etaMinutes <= 10 && styles.etaChipUrgent]}>
                            <Text style={styles.etaText}>{etaMinutes}분 후</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => setShowMapModal(true)} style={[styles.childChip, { backgroundColor: '#3B82F6' }]}>
                        <Text style={[styles.childChipText, { color: '#fff' }]}>🗺️ 노선도</Text>
                    </TouchableOpacity>

                </View>
            </View>

            {/* ── 탭 rows ── */}
            <View style={styles.tabGroup}>
                {/* 등교/하교 */}
                {[{ id: 'school', label: '🌅 등교' }, { id: 'home', label: '🌙 하교' }].map(d => (
                    <TouchableOpacity
                        key={d.id}
                        style={[styles.tab, direction === d.id && { backgroundColor: busInfo.color }]}
                        onPress={() => setDirection(d.id)}
                    >
                        <Text style={[styles.tabText, direction === d.id && { color: '#fff' }]}>{d.label}</Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.tabDivider} />
                {/* 버스 선택 — 학부모는 자녀 버스만, 교사/실무사는 전체 */}
                {visibleBuses.map(bus => (
                    <TouchableOpacity
                        key={bus.id}
                        style={[styles.tab, selectedBus === bus.id && { backgroundColor: bus.color }]}
                        onPress={() => setSelectedBus(bus.id)}
                        disabled={user?.role === 'parent'} // 학부모는 버스 변경 건드림
                    >
                        <Text style={[styles.tabText, selectedBus === bus.id && { color: '#fff' }]}>🚌 {bus.label}</Text>
                        <View style={[styles.pingDot, { backgroundColor: busData[bus.id]?.isActive ? '#4ADE80' : '#4B5563' }]} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── 레이싱 트랙 노선도 ── */}
            <View style={styles.trackWrap}>
                <RouteTrackView
                    stops={stops}
                    busStopIndex={busStopIndex}
                    busColor={busInfo.color}
                />
            </View>

            {/* ── 탑승 축하 오버레이 ── */}
            {showBoarded && (
                <Animated.View style={[styles.boardedCard, {
                    opacity: boardedAnim,
                    transform: [{ scale: boardedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
                }]}>
                    <Text style={{ fontSize: 40 }}>🎉</Text>
                    <Text style={styles.boardedTitle}>{childInfo?.name} 탑승 완료!</Text>
                    <Text style={styles.boardedSub}>버스에 안전하게 탑승했습니다</Text>
                </Animated.View>
            )}

            {/* ── 미탑승 신청 버튼 ── */}
            {user?.role === 'parent' && childInfo && (
                <TouchableOpacity
                    style={[styles.notBoardedBtn, myChildStatus?.notBoarded && styles.notBoardedActive]}
                    onPress={handleParentNotBoarded}
                >
                    <Ionicons
                        name={myChildStatus?.notBoarded ? 'close-circle' : 'hand-left-outline'}
                        size={16} color={myChildStatus?.notBoarded ? '#fff' : '#EF4444'}
                    />
                    <Text style={[styles.notBoardedText, myChildStatus?.notBoarded && { color: '#fff' }]}>
                        {myChildStatus?.notBoarded ? '✅ 미탑승 신청됨 (취소)' : `오늘 ${childInfo.name} 미탑승 신청`}
                    </Text>
                </TouchableOpacity>
            )}

            {/* ── 노선도 맵 모달 ── */}
            <RouteMapModal
                visible={showMapModal}
                onClose={() => setShowMapModal(false)}
                stops={stops}
                busColor={busInfo.color}
                busName={`${busInfo.label} · ${direction === 'school' ? '🌅 등교' : '🌙 하교'}`}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0F172A' },

    // 헤더
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0F172A' },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#E2E8F0' },
    headerSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
    etaChip: { backgroundColor: '#1E3A8A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    etaChipUrgent: { backgroundColor: '#EF4444' },
    etaText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    childChip: { backgroundColor: '#1E293B', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    childChipText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },

    // 탭
    tabGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: '#0F172A' },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1E293B' },
    tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    tabDivider: { width: 1, height: 20, backgroundColor: '#1E293B', marginHorizontal: 2 },
    pingDot: { width: 6, height: 6, borderRadius: 3 },

    // 노선 트랙
    trackWrap: { flex: 1 },

    // 탑승 축하
    boardedCard: {
        position: 'absolute', alignSelf: 'center', top: '30%',
        backgroundColor: '#1E293B', borderRadius: 20,
        padding: 28, alignItems: 'center', gap: 6,
        elevation: 16, zIndex: 999, borderWidth: 1.5, borderColor: '#334155',
    },
    boardedTitle: { fontSize: 18, fontWeight: 'bold', color: '#E2E8F0' },
    boardedSub: { fontSize: 13, color: '#64748B' },

    // 미탑승 버튼
    notBoardedBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        margin: 12, marginTop: 0, borderRadius: 12, padding: 12,
        backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#7f1d1d',
    },
    notBoardedActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    notBoardedText: { fontSize: 13, fontWeight: '700', color: '#EF4444', flex: 1 },

    // 등록 화면
    setupWrap: { padding: 24, paddingTop: 60 },
    setupTitle: { fontSize: 24, fontWeight: 'bold', color: '#E2E8F0', textAlign: 'center', marginBottom: 8 },
    setupSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 16 },
    input: { backgroundColor: '#1E293B', borderRadius: 10, padding: 14, fontSize: 15, color: '#E2E8F0', borderWidth: 1, borderColor: '#334155' },
    busPickBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#334155', backgroundColor: '#1E293B' },
    busPickText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default BusTrackingScreen;
