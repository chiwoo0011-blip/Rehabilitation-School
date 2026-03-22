import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { subscribeStops, subscribeDailyStatus, subscribeCurrentStop, markNotBoarded, clearBoardingStatus, subscribeBusLocation } from '../../services/routeService';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';
import RouteTrackView from '../../components/RouteTrackView';
import RouteMapModal from '../../components/RouteMapModal';

const BUSES = [
    { id: 'bus1', label: '1호차', color: '#3B82F6' },
    { id: 'bus2', label: '2호차', color: '#8B5CF6' },
];

const BusTrackingScreen = () => {
    const { user } = useAuth();
    const [selectedBus, setSelectedBus] = useState(user?.busId || 'bus1');
    const [direction, setDirection] = useState('school');
    const [stops, setStops] = useState([]);
    const [dailyStatus, setDailyStatus] = useState({});
    const [showMapModal, setShowMapModal] = useState(false);

    // 수동 정류장 진행 상태 (기사가 Firebase에 저장한 값)
    const [busStopIndex, setBusStopIndex] = useState(-1);
    const [busLocation, setBusLocation] = useState(null);

    // 탑승 축하 애니메이션
    const boardedAnim = useRef(new Animated.Value(0)).current;
    const [showBoarded, setShowBoarded] = useState(false);
    const prevBoarded = useRef(false);

    // 학부모는 자녀 버스만, 교사/실무사는 전체
    const visibleBuses = (user?.role === 'parent' && user?.busId)
        ? BUSES.filter(b => b.id === user.busId)
        : BUSES;

    useEffect(() => {
        const unsubStops = subscribeStops(selectedBus, direction, setStops);
        const unsubStatus = subscribeDailyStatus(selectedBus, direction, setDailyStatus);
        const unsubStop = subscribeCurrentStop(selectedBus, direction, setBusStopIndex);
        const unsubLoc = subscribeBusLocation(selectedBus, setBusLocation);
        return () => { unsubStops(); unsubStatus(); unsubStop(); unsubLoc(); };
    }, [selectedBus, direction]);

    const busInfo = BUSES.find(b => b.id === selectedBus);

    // 내 아이 탑승 축하 애니메이션 (학부모용)
    const myChildName = user?.studentName;
    const myChildKey = myChildName?.replace(/[.$#[\]/]/g, '_');
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

    const handleParentNotBoarded = () => {
        if (!myChildName) return;
        const s = myChildStatus;
        if (s?.notBoarded) {
            Alert.alert('미탑승 취소', `${myChildName}의 신청을 취소할까요?`, [
                { text: '아니오', style: 'cancel' },
                { text: '취소', onPress: () => clearBoardingStatus(user.busId, direction, myChildName) },
            ]);
        } else {
            Alert.alert('미탑승 신청', `오늘 ${myChildName}이 미탑승합니다.`, [
                { text: '취소', style: 'cancel' },
                { text: '신청', style: 'destructive', onPress: () => markNotBoarded(user.busId, direction, myChildName, 'parent') },
            ]);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>통학버스 노선</Text>
                    <Text style={styles.headerSub}>
                        {busInfo.label} · {direction === 'school' ? '🌅 등교' : '🌙 하교'}
                        {busStopIndex >= 0
                            ? `  🟢 ${stops[busStopIndex]?.name || ''} 진행 중`
                            : '  ⚫ 운행 전'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setShowMapModal(true)} style={styles.mapBtn}>
                    <Text style={styles.mapBtnText}>🗺️ 노선도</Text>
                </TouchableOpacity>
            </View>

            {/* 탭 */}
            <View style={styles.tabGroup}>
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
                {visibleBuses.map(bus => (
                    <TouchableOpacity
                        key={bus.id}
                        style={[styles.tab, selectedBus === bus.id && { backgroundColor: bus.color }]}
                        onPress={() => setSelectedBus(bus.id)}
                        disabled={user?.role === 'parent'}
                    >
                        <Text style={[styles.tabText, selectedBus === bus.id && { color: '#fff' }]}>🚌 {bus.label}</Text>
                        <View style={[styles.pingDot, { backgroundColor: busStopIndex >= 0 ? '#4ADE80' : '#4B5563' }]} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* 노선 트랙 */}
            <View style={styles.trackWrap}>
                <RouteTrackView
                    stops={stops}
                    busStopIndex={busStopIndex}
                    busColor={busInfo.color}
                />
            </View>

            {/* 탑승 축하 오버레이 */}
            {showBoarded && (
                <Animated.View 
                    pointerEvents="none"
                    style={[styles.boardedCard, {
                    opacity: boardedAnim,
                    transform: [{ scale: boardedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
                }]}>
                    <Text style={{ fontSize: 40 }}>🎉</Text>
                    <Text style={styles.boardedTitle}>{myChildName} 탑승 완료!</Text>
                    <Text style={styles.boardedSub}>버스에 안전하게 탑승했습니다</Text>
                </Animated.View>
            )}

            {/* 미탑승 신청 버튼 (학부모만) */}
            {user?.role === 'parent' && myChildName && (
                <TouchableOpacity
                    style={[styles.notBoardedBtn, myChildStatus?.notBoarded && styles.notBoardedActive]}
                    onPress={handleParentNotBoarded}
                >
                    <Ionicons
                        name={myChildStatus?.notBoarded ? 'close-circle' : 'hand-left-outline'}
                        size={16} color={myChildStatus?.notBoarded ? '#fff' : '#EF4444'}
                    />
                    <Text style={[styles.notBoardedText, myChildStatus?.notBoarded && { color: '#fff' }]}>
                        {myChildStatus?.notBoarded ? '✅ 미탑승 신청됨 (취소)' : `오늘 ${myChildName} 미탑승 신청`}
                    </Text>
                </TouchableOpacity>
            )}

            <RouteMapModal
                visible={showMapModal}
                onClose={() => setShowMapModal(false)}
                stops={stops}
                busColor={busInfo.color}
                busName={`${busInfo.label} · ${direction === 'school' ? '🌅 등교' : '🌙 하교'}`}
                busLocation={busLocation}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0F172A' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0F172A' },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#E2E8F0' },
    headerSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
    mapBtn: { backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    mapBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    tabGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: '#0F172A' },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1E293B' },
    tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    tabDivider: { width: 1, height: 20, backgroundColor: '#1E293B', marginHorizontal: 2 },
    pingDot: { width: 6, height: 6, borderRadius: 3 },
    trackWrap: { flex: 1 },
    boardedCard: {
        position: 'absolute', alignSelf: 'center', top: '30%',
        backgroundColor: '#1E293B', borderRadius: 20, padding: 28, alignItems: 'center', gap: 6,
        elevation: 16, zIndex: 999, borderWidth: 1.5, borderColor: '#334155',
    },
    boardedTitle: { fontSize: 18, fontWeight: 'bold', color: '#E2E8F0' },
    boardedSub: { fontSize: 13, color: '#64748B' },
    notBoardedBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        margin: 12, marginTop: 0, borderRadius: 12, padding: 12,
        backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#7f1d1d',
    },
    notBoardedActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    notBoardedText: { fontSize: 13, fontWeight: '700', color: '#EF4444', flex: 1 },
});

export default BusTrackingScreen;
