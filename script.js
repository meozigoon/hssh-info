// ===== Firebase 초기화 =====
const firebaseConfig = {
    apiKey: "AIzaSyAvdeqqvTeRv_xLGW7CKllR156ZrXP45-g",
    authDomain: "hssh-meal.firebaseapp.com",
    projectId: "hssh-meal",
    };
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// ✨ Google 팝업 단계에서 hansung-sh.hs.kr만 선택 가능하도록 제한
provider.setCustomParameters({ hd: 'hansung-sh.hs.kr' });

// 버튼 참조
const loginBtn    = document.getElementById('login-btn');
const signupBtn   = document.getElementById('signup-btn');
const signoutBtn  = document.getElementById('signout-btn');
const userEmailEl = document.getElementById('user-email');

// 로그인 상태 변동 감지
auth.onAuthStateChanged(user => {
    if (user) {
        userEmailEl.textContent = user.email;
        loginBtn.style.display    = 'none';
        signupBtn.style.display   = 'none';
        signoutBtn.style.display  = 'inline-block';
    } else {
        userEmailEl.textContent   = '';
        loginBtn.style.display    = 'inline-block';
        signupBtn.style.display   = 'inline-block';
        signoutBtn.style.display  = 'none';
    }
});

// 공통 로그인/회원가입 핸들러
function signIn() {
    auth.signInWithPopup(provider)
        .then(result => {
            const email = result.user.email;
            // 도메인 재확인: 혹시 bypass 될 경우 삭제
            if (email.endsWith('@hansung-sh.hs.kr')) {
                // 정상 로그인
            } else {
                // Firebase에 추가된 계정 즉시 삭제
                auth.currentUser.delete()
                    .catch(err => console.error('계정 삭제 실패:', err));
                auth.signOut();
                alert('한성과학고(@hansung-sh.hs.kr) 계정만 로그인 가능합니다.');
            }
        })
        .catch(error => {
            console.error('인증 실패:', error);
            alert('인증 실패: ' + error.message);
        });
}

// 로그인
loginBtn.addEventListener('click', signIn);
// 회원가입
signupBtn.addEventListener('click', signIn);
// 로그아웃
signoutBtn.addEventListener('click', () => auth.signOut());

// ===== 급식 정보 로딩 =====
const dateInput = document.getElementById('meal-date');

function setTodayToInput(input) {
    const now = new Date();
    let yyyy = now.getFullYear();
    let mm   = String(now.getMonth() + 1).padStart(2, '0');
    let dd   = String(now.getDate()).padStart(2, '0');
    if (now.getHours() >= 18) {
        const t = new Date(now.getTime() + 86400000);
        yyyy = t.getFullYear();
        mm   = String(t.getMonth() + 1).padStart(2, '0');
        dd   = String(t.getDate()).padStart(2, '0');
    }
    input.value = `${yyyy}-${mm}-${dd}`;
}
setTodayToInput(dateInput);

function fetchAndDisplayMeal() {
    const sel = new Date(dateInput.value);
    const y = sel.getFullYear(), m = String(sel.getMonth()+1).padStart(2,'0'), d = String(sel.getDate()).padStart(2,'0');
    const dateString = `${y}${m}${d}`;
    const apiKey = 'b9051bf44db6484e8e82f71c8c422100';
    const proxy  = 'https://corsproxy.io/?';
    const url    = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010115&MLSV_YMD=${dateString}&Type=json&Key=${apiKey}`
    );
    fetch(url)
        .then(r => r.json())
        .then(data => {
            const meals = {1:'breakfast',2:'lunch',3:'dinner'};
            Object.values(meals).forEach(id => document.getElementById(id).innerHTML = '급식 정보 없음');
            const rows = data?.mealServiceDietInfo?.[1]?.row || [];
            rows.forEach(item => {
                const t = parseInt(item.MMEAL_SC_CODE), raw = item.DDISH_NM;
                const formatted = raw
                    .split(/<br\s*\/?>/gi)
                    .map(line => line.replace(/\(([^)]+)\)/g,'<span class="allergy">($1)</span>'))
                    .join('<br>');
                const el = meals[t];
                if (el) document.getElementById(el).innerHTML = formatted;
            });
        })
        .catch(e => {
            console.error('급식 로딩 실패:', e);
            ['breakfast','lunch','dinner'].forEach(id => document.getElementById(id).innerHTML = '오류 발생');
        });
}

dateInput.addEventListener('change', fetchAndDisplayMeal);
window.addEventListener('DOMContentLoaded', fetchAndDisplayMeal);

// ===== 학교 행사 정보 =====
// API 기본 정보
const eventApiKey = '2d4a22c414504fe9ba434a810d3c64f1'; // 자신의 API 키 입력
const schoolCode = '7010115'; // 한성과학고등학교 학교 코드 (예시)

// 페이지 로드 시 event-month input을 오늘 날짜의 년월로 설정하고, 바로 행사 목록도 보여줌
window.addEventListener('DOMContentLoaded', () => {
    const eventMonthInput = document.getElementById('event-month');
    if (eventMonthInput) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        eventMonthInput.value = `${yyyy}-${mm}`;
        // 바로 행사 목록 표시
        if (typeof fetchAndDisplayEvents === 'function') {
            fetchAndDisplayEvents();
        }
        eventMonthInput.addEventListener('change', fetchAndDisplayEvents);
    }
});

// 행사 정보를 가져오는 함수
async function fetchSchoolEvents(year, month) {
    const proxy = 'https://corsproxy.io/?';
    const url = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/SchoolSchedule?` +
        `Key=${eventApiKey}&Type=json&ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010115` +
        `&AA_YMD=${year}${month}`
    );

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.SchoolSchedule && data.SchoolSchedule[1].row) {
            return data.SchoolSchedule[1].row;
        } else {
            return [];
        }
    } catch (error) {
        console.error('행사 데이터를 가져오는 중 오류 발생:', error);
        return [];
    }
}

// 달력 생성 및 행사 표시 함수
function renderEventCalendar(year, month, events) {
    const calendarDiv = document.getElementById('event-calendar');
    calendarDiv.innerHTML = '';
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    // 행사 정보를 날짜별로 매핑
    const eventMap = {};
    events.forEach(ev => {
        const day = parseInt(ev.AA_YMD.slice(6, 8), 10);
        if (!eventMap[day]) eventMap[day] = [];
        eventMap[day].push(ev.EVENT_NM);
    });
    let html = '<table class="event-calendar-table">';
    html += '<thead><tr style="background:#72d1ff;color:#1f233e;"><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr></thead><tbody>';
    let day = 1;
    for (let i = 0; i < 6; i++) {
        html += '<tr>';
        for (let j = 0; j < 7; j++) {
            if ((i === 0 && j < startDay) || day > totalDays) {
                html += '<td style="background:#f4f2e8;"></td>';
            } else {
                html += `<td style="vertical-align:top;padding:4px 2px 8px 2px;min-width:36px;min-height:48px;border:1px solid #e0e0e0;">
                    <div style="font-weight:bold;">${day}</div>`;
                if (eventMap[day]) {
                    eventMap[day].forEach(evName => {
                        html += `<div style="background:#72d1ff;color:#1f233e;border-radius:4px;padding:2px 3px;margin:2px 0;font-size:0.85em;">${evName}</div>`;
                    });
                }
                html += '</td>';
                day++;
            }
        }
        html += '</tr>';
        if (day > totalDays) break;
    }
    html += '</tbody></table>';
    calendarDiv.innerHTML = html;
}

// 행사 정보를 화면에 표시하는 함수
async function fetchAndDisplayEvents() {
    const eventList = document.getElementById('event-list');
    eventList.innerHTML = ''; // 기존 목록 초기화

    const selectedMonth = document.getElementById('event-month').value;
    if (!selectedMonth) {
        alert('조회할 년월을 선택해주세요.');
        return;
    }

    const [year, month] = selectedMonth.split('-');
    const events = await fetchSchoolEvents(year, month);

    renderEventCalendar(parseInt(year), parseInt(month), events);

    if (events.length === 0) {
        eventList.innerHTML = '<li>해당 월에는 등록된 행사가 없습니다.</li>';
        return;
    }

    events.forEach(event => {
        const eventItem = document.createElement('li');
        eventItem.innerHTML = `
            <span class="event-date">${formatDate(event.AA_YMD)}</span> - ${event.EVENT_NM}
        `;
        eventList.appendChild(eventItem);
    });
}

// 날짜 포매팅 (YYYYMMDD -> YYYY년 MM월 DD일)
function formatDate(ymd) {
    return `${ymd.substring(0, 4)}년 ${ymd.substring(4, 6)}월 ${ymd.substring(6, 8)}일`;
}