import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONTS, RADIUS } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/config';

const LoginScreen = () => {
    const { login } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!code.trim()) {
            setError('초대코드를 입력해주세요.');
            return;
        }
        setError('');
        setLoading(true);
        const result = await login(code);
        setLoading(false);
        if (!result.success) {
            setError(result.message);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                {/* 로고/헤더 */}
                <View style={styles.logoArea}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoEmoji}>🏫</Text>
                    </View>
                    <Text style={styles.schoolName}>{APP_CONFIG.name}</Text>
                    <Text style={styles.subTitle}>학교 앱 서비스</Text>
                </View>

                {/* 카드 */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>초대코드로 입장하기</Text>
                    <Text style={styles.cardDesc}>
                        학교에서 받은 초대코드를 입력해주세요
                    </Text>

                    {/* 코드 입력 */}
                    <View style={[styles.inputWrap, error ? styles.inputError : null]}>
                        <Ionicons
                            name="key-outline"
                            size={20}
                            color={error ? COLORS.danger : COLORS.textSecondary}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="초대코드 입력 (예: PARENT2026)"
                            placeholderTextColor={COLORS.textSecondary}
                            value={code}
                            onChangeText={(t) => {
                                setCode(t.toUpperCase());
                                setError('');
                            }}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                        />
                    </View>

                    {/* 에러 메시지 */}
                    {error ? (
                        <View style={styles.errorWrap}>
                            <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* 로그인 버튼 */}
                    <TouchableOpacity
                        style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                        onPress={handleLogin}
                        activeOpacity={0.85}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.loginBtnText}>입장하기</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 역할 안내 */}
                <View style={styles.rolesWrap}>
                    {[
                        { icon: '👨‍👩‍👧', label: '학부모' },
                        { icon: '👩‍🏫', label: '교사' },
                        { icon: '🧑‍💼', label: '교육실무사' },
                        { icon: '🚌', label: '버스 1호차' },
                        { icon: '🚌', label: '버스 2호차' },
                        { icon: '🛠️', label: '운영자' },
                    ].map((r) => (
                        <View key={r.label} style={styles.roleChip}>
                            <Text style={styles.roleIcon}>{r.icon}</Text>
                            <Text style={styles.roleLabel}>{r.label}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.contact}>
                    코드를 모르시나요? 학교 행정실에 문의해주세요
                </Text>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    logoArea: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    logoEmoji: { fontSize: 48 },
    schoolName: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    subTitle: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: SPACING.lg,
    },
    cardTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    cardDesc: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
    },
    inputError: { borderColor: COLORS.danger },
    inputIcon: { marginRight: SPACING.sm },
    input: {
        flex: 1,
        height: 50,
        fontSize: FONTS.sizes.md,
        color: COLORS.textPrimary,
        letterSpacing: 1,
    },
    errorWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    errorText: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.danger,
        flex: 1,
    },
    loginBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        height: 52,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: {
        color: '#fff',
        fontSize: FONTS.sizes.lg,
        fontWeight: 'bold',
    },
    rolesWrap: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    roleChip: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        elevation: 1,
    },
    roleIcon: { fontSize: 14 },
    roleLabel: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    contact: {
        textAlign: 'center',
        fontSize: FONTS.sizes.xs,
        color: COLORS.textSecondary,
    },
});

export default LoginScreen;
