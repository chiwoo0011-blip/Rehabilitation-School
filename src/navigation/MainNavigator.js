import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/parent/HomeScreen';
import MealScreen from '../screens/parent/MealScreen';
import NoticeScreen from '../screens/parent/NoticeScreen';
import FieldTripScreen from '../screens/parent/FieldTripScreen';
import BusTrackingScreen from '../screens/parent/BusTrackingScreen';
import BusDriverScreen from '../screens/bus/BusDriverScreen';
import BusDriverHomeScreen from '../screens/bus/BusDriverHomeScreen';
import BusRouteScreen from '../screens/operator/BusRouteScreen';
import StopFormScreen from '../screens/operator/StopFormScreen';
import StudentManageScreen from '../screens/operator/StudentManageScreen';
import OperatorHomeScreen from '../screens/operator/OperatorHomeScreen';
import SchoolCalendarScreen from '../screens/parent/SchoolCalendarScreen';
import CalendarManageScreen from '../screens/operator/CalendarManageScreen';
import AttendanceScreen from '../screens/parent/AttendanceScreen';
import AttendanceCalendarScreen from '../screens/parent/AttendanceCalendarScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';

// 역할에 따라 등하교 화면 자동 분기
const AttendanceRoute = () => {
    const { user } = useAuth();
    if (user?.role === 'teacher' || user?.role === 'staff') return <TeacherAttendanceScreen />;
    return <AttendanceScreen />;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── 홈 스택 (학부모/교사/교육실무사) ────────────────────────
const HomeStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerStyle: { backgroundColor: COLORS.cardBg },
            headerTintColor: COLORS.textPrimary,
            headerTitleStyle: { fontWeight: 'bold' },
        }}
    >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Meal" component={MealScreen} options={{ title: '오늘의 급식 🍱' }} />
        <Stack.Screen name="FieldTrip" component={FieldTripScreen} options={{ title: '현장학습 앨범 📸' }} />
        <Stack.Screen name="Attendance" component={AttendanceRoute} options={{ title: '등하교 확인 ✅' }} />
        <Stack.Screen name="AttendanceCalendar" component={AttendanceCalendarScreen} options={{ title: '월간 출결 📅', headerShown: false }} />
        <Stack.Screen name="Bus" component={BusTrackingScreen} options={{ title: '통학버스 실시간 위치 🚌' }} />
        <Stack.Screen name="Calendar" component={SchoolCalendarScreen} options={{ title: '학사일정 📅' }} />
    </Stack.Navigator>
);

// ── 학부모/교사/교육실무사 탭 ────────────────────────────────
const ParentTabs = () => {
    const insets = useSafeAreaInsets();
    const tabBarPaddingBottom = insets.bottom > 0 ? insets.bottom : 8;
    const tabBarHeight = 52 + tabBarPaddingBottom;
    return (
        <Tab.Navigator
            initialRouteName="홈"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = {
                        '홈': focused ? 'home' : 'home-outline',
                        '공지사항': focused ? 'megaphone' : 'megaphone-outline',
                        '현장학습': focused ? 'images' : 'images-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.tabBg,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: tabBarHeight,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 4,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                headerShown: false,
            })}
        >
            <Tab.Screen name="홈" component={HomeStack} />
            <Tab.Screen name="공지사항" component={NoticeScreen} />
            <Tab.Screen name="현장학습" component={FieldTripScreen} />
        </Tab.Navigator>
    );
};

// ── 버스기사 탭 (홈 + 운행관리 + 현장학습) ───────────────────
const BusDriverTabs = () => {
    const insets = useSafeAreaInsets();
    const tabBarPaddingBottom = insets.bottom > 0 ? insets.bottom : 8;
    const tabBarHeight = 52 + tabBarPaddingBottom;
    return (
        <Tab.Navigator
            initialRouteName="홈"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = {
                        '홈': focused ? 'home' : 'home-outline',
                        '운행관리': focused ? 'bus' : 'bus-outline',
                        '현장학습': focused ? 'images' : 'images-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.tabBg,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: tabBarHeight,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 4,
                },
                tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
                headerShown: false,
            })}
        >
            <Tab.Screen name="홈" component={BusDriverHomeScreen} />
            <Tab.Screen name="운행관리" component={BusDriverScreen} />
            <Tab.Screen name="현장학습" component={FieldTripScreen} />
        </Tab.Navigator>
    );
};

// ── 운영자 스택: 노선관리 (BusRouteScreen + StopForm) ──────────
const OperatorRouteStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerStyle: { backgroundColor: COLORS.cardBg },
            headerTintColor: COLORS.textPrimary,
            headerTitleStyle: { fontWeight: 'bold' },
        }}
    >
        <Stack.Screen name="BusRoute" component={BusRouteScreen} options={{ title: '🗂️ 노선 관리', headerShown: false }} />
        <Stack.Screen name="StopForm" component={StopFormScreen} options={({ route }) => ({
            title: route.params?.stop ? '정류장 수정 ✏️' : '정류장 추가 ➕',
        })} />
    </Stack.Navigator>
);

// ── 운영자 탭 (홈 + 노선관리 + 학생관리) ───────────────────
const OperatorTabs = () => {
    const { logout } = useAuth();
    const insets = useSafeAreaInsets();
    const tabBarPaddingBottom = insets.bottom > 0 ? insets.bottom : 8;
    const tabBarHeight = 52 + tabBarPaddingBottom;
    return (
        <Tab.Navigator
            initialRouteName="홈"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = {
                        '홈': focused ? 'home' : 'home-outline',
                        '노선관리': focused ? 'git-branch' : 'git-branch-outline',
                        '학생관리': focused ? 'people' : 'people-outline',
                        '일정관리': focused ? 'calendar' : 'calendar-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.tabBg,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: tabBarHeight,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 4,
                },
                tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
                headerShown: false,
            })}
        >
            <Tab.Screen name="노선관리" component={OperatorRouteStack} />
            <Tab.Screen name="홈" component={OperatorHomeScreen} />
            <Tab.Screen name="학생관리" component={StudentManageScreen} />
            <Tab.Screen name="일정관리" component={CalendarManageScreen} />
        </Tab.Navigator>
    );
};

// ── 교사/교육실무사 탭 (통학버스 + 홈 + 현장학습) ─────────────
const TeacherTabs = () => {
    const insets = useSafeAreaInsets();
    const tabBarPaddingBottom = insets.bottom > 0 ? insets.bottom : 8;
    const tabBarHeight = 52 + tabBarPaddingBottom;
    return (
        <Tab.Navigator
            initialRouteName="홈"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = {
                        '통학버스': focused ? 'bus' : 'bus-outline',
                        '홈': focused ? 'home' : 'home-outline',
                        '현장학습': focused ? 'images' : 'images-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.tabBg,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: tabBarHeight,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 4,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                headerShown: false,
            })}
        >
            <Tab.Screen name="통학버스" component={BusTrackingScreen} />
            <Tab.Screen name="홈" component={HomeStack} />
            <Tab.Screen name="현장학습" component={FieldTripScreen} />
        </Tab.Navigator>
    );
};

// ── 최상위: 로그인 + 역할 분기 ──────────────────────────────
const MainNavigator = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!user) return <LoginScreen />;

    if (user.role === 'bus1' || user.role === 'bus2') return <BusDriverTabs />;
    if (user.role === 'operator') return <OperatorTabs />;
    if (user.role === 'teacher' || user.role === 'staff') return <TeacherTabs />;

    return <ParentTabs />;
};

export default MainNavigator;
