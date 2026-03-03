import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTodayMeal } from '../../services/neisService';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';

const MealScreen = () => {
    const [meal, setMeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [today] = useState(new Date());

    const loadMeal = async () => {
        setLoading(true);
        setError(null);
        const result = await fetchTodayMeal(today);
        if (result.success) {
            setMeal(result.data);
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadMeal();
    }, []);

    const formatDisplayDate = () => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]})`;
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* 날짜 헤더 카드 */}
                <View style={styles.dateCard}>
                    <Ionicons name="restaurant" size={36} color={COLORS.warning} />
                    <View style={{ marginLeft: SPACING.md }}>
                        <Text style={styles.dateLabel}>오늘의 급식</Text>
                        <Text style={styles.dateText}>{formatDisplayDate()}</Text>
                    </View>
                </View>

                {loading && (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={COLORS.warning} />
                        <Text style={styles.loadingText}>급식 정보를 불러오는 중...</Text>
                    </View>
                )}

                {error && !loading && (
                    <View style={styles.centerBox}>
                        <Ionicons name="sad-outline" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={loadMeal}>
                            <Text style={styles.retryText}>다시 시도</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {meal && !loading && (
                    <>
                        {/* 칼로리 배지 */}
                        <View style={styles.calCard}>
                            <Ionicons name="flame" size={20} color={COLORS.warning} />
                            <Text style={styles.calText}>열량: {meal.calories}</Text>
                        </View>

                        {/* 식단 목록 */}
                        <View style={styles.dishCard}>
                            <Text style={styles.sectionTitle}>🥄 {meal.mealType || '중식'} 메뉴</Text>
                            {meal.dishes.map((dish, index) => (
                                <View key={index} style={styles.dishRow}>
                                    <View style={styles.dishDot} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.dishName}>{dish.name}</Text>
                                        {dish.allergies.length > 0 && (
                                            <View style={styles.allergyRow}>
                                                {dish.allergies.map((a, i) => (
                                                    <View key={i} style={styles.allergyTag}>
                                                        <Text style={styles.allergyText}>{a}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* 원산지 */}
                        {meal.origin && (
                            <View style={styles.originCard}>
                                <Text style={styles.originTitle}>📍 원산지 정보</Text>
                                <Text style={styles.originText}>{meal.origin}</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md, paddingBottom: 40 },
    dateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        elevation: 2,
    },
    dateLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
    dateText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: 'bold' },
    centerBox: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
    loadingText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
    errorText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, textAlign: 'center' },
    retryBtn: {
        backgroundColor: COLORS.warning,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
    },
    retryText: { color: '#FFF', fontWeight: 'bold' },
    calCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        borderRadius: RADIUS.sm,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
        gap: SPACING.xs,
    },
    calText: { color: COLORS.warning, fontWeight: '600', fontSize: FONTS.sizes.md },
    dishCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        elevation: 2,
    },
    sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
    dishRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm, gap: SPACING.sm },
    dishDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning, marginTop: 6 },
    dishName: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary },
    allergyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    allergyTag: {
        backgroundColor: '#FFF3E0',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: COLORS.warning,
    },
    allergyText: { fontSize: FONTS.sizes.xs, color: COLORS.warning },
    originCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        elevation: 1,
    },
    originTitle: { fontSize: FONTS.sizes.sm, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: SPACING.xs },
    originText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 18 },
});

export default MealScreen;
