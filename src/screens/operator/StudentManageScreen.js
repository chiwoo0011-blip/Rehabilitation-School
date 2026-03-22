/**
 * StudentManageScreen.js
 * 운영자가 학생을 추가/삭제하고 초대코드를 관리하는 화면
 */
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, Modal, Alert, Share, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../../constants/theme';
import { addStudent, removeStudent, subscribeStudents, updateOffDays } from '../../services/studentService';

const DAY_LABELS = ['', '월', '화', '수', '목', '금']; // index 1~5

const BUS_OPTIONS = [
    { id: 'bus1', label: '1호차', color: '#3B82F6' },
    { id: 'bus2', label: '2호차', color: '#8B5CF6' },
];

// ── 학생 추가 모달 ───────────────────────────────────────────
const AddStudentModal = ({ visible, onClose }) => {
    const [studentName, setStudentName] = useState('');
    const [parentName, setParentName] = useState('');
    const [busId, setBusId] = useState('bus1');
    const [loading, setLoading] = useState(false);

    const reset = () => { setStudentName(''); setParentName(''); setBusId('bus1'); };

    const handleAdd = async () => {
        if (!studentName.trim()) { Alert.alert('알림', '학생 이름을 입력해주세요.'); return; }
        setLoading(true);
        try {
            const result = await addStudent({
                studentName: studentName.trim(),
                busId,
                parentName: parentName.trim(),
            });
            Alert.alert(
                '✅ 학생 추가 완료',
                `초대코드: ${result.code}\n\n학부모님께 이 코드를 전달해주세요.`,
                [
                    {
                        text: '코드 공유',
                        onPress: () => Share.share({
                            message: `[특수학교 통학버스 앱]\n학생: ${result.studentName}\n초대코드: ${result.code}\n\n앱에서 위 코드를 입력하여 로그인 해주세요.`,
                        }),
                    },
                    { text: '확인', onPress: () => { reset(); onClose(); } },
                ]
            );
        } catch (e) {
            Alert.alert('오류', '학생 추가에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const selectedBus = BUS_OPTIONS.find(b => b.id === busId);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalCard}>
                    {/* 모달 핸들 */}
                    <View style={styles.modalHandle} />

                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>학생 추가</Text>
                            <Text style={styles.modalSub}>초대코드가 자동 생성됩니다</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { reset(); onClose(); }}>
                            <Ionicons name="close" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* 학생 이름 */}
                        <Text style={styles.label}>학생 이름 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="예: 홍길동"
                            placeholderTextColor="#94A3B8"
                            value={studentName}
                            onChangeText={setStudentName}
                        />

                        {/* 학부모 성함 */}
                        <Text style={styles.label}>
                            학부모 성함 <Text style={styles.optional}>(선택)</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="예: 홍길동 어머님"
                            placeholderTextColor="#94A3B8"
                            value={parentName}
                            onChangeText={setParentName}
                        />

                        {/* 버스 선택 */}
                        <Text style={styles.label}>탑승 버스 <Text style={styles.required}>*</Text></Text>
                        <View style={styles.busRow}>
                            {BUS_OPTIONS.map((b) => {
                                const active = busId === b.id;
                                return (
                                    <TouchableOpacity
                                        key={b.id}
                                        style={[styles.busBtn, active && { backgroundColor: b.color, borderColor: b.color }]}
                                        onPress={() => setBusId(b.id)}
                                    >
                                        <Ionicons name="bus" size={16} color={active ? '#fff' : '#94A3B8'} />
                                        <Text style={[styles.busBtnText, active && { color: '#fff' }]}>{b.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: selectedBus?.color }, loading && { opacity: 0.6 }]}
                            onPress={handleAdd}
                            disabled={loading}
                        >
                            <Ionicons name="person-add" size={18} color="#fff" />
                            <Text style={styles.submitText}>
                                {loading ? '추가 중...' : '학생 추가 및 코드 생성'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ── 요일 설정 인라인 컴포넌트 ────────────────────────────────
const OffDaysPicker = ({ code, offDays = [] }) => {
    const [days, setDays] = useState(offDays);
    const [saving, setSaving] = useState(false);

    const toggle = (d) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

    const handleSave = async () => {
        setSaving(true);
        await updateOffDays(code, days);
        setSaving(false);
    };

    return (
        <View style={styles.offDaysWrap}>
            <Text style={styles.offDaysLabel}>안 타는 요일</Text>
            <View style={styles.offDaysRow}>
                {[1, 2, 3, 4, 5].map(d => (
                    <TouchableOpacity
                        key={d}
                        style={[styles.dayBtn, days.includes(d) && styles.dayBtnActive]}
                        onPress={() => toggle(d)}
                    >
                        <Text style={[styles.dayBtnText, days.includes(d) && styles.dayBtnTextActive]}>
                            {DAY_LABELS[d]}
                        </Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={[styles.saveDaysBtn, saving && { opacity: 0.5 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveDaysBtnText}>{saving ? '저장중' : '저장'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ── 메인 화면 ────────────────────────────────────────────────
const StudentManageScreen = () => {
    const [students, setStudents] = useState([]);
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        const unsub = subscribeStudents(setStudents);
        return unsub;
    }, []);

    const handleShare = (student) => {
        Share.share({
            message: `[특수학교 통학버스 앱]\n학생: ${student.studentName}\n초대코드: ${student.code}\n\n앱에서 위 코드를 입력하여 로그인 해주세요.`,
        });
    };

    const handleDelete = (student) => {
        Alert.alert(
            '학생 삭제',
            `${student.studentName} 학생을 삭제합니까?\n해당 초대코드(${student.code})도 함께 삭제됩니다.`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제', style: 'destructive',
                    onPress: () => removeStudent(student.code),
                },
            ]
        );
    };

    const getBusInfo = (busId) => BUS_OPTIONS.find(b => b.id === busId) || { label: busId, color: '#64748B' };

    // 버스별 그룹
    const bus1Students = students.filter(s => s.busId === 'bus1');
    const bus2Students = students.filter(s => s.busId === 'bus2');

    const renderStudentCard = (student) => {
        const busInfo = getBusInfo(student.busId);
        return (
            <View key={student.code} style={styles.card}>
                {/* 상단: 아바타 + 이름 + 액션 */}
                <View style={styles.cardTop}>
                    <View style={[styles.avatarCircle, { backgroundColor: busInfo.color + '18' }]}>
                        <Text style={[styles.avatarText, { color: busInfo.color }]}>
                            {student.studentName.charAt(0)}
                        </Text>
                    </View>

                    <View style={styles.cardInfo}>
                        <Text style={styles.studentName}>{student.studentName}</Text>
                        <Text style={styles.studentMeta}>{student.parentName || '학부모'}</Text>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleShare(student)}>
                            <Ionicons name="share-social-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => handleDelete(student)}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 하단: 초대 코드 큰 박스 */}
                <View style={[styles.codeBox, { backgroundColor: busInfo.color + '10', borderColor: busInfo.color + '30' }]}>
                    <Ionicons name="key" size={14} color={busInfo.color} />
                    <Text style={styles.codeLabel}>초대코드</Text>
                    <Text
                        style={[styles.codeBig, { color: busInfo.color }]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >
                        {student.code}
                    </Text>
                </View>

                {/* 안 타는 요일 설정 */}
                <OffDaysPicker code={student.code} offDays={student.offDays || []} />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>학생 관리</Text>
                    <Text style={styles.headerSub}>총 {students.length}명 등록됨</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {students.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIconWrap}>
                            <Text style={{ fontSize: 40 }}>👦</Text>
                        </View>
                        <Text style={styles.emptyText}>등록된 학생이 없습니다</Text>
                        <Text style={styles.emptySubText}>상단 추가 버튼으로 학생을 등록하세요</Text>
                        <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
                            <Ionicons name="person-add" size={16} color="#fff" />
                            <Text style={styles.emptyAddBtnText}>첫 학생 추가하기</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* 1호차 그룹 */}
                        {bus1Students.length > 0 && (
                            <>
                                <View style={styles.groupHeader}>
                                    <View style={[styles.groupDot, { backgroundColor: '#3B82F6' }]} />
                                    <Text style={styles.groupTitle}>🚌 1호차</Text>
                                    <View style={[styles.groupBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                                        <Text style={[styles.groupBadgeText, { color: '#3B82F6' }]}>{bus1Students.length}명</Text>
                                    </View>
                                </View>
                                {bus1Students.map(renderStudentCard)}
                            </>
                        )}

                        {/* 2호차 그룹 */}
                        {bus2Students.length > 0 && (
                            <>
                                <View style={styles.groupHeader}>
                                    <View style={[styles.groupDot, { backgroundColor: '#8B5CF6' }]} />
                                    <Text style={styles.groupTitle}>🚌 2호차</Text>
                                    <View style={[styles.groupBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                                        <Text style={[styles.groupBadgeText, { color: '#8B5CF6' }]}>{bus2Students.length}명</Text>
                                    </View>
                                </View>
                                {bus2Students.map(renderStudentCard)}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            <AddStudentModal visible={showAdd} onClose={() => setShowAdd(false)} />
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
    addBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6',
        justifyContent: 'center', alignItems: 'center',
        elevation: 3, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    },

    content: { paddingHorizontal: 20, paddingBottom: 40 },

    // 그룹 헤더
    groupHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginBottom: 8, marginTop: 12,
    },
    groupDot: { width: 8, height: 8, borderRadius: 4 },
    groupTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#334155' },
    groupBadge: {
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
        borderWidth: 1,
    },
    groupBadgeText: { fontSize: 11, fontWeight: '700' },

    // 학생 카드
    card: {
        backgroundColor: '#fff', borderRadius: 14,
        padding: 14, marginBottom: 10,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '800' },
    cardInfo: { flex: 1, gap: 2 },
    studentName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    studentMeta: { fontSize: 11, color: '#94A3B8' },

    // 코드 큼게 표시
    codeBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 10, borderWidth: 1,
        paddingHorizontal: 12, paddingVertical: 8,
    },
    codeLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
    codeBig: { flex: 1, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    copyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    },
    copyBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    cardActions: { flexDirection: 'row', gap: 6 },
    iconBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center',
    },
    deleteBtn: { backgroundColor: '#FEF2F2' },

    // 빈 상태
    emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 24, backgroundColor: '#F1F5F9',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    emptyText: { fontSize: 15, fontWeight: '700', color: '#334155' },
    emptySubText: { fontSize: 12, color: '#94A3B8' },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#3B82F6', borderRadius: 22,
        paddingHorizontal: 20, paddingVertical: 12, marginTop: 16,
    },
    emptyAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    // 모달
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: '85%',
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
        alignSelf: 'center', marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    modalSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    modalCloseBtn: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9',
        justifyContent: 'center', alignItems: 'center',
    },

    label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
    required: { color: '#EF4444' },
    optional: { fontWeight: '400', color: '#94A3B8' },
    input: {
        backgroundColor: '#F8FAFC', borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E2E8F0',
        padding: 14, fontSize: 14, color: '#0F172A',
        marginBottom: 18,
    },
    busRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    busBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 12, padding: 14,
        backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    busBtnText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
    offDaysWrap: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 4 },
    offDaysLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 },
    offDaysRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dayBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
    dayBtnActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
    dayBtnText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
    dayBtnTextActive: { color: '#EF4444' },
    saveDaysBtn: { marginLeft: 4, backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    saveDaysBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderRadius: 14, padding: 16, gap: SPACING.sm, marginBottom: SPACING.xl,
        elevation: 3,
    },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default StudentManageScreen;
