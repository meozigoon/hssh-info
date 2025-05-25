// mypage 전용 스크립트
// 내 정보 이메일/이미지/로그아웃 표시
function renderMypageUserBox(user) {
    const box = document.getElementById("mypage-userbox");
    if (user) {
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
        box.innerHTML = "";
        box.style.display = 'none';
    }
}
document.addEventListener("DOMContentLoaded", function () {
    // Firebase auth가 window에 없으면 script.js가 로드되기 전이므로 대기
    function waitForAuthAndInit() {
        if (!window.auth) {
            setTimeout(waitForAuthAndInit, 50);
            return;
        }
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
        // 헤더 버튼 이벤트
        document.getElementById('login-btn').onclick = function() {
            if (window.signIn) window.signIn();
        };
        document.getElementById('signout-btn').onclick = function() {
            if (window.auth) window.auth.signOut().then(()=>window.location.href='/');
        };
        document.getElementById('user-email').onclick = function() {
            if (window.auth && window.auth.currentUser) {
                window.location.href = '/mypage.html';
            }
        };
        // auth 상태 동기화
        if (window.auth && window.auth.currentUser) {
            syncHeaderAuth(window.auth.currentUser);
            renderMypageUserBox(window.auth.currentUser);
        } else {
            window.auth.onAuthStateChanged(function (user) {
                syncHeaderAuth(user);
                renderMypageUserBox(user);
            });
        }
        // 계정 삭제 버튼 이벤트
        document
            .getElementById("delete-account-btn")
            .addEventListener("click", function () {
                if (window.auth && window.auth.currentUser) {
                    if (
                        confirm(
                            "정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
                        )
                    ) {
                        window.auth.currentUser
                            .delete()
                            .then(function () {
                                alert("계정이 삭제되었습니다.");
                                window.location.href = "/";
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
                                        "계정 삭제 실패: " +
                                            error.message
                                    );
                                }
                            });
                    }
                }
            });
    }
    waitForAuthAndInit();
});
