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