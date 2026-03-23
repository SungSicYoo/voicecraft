# VoiceCraft — 고품질 한국어 TTS

Microsoft Azure Neural TTS를 사용하는 한국어 텍스트 음성 변환 웹 서비스.  
Cloudflare Pages + Cloudflare Pages Functions 기반으로 백엔드 서버 없이 배포 가능합니다.

## 음성 품질

edge-tts Python 패키지와 **동일한 Microsoft Neural 음성** 사용  
(ko-KR-SunHiNeural, ko-KR-InJoonNeural 등)

---

## 1단계 — Azure TTS API 키 발급 (무료)

1. [Azure Portal](https://portal.azure.com) 접속 (Microsoft 계정 필요)
2. **리소스 만들기** → "Speech" 검색 → **Speech Services** 선택
3. 구독: Free (F0) 선택
   - 무료 한도: **월 500만 자**
4. 지역(Region): `koreacentral` 또는 `japaneast` 권장
5. 생성 완료 후 **키 및 엔드포인트** 메뉴에서 **키1** 복사

---

## 2단계 — GitHub에 코드 업로드

```
voicecraft/
├── index.html
├── functions/
│   └── api/
│       └── tts.js
└── README.md
```

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/voicecraft.git
git push -u origin main
```

---

## 3단계 — Cloudflare Pages 배포

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 로그인
2. **Workers & Pages** → **Create application** → **Pages** 탭
3. **Connect to Git** → GitHub 저장소 선택
4. 빌드 설정:
   - Framework preset: `None`
   - Build command: *(비워두기)*
   - Build output directory: `/` (루트)
5. **Save and Deploy** 클릭

---

## 4단계 — 환경 변수 설정

배포 완료 후:

1. Pages 프로젝트 → **Settings** → **Environment variables**
2. 다음 두 변수 추가:

| 변수명 | 값 | 예시 |
|---|---|---|
| `AZURE_TTS_KEY` | Azure 키1 값 | `abc123...` |
| `AZURE_REGION` | Azure 리전 코드 | `koreacentral` |

3. **Save** 후 **Deployments** → **Retry deployment** 클릭

---

## 사용 가능한 음성

| 음성 ID | 성별 | 특징 |
|---|---|---|
| ko-KR-SunHiNeural | 여성 | 명확하고 안정적 (기본값) |
| ko-KR-InJoonNeural | 남성 | 자연스럽고 따뜻한 톤 |
| ko-KR-BongJinNeural | 남성 | 차분한 내레이션 톤 |
| ko-KR-GookMinNeural | 남성 | 젊고 에너제틱 |
| ko-KR-JiMinNeural | 여성 | 밝고 친근한 톤 |
| ko-KR-SeoHyeonNeural | 여성 | 부드럽고 감성적 |
| ko-KR-SoonBokNeural | 여성 | 안정적인 성인 톤 |
| ko-KR-YuJinNeural | 여성 | 활발하고 또렷한 발음 |

---

## 로컬 테스트 (선택사항)

```bash
npm install -g wrangler
wrangler pages dev . --binding AZURE_TTS_KEY=your_key --binding AZURE_REGION=koreacentral
```

브라우저에서 `http://localhost:8788` 접속

---

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| "서버 설정 오류" | AZURE_TTS_KEY 미설정 | 4단계 환경 변수 확인 |
| "Azure TTS 오류 (401)" | API 키 오류 | Azure에서 키 재확인 |
| "Azure TTS 오류 (403)" | 리전 불일치 | AZURE_REGION 값 확인 |
| 함수가 실행 안 됨 | functions 폴더 위치 오류 | `functions/api/tts.js` 경로 확인 |
