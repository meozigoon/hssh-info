const dateInput = document.getElementById('meal-date');

// 오늘 날짜를 기본값으로 설정 (18시 이후면 다음날)
function setTodayToInput(input) {
    const now = new Date();
    let yyyy = now.getFullYear();
    let mm = String(now.getMonth() + 1).padStart(2, '0');
    let dd = String(now.getDate()).padStart(2, '0');
    if (now.getHours() >= 18) {
        // 18시(6시) 이후면 다음날로
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        yyyy = tomorrow.getFullYear();
        mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        dd = String(tomorrow.getDate()).padStart(2, '0');
    }
    input.value = `${yyyy}-${mm}-${dd}`;
}
setTodayToInput(dateInput);

// 날짜가 바뀌거나, 페이지가 처음 로드될 때 급식 정보를 자동으로 표시
function fetchAndDisplayMeal() {
    const selectedDate = new Date(dateInput.value);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;

    const apiKey = 'b9051bf44db6484e8e82f71c8c422100';
    const proxy = 'https://corsproxy.io/?';
    const url = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010115&MLSV_YMD=${dateString}&Type=json&Key=${apiKey}`
    );

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const meals = {
                1: 'breakfast',
                2: 'lunch',
                3: 'dinner'
            };

            for (const key of Object.values(meals)) {
                document.getElementById(key).innerHTML = '급식 정보 없음';
            }

            const mealData = data?.mealServiceDietInfo?.[1]?.row || [];

            for (const meal of mealData) {
                const mealType = parseInt(meal.MMEAL_SC_CODE);
                const rawContent = meal.DDISH_NM;
                const formattedContent = rawContent
                    .split(/<br\s*\/?\s*>/gi)
                    .map(line => {
                        return line.replace(
                            /\(([^)]+)\)/g,
                            '<span class="allergy">($1)</span>'
                        );
                    })
                    .join('<br>');
                const elementId = meals[mealType];
                if (elementId) {
                    document.getElementById(elementId).innerHTML = formattedContent;
                }
            }
        })
        .catch(error => {
            console.error('급식 정보 불러오기 실패:', error);
            for (const key of ['breakfast', 'lunch', 'dinner']) {
                document.getElementById(key).innerHTML = '오류 발생';
            }
        });
}

dateInput.addEventListener('change', fetchAndDisplayMeal);
window.addEventListener('DOMContentLoaded', fetchAndDisplayMeal);
