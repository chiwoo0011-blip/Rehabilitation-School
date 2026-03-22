import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Modal, TextInput, Alert, KeyboardAvoidingView,
    Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeCalendar, addCalendarEvent, deleteCalendarEvent, addMultipleCalendarEvents } from '../../services/calendarService';
import { fetchSchoolSchedule } from '../../services/neisService';

const CATEGORIES = ['행사', '방학', '시험', '기타'];

const CATEGORY_COLORS = {
    '행사': '#3B82F6',
    '방학': '#10B981',
    '시험': '#EF4444',
    '기타': '#94A3B8',
};

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ── 일정 등록 모달 ──────────────────────────────────────────
const WriteModal = ({ visible, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState(todayStr());
    const [endDate, setEndDate] = useState(todayStr());
    const [category, setCategory] = useState('행사');
    const [description, setDescription] = useState('');

    const reset = () => {
        setTitle(''); setStartDate(todayStr()); setEndDate(todayStr());
        setCategory('행사'); setDescription('');
    };

    const handleSubmit = () => {
        if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
        if (!startDate || !endDate) { Alert.alert('알림', '날짜를 입력해주세요.'); return; }
        if (startDate > endDate) { Alert.alert('알림', '종료일이 시작일보다 빠릅니다.'); return; }
        onSubmit({ title: title.trim(), startDate, endDate, category, description: description.trim() });
        reset(); onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>일정 등록</Text>
                            <Text style={styles.modalSub}>학사일정을 입력하세요</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { reset(); onClose(); }}>
                            <Ionicons name="close" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>제목 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="예: 봄 소풍"
                            placeholderTextColor="#94A3B8"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={50}
                        />

                        <Text style={styles.label}>시작일 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#94A3B8"
                            value={startDate}
                            onChangeText={setStartDate}
                            maxLength={10}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>종료일 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD  (하루짜리면 시작일과 동일)"
                            placeholderTextColor="#94A3B8"
                            value={endDate}
                            onChangeText={setEndDate}
                            maxLength={10}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>카테고리</Text>
                        <View style={styles.chipRow}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.chip,
                                        category === cat && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] },
                                    ]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>설명 <Text style={styles.optional}>(선택)</Text></Text>
                        <TextInput
                            style={[styles.input, styles.inputMulti]}
                            placeholder="추가 안내 사항을 입력해주세요"
                            placeholderTextColor="#94A3B8"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            maxLength={200}
                        />
                        <Text style={styles.charCount}>{description.length}/200</Text>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Ionicons name="calendar" size={18} color="#fff" />
                            <Text style={styles.submitText}>일정 등록</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── 메인 화면 ───────────────────────────────────────────────
const CalendarManageScreen = () => {
    const [events, setEvents] = useState([]);
    const [showWrite, setShowWrite] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeCalendar(setEvents);
        return unsubscribe;
    }, []);

    const handleSubmit = async (data) => {
        try {
            await addCalendarEvent(data);
        } catch (e) {
            Alert.alert('오류', '일정 등록에 실패했습니다.');
        }
    };

    const handleDelete = (id, title) => {
        Alert.alert('일정 삭제', `"${title}"을 삭제하시겠습니까?`, [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제', style: 'destructive', onPress: async () => {
                    try { await deleteCalendarEvent(id); }
                    catch (e) { Alert.alert('오류', '삭제에 실패했습니다.'); }
                },
            },
        ]);
    };

    const handleSyncNeis = async () => {
        Alert.alert('나이스 일정 연동', '올해(3월 기준) 학사일정을 동기화하시겠습니까?\n(동일한 일정이 중복으로 등록될 수 있으니 미리 확인해주세요.)', [
            { text: '취소', style: 'cancel' },
            { text: '연동', onPress: async () => {
                setIsSyncing(true);
                const year = new Date().getFullYear();
                const res = await fetchSchoolSchedule(year);
                if (res.success && res.data.length > 0) {
                    try {
                        await addMultipleCalendarEvents(res.data);
                        Alert.alert('성공', `총 ${res.data.length}개의 학사일정이 등록되었습니다.`);
                    } catch(e) {
                         Alert.alert('오류', '일정을 저장하는데 실패했습니다.');
                    }
                } else {
                    Alert.alert('오류', res.message || '데이터를 가져오지 못했습니다.');
                }
                setIsSyncing(false);
            }}
        ]);
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>학사일정 관리</Text>
                    <Text style={styles.headerSub}>총 {events.length}개 일정</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNeis} disabled={isSyncing}>
                        <Ionicons name="sync" size={18} color="#fff" />
                        <Text style={styles.syncBtnText}>{isSyncing ? '동기화 중...' : '연동'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowWrite(true)}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 일정 목록 */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {events.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIconWrap}>
                            <Text style={{ fontSize: 36 }}>📅</Text>
                        </View>
                        <Text style={styles.emptyText}>등록된 일정이 없습니다</Text>
                        <Text style={styles.emptySub}>상단 + 버튼으로 첫 일정을 등록해보세요</Text>
                        <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowWrite(true)}>
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={styles.emptyAddBtnText}>일정 등록하기</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    events.map((ev) => (
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
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDelete(ev.id, ev.title)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.eventTitle}>{ev.title}</Text>
                                {ev.description ? (
                                    <Text style={styles.eventDesc}>{ev.description}</Text>
                                ) : null}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <WriteModal
                visible={showWrite}
                onClose={() => setShowWrite(false)}
                onSubmit={handleSubmit}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    addBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center',
        elevation: 3, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    },
    syncBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#10B981',
        justifyContent: 'center',
        elevation: 3, shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    },
    syncBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    content: { paddingHorizontal: 20, paddingBottom: 40 },

    emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
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

    eventCard: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
        marginBottom: 8, overflow: 'hidden',
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    categoryBar: { width: 4 },
    eventBody: { flex: 1, padding: 12 },
    eventTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    categoryChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    categoryText: { fontSize: 11, fontWeight: '700' },
    eventDate: { fontSize: 11, color: '#94A3B8', flex: 1 },
    deleteBtn: {
        width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF2F2',
        justifyContent: 'center', alignItems: 'center',
    },
    eventTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    eventDesc: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 },

    // 모달
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: '90%',
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    modalSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
    optional: { fontWeight: '400', color: '#94A3B8' },
    required: { color: '#EF4444' },
    input: {
        backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
        padding: 14, fontSize: 14, color: '#0F172A', marginBottom: 16,
    },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    charCount: { textAlign: 'right', fontSize: 11, color: '#94A3B8', marginTop: -12, marginBottom: 16 },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff',
    },
    chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    chipTextActive: { color: '#fff' },
    submitBtn: {
        backgroundColor: '#3B82F6', borderRadius: 14, padding: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20,
    },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default CalendarManageScreen;
