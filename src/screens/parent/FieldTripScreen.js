import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, Image, StatusBar,
    Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

// ── 상수 ───────────────────────────────────────────────────
const CAN_WRITE = ['teacher', 'staff', 'operator'];
const MAX_POSTS = 20;
const EXPIRE_DAYS = 30;

// 학교급
const SCHOOL_DIVS = ['유초등', '중등', '고등', '전공'];
// 학교급별 학년 목록 (유초등은 유치원 포함)
const GRADE_OPTIONS = {
    '유초등': ['유치원', '1학년', '2학년', '3학년', '4학년', '5학년', '6학년'],
    '중등': ['1학년', '2학년', '3학년'],
    '고등': ['1학년', '2학년', '3학년'],
    '전공': ['1학년', '2학년', '3학년', '4학년'],
};

const daysSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// ── 필터 탭 ─────────────────────────────────────────────────
const FILTER_TABS = [
    { key: 'all', label: '전체' },
    ...SCHOOL_DIVS.map(d => ({ key: d, label: d })),
];

// ── 학급명 조합 ──────────────────────────────────────────────
const buildClassName = (div, grade, cls) => {
    // grade is full label like '유치원' or '3학년'
    let name = `${div} ${grade}`;
    if (cls.trim()) name += ` ${cls.trim()}반`;
    return name;
};

// ── 작성 모달 ───────────────────────────────────────────────
const WriteModal = ({ visible, onClose, onSubmit, author }) => {
    const [div, setDiv] = useState('중등');
    const [grade, setGrade] = useState('1학년');
    const [cls, setCls] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState([]);

    const reset = () => {
        setDiv('중등'); setGrade('1학년'); setCls('');
        setTitle(''); setContent(''); setPhotos([]);
    };

    const handlePickPhoto = async () => {
        if (photos.length >= 4) { Alert.alert('알림', '사진은 최대 4장까지 첨부할 수 있습니다.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        if (!result.canceled) setPhotos(prev => [...prev, result.assets[0].uri]);
    };

    const handleSubmit = () => {
        if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
        if (!content.trim()) { Alert.alert('알림', '내용을 입력해주세요.'); return; }
        onSubmit({
            className: buildClassName(div, grade, cls),
            schoolDiv: div,
            title: title.trim(),
            content: content.trim(),
            photos,
            teacher: author,
        });
        reset(); onClose();
    };

    const grades = GRADE_OPTIONS[div] || ['1학년', '2학년', '3학년'];

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>현장학습 작성</Text>
                            <Text style={styles.modalSub}>학교급·학년을 선택하고 내용을 입력하세요</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { reset(); onClose(); }}>
                            <Ionicons name="close" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* 학교급 선택 — 가로 스크롤 */}
                        <Text style={styles.label}>학교급 <Text style={styles.required}>*</Text></Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                            {SCHOOL_DIVS.map(d => (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.chip, div === d && styles.chipActive]}
                                    onPress={() => { setDiv(d); setGrade(GRADE_OPTIONS[d][0]); }}
                                >
                                    <Text style={[styles.chipText, div === d && styles.chipTextActive]}>{d}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* 학년 선택 — 2줄 wrap 구조 */}
                        <Text style={[styles.label, { marginTop: 12 }]}>학년 <Text style={styles.required}>*</Text></Text>
                        <View style={styles.chipWrap}>
                            {grades.map(g => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.chip, grade === g && styles.chipActive]}
                                    onPress={() => setGrade(g)}
                                >
                                    <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 반 (선택) */}
                        <Text style={[styles.label, { marginTop: 12 }]}>반 <Text style={styles.optional}>(선택)</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="예: 1  또는 비워두면 학년까지만 표시"
                            placeholderTextColor="#94A3B8"
                            value={cls}
                            onChangeText={setCls}
                            keyboardType="number-pad"
                            maxLength={2}
                        />

                        {/* 미리보기 */}
                        <View style={styles.previewRow}>
                            <Ionicons name="information-circle-outline" size={14} color="#3B82F6" />
                            <Text style={styles.previewText}>
                                학급명 미리보기: <Text style={styles.previewBold}>{buildClassName(div, grade, cls)}</Text>
                            </Text>
                        </View>

                        {/* 제목 */}
                        <Text style={[styles.label, { marginTop: 12 }]}>제목 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="예: 🌸 봄 소풍 - 어린이대공원"
                            placeholderTextColor="#94A3B8"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={50}
                        />

                        {/* 내용 */}
                        <Text style={styles.label}>내용 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, styles.inputMulti]}
                            placeholder="현장학습 내용을 입력해주세요"
                            placeholderTextColor="#94A3B8"
                            value={content}
                            onChangeText={setContent}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{content.length}/500</Text>

                        {/* 사진 */}
                        <Text style={styles.label}>사진 ({photos.length}/4)</Text>
                        <View style={styles.photoRow}>
                            {photos.map((uri, i) => (
                                <View key={i} style={styles.photoThumbWrap}>
                                    <Image source={{ uri }} style={styles.photoThumbModal} />
                                    <TouchableOpacity
                                        style={styles.removePhotoBtn}
                                        onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                    >
                                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {photos.length < 4 && (
                                <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickPhoto}>
                                    <Ionicons name="camera-outline" size={24} color="#94A3B8" />
                                    <Text style={styles.addPhotoText}>사진 추가</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Ionicons name="images-outline" size={18} color="#fff" />
                            <Text style={styles.submitText}>게시하기</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── 메인 화면 ──────────────────────────────────────────────
const FieldTripScreen = () => {
    const { user } = useAuth();
    const canWrite = CAN_WRITE.includes(user?.role);
    const [filter, setFilter] = useState('all');
    const [posts, setPosts] = useState([
        {
            id: '1', schoolDiv: '유초등', className: '유초등 3학년',
            title: '🌸 봄 소풍 - 어린이대공원',
            content: '오늘 아이들이 나비도 보고 꽃길도 걸으며 즐거운 시간을 보냈습니다.',
            photos: [], date: '2026-02-19', teacher: '김민지 선생님',
        },
        {
            id: '2', schoolDiv: '중등', className: '중등 2학년 3반',
            title: '🦕 국립자연사박물관 현장학습',
            content: '공룡 화석을 보며 아이들이 매우 신기해했어요. 내년에 또 오고 싶다고 했답니다!',
            photos: [], date: '2026-02-18', teacher: '이지수 선생님',
        },
    ]);
    const [showWrite, setShowWrite] = useState(false);

    // 자동삭제: 마운트 시 만료 게시물 제거
    React.useEffect(() => {
        setPosts(prev => {
            const valid = prev.filter(p => daysSince(p.date) < EXPIRE_DAYS);
            if (valid.length !== prev.length) {
                Alert.alert(
                    '게시물 정리',
                    `${EXPIRE_DAYS}일이 지난 현장학습 게시물 ${prev.length - valid.length}개가 자동 삭제되었습니다.`,
                    [{ text: '확인' }]
                );
            }
            return valid;
        });
    }, []);

    const handleSubmit = ({ className, schoolDiv, title, content, photos, teacher }) => {
        const newPost = {
            id: Date.now().toString(),
            className, schoolDiv, title, content, photos,
            date: new Date().toISOString().slice(0, 10),
            teacher,
        };
        setPosts(prev => {
            const updated = [newPost, ...prev];
            if (updated.length > MAX_POSTS) return updated.slice(0, MAX_POSTS);
            return updated;
        });
    };

    const handleDelete = (post) => {
        Alert.alert('게시물 삭제', `"${post.title}"을 삭제하시겠습니까?`, [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => setPosts(prev => prev.filter(p => p.id !== post.id)) },
        ]);
    };

    const filtered = filter === 'all' ? posts : posts.filter(p => p.schoolDiv === filter);

    // 학교급별 색상
    const divColor = { '유초등': '#10B981', '중등': '#3B82F6', '고등': '#8B5CF6', '전공': '#F59E0B' };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>현장학습</Text>
                    <Text style={styles.headerSub}>학교급별 현장학습 앨범</Text>
                </View>
                {canWrite && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowWrite(true)}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* 학교급 필터 탭 — 고정 높이 컨테이너로 감싸서 세로 팩력 방지 */}
            <View style={styles.filterWrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    {FILTER_TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.filterTab,
                                filter === tab.key && {
                                    backgroundColor: tab.key === 'all' ? '#334155' : divColor[tab.key],
                                    borderColor: tab.key === 'all' ? '#334155' : divColor[tab.key],
                                },
                            ]}
                            onPress={() => setFilter(tab.key)}
                        >
                            <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* 게시물 목록 */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {filtered.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={{ fontSize: 40 }}>📭</Text>
                        <Text style={styles.emptyText}>게시물이 없습니다</Text>
                        {canWrite && (
                            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowWrite(true)}>
                                <Ionicons name="add" size={16} color="#fff" />
                                <Text style={styles.emptyAddText}>첫 게시물 작성하기</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    filtered.map(post => {
                        const color = divColor[post.schoolDiv] || '#64748B';
                        return (
                            <View key={post.id} style={styles.postCard}>
                                {/* 카드 헤더 */}
                                <View style={styles.postHeader}>
                                    <View style={[styles.classBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                                        <Text style={[styles.classText, { color }]}>{post.className}</Text>
                                    </View>
                                    <Text style={styles.dateText}>{post.date}</Text>
                                    {/* 삭제 버튼 — 작성자만 */}
                                    {canWrite && (
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => handleDelete(post)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text style={styles.postTitle}>{post.title}</Text>
                                <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>

                                {post.photos.length > 0 && (
                                    <View style={styles.photoGrid}>
                                        {post.photos.slice(0, 4).map((uri, i) => (
                                            <Image key={i} source={{ uri }} style={styles.photoThumb} />
                                        ))}
                                    </View>
                                )}

                                <Text style={styles.teacherText}>📝 {post.teacher}</Text>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <WriteModal
                visible={showWrite}
                onClose={() => setShowWrite(false)}
                onSubmit={handleSubmit}
                author={user?.label || '선생님'}
            />
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
    addBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#9C27B0',
        justifyContent: 'center', alignItems: 'center',
        elevation: 3, shadowColor: '#9C27B0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    },

    // 필터 영역 — 높이 고정으로 세로 팩력 방지
    filterWrap: { height: 48, overflow: 'hidden' },
    filterScroll: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
    filterTab: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    filterText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    filterTextActive: { color: '#fff' },

    content: { paddingHorizontal: 16, paddingBottom: 40 },

    emptyWrap: { alignItems: 'center', marginTop: 60, gap: 10 },
    emptyText: { fontSize: 15, fontWeight: '700', color: '#334155' },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#9C27B0', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
    },
    emptyAddText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    postCard: {
        backgroundColor: '#fff', borderRadius: 14,
        padding: 14, marginBottom: 10,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    classBadge: {
        borderRadius: 20, borderWidth: 1.5,
        paddingHorizontal: 10, paddingVertical: 3,
    },
    classText: { fontSize: 12, fontWeight: '700' },
    dateText: { color: '#94A3B8', fontSize: 11, marginLeft: 'auto' },
    deleteBtn: {
        width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF2F2',
        justifyContent: 'center', alignItems: 'center',
    },
    postTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
    postContent: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 10 },
    photoGrid: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
    photoThumb: { width: 70, height: 70, borderRadius: 8 },
    teacherText: { fontSize: 11, color: '#94A3B8' },

    // 모달
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: '92%',
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    modalSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

    label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
    required: { color: '#EF4444' },
    optional: { color: '#94A3B8', fontWeight: '400' },

    // 학교급 — 가로 스크롤 contentContainerStyle
    chipScroll: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    // 학년 — 2줄 wrap (화면 밖으로 벗어나지 않도록)
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
    },
    chipActive: { backgroundColor: '#9C27B0', borderColor: '#9C27B0' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    chipTextActive: { color: '#fff' },

    // 미리보기
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginBottom: 4 },
    previewText: { fontSize: 12, color: '#3B82F6' },
    previewBold: { fontWeight: '800' },

    input: {
        backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
        padding: 14, fontSize: 14, color: '#0F172A', marginBottom: 16,
    },
    inputMulti: { height: 100, textAlignVertical: 'top' },
    charCount: { textAlign: 'right', fontSize: 11, color: '#94A3B8', marginTop: -12, marginBottom: 16 },

    photoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
    photoThumbWrap: { position: 'relative' },
    photoThumbModal: { width: 72, height: 72, borderRadius: 10 },
    removePhotoBtn: { position: 'absolute', top: -6, right: -6 },
    addPhotoBtn: {
        width: 72, height: 72, borderRadius: 10,
        backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    addPhotoText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

    submitBtn: {
        backgroundColor: '#9C27B0', borderRadius: 14, padding: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20,
    },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default FieldTripScreen;
