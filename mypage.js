const inlineEnvConfig = window.__ENV__ || null;
let resolvedConfig = null;
let neisTimetableApiKey = '';
let authListenerAttached = false;

function renderMypageUserBox(user) {
    const box = document.getElementById("mypage-userbox");
    const infoArea = document.getElementById("mypage-account-info");
    if (!box) return;

    if (user) {
        if (infoArea) {
            infoArea.style.display = 'flex';
            infoArea.innerHTML = `
                <img src="${user.photoURL || '/image/hssh_Logo.png'}" alt="프로필" style="width:56px;height:56px;border-radius:50%;background:#ececec;object-fit:cover;margin-bottom:8px;" />
                <div style="font-size:1.1rem;font-weight:600;color:#72d1ff;margin-top:6px;">${user.displayName || user.email}</div>
                <div style="font-size:0.98rem;color:#ececec;margin-top:2px;">${user.email}</div>
            `;
        }
        box.innerHTML = `<span class="user-email" style="text-decoration:underline;text-underline-position:under;color:#72d1ff;cursor:pointer;gap:6px;display:flex;align-items:center;">
            <img src="${user.photoURL || '/image/hssh_Logo.png'}" alt="프로필" style="width:28px;height:28px;border-radius:50%;background:#ececec;object-fit:cover;margin-right:4px;" />
            ${user.email}
        </span>
        <button id="mypage-signout-btn" class="btn" style="margin-left:10px;">로그아웃</button>`;
        const signoutBtn = document.getElementById("mypage-signout-btn");
        if (signoutBtn) {
            signoutBtn.onclick = function () {
                window.auth?.signOut().then(() => (window.location.href = "/"));
            };
        }
        box.style.display = 'flex';
    } else {
        if (infoArea) {
            infoArea.innerHTML = '';
            infoArea.style.display = 'none';
        }
        box.innerHTML = '';
        box.style.display = 'none';
    }
}

function syncHeaderAuth(user) {
    const loginBtn = document.getElementById('login-btn');
    const signoutBtn = document.getElementById('signout-btn');
    const userEmailEl = document.getElementById('user-email');
    if (!loginBtn || !signoutBtn || !userEmailEl) return;

    if (user) {
        userEmailEl.innerHTML = `<img src="${user.photoURL || '/image/hssh_Logo.png'}" alt="프로필" />${user.email}`;
        loginBtn.style.display = 'none';
        signoutBtn.style.display = 'inline-block';
    } else {
        userEmailEl.innerHTML = '';
        loginBtn.style.display = 'inline-block';
        signoutBtn.style.display = 'none';
    }
}

function setupHeaderActions() {
    document.querySelectorAll('.logo').forEach(function (logo) {
        logo.style.cursor = 'pointer';
        logo.onclick = function () {
            window.location.href = '/';
        };
    });

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = function () {
            if (typeof window.signIn === 'function') {
                window.signIn();
            } else {
                alert('로그인 구성이 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
            }
        };
    }

    const signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) {
        signoutBtn.onclick = function () {
            window.auth?.signOut();
        };
    }

    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) {
        userEmailEl.onclick = function () {
            if (window.auth?.currentUser) {
                window.location.href = '/mypage.html';
            }
        };
    }
}

function waitForFirebase() {
    return new Promise(function (resolve, reject) {
        let attempts = 0;
        const maxAttempts = 200; // 약 10초
        function check() {
            if (typeof window.firebase !== 'undefined') {
                resolve(window.firebase);
                return;
            }
            attempts += 1;
            if (attempts > maxAttempts) {
                reject(new Error('Firebase SDK를 찾을 수 없습니다.')); // eslint-disable-line prefer-promise-reject-errors
                return;
            }
            setTimeout(check, 50);
        }
        check();
    });
}

async function resolveAppConfig() {
    if (resolvedConfig) {
        return resolvedConfig;
    }
    if (window.__APP_CONFIG__) {
        resolvedConfig = window.__APP_CONFIG__;
        return resolvedConfig;
    }
    if (inlineEnvConfig) {
        resolvedConfig = inlineEnvConfig;
        window.__APP_CONFIG__ = resolvedConfig;
        return resolvedConfig;
    }
    const res = await fetch('/api/config');
    if (!res.ok) {
        throw new Error(`Failed to load config: ${res.status}`);
    }
    const data = await res.json();
    window.__APP_CONFIG__ = data;
    resolvedConfig = data;
    return data;
}

async function ensureFirebaseAuth(config) {
    const firebase = await waitForFirebase();
    if (!firebase.apps.length) {
        firebase.initializeApp(config.firebaseConfig);
    }
    if (!window.auth) {
        window.auth = firebase.auth();
    }
    if (!window.provider) {
        const provider = new firebase.auth.GoogleAuthProvider();
        if (config.allowedDomain) {
            provider.setCustomParameters({ hd: config.allowedDomain });
        }
        window.provider = provider;
    }
    window.signIn = async function () {
        if (!window.auth || !window.provider) {
            alert('로그인 구성이 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        try {
            const result = await window.auth.signInWithPopup(window.provider);
            const email = result.user.email;
            const allowedDomain = config.allowedDomain;
            if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
                await window.auth.currentUser?.delete().catch(function (err) {
                    console.error('계정 삭제 실패:', err);
                });
                await window.auth.signOut();
                alert(`${allowedDomain} 계정만 로그인 가능합니다.`);
            }
        } catch (error) {
            console.error('인증 실패:', error);
            alert('인증 실패: ' + error.message);
        }
    };
}

function attachAuthListener() {
    if (!window.auth || authListenerAttached) return;
    authListenerAttached = true;
    let first = true;
    window.auth.onAuthStateChanged(function (user) {
        syncHeaderAuth(user);
        renderMypageUserBox(user);
        handleUserTimetable(user);
        if (first && user) {
            first = false;
            setTimeout(function () {
                syncHeaderAuth(user);
                renderMypageUserBox(user);
            }, 0);
        }
    });
}

// 계정 이름에서 학년/반 추출
function getGradeClassFromName(name) {
    if (!name || name.length < 2) return { grade: '', classNum: '' };
    const grade = name[0];
    const classNum = name[1];
    return { grade, classNum };
}

function ensureTimetableContainer() {
    const section = document.querySelector('main section');
    if (!section) return null;
    let timetableBoxBottom = document.getElementById('timetable-box-bottom');
    if (!timetableBoxBottom) {
        timetableBoxBottom = document.createElement('div');
        timetableBoxBottom.id = 'timetable-box-bottom';
        timetableBoxBottom.className = 'user-info-box';
        timetableBoxBottom.style.marginTop = '24px';
        section.appendChild(timetableBoxBottom);
    }
    return timetableBoxBottom;
}

function handleUserTimetable(user) {
    if (!user) return;
    const name = user.displayName || '';
    const { grade, classNum } = getGradeClassFromName(name);
    if (grade && classNum) {
        const timetableBox = ensureTimetableContainer();
        if (timetableBox) {
            fetchAndShowWeeklyTimetable(grade, classNum, timetableBox);
        }
    }
}

// 주간 시간표를 달력형 표로 표시
async function fetchAndShowWeeklyTimetable(grade, classNum, timetableBox) {
    if (!neisTimetableApiKey) {
        timetableBox.innerHTML = '<div style="text-align:center;color:#ff4d4f;margin-top:18px;">시간표 API 키가 설정되지 않았습니다.</div>';
        console.warn('NEIS 시간표 API 키가 설정되지 않았습니다.');
        return;
    }
    const proxy = 'https://corsproxy.io/?';
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0(일)~6(토)
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d);
    }
    const ymdArr = weekDates.map(function (d) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}${mm}${dd}`;
    });
    const fromYmd = ymdArr[0];
    const toYmd = ymdArr[4];
    const url = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/hisTimetable?ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010115&GRADE=${grade}&CLASS_NM=${classNum}&TI_FROM_YMD=${fromYmd}&TI_TO_YMD=${toYmd}&Type=json&KEY=${neisTimetableApiKey}`
    );
    timetableBox.innerHTML = '<div style="text-align:center;">전체 시간표 불러오는 중...</div>';
    try {
        const res = await fetch(url);
        const data = await res.json();
        const rows = data?.hisTimetable?.[1]?.row || [];
        if (rows.length === 0) {
            timetableBox.innerHTML = '<div style="text-align:center;margin-top:18px;">이번 주 시간표가 없습니다.</div>';
            return;
        }
        const days = ['월', '화', '수', '목', '금'];
        const dayMap = {};
        days.forEach(function (_, i) {
            const ymd = ymdArr[i];
            dayMap[ymd] = {};
        });
        let maxPeriod = 0;
        rows.forEach(function (r) {
            const ymd = r.ALL_TI_YMD;
            const period = parseInt(r.PERIO, 10);
            if (!dayMap[ymd]) dayMap[ymd] = {};
            dayMap[ymd][period] = r.ITRT_CNTNT || r.SUBJECT_NM || '-';
            if (period > maxPeriod) maxPeriod = period;
        });
        let html = '<div class="timetable-wide-card"><div style="font-weight:600;font-size:1.08rem;margin-bottom:8px;text-align:center;color:#72d1ff;">이번 주 전체 시간표</div>';
        html += '<div style="overflow-x:auto;"><table class="weekly-timetable">';
        html += '<thead><tr><th>교시</th>';
        days.forEach(function (d) {
            html += `<th>${d}</th>`;
        });
        html += '</tr></thead><tbody>';
        for (let period = 1; period <= maxPeriod; period++) {
            html += `<tr><td>${period}</td>`;
            for (let i = 0; i < 5; i++) {
                const ymd = ymdArr[i];
                const subject = dayMap[ymd][period] || '-';
                html += `<td>${subject}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table></div></div>';
        timetableBox.innerHTML = html;
    } catch (e) {
        console.error('주간 시간표 불러오기 실패:', e);
        timetableBox.innerHTML = '<div style="text-align:center;color:#ff4d4f;margin-top:18px;">주간 시간표 불러오기 실패</div>';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    (async function initMypage() {
        try {
            const config = await resolveAppConfig();
            neisTimetableApiKey = config.neisTimetableApiKey || '';
            await ensureFirebaseAuth(config);
            setupHeaderActions();
            attachAuthListener();
        } catch (error) {
            console.error('마이페이지 초기화 실패:', error);
            alert('서비스 설정을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
    })();
});
