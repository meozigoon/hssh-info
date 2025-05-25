// mypage 전용 스크립트
// 내 정보 이메일/이미지/로그아웃 표시
function renderMypageUserBox(user) {
    const box = document.getElementById("mypage-userbox");
    const infoArea = document.getElementById("mypage-account-info");
    if (user) {
        // 상단 계정 정보(이름, 사진) 표시
        if (infoArea) {
            infoArea.style.display = 'flex';
            infoArea.innerHTML = `
                <img src="${user.photoURL || '/image/hssh_Logo.png'}" alt="프로필" style="width:56px;height:56px;border-radius:50%;background:#ececec;object-fit:cover;margin-bottom:8px;" />
                <div style="font-size:1.1rem;font-weight:600;color:#72d1ff;margin-top:6px;">${user.displayName || user.email}</div>
                <div style="font-size:0.98rem;color:#ececec;margin-top:2px;">${user.email}</div>
            `;
        }
        // 기존 하단 계정 정보(이메일+로그아웃)
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
    // Firebase auth가 window에 없으면 script.js가 로드되기 전이므로 대기
    function waitForAuthAndInit() {
        // Firebase SDK가 window.firebase로 로드됐는지 체크 (CDN 환경 대응)
        if (typeof window.firebase === 'undefined') {
            setTimeout(waitForAuthAndInit, 50);
            return;
        }
        // Firebase 초기화 (script.js 미참조, mypage.js 단독 동작)
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
        // DOM이 완전히 준비된 후에만 버튼 이벤트 연결
        window.addEventListener('DOMContentLoaded', function() {
            // auth 상태 동기화 (최초 진입 시 강제 트리거)
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
            // 로고 클릭 시 메인으로 이동
            document.querySelectorAll(".logo").forEach(function (logo) {
                logo.style.cursor = "pointer";
                logo.addEventListener("click", function () {
                    window.location.href = "/";
                });
            });
            // 로그인/로그아웃/이메일 헤더 동기화
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
            // 헤더 버튼 이벤트 (script.js와 동일하게)
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
            // 계정 삭제 버튼 이벤트
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
