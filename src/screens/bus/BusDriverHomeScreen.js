/**
 * BusDriverHomeScreen.js
 * 버스기사 홈 탭 — 홈페이지 연결 + 공지사항
 */
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Modal, TextInput, Switch, Alert, KeyboardAvoidingView,
    Platform, StatusBar, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { APP_CONFIG } from '../../constants/config';

const FILTER_TABS = [
    { key: 'all', label: '전체' },
    { key: 'important', label: '📌 중요' },
    { key: 'unread', label: '🔵 안읽음' },
];

// ── 공지 상세 화면 컴포넌트 ──────────────────────────────────
const NoticeDetail = ({ notice, onBack, onRead }) => (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.detailContent}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                <Text style={styles.backText}>목록으로</Text>
            </TouchableOpacity>
            <View style={styles.detailCard}>
                {notice.isImportant && (
                    <View style={styles.importantBadge}>
                        <Text style={styles.importantBadgeText}>🚨 긴급 공지</Text>
                    </View>
                )}
                <Text style={styles.detailTitle}>{notice.title}</Text>
                <View style={styles.detailMeta}>
                    <Ionicons name="person-outline" size={12} color="#94A3B8" />
                    <Text style={styles.detailMetaText}>{notice.author}</Text>
                    <Text style={styles.detailMetaText}>·</Text>
                    <Text style={styles.detailMetaText}>{notice.date}</Text>
                </View>
                <View style={styles.divider} />
                <Text style={styles.detailBody}>{notice.summary}</Text>
                {!notice.isRead ? (
                    <TouchableOpacity style={styles.confirmBtn} onPress={onRead}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.confirmText}>확인했습니다</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.alreadyRead}>
                        <Ionicons name="checkmark-done" size={16} color="#10B981" />
                        <Text style={styles.alreadyReadText}>이미 확인한 공지입니다</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    </SafeAreaView>
);

// ── 메인 화면 ──────────────────────────────────────────────
const BusDriverHomeScreen = () => {
    const { user, logout } = useAuth();
    const [notices, setNotices] = useState([]);
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);

    const filtered = notices.filter((n) => {
        if (filter === 'important') return n.isImportant;
        if (filter === 'unread') return !n.isRead;
        return true;
    });

    const markAsRead = (id) =>
        setNotices(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

    const handleLogout = () => {
        Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: logout },
        ]);
    };

    // 상세 화면
    const selectedNotice = notices.find(n => n.id === selectedId);
    if (selectedNotice) {
        return (
            <NoticeDetail
                notice={selectedNotice}
                onBack={() => setSelectedId(null)}
                onRead={() => { markAsRead(selectedNotice.id); setSelectedId(null); }}
            />
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>홈</Text>
                    <Text style={styles.headerSub}>{user?.label || '기사님'}, 안전 운행하세요 🚌</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* 홈페이지 카드 */}
            <TouchableOpacity
                style={styles.homepageCard}
                onPress={() => Linking.openURL(APP_CONFIG.homepageUrl).catch(() => { })}
                activeOpacity={0.85}
            >
                <View style={styles.homepageIcon}>
                    <Ionicons name="globe" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.homepageTitle}>{APP_CONFIG.name}</Text>
                    <Text style={styles.homepageUrl} numberOfLines={1}>{APP_CONFIG.homepageUrl}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>

            {/* 공지 섹션 */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                    <View style={styles.sectionDot} />
                    <Text style={styles.sectionTitle}>공지사항</Text>
                    {notices.filter(n => !n.isRead).length > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{notices.filter(n => !n.isRead).length}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.filterRow}>
                    {FILTER_TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
                            onPress={() => setFilter(tab.key)}
                        >
                            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 공지 목록 */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {filtered.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIconWrap}>
                            <Text style={{ fontSize: 36 }}>📭</Text>
                        </View>
                        <Text style={styles.emptyText}>등록된 공지가 없습니다</Text>
                        <Text style={styles.emptySub}>운영자가 공지를 등록하면 여기에 표시됩니다</Text>
                    </View>
                ) : (
                    filtered.map(notice => (
                        <TouchableOpacity
                            key={notice.id}
                            style={[styles.noticeCard, notice.isImportant && styles.importantCard]}
                            onPress={() => setSelectedId(notice.id)}
                            activeOpacity={0.85}
                        >
                            <View style={styles.noticeTop}>
                                {notice.isImportant && <Text style={styles.importantTag}>🚨</Text>}
                                {!notice.isRead && <View style={styles.unreadDot} />}
                                <Text style={styles.noticeDate}>{notice.date}</Text>
                            </View>
                            <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                            <Text style={styles.noticePreview} numberOfLines={2}>{notice.summary}</Text>
                            <View style={styles.noticeFooter}>
                                <View style={styles.authorChip}>
                                    <Ionicons name="person-outline" size={11} color="#94A3B8" />
                                    <Text style={styles.authorText}>{notice.author}</Text>
                                </View>
                                {notice.isImportant && (
                                    <View style={styles.urgentChip}>
                                        <Text style={styles.urgentChipText}>긴급</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    logoutBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#64748B',
        justifyContent: 'center', alignItems: 'center',
        elevation: 3, shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },

    homepageCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
        borderWidth: 1, borderColor: '#EFF6FF',
    },
    homepageIcon: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center',
    },
    homepageTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
    homepageUrl: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    sectionHeader: { paddingHorizontal: 20, marginBottom: 8, marginTop: 12 },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
    sectionTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4, flex: 1 },
    unreadBadge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    filterRow: { flexDirection: 'row', gap: 6 },
    filterTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0' },
    filterTabActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    filterTabText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    filterTabTextActive: { color: '#fff' },

    content: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyWrap: { alignItems: 'center', marginTop: 40, gap: 8 },
    emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    emptyText: { fontSize: 15, fontWeight: '700', color: '#334155' },
    emptySub: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

    noticeCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    importantCard: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
    noticeTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    importantTag: { fontSize: 13 },
    unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3B82F6' },
    noticeDate: { color: '#94A3B8', fontSize: 11, marginLeft: 'auto' },
    noticeTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
    noticePreview: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 10 },
    noticeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    authorChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    authorText: { fontSize: 11, color: '#94A3B8' },
    urgentChip: { backgroundColor: '#FEE2E2', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    urgentChipText: { fontSize: 11, color: '#EF4444', fontWeight: '700' },

    // 상세 화면
    detailContent: { padding: 20, paddingBottom: 40 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    backText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
    detailCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, elevation: 2 },
    importantBadge: { alignSelf: 'flex-start', backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
    importantBadgeText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
    detailTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
    detailMetaText: { fontSize: 11, color: '#94A3B8' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
    detailBody: { fontSize: 15, color: '#334155', lineHeight: 26, marginBottom: 20 },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: 14, padding: 14, gap: 8 },
    confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    alreadyRead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    alreadyReadText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
});

export default BusDriverHomeScreen;
