import React from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, StatusBar, Alert, Linking,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';

const { width: SW } = Dimensions.get('window');

const MENU_ITEMS = [
    { id: 'bus', label: '통학버스', subLabel: '실시간 위치', icon: 'bus', color: '#3B82F6', screen: 'Bus' },
    { id: 'attendance', label: '등하교 확인', subLabel: '오늘 현황 확인', icon: 'checkmark-circle', color: '#10B981', screen: 'Attendance' },
    { id: 'meal', label: '오늘 급식', subLabel: '알레르기 포함', icon: 'restaurant', color: '#F59E0B', screen: 'Meal' },
    { id: 'fieldtrip', label: '현장학습', subLabel: '학급 앨범', icon: 'images', color: '#8B5CF6', screen: 'FieldTrip' },
    { id: 'calendar', label: '학사일정', subLabel: '학교 일정', icon: 'calendar', color: '#0EA5E9', screen: 'Calendar' },
    { id: 'homepage', label: '학교 홈페이지', subLabel: '홈페이지 바로가기', icon: 'globe', color: '#2563EB', screen: null },
];

// 카드 크기: 화면 너비 기반, 높이는 너비의 70%로 고정 (정사각형보다 납작)
const HPAD = 16;
const CGAP = 14;
const CARD_W = (SW - HPAD * 2 - CGAP) / 2;
const CARD_H = Math.round(CARD_W * 0.68);

const HomeScreen = ({ navigation }) => {
    const { user, logout } = useAuth();
    const greeting = user?.greeting || '이용자';

    const handleLogout = () =>
        Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: logout },
        ]);

    const openHomepage = () =>
        Linking.openURL(APP_CONFIG.homepageUrl).catch(() =>
            Alert.alert('오류', '홈페이지를 열 수 없습니다.')
        );

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

            {/* ── 헤더 (1줄) ── */}
            <View style={styles.header}>
                <View style={styles.schoolRow}>
                    <Text style={styles.schoolEmoji}>🏫</Text>
                    <Text style={styles.schoolName}>{APP_CONFIG.name}</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={11} color="#fff" />
                        <Text style={styles.dateText}>
                            {new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('공지사항')} style={styles.headerIcon}>
                        <Ionicons name="notifications-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.headerIcon}>
                        <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── 인사말 밴드 ── */}
            <View style={styles.greetingBand}>
                <Text style={styles.greetingText}>{greeting}, 안녕하세요 👋</Text>
            </View>

            {/* ── 스크롤 콘텐츠 ── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* 빠른 메뉴 */}
                <Text style={styles.sectionLabel}>빠른 메뉴</Text>
                <View style={styles.grid}>
                    {MENU_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuCard, { backgroundColor: item.color }]}
                            onPress={() => item.screen ? navigation.navigate(item.screen) : openHomepage()}
                            activeOpacity={0.85}
                        >
                            <View style={styles.cardShine} />
                            <View style={styles.iconWrap}>
                                <Ionicons name={item.icon} size={26} color="#fff" />
                            </View>
                            <Text style={styles.cardLabel}>{item.label}</Text>
                            <Text style={styles.cardSub}>{item.subLabel}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F0F4FF' },

    /* 헤더 */
    header: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: HPAD,
        paddingVertical: 8,
    },
    schoolRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    schoolEmoji: { fontSize: 15 },
    schoolName: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2, flexShrink: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dateBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
    },
    dateText: { fontSize: 10, color: '#fff', fontWeight: '600' },
    headerIcon: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },

    /* 인사말 밴드 */
    greetingBand: {
        backgroundColor: '#2563EB',
        paddingHorizontal: HPAD,
        paddingBottom: 12,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    greetingText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },

    /* 스크롤 콘텐츠 */
    content: { paddingHorizontal: HPAD, paddingTop: 10, paddingBottom: 16 },
    sectionLabel: {
        fontSize: 10, fontWeight: '700', color: '#6B7280',
        letterSpacing: 0.5, marginBottom: 8, marginTop: 10,
    },

    /* 메뉴 그리드 */
    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: CGAP,
    },
    menuCard: {
        width: CARD_W, height: CARD_H,
        borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        elevation: 4,
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18, shadowRadius: 5,
        overflow: 'hidden',
        gap: 4,
    },
    cardShine: {
        position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
    },
    iconWrap: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.22)',
        justifyContent: 'center', alignItems: 'center',
    },
    cardLabel: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    cardSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },

    /* 홈페이지 버튼 */
    homepageBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12,
        padding: 10, gap: 10,
        elevation: 2,
        shadowColor: '#2563EB', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 3,
        borderWidth: 1.5, borderColor: '#DBEAFE',
    },
    homepageIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#2563EB',
        justifyContent: 'center', alignItems: 'center',
    },
    homepageLabel: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
    homepageSub: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
});

export default HomeScreen;
