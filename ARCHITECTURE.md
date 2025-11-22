# Architecture Overview

이 프로젝트는 **Vite + TypeScript** 기반의 모듈형 아키텍처로 구성되어 있습니다.
기존의 단일 파일(`sketch.js`) 방식에서 벗어나, 역할과 책임(Separation of Concerns)에 따라 코드를 분리하여 유지보수성과 확장성을 높였습니다.

## 📂 Directory Structure

```
src/
├── core/           # 핵심 로직 (물리 엔진, 텍스트 관리)
├── objects/        # 게임 오브젝트 (글자, 벽 등)
├── ui/             # 사용자 인터페이스 (슬라이더, 버튼)
├── data/           # 정적 데이터 (텍스트 콘텐츠)
└── main.ts         # 진입점 (Entry Point)
```

---

## 🏗️ Core Modules

### 1. `src/main.ts` (Entry Point)
- **역할**: 애플리케이션의 시작점입니다.
- **기능**:
  - `PhysicsWorld`, `TextManager`, `UIManager` 인스턴스를 생성하고 연결합니다.
  - **메인 루프(Game Loop)**: `Matter.Events.on(engine, 'beforeUpdate')`를 통해 매 프레임마다 실행되는 로직(글자 넘침 감지, 페이드아웃 등)을 관리합니다.
  - 렌더링 루프에서 글자와 프레임을 그립니다.

### 2. `src/core/PhysicsWorld.ts`
- **역할**: Matter.js 물리 엔진을 캡슐화한 클래스입니다.
- **기능**:
  - `Matter.Engine`, `Matter.Render`, `Matter.Runner` 초기화.
  - **반응형 프레임**: 화면 크기(`resize` 이벤트)에 따라 사다리꼴 프레임(벽, 바닥)의 좌표를 다시 계산하고 재생성합니다.
  - **마우스 제어**: 마우스로 글자를 집어 던질 수 있는 `MouseConstraint`를 설정합니다.

### 3. `src/core/TextManager.ts`
- **역할**: 텍스트의 생성, 배치, 타이핑 효과를 담당합니다.
- **기능**:
  - **타이핑 로직**: `setInterval`을 사용하여 한 글자씩 생성합니다.
  - **레이아웃 계산**: 사다리꼴 형태에 맞춰 글자가 배치될 X, Y 좌표를 계산합니다.
  - **줄바꿈 및 밀어올리기**: 새 글자가 들어올 공간이 없으면 기존 글자들을 위로 밀어올립니다(`pushLettersUp`).
  - **일시정지(Pause)**: 텍스트 중간의 `|||` 마커를 감지하여 긴 호흡을 연출합니다.

---

## 🧩 Object Modules

### 4. `src/objects/Letter.ts`
- **역할**: 화면에 떨어지는 '글자' 하나를 나타내는 클래스입니다.
- **기능**:
  - `Matter.Bodies.rectangle`을 사용하여 물리 바디를 생성합니다.
  - **상태 관리(`plugin`)**: Matter.js 바디에 커스텀 데이터를 저장하여 상태를 추적합니다.
    - `isInside`: 프레임 안에 있는지 여부
    - `hasOverflowed`: 넘쳐흘렀는지 여부
    - `opacity`: 페이드아웃 투명도
    - `floatingPhase`: 무중력 상태 여부

---

## 🎨 UI & Data

### 5. `src/ui/UIManager.ts`
- **역할**: HTML DOM 요소(슬라이더, 버튼)와 TypeScript 로직을 연결합니다.
- **기능**:
  - 슬라이더 값을 변경하면 `PhysicsWorld`나 `TextManager`의 속성을 실시간으로 업데이트합니다.
  - "생성 정지", "리셋" 버튼의 이벤트를 처리합니다.

### 6. `src/data/text.ts`
- **역할**: 작품에 사용되는 긴 텍스트 데이터를 담고 있습니다.
- **기능**: TypeScript 모듈로 텍스트를 `export` 하여 다른 파일에서 쉽게 불러올 수 있게 합니다.

---

## 🔄 Data Flow (데이터 흐름)

1. **초기화**: `main.ts`가 실행되면서 World, Text, UI 매니저를 생성합니다.
2. **사용자 입력**: `UIManager`가 슬라이더 값을 받아 파라미터를 수정합니다.
3. **텍스트 생성**: `TextManager`가 주기적으로 `Letter` 객체를 생성하여 `PhysicsWorld`에 추가합니다.
4. **물리 연산**: Matter.js가 중력과 충돌을 계산합니다.
5. **상태 업데이트**: `main.ts`의 루프에서 글자가 프레임을 넘쳤는지 확인하고, 넘쳤다면 `Letter`의 상태를 변경(오버플로우, 페이드아웃)합니다.
6. **렌더링**: 변경된 위치와 투명도(Opacity)를 반영하여 캔버스에 그립니다.
