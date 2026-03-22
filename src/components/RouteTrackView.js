/**
 * RouteTrackView.js
 * 레이싱 트랙 스타일 노선도 컴포넌트 (MapView 불필요)
 * - 정류장을 수직 트랙으로 표현
 * - 버스가 Spring 애니메이션으로 부드럽게 이동
 * - 통과한 정류장은 체크 표시, 현재 정류장은 펄스 효과
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STOP_H = 100;   // 정류장 간 세로 간격 (px)
const TRACK_L = 52;   // 트랙 라인 X 위치
const TRACK_W = 6;    // 트랙 선 두께
const CIRCLE_R = 18;  // 정류장 원 반지름
// 버스 마커: left=26, width=48 → 오른쪽 끝=74px
// infoCard 시작: 82px 이상이면 가림 없음
const INFO_LEFT = TRACK_L + 30; // 82px — 버스/순번 원 오른쪽

const RouteTrackView = ({
    stops = [],
    busStopIndex = -1,   // -1 = 운행 전, 0~N = 해당 정류장에 있음
    busColor = '#3B82F6',
    compact = false,   // 탭내 미리보기용 소형 모드
}) => {
    // 버스 Y 위치 애니메이션
    const busY = useRef(new Animated.Value(-80)).current;
    // 버스 흔들기 애니메이션
    const busX = useRef(new Animated.Value(0)).current;
    // 현재 정류장 펄스
    const pulseS = useRef(new Animated.Value(1)).current;
    // 자동 스크롤용 ScrollView ref
    const scrollRef = useRef(null);

    // 탑승(하차) 애니메이션
    const [boardingIndex, setBoardingIndex] = useState(-1);
    const boardAnim = useRef(new Animated.Value(0)).current;

    // 탑승/하차 이펙트
    useEffect(() => {
        if (busStopIndex < 0) {
            setBoardingIndex(-1);
            return;
        }
        setBoardingIndex(busStopIndex);
        boardAnim.setValue(0);

        Animated.sequence([
            Animated.delay(450),
            Animated.timing(boardAnim, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
            })
        ]).start(() => {
            setBoardingIndex(-1);
        });
    }, [busStopIndex]);

    // 버스 이동 + 자동 스크롤
    useEffect(() => {
        if (busStopIndex < 0) { busY.setValue(-80); return; }
        const targetY = busStopIndex * STOP_H + (STOP_H / 2) - CIRCLE_R;
        Animated.spring(busY, {
            toValue: targetY,
            useNativeDriver: true,
            friction: 7,
            tension: 45,
        }).start();
        // 도착 시 좌우 흔들기
        Animated.sequence([
            Animated.timing(busX, { toValue: 5, duration: 80, useNativeDriver: true }),
            Animated.timing(busX, { toValue: -5, duration: 80, useNativeDriver: true }),
            Animated.timing(busX, { toValue: 3, duration: 60, useNativeDriver: true }),
            Animated.timing(busX, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();

        // 자동 스크롤: 현재 정류장이 화면 중앙에 오도록
        // 버스 앞뒤 2개 정류장이 함께 보이도록 위쪽 여백 확보
        const scrollY = Math.max(0, busStopIndex * STOP_H - STOP_H * 1.5);
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: scrollY, animated: true });
        }, 300); // 버스 이동 애니메이션 시작 직후 스크롤
    }, [busStopIndex]);

    // 현재 정류장 펄스 루프
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseS, { toValue: 1.35, duration: 550, useNativeDriver: true }),
                Animated.timing(pulseS, { toValue: 1.00, duration: 550, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    if (stops.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={{ fontSize: 32 }}>🛣️</Text>
                <Text style={styles.emptyText}>등록된 정류장이 없습니다</Text>
            </View>
        );
    }

    const totalH = stops.length * STOP_H + 20;

    const getStopColor = (stop) => {
        if (stop.stopType === 'departure') return '#F59E0B';
        if (stop.stopType === 'arrival') return '#10B981';
        return busColor;
    };

    const getStopIcon = (stop, idx) => {
        if (stop.stopType === 'departure') return '🚩';
        if (stop.stopType === 'arrival') return '🏁';
        const num = stops.slice(0, idx + 1).filter(s => !s.stopType || s.stopType === 'stop').length;
        return String(num);
    };

    // compact 모드(미리보기)에서는 어두운 배경 유지, 전체 운행 뷰는 밝은 배경
    const bgColor = compact ? '#0F172A' : '#F0F4FF';
    const cardBg = compact ? '#1E293B' : '#FFFFFF';
    const cardBgCurrent = compact ? busColor + '18' : busColor + '15';
    const trackUnusedColor = compact ? '#2D3748' : '#CBD5E1';
    const stopNameColor = compact ? '#E2E8F0' : '#0F172A';
    const stopMetaColor = compact ? '#94A3B8' : '#475569';
    const circleBgUnused = compact ? '#1E293B' : '#F1F5F9';
    const circleBgCurrent = compact ? '#0F172A' : '#FFFFFF';

    return (
        <ScrollView
            ref={scrollRef}
            style={[styles.scroll, compact && styles.scrollCompact, { backgroundColor: bgColor }]}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
        >
            <View style={{ height: totalH, position: 'relative', paddingLeft: TRACK_L + 28 }}>



                {/* ── 정류장 원 & 레이블 ── */}
                {stops.map((stop, i) => {
                    const isPast = i < busStopIndex;
                    const isCurrent = i === busStopIndex;
                    const stopColor = getStopColor(stop);
                    const icon = getStopIcon(stop, i);

                    const isBoarding = i === boardingIndex;
                    const isArrival = stop.stopType === 'arrival';

                    const pTranslateX = boardAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: isArrival ? [-20, 20, 60] : [60, 20, -20]
                    });
                    const pTranslateY = boardAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, -35, 5]
                    });
                    const pOpacity = boardAnim.interpolate({
                        inputRange: [0, 0.2, 0.8, 1],
                        outputRange: [0, 1, 1, 0]
                    });
                    const pScale = boardAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.5, 1.3, 0.8]
                    });

                    let emojis = '🚶‍♂️';
                    if (isArrival) emojis = '👋👦👧';
                    else if (stop.students?.length) emojis = '👦👧';
                    else if (stop.stopType === 'departure') emojis = '🚌💨';

                    return (
                        <View key={stop.id || i} style={[styles.stopRow, { top: i * STOP_H }]}>
                            {/* 원형 마커 */}
                            {isCurrent ? (
                                <Animated.View style={[
                                    styles.circle,
                                    styles.circleCurrent,
                                    {
                                        borderColor: busColor,
                                        backgroundColor: circleBgCurrent,
                                        transform: [{ scale: pulseS }],
                                    },
                                ]}>
                                    <Text style={[styles.circleText, { color: busColor }]}>{icon}</Text>
                                </Animated.View>
                            ) : (
                                <View style={[
                                    styles.circle,
                                    isPast
                                        ? { backgroundColor: stopColor, borderColor: stopColor }
                                        : { backgroundColor: circleBgUnused, borderColor: stopColor },
                                ]}>
                                    <Text style={[styles.circleText, { color: isPast ? '#fff' : stopColor }]}>{icon}</Text>
                                </View>
                            )}

                            {/* 정류장 정보 카드 */}
                            <View style={[
                                styles.infoCard,
                                { backgroundColor: cardBg },
                                isCurrent && { borderLeftColor: busColor, borderLeftWidth: 3, backgroundColor: cardBgCurrent },
                                isPast && { opacity: compact ? 0.55 : 0.7 },
                            ]}>
                                {/* 정류장 이름 + 뱃지 */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.stopName, { color: stopNameColor }, isCurrent && { color: busColor }]} numberOfLines={1}>
                                        {stop.name}
                                    </Text>
                                    {isCurrent && (
                                        <View style={[styles.nowBadge, { backgroundColor: busColor }]}>
                                            <Text style={styles.nowBadgeText}>● 현재</Text>
                                        </View>
                                    )}
                                    {isPast && (
                                        <View style={styles.doneBadge}>
                                            <Text style={styles.doneBadgeText}>✓ 완료</Text>
                                        </View>
                                    )}
                                </View>

                                {/* 시간 */}
                                {stop.scheduledTime ? (
                                    <Text style={[styles.stopMeta, { color: stopMetaColor }]}>⏰ {stop.scheduledTime}</Text>
                                ) : null}

                                {/* 학생 이름: 크게, 선명하게 */}
                                {stop.students?.length > 0 && (
                                    <View style={styles.studentNameRow}>
                                        <Text style={[styles.studentNameText, { color: stopMetaColor }]}>
                                            👥 {stop.students.join(' · ')}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* 탑승/하차 애니메이션 파티클 */}
                            {isBoarding && !compact && (
                                <Animated.View style={{
                                    position: 'absolute',
                                    left: TRACK_L + 10,
                                    top: 10,
                                    opacity: pOpacity,
                                    transform: [
                                        { translateX: pTranslateX },
                                        { translateY: pTranslateY },
                                        { scale: pScale },
                                    ],
                                    zIndex: 30,
                                }}>
                                    <Text style={{ fontSize: 26, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                                        {emojis}
                                    </Text>
                                </Animated.View>
                            )}
                        </View>
                    );
                })}

                {/* ── 레이싱 트랙 대시 무늬 (compact에서만) ── */}
                {compact && Array.from({ length: Math.floor(totalH / 16) }).map((_, i) => (
                    <View
                        key={i}
                        style={[styles.trackDash, {
                            top: 8 + i * 16,
                            backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent'
                        }]}
                    />
                ))}

                {/* ── 애니메이션 버스 마커 ── */}
                {busStopIndex >= 0 && (
                    <Animated.View style={[styles.busMarker, {
                        backgroundColor: busColor,
                        transform: [{ translateY: busY }, { translateX: busX }],
                        shadowColor: busColor,
                    }]}>
                        <Text style={{ fontSize: compact ? 16 : 22 }}>🚌</Text>
                    </Animated.View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    scrollCompact: { maxHeight: 200 },
    empty: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 20 },
    emptyText: { color: '#64748B', fontSize: 14 },

    // 트랙 라인
    trackLine: {
        position: 'absolute',
        left: TRACK_L - TRACK_W / 2,
        top: STOP_H / 2,
        width: TRACK_W,
        borderRadius: 3,
    },
    trackDash: {
        position: 'absolute',
        left: TRACK_L - 1,
        width: 2,
        height: 8,
    },

    // 정류장 행
    stopRow: {
        position: 'absolute',
        left: 0,
        right: 12,
        height: STOP_H,
        flexDirection: 'row',
        alignItems: 'center',
        // 버스 마커·순번 원이 infoCard를 가리지 않도록 왼쪽 여백 확보
        paddingLeft: INFO_LEFT,
    },

    // 원형 마커
    circle: {
        width: CIRCLE_R * 2,
        height: CIRCLE_R * 2,
        borderRadius: CIRCLE_R,
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        left: TRACK_L - CIRCLE_R - TRACK_W / 2,
        zIndex: 2,
    },
    circleCurrent: {
        borderWidth: 3,
        width: CIRCLE_R * 2 + 4,
        height: CIRCLE_R * 2 + 4,
        borderRadius: CIRCLE_R + 2,
        left: TRACK_L - CIRCLE_R - TRACK_W / 2 - 2,
        elevation: 4,
    },
    circleText: { fontSize: 11, fontWeight: 'bold' },

    // 정보 카드
    infoCard: {
        flex: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 3,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    stopName: { fontSize: 15, fontWeight: '700', flex: 1 },
    stopMeta: { fontSize: 12 },

    // 학생 이름 — 더 크고 선명하게
    studentNameRow: { marginTop: 2 },
    studentNameText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

    nowBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    nowBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    doneBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#10B981' },
    doneBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // 버스 마커
    busMarker: {
        position: 'absolute',
        left: TRACK_L - 26,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 10,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
        zIndex: 10,
    },
});

export default RouteTrackView;
