// ===== Firebase 초기화 =====
const firebaseConfig = {
    apiKey: "AIzaSyAvdeqqvTeRv_xLGW7CKllR156ZrXP45-g",
    authDomain: "hssh-meal.firebaseapp.com",
    projectId: "hssh-meal",
    };
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 버튼 엘리먼트 참조
const loginBtn    = document.getElementById('login-btn');
const signupBtn   = document.getElementById('signup-btn');
const signoutBtn  = document.getElementById('signout-btn');
const userEmailEl = document.getElementById('user-email');

// 로그인 상태 변경 감지
auth.onAuthStateChanged(user => {
    if (user) {
        userEmailEl.textContent = user.email;
        loginBtn.style.display    = 'none';
        signupBtn.style.display   = 'none';
        signoutBtn.style.display  = 'inline-block';
    } else {
        userEmailEl.textContent   = '';
        loginBtn.style.display     = 'inline-block';
        signupBtn.style.display    = 'inline-block';
        signoutBtn.style.display   = 'none';
    }
});

// 로그인 핸들러
loginBtn.addEventListener('click', () => {
    auth.signInWithPopup(provider)
        .catch(error => {
            console.error(error);
            alert('로그인 실패: ' + error.message);
        });
});

// 회원가입 핸들러 (도메인 체크)
signupBtn.addEventListener('click', () => {
    auth.signInWithPopup(provider)
        .then(result => {
            const email = result.user.email;
            if (email.endsWith('@hansung-sh.hs.kr')) {
                alert('회원가입이 완료되었습니다.');
            } else {
                auth.signOut();
                alert('한성과학고(@hansung-sh.hs.kr) 계정만 회원가입 가능합니다.');
            }
        })
        .catch(error => {
            console.error(error);
            alert('회원가입 실패: ' + error.message);
        });
});

// 로그아웃 핸들러
signoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// ===== 급식 정보 로딩 =====
const dateInput = document.getElementById('meal-date');

// 오늘 날짜 기본 설정 (18시 이후는 다음날)
function setTodayToInput(input) {
    const now = new Date();
    let yyyy = now.getFullYear();
    let mm   = String(now.getMonth() + 1).padStart(2, '0');
    let dd   = String(now.getDate()).padStart(2, '0');
    if (now.getHours() >= 18) {
        const tomorrow = new Date(now.getTime() + 24*60*60*1000);
        yyyy = tomorrow.getFullYear();
        mm   = String(tomorrow.getMonth() + 1).padStart(2, '0');
        dd   = String(tomorrow.getDate()).padStart(2, '0');
    }
    input.value = `${yyyy}-${mm}-${dd}`;
}
setTodayToInput(dateInput);

function fetchAndDisplayMeal() {
    const selectedDate = new Date(dateInput.value);
    const year  = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth()+1).padStart(2,'0');
    const day   = String(selectedDate.getDate()).padStart(2,'0');
    const dateString = `${year}${month}${day}`;

    const apiKey = 'b9051bf44db6484e8e82f71c8c422100';
    const proxy  = 'https://corsproxy.io/?';
    const url    = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010115&MLSV_YMD=${dateString}&Type=json&Key=${apiKey}`
    );

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const meals = {1:'breakfast',2:'lunch',3:'dinner'};
            Object.values(meals).forEach(id => {
                document.getElementById(id).innerHTML = '급식 정보 없음';
            });
            const mealData = data?.mealServiceDietInfo?.[1]?.row || [];
            mealData.forEach(item => {
                const type = parseInt(item.MMEAL_SC_CODE);
                const raw  = item.DDISH_NM;
                const formatted = raw
                    .split(/<br\s*\/?>/gi)
                    .map(line => line.replace(/\(([^)]+)\)/g,'<span class="allergy">($1)</span>'))
                    .join('<br>');
                const el = meals[type];
                if (el) document.getElementById(el).innerHTML = formatted;
            });
        })
        .catch(err => {
            console.error('급식 로딩 실패:', err);
            ['breakfast','lunch','dinner'].forEach(id => {
                document.getElementById(id).innerHTML = '오류 발생';
            });
        });
}

dateInput.addEventListener('change', fetchAndDisplayMeal);
window.addEventListener('DOMContentLoaded', fetchAndDisplayMeal);