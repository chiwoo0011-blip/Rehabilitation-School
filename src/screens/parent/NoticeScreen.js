import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, Modal, TextInput, Switch, Alert,
    Linking, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { APP_CONFIG } from '../../constants/config';

// 공지 작성 가능 역할
const CAN_WRITE = ['teacher', 'staff', 'operator'];

// 초기 공지 데이터 (샘플 없음 — 운영자가 직접 작성)
const INITIAL_NOTICES = [];

// 필터 탭 정의
const FILTER_TABS = [
    { key: 'all', label: '전체' },
    { key: 'important', label: '📌 중요' },
    { key: 'unread', label: '🔵 안읽음' },
];

// ── 통학버스 공지 작성 모달 ──────────────────────────────────
const WriteModal = ({ visible, onClose, onSubmit, author }) => {
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [isImportant, setIsImportant] = useState(false);

    const reset = () => {
        setTitle(''); setSummary(''); setIsImportant(false);
    };

    const handleSubmit = () => {
        if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
        if (!summary.trim()) { Alert.alert('알림', '내용을 입력해주세요.'); return; }
        onSubmit({ title: title.trim(), summary: summary.trim(), link: '', isImportant, author });
        reset();
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalCard}>
                    {/* 모달 헤더 */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>🚌 통학버스 공지 작성</Text>
                        <TouchableOpacity onPress={() => { reset(); onClose(); }}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* 제목 */}
                        <Text style={styles.inputLabel}>제목 *</Text>
                        <TextInput
                            style={styles.inputField}
                            placeholder="예: 내일 버스 지연 안내"
                            placeholderTextColor={COLORS.textSecondary}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={50}
                        />

                        {/* 내용 */}
                        <Text style={styles.inputLabel}>내용 *</Text>
                        <TextInput
                            style={[styles.inputField, styles.inputMultiline]}
                            placeholder="학부모님께 전달할 버스 운행 관련 내용을 입력해주세요"
                            placeholderTextColor={COLORS.textSecondary}
                            value={summary}
                            onChangeText={setSummary}
                            multiline
                            numberOfLines={4}
                            maxLength={300}
                        />
                        <Text style={styles.charCount}>{summary.length}/300</Text>

                        {/* 중요 공지 토글 */}
                        <View style={styles.toggleRow}>
                            <View>
                                <Text style={styles.inputLabel}>🚨 긴급 공지로 표시</Text>
                                <Text style={styles.toggleDesc}>긴급 공지는 상단에 강조됩니다</Text>
                            </View>
                            <Switch
                                value={isImportant}
                                onValueChange={setIsImportant}
                                trackColor={{ true: COLORS.danger }}
                                thumbColor={isImportant ? '#fff' : '#f4f3f4'}
                            />
                        </View>

                        {/* 등록 버튼 */}
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
const NoticeScreen = () => {
    const { user } = useAuth();
    const canWrite = CAN_WRITE.includes(user?.role);
    const isBusNotice = user?.role === 'operator'; // 운영자 = 통학버스 공지 화면

    const [notices, setNotices] = useState(INITIAL_NOTICES);
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const [showWrite, setShowWrite] = useState(false);

    // 필터 적용
    const filtered = notices.filter((n) => {
        if (filter === 'important') return n.isImportant;
        if (filter === 'unread') return !n.isRead;
        return true;
    });

    // 미읽음 수
    const unreadCount = notices.filter((n) => !n.isRead).length;

    // 읽음 처리
    const markAsRead = (id) => {
        setNotices((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    };

    // 공지 등록
    const handleSubmitNotice = ({ title, summary, link, isImportant, author }) => {
        const newNotice = {
            id: Date.now().toString(),
            title, summary, link, isImportant, author,
            date: new Date().toISOString().slice(0, 10),
            isRead: false,
        };
        setNotices((prev) => [newNotice, ...prev]);
    };

    // 링크 열기
    const openLink = (link) => {
        const url = link || APP_CONFIG.homepageUrl;
        Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
    };

    // 상세 보기
    const selectedNotice = notices.find((n) => n.id === selectedId);

    // ── 상세 화면 ──
    if (selectedNotice) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
                <ScrollView contentContainerStyle={styles.detailContent}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedId(null)}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
                        <Text style={styles.backText}>목록으로</Text>
                    </TouchableOpacity>

                    <View style={styles.detailCard}>
                        {selectedNotice.isImportant && (
                            <View style={styles.importantBadge}>
                                <Text style={styles.importantBadgeText}>📌 중요 공지</Text>
                            </View>
                        )}
                        <Text style={styles.detailTitle}>{selectedNotice.title}</Text>
                        <View style={styles.detailMeta}>
                            <Ionicons name="person-outline" size={13} color={COLORS.textSecondary} />
                            <Text style={styles.detailMetaText}>{selectedNotice.author}</Text>
                            <Text style={styles.detailMetaText}>·</Text>
                            <Text style={styles.detailMetaText}>{selectedNotice.date}</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.detailBody}>{selectedNotice.summary}</Text>

                        {/* 홈페이지 링크 버튼 */}
                        <TouchableOpacity
                            style={styles.linkBtn}
                            onPress={() => openLink(selectedNotice.link)}
                        >
                            <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.linkBtnText}>
                                {selectedNotice.link ? '자세히 보기 (홈페이지)' : '학교 홈페이지 바로가기'}
                            </Text>
                            <Ionicons name="open-outline" size={16} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* 읽음 확인 버튼 */}
                        {!selectedNotice.isRead ? (
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={() => { markAsRead(selectedNotice.id); setSelectedId(null); }}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                <Text style={styles.confirmText}>확인했습니다</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.alreadyRead}>
                                <Ionicons name="checkmark-done" size={18} color={COLORS.success} />
                                <Text style={styles.alreadyReadText}>이미 확인한 공지입니다</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── 목록 화면 ──
    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

            {/* 커스텀 헤더 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>공지</Text>
                    <Text style={styles.headerSub}>통학버스 운행 안내 및 공지</Text>
                </View>
                {canWrite && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowWrite(true)}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* 필터 탭 */}
            <View style={styles.filterRow}>
                <View style={{ flexDirection: 'row', flex: 1, gap: 8 }}>
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
                        <Text style={styles.emptyIcon}>{isBusNotice ? '🚌' : '📭'}</Text>
                        <Text style={styles.emptyText}>
                            {isBusNotice ? '등록된 버스 공지가 없습니다' : '해당 공지가 없습니다'}
                        </Text>
                        {isBusNotice && canWrite && (
                            <Text style={styles.emptySubText}>우상단 + 버튼으로 첫 공지를 등록해보세요</Text>
                        )}
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
                            </View>
                            <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                            <Text style={styles.noticePreview} numberOfLines={2}>{notice.summary}</Text>
                            <View style={styles.noticeFooter}>
                                <View style={styles.authorChip}>
                                    <Ionicons name="person-outline" size={11} color={COLORS.textSecondary} />
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

            {/* 공지 작성 모달 */}
            <WriteModal
                visible={showWrite}
                onClose={() => setShowWrite(false)}
                onSubmit={handleSubmitNotice}
                author={user?.label || ''}
            />
        </SafeAreaView>
    );
};

// ── 스타일 ────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },

    // 커스텀 헤더
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerIconBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center',
    },
    addBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center',
        elevation: 3, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    },

    // 필터 탭
    filterRow: {
        flexDirection: 'row', gap: SPACING.sm,
        paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
    },
    filterTab: {
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full, backgroundColor: COLORS.cardBg,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterTabText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
    filterTabTextActive: { color: '#fff' },
    writeBtnInline: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    },
    writeBtnText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '700' },

    // 목록
    content: { padding: SPACING.md, paddingBottom: 40 },
    emptyWrap: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: SPACING.sm },
    emptyText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
    emptySubText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 6, textAlign: 'center' },

    // 공지 카드
    noticeCard: {
        backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: SPACING.sm,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 4,
    },
    importantCard: {
        borderLeftWidth: 4, borderLeftColor: COLORS.danger,
    },
    noticeTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 6 },
    importantTag: { fontSize: 13 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
    noticeDate: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginLeft: 'auto' },
    noticeTitle: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    noticePreview: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
    noticeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    authorChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    authorText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
    urgentChip: {
        backgroundColor: '#FEE2E2', borderRadius: RADIUS.full,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    urgentChipText: { fontSize: FONTS.sizes.xs, color: COLORS.danger, fontWeight: '700' },

    // 상세 화면
    detailContent: { padding: SPACING.md, paddingBottom: 40 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
    backText: { color: COLORS.primary, fontSize: FONTS.sizes.md, fontWeight: '600' },
    detailCard: {
        backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md,
        padding: SPACING.lg, elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 4,
    },
    importantBadge: {
        alignSelf: 'flex-start', backgroundColor: '#FFF3E0',
        borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4, marginBottom: SPACING.sm,
    },
    importantBadgeText: { color: COLORS.warning, fontSize: FONTS.sizes.sm, fontWeight: '700' },
    detailTitle: { fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.xs },
    detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.md },
    detailMetaText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
    divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
    detailBody: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, lineHeight: 26, marginBottom: SPACING.lg },
    linkBtn: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: '#EBF4FF', borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: SPACING.md,
    },
    linkBtnText: { flex: 1, color: COLORS.primary, fontSize: FONTS.sizes.md, fontWeight: '600' },
    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.success, borderRadius: RADIUS.full,
        padding: SPACING.md, gap: SPACING.sm,
    },
    confirmText: { color: '#FFF', fontSize: FONTS.sizes.md, fontWeight: 'bold' },
    alreadyRead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
    alreadyReadText: { color: COLORS.success, fontSize: FONTS.sizes.sm, fontWeight: '600' },

    // 작성 모달
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
        backgroundColor: COLORS.cardBg, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
        padding: SPACING.lg, maxHeight: '90%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
    modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    inputLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
    optionalLabel: { fontWeight: '400', color: COLORS.textSecondary },
    inputField: {
        backgroundColor: COLORS.background, borderRadius: RADIUS.md,
        borderWidth: 1.5, borderColor: COLORS.border,
        padding: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    inputMultiline: { height: 90, textAlignVertical: 'top' },
    charCount: { textAlign: 'right', fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: -SPACING.sm, marginBottom: SPACING.md },
    linkInputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.background, borderRadius: RADIUS.md,
        borderWidth: 1.5, borderColor: COLORS.border,
        paddingHorizontal: SPACING.md, marginBottom: SPACING.md,
    },
    linkInput: { flex: 1, height: 48, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary },
    toggleRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: COLORS.background, borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: SPACING.lg,
    },
    toggleDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
    submitBtn: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        padding: SPACING.md, flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    submitText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: 'bold' },
});

export default NoticeScreen;
