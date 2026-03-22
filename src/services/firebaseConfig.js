import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase 설정 (yrs-schoolapp 프로젝트)
const firebaseConfig = {
    apiKey: "AIzaSyCTJLYI1R63DwaYeEUBddoOqgK2E7_V9sA",
    authDomain: "yrs-schoolapp.firebaseapp.com",
    projectId: "yrs-schoolapp",
    storageBucket: "yrs-schoolapp.firebasestorage.app",
    messagingSenderId: "492481893245",
    appId: "1:492481893245:web:8981e5cf32dfcfe0a5b214",
    // ⚠️ Realtime Database 활성화 후 아래 URL 추가 필요
    // https://console.firebase.google.com/project/yrs-schoolapp/database
    // 활성화하면 이런 형식: "https://yrs-schoolapp-default-rtdb.asia-southeast1.firebasedatabase.app"
    databaseURL: "https://yrs-schoolapp-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export default app;
