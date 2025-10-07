let auth;
let provider;
let neisMealApiKey = "";
let neisEventApiKey = "";
const schoolCode = "7010115";
const inlineEnvConfig = window.__ENV__ || null;

const loginBtn = document.getElementById("login-btn");
const signoutBtn = document.getElementById("signout-btn");
const userEmailEl = document.getElementById("user-email");
const dateInput = document.getElementById("meal-date");

async function loadRemoteConfig() {
    const res = await fetch("/api/config");
    if (!res.ok) {
        throw new Error(`Failed to load config: ${res.status}`);
    }
    return res.json();
}

function setupAuthStateListener() {
    if (!auth) return;
    auth.onAuthStateChanged((user) => {
        if (user) {
            userEmailEl.innerHTML = `<img src="${
                user.photoURL || "/image/hssh_Logo.png"
            }" alt="프로필" />${user.email}`;
            loginBtn.style.display = "none";
            signoutBtn.style.display = "inline-block";
        } else {
            userEmailEl.innerHTML = "";
            loginBtn.style.display = "inline-block";
            signoutBtn.style.display = "none";
        }
    });
}

function signIn() {
    if (!auth || !provider) {
        alert(
            "로그인 구성이 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요."
        );
        return;
    }
    auth.signInWithPopup(provider)
        .then((result) => {
            const email = result.user.email;
            const params =
                typeof provider.getCustomParameters === "function"
                    ? provider.getCustomParameters()
                    : {};
            const allowedDomain = params?.hd || "";
            if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
                auth.currentUser
                    ?.delete()
                    .catch((err) => console.error("계정 삭제 실패:", err));
                auth.signOut();
                alert(`${allowedDomain} 계정만 로그인 가능합니다.`);
            }
        })
        .catch((error) => {
            console.error("인증 실패:", error);
            alert("인증 실패: " + error.message);
        });
}

function setTodayToInput(input) {
    if (!input) return;
    const now = new Date();
    let yyyy = now.getFullYear();
    let mm = String(now.getMonth() + 1).padStart(2, "0");
    let dd = String(now.getDate()).padStart(2, "0");
    if (now.getHours() >= 18) {
        const t = new Date(now.getTime() + 86400000);
        yyyy = t.getFullYear();
        mm = String(t.getMonth() + 1).padStart(2, "0");
        dd = String(t.getDate()).padStart(2, "0");
    }
    input.value = `${yyyy}-${mm}-${dd}`;
}

function fetchAndDisplayMeal() {
    if (!dateInput) return;
    if (!neisMealApiKey) {
        console.warn("급식 API 키가 설정되지 않았습니다.");
        return;
    }
    const sel = new Date(dateInput.value);
    const y = sel.getFullYear();
    const m = String(sel.getMonth() + 1).padStart(2, "0");
    const d = String(sel.getDate()).padStart(2, "0");
    const dateString = `${y}${m}${d}`;
    const proxy = "https://corsproxy.io/?";
    const url =
        proxy +
        encodeURIComponent(
            `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=B10` +
                `&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${dateString}&Type=json&Key=${neisMealApiKey}`
        );
    fetch(url)
        .then((r) => r.json())
        .then((data) => {
            const meals = { 1: "breakfast", 2: "lunch", 3: "dinner" };
            Object.values(meals).forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = "급식 정보 없음";
            });
            const rows = data?.mealServiceDietInfo?.[1]?.row || [];
            rows.forEach((item) => {
                const t = parseInt(item.MMEAL_SC_CODE, 10);
                const raw = item.DDISH_NM;
                const formatted = raw
                    .split(/<br\s*\/?>/gi)
                    .map((line) =>
                        line.replace(
                            /\(([^)]+)\)/g,
                            '<span class="allergy">($1)</span>'
                        )
                    )
                    .join("<br>");
                const elId = meals[t];
                if (elId) {
                    const target = document.getElementById(elId);
                    if (target) target.innerHTML = formatted;
                }
            });
        })
        .catch((e) => {
            console.error("급식 로딩 실패:", e);
            ["breakfast", "lunch", "dinner"].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = "오류 발생";
            });
        });
}

async function fetchSchoolEvents(year, month) {
    if (!neisEventApiKey) {
        console.warn("행사 API 키가 설정되지 않았습니다.");
        return [];
    }
    const proxy = "https://corsproxy.io/?";
    const monthStr = String(month).padStart(2, "0");
    const url =
        proxy +
        encodeURIComponent(
            `https://open.neis.go.kr/hub/SchoolSchedule?Key=${neisEventApiKey}` +
                `&Type=json&ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=${schoolCode}` +
                `&AA_YMD=${year}${monthStr}`
        );
    try {
        const res = await fetch(url);
        const data = await res.json();
        const rows = data?.SchoolSchedule?.[1]?.row || [];
        return rows.filter(
            (ev) =>
                ev.AA_YMD &&
                ev.AA_YMD.startsWith(`${year}${monthStr}`) &&
                ev.EVENT_NM &&
                ev.EVENT_NM.trim() !== ""
        );
    } catch (err) {
        console.error("행사 데이터 로딩 실패:", err);
        return [];
    }
}

function renderEventCalendar(year, month, events) {
    const calendarDiv = document.getElementById("event-calendar");
    if (!calendarDiv) return;
    calendarDiv.innerHTML = "";
    const firstDay = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0).getDate();
    const startDay = firstDay.getDay();
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth() + 1;
    const todayD = today.getDate();
    let day = 1;

    let html = '<table class="event-calendar-table">';
    html +=
        "<thead><tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr></thead><tbody>";
    for (let i = 0; i < 6; i++) {
        html += "<tr>";
        for (let j = 0; j < 7; j++) {
            if ((i === 0 && j < startDay) || day > lastDate) {
                html += "<td></td>";
            } else {
                let tdClass = "";
                if (year === todayY && month === todayM && day === todayD) {
                    tdClass = "today";
                }
                html += `<td${
                    tdClass ? ` class="${tdClass}"` : ""
                }><div style="font-weight:bold;">${day}</div>`;
                (
                    events.filter(
                        (ev) => parseInt(ev.AA_YMD.slice(6, 8), 10) === day
                    ) || []
                ).forEach((ev) => {
                    html += `<div style="background:#72d1ff;color:#1f233e;border-radius:4px;padding:2px 3px;margin-top:4px;font-size:0.85em;">${ev.EVENT_NM}</div>`;
                });
                html += "</td>";
                day++;
            }
        }
        html += "</tr>";
        if (day > lastDate) break;
    }
    html += "</tbody></table>";
    calendarDiv.innerHTML = html;
}

async function fetchAndDisplayEvents() {
    const listEl = document.getElementById("event-list");
    const monthInput = document.getElementById("event-month");
    if (!listEl || !monthInput) return;
    listEl.innerHTML = "";
    const [year, month] = monthInput.value.split("-");
    const events = await fetchSchoolEvents(
        parseInt(year, 10),
        parseInt(month, 10)
    );
    renderEventCalendar(parseInt(year, 10), parseInt(month, 10), events);
    if (events.length === 0) {
        listEl.innerHTML = "<li>해당 월에는 등록된 행사가 없습니다.</li>";
    } else {
        events.forEach((ev) => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="event-date">${ev.AA_YMD.slice(
                0,
                4
            )}년 ${ev.AA_YMD.slice(4, 6)}월 ${ev.AA_YMD.slice(
                6,
                8
            )}일</span> - ${ev.EVENT_NM}`;
            listEl.appendChild(li);
        });
    }
}

function setupEventControls() {
    const eventMonthInput = document.getElementById("event-month");
    const toggleBtn = document.getElementById("toggle-events-btn");
    const eventList = document.getElementById("event-list");
    if (!eventMonthInput || !toggleBtn || !eventList) return;

    const now = new Date();
    eventMonthInput.value = `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;

    eventList.style.display = "none";
    toggleBtn.textContent = "행사 목록 보기";

    toggleBtn.addEventListener("click", () => {
        const isVisible = eventList.style.display === "block";
        eventList.style.display = isVisible ? "none" : "block";
        toggleBtn.textContent = isVisible
            ? "행사 목록 보기"
            : "행사 목록 숨기기";
    });

    eventMonthInput.addEventListener("change", fetchAndDisplayEvents);
    fetchAndDisplayEvents();
}

function guardMyPageAccess() {
    if (!auth) return;
    if (window.location.pathname.endsWith("/mypage.html")) {
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = "/";
            }
        });
    }
}

loginBtn?.addEventListener("click", signIn);
signoutBtn?.addEventListener("click", () => {
    if (!auth) return;
    auth.signOut();
});
userEmailEl?.addEventListener("click", () => {
    if (auth?.currentUser) {
        window.location.href = "/mypage.html";
    }
});

dateInput?.addEventListener("change", fetchAndDisplayMeal);

document.querySelectorAll(".logo").forEach(function (logo) {
    logo.style.cursor = "pointer";
    logo.addEventListener("click", function () {
        window.location.href = "/";
    });
});

(function () {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
                console.log("Service Worker 등록 성공:", reg);
            })
            .catch((err) => {
                console.error("Service Worker 등록 실패:", err);
            });
    }
})();

async function initApp() {
    let config;
    try {
        config = await loadRemoteConfig();
    } catch (error) {
        if (inlineEnvConfig) {
            console.warn(
                "원격 환경 구성을 불러오지 못해 window.__ENV__ 값을 사용합니다.",
                error
            );
            config = inlineEnvConfig;
        } else {
            console.error("환경 설정 로드 실패:", error);
            alert(
                "서비스 설정을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요."
            );
            return;
        }
    }

    try {
        firebase.initializeApp(config.firebaseConfig);
    } catch (firebaseError) {
        console.error("Firebase 초기화 실패:", firebaseError);
        alert("인증 구성을 불러오는 데 문제가 발생했습니다.");
        return;
    }

    auth = firebase.auth();
    provider = new firebase.auth.GoogleAuthProvider();
    if (config.allowedDomain) {
        provider.setCustomParameters({ hd: config.allowedDomain });
    }
    neisMealApiKey = config.neisMealApiKey || "";
    neisEventApiKey = config.neisEventApiKey || "";

    setupAuthStateListener();
    guardMyPageAccess();
    setTodayToInput(dateInput);
    fetchAndDisplayMeal();
    setupEventControls();
}

document.addEventListener("DOMContentLoaded", initApp);
