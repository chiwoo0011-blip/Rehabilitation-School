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

// 학사일정 정보 가져오기 (해당 연도 3월부터 내년 2월까지)
export const fetchSchoolSchedule = async (year) => {
    try {
        const url = `${NEIS_CONFIG.baseUrl}/SchoolSchedule`;
        const response = await axios.get(url, {
            params: {
                KEY: NEIS_CONFIG.apiKey,
                Type: 'json',
                ATPT_OFCDC_SC_CODE: NEIS_CONFIG.eduOfficeCode,
                SD_SCHUL_CODE: NEIS_CONFIG.schoolCode,
                AA_FROM_YMD: `${year}0301`,
                AA_TO_YMD: `${parseInt(year) + 1}0228`,
                pSize: 500,
            },
            timeout: 10000,
        });

        const data = response.data;

        if (data.RESULT && data.RESULT.CODE === 'INFO-200') {
            return { success: false, message: '학사일정 정보가 없습니다.' };
        }

        const scheduleInfo = data.SchoolSchedule?.[1]?.row;
        if (!scheduleInfo || scheduleInfo.length === 0) {
            return { success: false, message: '학사일정 정보가 없습니다.' };
        }

        const events = scheduleInfo.map((item) => {
            const ymd = item.AA_YMD;
            const formattedDate = `${ymd.substring(0, 4)}-${ymd.substring(4, 6)}-${ymd.substring(6, 8)}`;
            
            let category = '행사';
            const eventNm = item.EVENT_NM || '';
            const sbtrNm = item.SBTR_DD_SC_NM || '';
            
            if (eventNm.includes('방학') || sbtrNm.includes('휴업일') || sbtrNm.includes('방학')) {
                category = '방학';
            } else if (eventNm.includes('고사') || eventNm.includes('평가')) {
                category = '시험';
            } else if (['토요휴업일', '관공서의공휴일', '제헌절', '개천절', '광복절', '한글날', '추석', '설날', '설', '어린이날', '현충일', '삼일절', '대체휴무일', '기독탄신일(성탄절)', '부처님오신날'].some(k => eventNm.includes(k))) {
                category = '방학';
            }

            return {
                title: eventNm,
                startDate: formattedDate,
                endDate: formattedDate,
                category: category,
                description: item.EVENT_CNTNT || '',
            };
        });

        // 불필요한 공휴일, 주말 일정 필터링
        const filteredEvents = events.filter(e => 
            !e.title.includes('토요휴업일') && 
            !e.title.includes('관공서의공휴일') &&
            !e.title.includes('여름방학중') &&
            !e.title.includes('겨울방학중') &&
            !e.title.includes('휴업일(토요일)') &&
            !e.title.includes('휴업일(일요일)')
        );

        return { success: true, data: filteredEvents };
    } catch (error) {
        console.error('NEIS 학사일정 연동 오류:', error);
        return { success: false, message: '학사일정을 불러오는 중 오류가 발생했습니다.' };
    }
};
