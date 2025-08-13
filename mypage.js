function renderMypageUserBox(user) {
    const box = document.getElementById("mypage-userbox");
    const infoArea = document.getElementById("mypage-account-info");
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
            <img src="${user.photoURL || "/image/hssh_Logo.png"}" alt="프로필" style="width:28px;height:28px;border-radius:50%;background:#ececec;object-fit:cover;margin-right:4px;" />
            ${user.email}
        </span>
        <button id="mypage-signout-btn" class="btn" style="margin-left:10px;">로그아웃</button>`;
        document.getElementById("mypage-signout-btn").onclick = function () {
            window.auth.signOut().then(() => (window.location.href = "/"));
        };
        box.style.display = 'flex';
    } else {
        if (infoArea) {
            infoArea.innerHTML = '';
            infoArea.style.display = 'none';
        }
        box.innerHTML = "";
        box.style.display = 'none';
    }
}
document.addEventListener("DOMContentLoaded", function () {
    function waitForAuthAndInit() {
        if (typeof window.firebase === 'undefined') {
            setTimeout(waitForAuthAndInit, 50);
            return;
        }
        if (!window.firebase.apps.length) {
            window.firebase.initializeApp({
                apiKey: "AIzaSyAvdeqqvTeRv_xLGW7CKllR156ZrXP45-g",
                authDomain: "hssh-meal.firebaseapp.com",
                projectId: "hssh-meal"
            });
        }
        if (!window.auth) {
            window.auth = window.firebase.auth();
            window.provider = new window.firebase.auth.GoogleAuthProvider();
            window.provider.setCustomParameters({ hd: 'hansung-sh.hs.kr' });
            window.signIn = function() {
                window.auth.signInWithPopup(window.provider)
                    .then(result => {
                        const email = result.user.email;
                        if (!email.endsWith('@hansung-sh.hs.kr')) {
                            window.auth.currentUser.delete().catch(err => console.error('계정 삭제 실패:', err));
                            window.auth.signOut();
                            alert('한성과학고(@hansung-sh.hs.kr) 계정만 로그인 가능합니다.');
                        }
                    })
                    .catch(error => {
                        console.error('인증 실패:', error);
                        alert('인증 실패: ' + error.message);
                    });
            };
        }
        window.addEventListener('DOMContentLoaded', function() {
            let first = true;
            window.auth.onAuthStateChanged(function (user) {
                syncHeaderAuth(user);
                renderMypageUserBox(user);
                if (first && user) {
                    first = false;
                    setTimeout(() => {
                        syncHeaderAuth(user);
                        renderMypageUserBox(user);
                    }, 0);
                }
            });
            document.querySelectorAll(".logo").forEach(function (logo) {
                logo.style.cursor = "pointer";
                logo.addEventListener("click", function () {
                    window.location.href = "/";
                });
            });
            function syncHeaderAuth(user) {
                const loginBtn = document.getElementById('login-btn');
                const signoutBtn = document.getElementById('signout-btn');
                const userEmailEl = document.getElementById('user-email');
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
            document.getElementById('login-btn').onclick = function() {
                if (window.signIn) {
                    window.signIn();
                }
            };
            document.getElementById('signout-btn').onclick = function() {
                if (window.auth) window.auth.signOut();
            };
            document.getElementById('user-email').onclick = function() {
                if (window.auth && window.auth.currentUser) {
                    window.location.href = '/mypage.html';
                }
            };
            document.getElementById("delete-account-btn").addEventListener("click", function () {
                if (window.auth && window.auth.currentUser) {
                    if (
                        confirm(
                            "정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
                        )
                    ) {
                        window.auth.currentUser
                            .delete()
                            .then(function () {
                                alert("계정이 삭제되었습니다. 로그아웃됩니다.");
                                window.auth.signOut().then(function() {
                                    window.location.href = "/";
                                });
                            })
                            .catch(function (error) {
                                if (
                                    error.code ===
                                    "auth/requires-recent-login"
                                ) {
                                    alert(
                                        "보안을 위해 다시 로그인 후 계정 삭제를 시도해 주세요."
                                    );
                                    window.location.href = "/";
                                } else {
                                    alert(
                                        "계정 삭제 실패: " + error.message
                                    );
                                }
                            });
                    }
                }
            });
        });
    }
    waitForAuthAndInit();
});
// 계정 이름에서 학년/반 추출
function getGradeClassFromName(name) {
    if (!name || name.length < 2) return { grade: '', classNum: '' };
    const grade = name[0];
    const classNum = name[1];
    return { grade, classNum };
}

// 주간 시간표를 달력형 표로 표시
async function fetchAndShowWeeklyTimetable(grade, classNum, timetableBox) {
    const apiKey = 'a20b10c46deb473eb5eb936d53e64ce2';
    const proxy = 'https://corsproxy.io/?';
    const today = new Date();
    // 이번 주 월요일~금요일 날짜 구하기
    const dayOfWeek = today.getDay(); // 0(일)~6(토)
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const weekDates = [];
    for (let i = 7; i < 12; i++) { // 월~금
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d);
    }
    // 날짜별로 시간표 요청
    const ymdArr = weekDates.map(d => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}${mm}${dd}`;
    });
    const fromYmd = ymdArr[0];
    const toYmd = ymdArr[4];
    const url = proxy + encodeURIComponent(
        `https://open.neis.go.kr/hub/hisTimetable?ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7010115&GRADE=${grade}&CLASS_NM=${classNum}&TI_FROM_YMD=${fromYmd}&TI_TO_YMD=${toYmd}&Type=json&KEY=${apiKey}`
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
        // 요일별, 교시별로 정렬
        const days = ['월', '화', '수', '목', '금'];
        const dayMap = {};
        days.forEach((d, i) => {
            const ymd = ymdArr[i];
            dayMap[ymd] = {};
        });
        let maxPeriod = 0;
        rows.forEach(r => {
            const ymd = r.ALL_TI_YMD;
            const period = parseInt(r.PERIO, 10);
            if (!dayMap[ymd]) dayMap[ymd] = {};
            dayMap[ymd][period] = r.ITRT_CNTNT || r.SUBJECT_NM || '-';
            if (period > maxPeriod) maxPeriod = period;
        });
        // 표 생성
        let html = '<div class="timetable-wide-card"><div style="font-weight:600;font-size:1.08rem;margin-bottom:8px;text-align:center;color:#72d1ff;">이번 주 전체 시간표</div>';
        html += '<div style="overflow-x:auto;"><table class="weekly-timetable">';
        html += '<thead><tr><th>교시</th>';
        days.forEach(d => {
            html += `<th>${d}</th>`;
        });
        html += '</tr></thead><tbody>';
        for (let period = 1; period <= maxPeriod; period++) {
            html += `<tr><td>${period}</td>`;
            for (let i = 0; i < 5; i++) {
                const ymd = ymdArr[i];
                const subject = (dayMap[ymd][period] || '-');
                html += `<td>${subject}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table></div></div>';
        timetableBox.innerHTML = html;
    } catch (e) {
        timetableBox.innerHTML = '<div style="text-align:center;color:#ff4d4f;margin-top:18px;">주간 시간표 불러오기 실패</div>';
    }
}

// mypage 진입 시 계정 이름에서 학년/반 추출 후 전체 시간표 표시
window.addEventListener('DOMContentLoaded', function() {
    window.auth.onAuthStateChanged(function(user) {
        if (!user) return;
        const name = user.displayName || '';
        const { grade, classNum } = getGradeClassFromName(name);
        if (grade && classNum) {
            // 전체 시간표 박스 생성 및 렌더링
            let section = document.querySelector('main section');
            if (!section) return;
            let timetableBoxBottom = document.getElementById('timetable-box-bottom');
            if (!timetableBoxBottom) {
                timetableBoxBottom = document.createElement('div');
                timetableBoxBottom.id = 'timetable-box-bottom';
                timetableBoxBottom.className = 'user-info-box';
                timetableBoxBottom.style.marginTop = '24px';
                section.appendChild(timetableBoxBottom);
            }
            fetchAndShowWeeklyTimetable(grade, classNum, timetableBoxBottom);
        }
    });
});
