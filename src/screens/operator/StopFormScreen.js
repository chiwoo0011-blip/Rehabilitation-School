import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TextInput, TouchableOpacity, Alert, Platform,
    ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KakaoMapView from '../../components/KakaoMapView';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { saveStop, subscribeStops } from '../../services/routeService';
import { subscribeStudents } from '../../services/studentService';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';

const SCHOOL_COORD = { latitude: 37.5665, longitude: 126.9780 };

// 정류장 타입: 일반 / 출발점 / 도착점
const STOP_TYPES = [
    { value: 'stop', icon: '📍', label: '일반 정류장' },
    { value: 'departure', icon: '🚩', label: '출발점' },
    { value: 'arrival', icon: '🏁', label: '도착점' },
];

const StopFormScreen = ({ route, navigation }) => {
    const { busId, direction, stop } = route.params;
    const isEdit = !!stop;

    const [name, setName] = useState(stop?.name || '');
    const [address, setAddress] = useState(stop?.address || '');
    const parseHour = (t) => {
        if (!t) return 8;
        const h = parseInt(t.split(':')[0], 10);
        return isNaN(h) ? 8 : h;
    };
    const parseMin = (t) => {
        if (!t) return 0;
        const m = parseInt(t.split(':')[1], 10);
        return isNaN(m) ? 0 : m;
    };

    const [timeHour, setTimeHour] = useState(parseHour(stop?.scheduledTime));
    const [timeMinute, setTimeMinute] = useState(parseMin(stop?.scheduledTime));
    const [stopType, setStopType] = useState(stop?.stopType || 'stop');
    const [coord, setCoord] = useState(
        stop?.latitude ? { latitude: stop.latitude, longitude: stop.longitude } : null
    );
    const [students, setStudents] = useState(stop?.students || []);
    const [allStudents, setAllStudents] = useState([]); // Firebase 등록 학생 목록
    const [allStops, setAllStops] = useState([]);       // 현재 노선의 전체 정류장
    const [saving, setSaving] = useState(false);
    const [searching, setSearching] = useState(false);
    const mapRef = useRef(null);

    // Firebase에서 해당 버스 학생 목록 구독
    useEffect(() => {
        const unsub = subscribeStudents((list) => {
            const filtered = list.filter((s) => s.busId === busId);
            setAllStudents(filtered);
        });
        return unsub;
    }, [busId]);

    // 현재 노선의 전체 정류장 구독 (이미 배정된 학생 파악용)
    useEffect(() => {
        const unsub = subscribeStops(busId, direction, setAllStops);
        return unsub;
    }, [busId, direction]);

    // 다른 정류장에 이미 배정된 학생 이름 집합
    const assignedElsewhere = new Set(
        allStops
            .filter(s => s.id !== stop?.id) // 현재 편집 중인 정류장 제외
            .flatMap(s => s.students || [])
    );

    // 선택 가능한 학생: 이미 다른 정류장에 배정된 학생은 제외
    const availableStudents = allStudents.filter(s => !assignedElsewhere.has(s.studentName));

    // 주소로 좌표 검색 (expo-location geocoding)
    const handleSearchAddress = async () => {
        if (!address.trim()) {
            Alert.alert('알림', '검색할 주소를 입력하세요.');
            return;
        }
        setSearching(true);
        try {
            const results = await Location.geocodeAsync(address);
            if (results && results.length > 0) {
                const newCoord = { latitude: results[0].latitude, longitude: results[0].longitude };
                setCoord(newCoord);
                // 주소 검색 시 리렌더링을 위해 mapRef 코드는 제거합니다.
            } else {
                Alert.alert('검색 결과 없음', '정확한 도로명 주소나 건물명을 입력해 보세요.');
            }
        } catch (e) {
            Alert.alert('검색 실패', '주소를 찾을 수 없습니다.');
        } finally {
            setSearching(false);
        }
    };

    const handleMapPress = (e) => {
        setCoord(e.nativeEvent.coordinate);
    };

    const handleToggleStudent = (studentName) => {
        setStudents((prev) =>
            prev.includes(studentName)
                ? prev.filter((s) => s !== studentName)
                : [...prev, studentName]
        );
    };

    const handleRemoveStudent = (n) => {
        setStudents(students.filter((s) => s !== n));
    };

    const computedTime = `${String(timeHour).padStart(2, '0')}:${String(timeMinute).padStart(2, '0')}`;

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('입력 오류', '정류장 이름을 입력하세요.'); return; }
        if (!coord) { Alert.alert('입력 오류', '주소 검색 또는 지도를 눌러 위치를 설정하세요.'); return; }

        setSaving(true);
        try {
            await saveStop(busId, direction, stop?.id || null, {
                name: name.trim(),
                address: address.trim(),
                scheduledTime: computedTime,
                stopType,
                latitude: coord.latitude,
                longitude: coord.longitude,
                students,
                order: stop?.order !== undefined ? stop.order
                    : (allStops.filter(s => !s.stopType || s.stopType === 'stop').length + 1),
            });
            Alert.alert('저장 완료', `"${name}" 정류장이 저장됐습니다.`, [
                { text: '확인', onPress: () => navigation.goBack() },
            ]);
        } catch (e) {
            Alert.alert('오류', '저장 실패: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                    {/* ① 탑승 학생 (상단) */}
                    {stopType === 'stop' && (<>
                        <Text style={styles.label}>👥 탑승 학생</Text>
                        {availableStudents.length === 0 ? (
                            <View style={styles.noStudentBox}>
                                <Text style={styles.noStudentText}>
                                    {allStudents.length === 0
                                        ? '학생관리 탭에서 먼저 학생을 등록해주세요'
                                        : '배정 가능한 학생이 없습니다\n(모든 학생이 다른 정류장에 배정됨)'}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.studentPickerWrap}>
                                {availableStudents.map((s) => {
                                    const selected = students.includes(s.studentName);
                                    return (
                                        <TouchableOpacity
                                            key={s.code}
                                            style={[styles.studentPickBtn, selected && styles.studentPickBtnActive]}
                                            onPress={() => handleToggleStudent(s.studentName)}
                                        >
                                            <Text style={[styles.studentPickText, selected && styles.studentPickTextActive]}>
                                                {selected ? '✅ ' : '⬜ '}{s.studentName}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                        {students.length > 0 && (
                            <View style={styles.studentList}>
                                {students.map((s) => (
                                    <View key={s} style={styles.studentChip}>
                                        <Text style={styles.studentName}>{s}</Text>
                                        <TouchableOpacity onPress={() => handleRemoveStudent(s)}>
                                            <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>)}

                    {/* ② 시간 설정 */}
                    <Text style={styles.label}>⏰ 도착 예정 시간</Text>
                    <View style={styles.timePickerRow}>
                        <View style={styles.timeUnit}>
                            <TouchableOpacity
                                style={[styles.timeArrowBtn, { paddingBottom: 10 }]}
                                onPress={() => setTimeHour((h) => (h + 1) % 24)}
                                hitSlop={{ top: 15, bottom: 15, left: 20, right: 20 }}
                            >
                                <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <View style={styles.timeValueBox}>
                                <Text style={styles.timeValueText}>{String(timeHour).padStart(2, '0')}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.timeArrowBtn, { paddingTop: 10 }]}
                                onPress={() => setTimeHour((h) => (h - 1 + 24) % 24)}
                                hitSlop={{ top: 15, bottom: 15, left: 20, right: 20 }}
                            >
                                <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.timeColon}>:</Text>
                        <View style={styles.timeUnit}>
                            <TouchableOpacity
                                style={[styles.timeArrowBtn, { paddingBottom: 10 }]}
                                onPress={() => setTimeMinute((m) => (m + 5) % 60)}
                                hitSlop={{ top: 15, bottom: 15, left: 20, right: 20 }}
                            >
                                <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <View style={styles.timeValueBox}>
                                <Text style={styles.timeValueText}>{String(timeMinute).padStart(2, '0')}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.timeArrowBtn, { paddingTop: 10 }]}
                                onPress={() => setTimeMinute((m) => (m - 5 + 60) % 60)}
                                hitSlop={{ top: 15, bottom: 15, left: 20, right: 20 }}
                            >
                                <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.timePreview}>
                            <Text style={styles.timePreviewText}>
                                {String(timeHour).padStart(2, '0')}:{String(timeMinute).padStart(2, '0')}
                            </Text>
                            <Text style={styles.timePreviewLabel}>선택 시간</Text>
                        </View>
                    </View>

                    {/* ③ 정류장 이름 + 저장 버튼 인라인 */}
                    <Text style={styles.label}>📍 정류장 이름</Text>
                    <View style={styles.nameRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="예: 롯데마트 앞"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                        <TouchableOpacity
                            style={[styles.saveInlineBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Ionicons name={isEdit ? 'checkmark-circle' : 'add-circle'} size={18} color="#fff" />
                            <Text style={styles.saveInlineBtnText}>
                                {saving ? '저장중' : isEdit ? '수정완료' : '추가'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* ④ 주소 검색 */}
                    <Text style={styles.label}>🔍 주소 검색</Text>
                    <View style={styles.addressRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="예: 서울 서대문구 연세로 50"
                            placeholderTextColor={COLORS.textSecondary}
                            onSubmitEditing={handleSearchAddress}
                            returnKeyType="search"
                        />
                        <TouchableOpacity
                            style={[styles.searchBtn, searching && { opacity: 0.6 }]}
                            onPress={handleSearchAddress}
                            disabled={searching}
                        >
                            {searching
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Ionicons name="search" size={20} color="#fff" />
                            }
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.hintText}>지도를 눌러 정확한 위치를 조정할 수 있습니다</Text>

                    {/* ⑤ 지도 — 웹뷰 기반 카카오맵 피커 */}
                    <View style={styles.mapWrap}>
                        <KakaoMapView
                            key={coord ? `${coord.latitude}-${coord.longitude}` : 'initial'}
                            mode="picker"
                            initialRegion={coord || { latitude: 37.5665, longitude: 126.9780 }}
                            stops={coord ? [{ ...coord, name: name || '선택된 위치', stopType: 'stop' }] : []}
                            onMapClick={(data) => setCoord(data)}
                            onCenterChanged={(data) => setCoord(data)}
                        />
                        {!coord && (
                            <View style={styles.mapOverlay} pointerEvents="none">
                                <Ionicons name="map-outline" size={28} color="#fff" />
                                <Text style={styles.mapOverlayText}>주소 검색 또는 지도 눌러 위치 설정</Text>
                            </View>
                        )}
                    </View>
                    {coord && (
                        <Text style={styles.coordText}>
                            📌 {coord.latitude.toFixed(5)}, {coord.longitude.toFixed(5)}
                        </Text>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    container: { padding: SPACING.md, paddingBottom: 32 },
    label: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4, marginTop: SPACING.lg },
    input: {
        backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md,
        padding: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
        borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xs,
    },
    // 이름 + 저장 인라인
    nameRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', marginBottom: SPACING.xs },
    saveInlineBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        paddingHorizontal: 14, paddingVertical: 12,
        elevation: 3, shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    },
    saveInlineBtnText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: 'bold' },
    // 주소
    addressRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs },
    searchBtn: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        width: 48, height: 48, justifyContent: 'center', alignItems: 'center',
    },
    hintText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginBottom: SPACING.sm },
    // 지도
    mapWrap: {
        height: 200, borderRadius: RADIUS.lg, overflow: 'hidden',
        marginBottom: SPACING.xs, position: 'relative',
    },
    map: { flex: 1 },
    mapOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center', alignItems: 'center', gap: 6,
    },
    mapOverlayText: { color: '#fff', fontWeight: 'bold', fontSize: FONTS.sizes.sm, textAlign: 'center' },
    markerWrap: { backgroundColor: '#fff', borderRadius: 20, padding: 2 },
    coordText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: 'monospace', marginBottom: SPACING.xs },
    // 탑승 학생
    studentPickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
    studentPickBtn: {
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full, backgroundColor: COLORS.cardBg,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    studentPickBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    studentPickText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
    studentPickTextActive: { color: '#fff' },
    noStudentBox: {
        backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md,
        padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm,
    },
    noStudentText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, textAlign: 'center' },
    studentList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
    studentChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm, paddingVertical: 4,
        borderWidth: 1, borderColor: COLORS.primary + '40',
    },
    studentName: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
    // 시간
    timePickerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg,
        padding: SPACING.xs, marginBottom: SPACING.sm, // 패딩 축소
        borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
    },
    timeUnit: { alignItems: 'center', gap: 0 }, // 간격 축소
    timeArrowBtn: { padding: 0 },               // 버튼 패딩 축소
    timeValueBox: {
        backgroundColor: COLORS.background, borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.sm, paddingVertical: 2, // 상하 패딩 대폭 축소
        borderWidth: 1, borderColor: COLORS.primary + '60', minWidth: 48, alignItems: 'center',
    },
    timeValueText: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, fontVariant: ['tabular-nums'] },
    timeColon: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
    timePreview: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.md,
        padding: SPACING.xs,
    },
    timePreviewText: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.primary },
    timePreviewLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
});

export default StopFormScreen;
