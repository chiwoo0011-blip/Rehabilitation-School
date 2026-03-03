import React, { useRef, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import KakaoMapView from './KakaoMapView';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

const RouteMapModal = ({ visible, onClose, stops = [], busColor = '#3B82F6', title = '노선도', busName = '' }) => {
    const mapRef = useRef(null);
    const validStops = stops.filter(s => s.latitude && s.longitude);

    // KakaoMapView 내부의 HTML 스크립트에서 자동 포커싱(bounds)을 지원하므로 MapView.fitToCoordinates 관련 코드는 제거합니다.

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={styles.safe}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={28} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        {!!busName && <Text style={styles.headerSub}>{busName}</Text>}
                    </View>
                    <View style={{ width: 28 }} />
                </View>

                {validStops.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={{ fontSize: 40 }}>🗺️</Text>
                        <Text style={styles.emptyText}>지도에 표시할 정류장이 없습니다.</Text>
                        <Text style={styles.emptySub}>정류장에 위치 정보를 등록해주세요.</Text>
                    </View>
                ) : (
                    <KakaoMapView
                        stops={validStops}
                        mode="viewer"
                        busColor={busColor}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.background,
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
        zIndex: 10,
    },
    closeBtn: { padding: 4 },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.textPrimary },
    headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
    map: { flex: 1 },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc' },
    emptyText: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 10 },
    emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },

    // 마커 관련 스타일 제거(카카오맵 html에 정의됨)
});

export default RouteMapModal;
