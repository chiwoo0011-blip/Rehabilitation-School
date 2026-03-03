import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const KAKAO_APP_KEY = '2d1a16b1318ce6c19e94c087565d494a';

const KakaoMapView = ({
    stops = [],
    busLocation = null,
    mode = 'viewer', // 'viewer' | 'picker'
    initialRegion,
    onMapClick,
    onCenterChanged,
    busColor = '#3B82F6',
}) => {
    const webViewRef = useRef(null);

    // Default center to Seoul if not provided
    const centerLat = initialRegion?.latitude || 37.5665;
    const centerLng = initialRegion?.longitude || 126.9780;

    // We serialize the data to inject into the HTML script
    const stopsJson = JSON.stringify(stops.filter(s => s.latitude && s.longitude));
    const busLocJson = JSON.stringify(busLocation);

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
                #map { width: 100%; height: 100%; }
                
                /* Custom Marker Styles */
                .marker-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: -46px; /* Offset for anchor */
                }
                .marker-label {
                    background-color: rgba(255, 255, 255, 0.95);
                    padding: 4px 8px;
                    border-radius: 8px;
                    border: 2px solid ${busColor};
                    margin-bottom: 4px;
                    font-size: 14px;
                    font-weight: bold;
                    color: #1E293B;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    white-space: nowrap;
                }
                .marker-dot {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 3px solid ${busColor};
                    background-color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 14px;
                    font-weight: bold;
                    color: ${busColor};
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .bus-marker {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background-color: ${busColor};
                    border: 3px solid #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 20px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    margin-top: -22px;
                    margin-left: -22px;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}"></script>
            <script>
                var mapContainer = document.getElementById('map'),
                    mapOption = { 
                        center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
                        level: 5 // Default zoom level
                    };
                var map = new kakao.maps.Map(mapContainer, mapOption);
                
                var mode = '${mode}';
                var stops = ${stopsJson};
                var busLoc = ${busLocJson};
                var markers = [];
                var polyline = null;

                // Send message to React Native
                function sendMessage(type, data) {
                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
                    }
                }

                // If picker mode, add click listener
                if (mode === 'picker') {
                    kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
                        var latlng = mouseEvent.latLng;
                        sendMessage('onMapClick', {
                            latitude: latlng.getLat(),
                            longitude: latlng.getLng()
                        });
                    });

                    kakao.maps.event.addListener(map, 'dragend', function() {
                        var latlng = map.getCenter();
                        sendMessage('onCenterChanged', {
                            latitude: latlng.getLat(),
                            longitude: latlng.getLng()
                        });
                    });
                }

                // Draw stops and lines
                if (stops && stops.length > 0) {
                    var linePath = [];
                    var bounds = new kakao.maps.LatLngBounds();

                    stops.forEach(function(stop, index) {
                        var position = new kakao.maps.LatLng(stop.latitude, stop.longitude);
                        linePath.push(position);
                        bounds.extend(position);

                        var isDeparture = stop.stopType === 'departure';
                        var isArrival = stop.stopType === 'arrival';
                        var labelText = '';
                        if (isDeparture) labelText = '🚩';
                        else if (isArrival) labelText = '🏁';
                        else {
                            var stopNum = stops.slice(0, index + 1).filter(s => !s.stopType || s.stopType === 'stop').length;
                            labelText = stopNum;
                        }

                        var content = '<div class="marker-container">' +
                                      '<div class="marker-label">' + (stop.name || '') + '</div>' +
                                      '<div class="marker-dot">' + labelText + '</div>' +
                                      '</div>';

                        var customOverlay = new kakao.maps.CustomOverlay({
                            position: position,
                            content: content,
                            yAnchor: 1
                        });

                        customOverlay.setMap(map);
                        markers.push(customOverlay);
                    });

                    // Draw Polyline
                    polyline = new kakao.maps.Polyline({
                        path: linePath,
                        strokeWeight: 5,
                        strokeColor: '${busColor}',
                        strokeOpacity: 0.8,
                        strokeStyle: 'solid'
                    });
                    polyline.setMap(map);

                    // Auto-fit bounds if viewer
                    if (mode === 'viewer') {
                        map.setBounds(bounds, 50, 50, 50, 50);
                    }
                }

                // Draw bus location
                var busOverlay = null;
                if (busLoc && busLoc.latitude && busLoc.longitude) {
                    var busPos = new kakao.maps.LatLng(busLoc.latitude, busLoc.longitude);
                    var busContent = '<div class="bus-marker">🚌</div>';
                    busOverlay = new kakao.maps.CustomOverlay({
                        position: busPos,
                        content: busContent,
                        zIndex: 3
                    });
                    busOverlay.setMap(map);
                }

                // Handle data updates from React Native bounds
                window.updateMapData = function(newStops, newBusLoc) {
                    // This function can be expanded to dynamically update markers without full RN reload
                    // For MVP, RN will often just re-render the WebView or we can pass JS
                    if (newBusLoc && newBusLoc.latitude && newBusLoc.longitude) {
                        if (busOverlay) busOverlay.setMap(null);
                        var pos = new kakao.maps.LatLng(newBusLoc.latitude, newBusLoc.longitude);
                        busOverlay = new kakao.maps.CustomOverlay({
                            position: pos,
                            content: '<div class="bus-marker">🚌</div>',
                            zIndex: 3
                        });
                        busOverlay.setMap(map);
                    }
                };
            </script>
        </body>
        </html>
    `;

    // Handle messages from WebView
    const handleMessage = (event) => {
        try {
            const parsed = JSON.parse(event.nativeEvent.data);
            if (parsed.type === 'onMapClick' && onMapClick) {
                onMapClick(parsed.data);
            } else if (parsed.type === 'onCenterChanged' && onCenterChanged) {
                onCenterChanged(parsed.data);
            }
        } catch (e) {
            console.warn('WebView Message Parse Error', e);
        }
    };

    // Whenever bus data updates quickly, we want to inject JS instead of full reload for performance
    useEffect(() => {
        if (webViewRef.current && mode === 'viewer' && busLocation) {
            const script = `window.updateMapData(null, ${JSON.stringify(busLocation)});`;
            webViewRef.current.injectJavaScript(script);
        }
    }, [busLocation]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                style={styles.webview}
                source={{ html: htmlContent, baseUrl: 'https://localhost' }}
                originWhitelist={['*']}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                bounces={false}
                scrollEnabled={false}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={busColor} />
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    }
});

export default KakaoMapView;
