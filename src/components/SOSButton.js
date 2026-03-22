import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Linking,
} from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../constants/theme';
import { EMERGENCY_CONTACTS } from '../constants/config';

const SOSButton = () => {
    const handleSOS = () => {
        Alert.alert(
            '🆘 긴급 연락',
            '연락할 곳을 선택해주세요',
            [
                ...EMERGENCY_CONTACTS.map((contact) => ({
                    text: `${contact.icon} ${contact.label}`,
                    onPress: () => {
                        Alert.alert(
                            `${contact.label}에 전화`,
                            `${contact.phone}으로 연결합니다`,
                            [
                                { text: '취소', style: 'cancel' },
                                {
                                    text: '📞 전화 연결',
                                    onPress: () => Linking.openURL(`tel:${contact.phone}`),
                                },
                            ]
                        );
                    },
                })),
                { text: '취소', style: 'cancel' },
            ]
        );
    };

    return (
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.8}>
            <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    sosButton: {
        position: 'absolute',
        bottom: 90,
        right: SPACING.md,
        width: 60,
        height: 60,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.sos,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.sos,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        zIndex: 999,
    },
    sosText: {
        color: COLORS.textLight,
        fontSize: FONTS.sizes.sm,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});

export default SOSButton;
