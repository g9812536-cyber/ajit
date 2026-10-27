# 아지트 — 채팅 · 음성 · 친구 · 서버 만들기

디스코드처럼 서버를 만들고, 채널에서 채팅하고, 음성채널에서 말하고, 친구와 1:1 메시지를 주고받는 사이트예요.

## 기능
- 회원가입 / 로그인 (아이디·비밀번호), 새로고침해도 로그인 유지
- 친구: 아이디로 친구 요청, 수락·거절, 온라인 표시, 1:1 메시지
- 서버: 만들기, 초대 코드로 참가, 친구 바로 초대, 나가기, 삭제(만든 사람만)
- 서버마다 채팅·음성 채널 추가
- 음성채널: 마이크 끄기, 소리 끄기, 말하는 사람 초록 테두리
- 안 읽은 채널 표시, 입력 중 표시, 폰 화면, 다크/라이트 자동

---

## A. 내 컴퓨터에서 먼저 해보기
1. https://nodejs.org 에서 LTS 버전 설치
2. 이 폴더(server.js가 있는 곳)에서 터미널 열기
   - 윈도우: 폴더 주소창에 `cmd` 입력 후 Enter
3. 아래 두 줄 입력
   ```
   npm install
   npm start
   ```
4. 브라우저에서 http://localhost:3000 접속 → 회원가입

이때는 이 폴더의 `data.json`에 저장돼요.

---

## B. 친구들이 링크로 들어오게 올리기 (무료)

준비물: GitHub 계정, Neon 계정, Render 계정 (셋 다 무료, GitHub로 가입하면 편해요)

### 1단계 — GitHub에 올리기
1. https://github.com 로그인 → 오른쪽 위 **+** → **New repository**
2. 이름에 `ajit` 입력, **Public**이든 **Private**이든 상관없음 → **Create repository**
3. 만들어진 페이지에서 **uploading an existing file** 링크 클릭
4. 압축 푼 `ajit` 폴더 **안의** 파일들(`server.js`, `package.json`, `package-lock.json`, `README.md`, `.gitignore`, `public` 폴더)을 끌어다 놓기
   - `node_modules` 폴더와 `data.json`은 올리지 마세요.
   - `.gitignore`는 숨김 파일이라 안 보이면 빼도 괜찮아요.
5. 아래 **Commit changes** 클릭

### 2단계 — 무료 데이터베이스 만들기 (계정·메시지 보관용)
Render 무료 서버는 15분 동안 아무도 안 쓰면 잠들고, 그때 서버 안의 파일이 지워져요.
그래서 데이터는 Neon이라는 무료 데이터베이스에 따로 저장해요.

1. https://neon.com 가입 → 새 프로젝트 만들기 (지역은 **Asia Pacific (Singapore)** 추천)
2. 대시보드에서 **Connect** 버튼 → 연결 주소(Connection string) 복사
   - `postgresql://...neon.tech/neondb?sslmode=require` 처럼 생긴 긴 주소예요.
   - 이 주소는 비밀번호가 들어 있으니 다른 사람에게 보여주지 마세요.

### 3단계 — Render에 배포하기
1. https://render.com 가입 (GitHub로 로그인)
2. **New +** → **Web Service** → 1단계에서 만든 `ajit` 저장소 선택
3. 설정
   - Name: 원하는 이름 (주소가 `https://이름.onrender.com`이 돼요)
   - Region: **Singapore**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
4. 아래 **Environment Variables** 에서 **Add Environment Variable**
   - Key: `DATABASE_URL`
   - Value: 2단계에서 복사한 주소
5. **Deploy Web Service** 클릭 → 2~3분 기다리면 "Live"가 떠요
6. 위에 나온 `https://이름.onrender.com` 주소를 친구들에게 보내면 끝!

친구들은 링크를 열고 회원가입만 하면 바로 들어와요. https 주소라 음성채널도 돼요.

### 무료라서 생기는 점
- 15분 동안 아무도 접속 안 하면 잠들어요. 다음 사람이 들어올 때 깨어나는 데 1분 정도 걸려요.
- 접속해 있는 동안은 안 잠들어요.

### 코드를 고친 뒤 다시 올리려면
GitHub 저장소에 바뀐 파일을 다시 올리면 Render가 알아서 새로 배포해요.

---

## 음성이 안 될 때
- 주소창 왼쪽 아이콘 → 마이크 **허용**
- 학교·기숙사 와이파이는 사람끼리 직접 연결을 막는 경우가 있어요. 한쪽이 휴대폰 데이터(핫스팟)로 접속하면 대부분 해결돼요.
- 그래도 안 되면 TURN 서버가 필요해요. `public/app.js` 맨 위 `ICE` 설정에 TURN 서버 주소를 추가하면 돼요.

## 파일 구조
```
server.js          서버 (계정, 친구, 서버, 메시지, 음성 연결 중계, 저장)
public/index.html  화면 구조
public/style.css   디자인
public/app.js      화면 동작 (채팅, 친구, 음성)
data.json          컴퓨터에서 실행할 때 저장 파일 (자동 생성)
```
