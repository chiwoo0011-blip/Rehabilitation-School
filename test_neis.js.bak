const axios = require('axios');

async function test() {
    try {
        const url = `https://open.neis.go.kr/hub/SchoolSchedule`;
        const params = {
            KEY: 'b8e4412f51dc4ad8819730ac8084a71c',
            Type: 'json',
            ATPT_OFCDC_SC_CODE: 'B10',
            SD_SCHUL_CODE: '7010859',
            AA_FROM_YMD: '20260301',
            AA_TO_YMD: '20270228',
            pSize: 10
        };
        console.log('Fetching from:', url, params);
        const response = await axios.get(url, { params });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

test();
