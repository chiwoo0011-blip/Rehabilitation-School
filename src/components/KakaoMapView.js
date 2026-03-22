import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const MAP_URL = 'https://rehabilitation-school.vercel.app';

const KakaoMapView = ({
    stops = [],
    busLocation = null,
    mode = 'viewer',
    initialRegion,
    onMapClick,
    onCenterChanged,
    busColor = '#3B82F6',
}) => {
    const webViewRef = useRef(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [sdkReady, setSdkReady] = useState(false);

    const centerLat = initialRegion?.latitude || 37.5665;
    const centerLng = initialRegion?.longitude || 126.9780;

    // SDK 로드 완료 후 지도 초기화 데이터 주입
    useEffect(() => {
        if (!sdkReady || !webViewRef.current) return;
        injectMapConfig();
    }, [sdkReady]);

    const injectMapConfig = () => {
        if (!webViewRef.current) return;
        const config = JSON.stringify({
            centerLat,
            centerLng,
            mode,
            stops: stops.filter(s => s.latitude && s.longitude),
            busLoc: busLocation,
            busColor,
        });
        webViewRef.current.injectJavaScript(`
            kakao.maps.load(function() {
                window.initKakaoMap(${config});
            });
            true;
        `);
    };

    const handleMessage = (event) => {
        try {
            const parsed = JSON.parse(event.nativeEvent.data);
            if (parsed.type === 'onError') {
                console.warn('[KakaoMap Error]', parsed.data?.message);
                setErrorMsg(parsed.data?.message || '지도 로드 실패');
            } else if (parsed.type === 'onSdkReady') {
                setSdkReady(true);
            } else if (parsed.type === 'onMapClick' && onMapClick) {
                onMapClick(parsed.data);
            } else if (parsed.type === 'onCenterChanged' && onCenterChanged) {
                onCenterChanged(parsed.data);
            } else if (parsed.type === 'onMapReady') {
                setErrorMsg(null);
            }
        } catch (e) {
            console.warn('WebView Message Parse Error', e);
        }
    };

    useEffect(() => {
        if (webViewRef.current && mode === 'viewer' && busLocation) {
            webViewRef.current.injectJavaScript(
                `window.updateMapData && window.updateMapData(null, ${JSON.stringify(busLocation)}); true;`
            );
        }
    }, [busLocation]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                style={styles.webview}
                source={{ uri: MAP_URL }}
                originWhitelist={['*']}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                bounces={false}
                scrollEnabled={false}
                startInLoadingState={true}
                onError={(e) => {
                    console.warn('[WebView Error]', e.nativeEvent);
                    setErrorMsg('WebView 로드 실패');
                }}
                renderLoading={() => (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={busColor} />
                    </View>
                )}
            />
            {errorMsg && (
                <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    webview: { flex: 1, backgroundColor: 'transparent' },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc',
    },
    errorOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(239,68,68,0.95)', padding: 8,
    },
    errorText: { color: '#fff', fontSize: 12, textAlign: 'center' },
});

export default KakaoMapView;
