/**
 * OperatorHomeScreen.js
 * 운영자 홈 탭 — 공지사항 + 홈페이지 연결 + 로그아웃
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

// 필터 탭
const FILTER_TABS = [
    { key: 'all', label: '전체' },
    { key: 'important', label: '📌 중요' },
    { key: 'unread', label: '🔵 안읽음' },
];

// 공지 작성 모달
const WriteModal = ({ visible, onClose, onSubmit, author }) => {
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [isImportant, setIsImportant] = useState(false);

    const reset = () => { setTitle(''); setSummary(''); setIsImportant(false); };

    const handleSubmit = () => {
        if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
        if (!summary.trim()) { Alert.alert('알림', '내용을 입력해주세요.'); return; }
        onSubmit({ title: title.trim(), summary: summary.trim(), isImportant, author });
        reset(); onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>공지 작성</Text>
                            <Text style={styles.modalSub}>학부모께 전달할 내용을 입력하세요</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { reset(); onClose(); }}>
                            <Ionicons name="close" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>제목 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="예: 내일 버스 지연 안내"
                            placeholderTextColor="#94A3B8"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={50}
                        />

                        <Text style={styles.label}>내용 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, styles.inputMulti]}
                            placeholder="학부모님께 전달할 내용을 입력해주세요"
                            placeholderTextColor="#94A3B8"
                            value={summary}
                            onChangeText={setSummary}
                            multiline
                            numberOfLines={4}
                            maxLength={300}
                        />
                        <Text style={styles.charCount}>{summary.length}/300</Text>

                        <View style={styles.toggleRow}>
                            <View>
                                <Text style={styles.label}>🚨 긴급 공지</Text>
                                <Text style={styles.toggleDesc}>긴급 공지는 상단에 강조됩니다</Text>
                            </View>
                            <Switch
                                value={isImportant}
                                onValueChange={setIsImportant}
                                trackColor={{ true: '#EF4444' }}
                                thumbColor={isImportant ? '#fff' : '#f4f3f4'}
                            />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Ionicons name="send" size={18} color="#fff" />
                            <Text style={styles.submitText}>공지 등록</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── 메인 화면 ──────────────────────────────────────────────
const OperatorHomeScreen = () => {
    const { user, logout } = useAuth();
    const [notices, setNotices] = useState([]);
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const [showWrite, setShowWrite] = useState(false);

    const filtered = notices.filter((n) => {
        if (filter === 'important') return n.isImportant;
        if (filter === 'unread') return !n.isRead;
        return true;
    });

    const markAsRead = (id) => {
        setNotices((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    };

    const handleSubmitNotice = ({ title, summary, isImportant, author }) => {
        const MAX_NOTICES = 30;
        const newNotice = {
            id: Date.now().toString(),
            title, summary, isImportant, author,
            date: new Date().toISOString().slice(0, 10),
            isRead: false,
        };
        setNotices((prev) => {
            const updated = [newNotice, ...prev];
            if (updated.length > MAX_NOTICES) {
                return updated.slice(0, MAX_NOTICES); // 오래된 것 제거
            }
            return updated;
        });
    };

    const handleLogout = () => {
        Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: logout },
        ]);
    };

    const handleDeleteNotice = (id, title) => {
        Alert.alert('공지 삭제', `"${title}"을 삭제하시겠습니까?`, [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => setNotices(prev => prev.filter(n => n.id !== id)) },
        ]);
    };

    // 상세 화면
    const selectedNotice = notices.find((n) => n.id === selectedId);
    if (selectedNotice) {
        return (
            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
                <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
                <ScrollView contentContainerStyle={styles.detailContent}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedId(null)}>
                        <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                        <Text style={styles.backText}>목록으로</Text>
                    </TouchableOpacity>
                    <View style={styles.detailCard}>
                        {selectedNotice.isImportant && (
                            <View style={styles.importantBadge}>
                                <Text style={styles.importantBadgeText}>🚨 긴급 공지</Text>
                            </View>
                        )}
                        <Text style={styles.detailTitle}>{selectedNotice.title}</Text>
                        <View style={styles.detailMeta}>
                            <Ionicons name="person-outline" size={12} color="#94A3B8" />
                            <Text style={styles.detailMetaText}>{selectedNotice.author}</Text>
                            <Text style={styles.detailMetaText}>·</Text>
                            <Text style={styles.detailMetaText}>{selectedNotice.date}</Text>
                        </View>
                        <View style={styles.divider} />
                        <Text style={styles.detailBody}>{selectedNotice.summary}</Text>
                        {!selectedNotice.isRead ? (
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={() => { markAsRead(selectedNotice.id); setSelectedId(null); }}
                            >
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
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>홈</Text>
                    <Text style={styles.headerSub}>{user?.greeting || '운영자님'}</Text>
                </View>
                {/* 로그아웃 튰 — 공지쓰기와 동일한 44×44 원형 */}
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
                {/* 타이틀 행: 공지사항 + 안일음 배지 + 쓰기 버튼 */}
                <View style={styles.sectionLeft}>
                    <View style={styles.sectionDot} />
                    <Text style={styles.sectionTitle}>공지사항</Text>
                    {notices.filter(n => !n.isRead).length > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{notices.filter(n => !n.isRead).length}</Text>
                        </View>
                    )}
                    {/* 공지 작성 버튼 — 타이틀 옆 */}
                    <TouchableOpacity style={styles.sectionWriteBtn} onPress={() => setShowWrite(true)}>
                        <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
                {/* 필터 탭 */}
                <View style={styles.filterRow}>
                    {FILTER_TABS.map((tab) => (
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
                        <Text style={styles.emptySub}>상단 + 버튼으로 첫 공지를 등록해보세요</Text>
                        <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowWrite(true)}>
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={styles.emptyAddBtnText}>공지 작성하기</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    filtered.map((notice) => (
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
                                {/* 삭제 버튼 */}
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => handleDeleteNotice(notice.id, notice.title)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                </TouchableOpacity>
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

            <WriteModal
                visible={showWrite}
                onClose={() => setShowWrite(false)}
                onSubmit={handleSubmitNotice}
                author={user?.label || '운영자'}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },

    // 헤더
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    // 로그아웃: 공지쓰기와 동일한 44×44 파란 원형
    logoutBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#64748B',
        justifyContent: 'center', alignItems: 'center',
        elevation: 3, shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },

    // 홈페이지 카드
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

    // 섹션
    sectionHeader: {
        paddingHorizontal: 20, marginBottom: 8, marginTop: 12,
    },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
    // 공지사항 제목 — 홈 타이틀과 동일한 22px
    sectionTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4, flex: 1 },
    // 쓰기 버튼 — 타이틀 옆 뮤트 소형 파란 원형
    sectionWriteBtn: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center',
        elevation: 2, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3,
    },
    unreadBadge: {
        backgroundColor: '#EF4444', borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    filterRow: { flexDirection: 'row', gap: 6 },
    filterTab: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, backgroundColor: '#fff',
        borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    filterTabActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    filterTabText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    filterTabTextActive: { color: '#fff' },

    // 공지 목록
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyWrap: { alignItems: 'center', marginTop: 40, gap: 8 },
    emptyIconWrap: {
        width: 72, height: 72, borderRadius: 20, backgroundColor: '#F1F5F9',
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    emptyText: { fontSize: 15, fontWeight: '700', color: '#334155' },
    emptySub: { fontSize: 12, color: '#94A3B8' },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#3B82F6', borderRadius: 22,
        paddingHorizontal: 20, paddingVertical: 10, marginTop: 12,
    },
    emptyAddBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    noticeCard: {
        backgroundColor: '#fff', borderRadius: 14,
        padding: 14, marginBottom: 8,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    importantCard: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
    noticeTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    importantTag: { fontSize: 13 },
    unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3B82F6' },
    noticeDate: { color: '#94A3B8', fontSize: 11, marginLeft: 'auto' },
    deleteBtn: {
        width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF2F2',
        justifyContent: 'center', alignItems: 'center', marginLeft: 4,
    },
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
    detailCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 20,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    },
    importantBadge: {
        alignSelf: 'flex-start', backgroundColor: '#FEF2F2',
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
    },
    importantBadgeText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
    detailTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
    detailMetaText: { fontSize: 11, color: '#94A3B8' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
    detailBody: { fontSize: 15, color: '#334155', lineHeight: 26, marginBottom: 20 },
    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#10B981', borderRadius: 14, padding: 14, gap: 8,
    },
    confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    alreadyRead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    alreadyReadText: { color: '#10B981', fontSize: 13, fontWeight: '600' },

    // 모달
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: '85%',
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    modalSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
    required: { color: '#EF4444' },
    input: {
        backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
        padding: 14, fontSize: 14, color: '#0F172A', marginBottom: 16,
    },
    inputMulti: { height: 100, textAlignVertical: 'top' },
    charCount: { textAlign: 'right', fontSize: 11, color: '#94A3B8', marginTop: -12, marginBottom: 16 },
    toggleRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 20,
    },
    toggleDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    submitBtn: {
        backgroundColor: '#3B82F6', borderRadius: 14, padding: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20,
    },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default OperatorHomeScreen;
