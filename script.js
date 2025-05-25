// ===== Firebase 초기화 =====
const firebaseConfig = {
    apiKey: "AIzaSyAvdeqqvTeRv_xLGW7CKllR156ZrXP45-g",
    authDomain: "hssh-meal.firebaseapp.com",
    projectId: "hssh-meal",
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ hd: 'hansung-sh.hs.kr' });

const loginBtn    = document.getElementById('login-btn');
// 회원가입 버튼 제거
// const signupBtn   = document.getElementById('signup-btn');
const signoutBtn  = document.getElementById('signout-btn');
const userEmailEl = document.getElementById('user-email');

auth.onAuthStateChanged(user => {
    if (user) {
        userEmailEl.textContent = user.email;
        loginBtn.style.display   = 'none';
        // signupBtn.style.display  = 'none';
        signoutBtn.style.display = 'inline-block';
    } else {
        userEmailEl.textContent   = '';
        loginBtn.style.display    = 'inline-block';
        // signupBtn.style.display   = 'inline-block';
        signoutBtn.style.display  = 'none';
    }
});

function signIn() {
    auth.signInWithPopup(provider)
        .then(result => {
            const email = result.user.email;
            if (!email.endsWith('@hansung-sh.hs.kr')) {
                auth.currentUser.delete().catch(err => console.error('계정 삭제 실패:', err));
                auth.signOut();
                alert('한성과학고(@hansung-sh.hs.kr) 계정만 로그인 가능합니다.');
            }
        })
        .catch(error => {
            console.error('인증 실패:', error);
            alert('인증 실패: ' + error.message);
        });
}

loginBtn.addEventListener('click', signIn);
// signupBtn.addEventListener('click', signIn);
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
    const y = sel.getFullYear(),
          m = String(sel.getMonth()+1).padStart(2,'0'),
          d = String(sel.getDate()).padStart(2,'0');
    const dateString = `${y}${m}${d}`;
    const apiKey = 'b9051bf44db6484e8e82f71c8c422100';
    const proxy  = 'https://corsproxy.io/?';
    const url    = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=B10` +
        `&SD_SCHUL_CODE=7010115&MLSV_YMD=${dateString}&Type=json&Key=${apiKey}`
    );
    fetch(url)
        .then(r => r.json())
        .then(data => {
            const meals = {1:'breakfast',2:'lunch',3:'dinner'};
            Object.values(meals).forEach(id => document.getElementById(id).innerHTML = '급식 정보 없음');
            const rows = data?.mealServiceDietInfo?.[1]?.row || [];
            rows.forEach(item => {
                const t   = parseInt(item.MMEAL_SC_CODE, 10);
                const raw = item.DDISH_NM;
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
const eventApiKey = '2d4a22c414504fe9ba434a810d3c64f1';
const schoolCode  = '7010115';

window.addEventListener('DOMContentLoaded', () => {
    const eventMonthInput = document.getElementById('event-month');
    const toggleBtn       = document.getElementById('toggle-events-btn');
    const eventList       = document.getElementById('event-list');
    if (!eventMonthInput || !toggleBtn) return;

    // 오늘 기준 연·월 설정
    const now = new Date();
    eventMonthInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    // 행사 목록 기본적으로 보이기
    eventList.style.display = 'block';
    toggleBtn.textContent   = '행사 목록 숨기기';

    // 초기 데이터 로드
    fetchAndDisplayEvents();

    // 행사 목록 토글
    toggleBtn.addEventListener('click', () => {
        const isVisible = eventList.style.display === 'block';
        eventList.style.display = isVisible ? 'none' : 'block';
        toggleBtn.textContent   = isVisible ? '행사 목록 보기' : '행사 목록 숨기기';
    });

    // 월 변경 시 재조회
    eventMonthInput.addEventListener('change', fetchAndDisplayEvents);
});

async function fetchSchoolEvents(year, month) {
    const proxy = 'https://corsproxy.io/?';
    const monthStr = String(month).padStart(2, '0');
    const url = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/SchoolSchedule?Key=${eventApiKey}` +
        `&Type=json&ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=${schoolCode}` +
        `&AA_YMD=${year}${monthStr}`
    );
    try {
        const res  = await fetch(url);
        const data = await res.json();
        // 해당 월의 일정만 필터링
        const rows = data?.SchoolSchedule?.[1]?.row || [];
        return rows.filter(ev => ev.AA_YMD && ev.AA_YMD.startsWith(`${year}${monthStr}`) && ev.EVENT_NM && ev.EVENT_NM.trim() !== '');
    } catch (err) {
        console.error('행사 데이터 로딩 실패:', err);
        return [];
    }
}

function renderEventCalendar(year, month, events) {
    const calendarDiv = document.getElementById('event-calendar');
    calendarDiv.innerHTML = '';
    const firstDay = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0).getDate();
    const startDay = firstDay.getDay();
    const today    = new Date();
    const todayY   = today.getFullYear();
    const todayM   = today.getMonth() + 1;
    const todayD   = today.getDate();
    let day        = 1;

    let html = '<table class="event-calendar-table">';
    html += '<thead><tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr></thead><tbody>';
    for (let i = 0; i < 6; i++) {
        html += '<tr>';
        for (let j = 0; j < 7; j++) {
            if ((i === 0 && j < startDay) || day > lastDate) {
                html += '<td></td>';
            } else {
                const isToday = (year === todayY && month === todayM && day === todayD);
                html += `<td${isToday ? ' class="today"' : ''}><div style="font-weight:bold;">${day}</div>`;
                (events.filter(ev => parseInt(ev.AA_YMD.slice(6,8),10) === day) || []).forEach(ev => {
                    html += `<div style="background:#72d1ff;color:#1f233e;border-radius:4px;padding:2px 3px;margin-top:4px;font-size:0.85em;">${ev.EVENT_NM}</div>`;
                });
                html += '</td>';
                day++;
            }
        }
        html += '</tr>';
        if (day > lastDate) break;
    }
    html += '</tbody></table>';
    calendarDiv.innerHTML = html;
}

async function fetchAndDisplayEvents() {
    const listEl       = document.getElementById('event-list');
    listEl.innerHTML   = '';
    const [year, month] = document.getElementById('event-month').value.split('-');
    const events        = await fetchSchoolEvents(year, month);
    renderEventCalendar(parseInt(year), parseInt(month), events);
    if (events.length === 0) {
        listEl.innerHTML = '<li>해당 월에는 등록된 행사가 없습니다.</li>';
    } else {
        events.forEach(ev => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="event-date">${ev.AA_YMD.slice(0,4)}년 ${ev.AA_YMD.slice(4,6)}월 ${ev.AA_YMD.slice(6,8)}일</span> - ${ev.EVENT_NM}`;
            listEl.appendChild(li);
        });
    }
}
