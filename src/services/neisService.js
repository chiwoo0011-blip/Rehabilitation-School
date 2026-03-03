import axios from 'axios';
import { NEIS_CONFIG, ALLERGY_CODES } from '../constants/config';

// 알레르기 번호를 이름으로 변환
const parseAllergyInfo = (dishName) => {
    const allergies = [];
    const matches = dishName.match(/\d+\./g);
    if (matches) {
        matches.forEach((code) => {
            const num = code.replace('.', '');
            if (ALLERGY_CODES[num]) allergies.push(ALLERGY_CODES[num]);
        });
    }
    return { cleanName: dishName.replace(/[\d.]+/g, '').trim(), allergies };
};

// 날짜를 YYYYMMDD 형식으로 변환
const formatDate = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

// 오늘 급식 정보 가져오기
export const fetchTodayMeal = async (date) => {
    try {
        const dateStr = date ? formatDate(date) : formatDate();
        const url = `${NEIS_CONFIG.baseUrl}/mealServiceDietInfo`;
        const response = await axios.get(url, {
            params: {
                KEY: NEIS_CONFIG.apiKey,
                Type: 'json',
                ATPT_OFCDC_SC_CODE: NEIS_CONFIG.eduOfficeCode,
                SD_SCHUL_CODE: NEIS_CONFIG.schoolCode,
                MLSV_YMD: dateStr,
            },
            timeout: 10000,
        });

        const data = response.data;

        // 데이터 없음 처리
        if (data.RESULT && data.RESULT.CODE === 'INFO-200') {
            return { success: false, message: '오늘 급식 정보가 없습니다.' };
        }

        const mealInfo = data.mealServiceDietInfo?.[1]?.row;
        if (!mealInfo || mealInfo.length === 0) {
            return { success: false, message: '오늘 급식 정보가 없습니다.' };
        }

        // 급식 파싱
        const meal = mealInfo[0];
        const dishNames = meal.DDISH_NM.split('<br/>').map((dish) => {
            const { cleanName, allergies } = parseAllergyInfo(dish);
            return { name: cleanName, allergies };
        });

        return {
            success: true,
            data: {
                date: dateStr,
                dishes: dishNames,
                calories: meal.CAL_INFO,
                origin: meal.ORPLC_INFO,
                mealType: meal.MMEAL_SC_NM, // 중식 등
            },
        };
    } catch (error) {
        console.error('NEIS API 오류:', error);
        return { success: false, message: '급식 정보를 불러오는 중 오류가 발생했습니다.' };
    }
};
