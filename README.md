# hssh-meal

## 환경 변수 설정

1. `.env.example` 파일을 참고해 루트에 `.env` 파일을 생성하고 필요한 값을 채워주세요.
2. 로컬 개발 시 `vercel dev` 혹은 Vercel 호환 로컬 서버에서 `.env` 값이 자동으로 `api/config.js` 함수에 주입됩니다.
3. 정적 서버를 바로 띄우는 경우에는 아래 형태의 `env.js` 파일을 직접 만들어 `<script src="/env.js"></script>`로 로드해주세요.

```javascript
window.__ENV__ = {
  firebaseConfig: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
    projectId: 'YOUR_FIREBASE_PROJECT_ID'
  },
  allowedDomain: 'hansung-sh.hs.kr',
  neisMealApiKey: 'YOUR_NEIS_MEAL_API_KEY',
  neisEventApiKey: 'YOUR_NEIS_EVENT_API_KEY'
};
```

## Vercel 환경 변수 등록

Vercel 대시보드 > 프로젝트 > Settings > Environment Variables 에 다음 키를 추가하세요 (환경별로 필요한 곳에 모두 입력).

| Key | 설명 |
| --- | --- |
| `FIREBASE_API_KEY` | Firebase Web API Key |
| `FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `FIREBASE_PROJECT_ID` | Firebase Project ID |
| `ALLOWED_LOGIN_DOMAIN` | 허용할 Google Workspace 도메인 (예: `hansung-sh.hs.kr`) |
| `NEIS_MEAL_API_KEY` | NEIS 급식 API 키 |
| `NEIS_EVENT_API_KEY` | NEIS 학사일정 API 키 |

모든 값을 저장한 뒤 다시 배포하면 `/api/config` 함수가 해당 값을 프론트엔드에 전달합니다.
