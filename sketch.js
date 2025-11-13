// Matter.js 모듈 가져오기
const {
  Engine,
  Render,
  Runner,
  Bodies,
  Composite,
  Mouse,
  MouseConstraint,
  Events,
  Body,
} = Matter;

// 엔진 생성
const engine = Engine.create();
const world = engine.world;

// 캔버스 설정
let width = window.innerWidth;
let height = window.innerHeight;

// 렌더러 생성
const render = Render.create({
  element: document.getElementById("canvas-container"),
  engine: engine,
  options: {
    width: width,
    height: height,
    wireframes: false,
    background: "#ffffff",
  },
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// 전역 중력 비활성화 (개별 글자에 customGravity 적용)
engine.world.gravity.y = 0;

// 프레임 설정 (사다리꼴 형태)
let frameBottomWidth = 1800; // 바닥 너비 (넓음) - 슬라이더로 조절 가능
let frameTopWidth = 100; // 상단 너비 (좁음) - 플라스크 형태 - 슬라이더로 조절 가능
let frameHeight = 925; // 프레임 높이 - 슬라이더로 조절 가능
const frameBottomMargin = 0; // 화면 하단에서 떨어진 거리
const wallThickness = 0;

// 프레임 경계 계산 함수 (화면 크기 변경 시 재계산 가능)
function calculateFrameBounds() {
  const frameX = width / 2;
  const frameBottom = height - frameBottomMargin;
  const frameTop = frameBottom - frameHeight;
  const frameY = frameBottom - frameHeight / 2;
  const frameLeft = frameX - frameBottomWidth / 2;
  const frameRight = frameX + frameBottomWidth / 2;
  const frameTopLeft = frameX - frameTopWidth / 2;
  const frameTopRight = frameX + frameTopWidth / 2;

  return {
    frameX,
    frameBottom,
    frameTop,
    frameY,
    frameLeft,
    frameRight,
    frameTopLeft,
    frameTopRight,
  };
}

// 초기 프레임 경계
let frameBounds = calculateFrameBounds();
let frameX = frameBounds.frameX;
let frameBottom = frameBounds.frameBottom;
let frameTop = frameBounds.frameTop;
let frameY = frameBounds.frameY;
let frameLeft = frameBounds.frameLeft;
let frameRight = frameBounds.frameRight;
let frameTopLeft = frameBounds.frameTopLeft;
let frameTopRight = frameBounds.frameTopRight;

// 충돌 카테고리 정의
const CATEGORY_FRAME = 0x0001; // 프레임 (벽, 바닥)
const CATEGORY_INSIDE_TEXT = 0x0002; // 프레임 내부 글자
const CATEGORY_OVERFLOW_TEXT = 0x0004; // 넘친 글자

// 프레임 벽 생성 함수 (재사용 가능)
function createFrameWalls() {
  const frameTopLeft = frameX - frameTopWidth / 2;
  const frameTopRight = frameX + frameTopWidth / 2;

  const leftWallVertices = [
    { x: frameLeft, y: frameBottom },
    { x: frameLeft, y: frameBottom },
    { x: frameTopLeft, y: frameTop },
    { x: frameTopLeft, y: frameTop },
  ];

  const leftWall = Bodies.fromVertices(
    (frameLeft + frameTopLeft) / 2,
    frameY,
    leftWallVertices,
    {
      isStatic: true,
      render: { fillStyle: "#2a2a2a" },
      collisionFilter: {
        category: CATEGORY_FRAME,
        mask: CATEGORY_INSIDE_TEXT | CATEGORY_OVERFLOW_TEXT,
      },
      label: "leftWall",
    }
  );

  const rightWallVertices = [
    { x: frameRight, y: frameBottom },
    { x: frameRight, y: frameBottom },
    { x: frameTopRight, y: frameTop },
    { x: frameTopRight, y: frameTop },
  ];

  const rightWall = Bodies.fromVertices(
    (frameRight + frameTopRight) / 2,
    frameY,
    rightWallVertices,
    {
      isStatic: true,
      render: { fillStyle: "#2a2a2a" },
      collisionFilter: {
        category: CATEGORY_FRAME,
        mask: CATEGORY_INSIDE_TEXT | CATEGORY_OVERFLOW_TEXT,
      },
      label: "rightWall",
    }
  );

  return { leftWall, rightWall };
}

// 사다리꼴 프레임 생성 (바닥 + 좌우 기울어진 벽, 위는 열림)
// 바닥
let frameBottomWall = Bodies.rectangle(
  frameX,
  frameBottom - wallThickness / 2,
  frameBottomWidth,
  wallThickness,
  {
    isStatic: true,
    render: { fillStyle: "#2a2a2a" },
    collisionFilter: {
      category: CATEGORY_FRAME,
      mask: CATEGORY_INSIDE_TEXT | CATEGORY_OVERFLOW_TEXT,
    },
  }
);

// 초기 벽 생성
const walls = createFrameWalls();
let frameLeftWall = walls.leftWall;
let frameRightWall = walls.rightWall;

Composite.add(world, [frameBottomWall, frameLeftWall, frameRightWall]);

// 외부 바닥 (흘러내린 글자를 받음)
let outerGround = Bodies.rectangle(width / 2, height + 25, width, 50, {
  isStatic: true,
  render: { fillStyle: "#f0f0f0" },
  collisionFilter: {
    category: CATEGORY_FRAME,
    mask: CATEGORY_OVERFLOW_TEXT,
  },
});

Composite.add(world, outerGround);

// 마우스 제어 추가
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: { visible: false },
  },
  collisionFilter: {
    mask: CATEGORY_INSIDE_TEXT | CATEGORY_OVERFLOW_TEXT,
  },
});

Composite.add(world, mouseConstraint);
render.mouse = mouse;

// 텍스트 내용은 text.js에서 로드됨
// textContent 변수는 전역으로 사용 가능

// 텍스트 레이아웃 설정
let fontSize = 22; // 슬라이더로 조절 가능
let lineHeight = 28;
let letterSpacing = 22;
const padding = 20;
let framePadding = 30; // 프레임과 텍스트 사이 추가 여백 (양쪽 각각) - 슬라이더로 조절 가능

// 텍스트 영역 너비 계산 함수 (동적으로 재계산 가능)
function getTextWidth() {
  return {
    bottom: frameBottomWidth - framePadding * 2,
    top: frameTopWidth - framePadding * 2,
  };
}

// 현재 타이핑 위치
let currentCharIndex = 0;
let currentY = frameBottom - padding - fontSize / 2;

// currentY 위치에서의 실제 줄 너비를 계산하여 currentX 초기화
const textWidthInitial = getTextWidth();
const yRatioInitial = (frameBottom - currentY) / frameHeight;
const initialLineWidth =
  textWidthInitial.bottom -
  (textWidthInitial.bottom - textWidthInitial.top) * yRatioInitial;
let currentX = frameX - initialLineWidth / 2;

// 모든 글자 배열
let allLetters = [];

// 글자를 위로 밀어올리는 공통 함수 (X 좌표도 사다리꼴에 맞춰 수축)
function pushLettersUp(lines = 1) {
  const textWidth = getTextWidth();
  allLetters.forEach((letter) => {
    if (letter.plugin && !letter.plugin.hasOverflowed) {
      const oldY = letter.position.y;
      const newY = oldY - lineHeight * lines;

      const oldYRatio = (frameBottom - oldY) / frameHeight;
      const oldLineWidth =
        textWidth.bottom - (textWidth.bottom - textWidth.top) * oldYRatio;

      const newYRatio = (frameBottom - newY) / frameHeight;
      const newLineWidth =
        textWidth.bottom - (textWidth.bottom - textWidth.top) * newYRatio;

      const offsetFromCenter = letter.position.x - frameX;
      const widthRatio = newLineWidth / oldLineWidth;
      const newX = frameX + offsetFromCenter * widthRatio;

      Body.setPosition(letter, { x: newX, y: newY });
    }
  });
}

// 글자 생성 함수
function createLetter(char, x, y) {
  const charWidth = fontSize * 0.6;
  const charHeight = fontSize;

  const letter = Bodies.rectangle(x, y, charWidth, charHeight, {
    isStatic: true, // 프레임 내부에서는 정적
    render: {
      fillStyle: "rgba(0, 0, 0, 0)",
      strokeStyle: "rgba(0, 0, 0, 0)",
      lineWidth: 0,
    },
    friction: 0.8,
    restitution: 0.05,
    density: 0.002,
    frictionAir: 0.01,
    label: char,
    collisionFilter: {
      category: CATEGORY_INSIDE_TEXT,
      mask: CATEGORY_FRAME | CATEGORY_INSIDE_TEXT,
    },
    plugin: {
      isInside: true,
      hasOverflowed: false,
      isSeparated: false, // 1차 임계점 통과 여부
      floatingPhase: false, // 떠오르는 단계 여부
    },
  });

  return letter;
}

// 한 글자씩 추가하는 함수 (타이핑 방식) - 사다리꼴 대응
function addNextLetter() {
  if (currentCharIndex >= textContent.length) {
    // 마지막 문장 끝 - 공백으로 자연스럽게 밀어올리기 시작
    if (!isEndingPush) {
      isEndingPush = true;
      isSpawning = false; // 일반 타이핑 멈춤
      console.log("📝 마지막 문장 끝 - 5초마다 한 줄씩 천천히 떠오릅니다");

      // 5초(5000ms)마다 한 줄씩 밀어올리는 타이머 시작
      endingPushInterval = setInterval(() => {
        if (allLetters.length > 0) {
          pushLettersUp(1);
          console.log(`⬆️ 한 줄 올림 (남은 글자: ${allLetters.length}개)`);
        } else {
          // 모든 글자가 사라지면 타이머 정리
          clearInterval(endingPushInterval);
          endingPushInterval = null;
          console.log("✨ 모든 글자가 떠나갔습니다");
        }
      }, 1800);
    }
    return;
  }

  const char = textContent[currentCharIndex];
  currentCharIndex++;

  // 줄바꿈 문자는 건너뛰기
  if (char === "\n") {
    return;
  }

  // 현재 Y 위치에 따른 줄 너비 계산 (사다리꼴)
  const textWidth = getTextWidth();
  const yRatio = (frameBottom - currentY) / frameHeight;
  const currentLineWidth =
    textWidth.bottom - (textWidth.bottom - textWidth.top) * yRatio;
  const currentLineLeft = frameX - currentLineWidth / 2;
  const currentLineRight = frameX + currentLineWidth / 2;

  // 글자 너비 계산
  const charWidth = fontSize * 0.6;

  // 공백 처리
  if (char === " ") {
    currentX += letterSpacing * 0.7;
    if (currentX + charWidth / 2 > currentLineRight) {
      pushLettersUp(1);
      currentX = currentLineLeft;
    }
    return;
  }

  // 줄바꿈 체크
  if (currentX + charWidth / 2 > currentLineRight) {
    pushLettersUp(1);
    currentX = currentLineLeft;
  }

  const letter = createLetter(char, currentX, currentY);
  allLetters.push(letter);
  Composite.add(world, letter);

  currentX += letterSpacing;
}

// 자동 타이핑
let isSpawning = true;
let spawnSpeed = 65; // 65ms마다 한 글자 (타이핑 효과)
let isPaused = false; // 문단 사이 pause 상태
let isEndingPush = false; // 마지막 문장 후 공백으로 자연스럽게 밀어올리기
let endingPushInterval = null; // 마무리용 느린 타이머

function typeNextCharacter() {
  if (isSpawning && !isPaused) {
    // |||를 만나면 pause 모드 진입 + 두 줄 띄우기
    if (
      textContent.substring(currentCharIndex, currentCharIndex + 3) === "|||"
    ) {
      currentCharIndex += 3; // ||| 건너뛰기

      // 시각적으로 두 줄 띄우기
      pushLettersUp(2);

      // 타이핑 위치를 왼쪽으로 리셋
      const textWidth = getTextWidth();
      const yRatioReset = (frameBottom - currentY) / frameHeight;
      const resetLineWidth =
        textWidth.bottom - (textWidth.bottom - textWidth.top) * yRatioReset;
      currentX = frameX - resetLineWidth / 2;

      isPaused = true;

      // 2초 후 타이핑 재개
      setTimeout(() => {
        isPaused = false;
      }, 2000);
      return;
    }

    addNextLetter();
  }
}

let spawnInterval = setInterval(typeNextCharacter, spawnSpeed);

// 업데이트 루프: 프레임 상단을 넘은 글자 감지 및 페이드아웃
Events.on(engine, "beforeUpdate", () => {
  const bodies = Composite.allBodies(world);
  const bodiesToRemove = [];
  const currentTime = Date.now();

  // 1차 임계점 정의 (슬라이더로 조절)
  const threshold1 = frameTop + threshold1Distance;

  bodies.forEach((body) => {
    if (body.label && body.label.length > 0 && body.plugin) {
      // 1차 임계점: 임계점을 넘으면 무중력 시작 (글자수 제한 없음)
      if (
        body.plugin.isInside &&
        !body.plugin.isSeparated &&
        body.position.y < threshold1
      ) {
        body.plugin.isSeparated = true;

        // Static → Dynamic 전환 (물리 엔진 활성화)
        Body.setStatic(body, false);

        // 충돌 필터는 그대로 유지 - 벽과 계속 충돌하도록 (프레임 안에 머물기)
        // body.collisionFilter.category = CATEGORY_INSIDE_TEXT; (이미 설정됨)
        // body.collisionFilter.mask = CATEGORY_FRAME | CATEGORY_INSIDE_TEXT; (이미 설정됨)

        // 약간의 랜덤 위치 변화 (모래알처럼 흩어짐) - 거의 없음
        const randomOffsetX = (Math.random() - 0.5) * 0.2; // 거의 없음
        const randomOffsetY = (Math.random() - 0.5) * 0.1;

        Body.setPosition(body, {
          x: body.position.x + randomOffsetX,
          y: body.position.y + randomOffsetY,
        });

        // 약간의 각도 변화 - 거의 없음
        Body.setAngle(body, (Math.random() - 0.5) * 0.01);

        // 무중력으로 살짝 위로 떠오르는 속도 (천천히)
        const floatVelocityX = (Math.random() - 0.5) * 0.02; // 좌우 속도 거의 없음
        const floatVelocityY = -0.15 - Math.random() * 0.15; // -0.15 ~ -0.3 (천천히 위로)
        Body.setVelocity(body, {
          x: floatVelocityX,
          y: floatVelocityY,
        });

        // 공기 저항 높임 (천천히 떠오름)
        body.frictionAir = 0.08;

        // 무중력 상태 (슬라이더로 조절)
        body.plugin.customGravity = -floatSpeed; // 슬라이더 값 사용
        body.plugin.floatingPhase = true; // 떠오르는 단계

        // 회전 거의 없음
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.01);
      }

      // 2차 임계점: 오버플로우 - 벽 바깥으로 배치하고 흘러내리기 시작
      if (
        body.plugin.isInside &&
        !body.plugin.hasOverflowed &&
        body.plugin.floatingPhase
      ) {
        if (body.position.y < frameTop) {
          body.plugin.hasOverflowed = true;
          body.plugin.isInside = false;
          body.plugin.floatingPhase = false;
          body.plugin.overflowStartTime = currentTime;

          // 충돌 필터 변경 - 이제 오버플로우 글자로 취급, 프레임 벽과 충돌 (안으로 못 들어오게)
          body.collisionFilter.category = CATEGORY_OVERFLOW_TEXT;
          body.collisionFilter.mask = CATEGORY_FRAME | CATEGORY_OVERFLOW_TEXT;

          // 분출 시점에서 안/밖 판별 - 프레임 상단 기준
          const topYRatio = (frameBottom - frameTop) / frameHeight;
          const topFrameWidth =
            frameBottomWidth - (frameBottomWidth - frameTopWidth) * topYRatio;
          const topFrameLeft = frameX - topFrameWidth / 2;
          const topFrameRight = frameX + topFrameWidth / 2;

          // 좌우 균등 분산: 50% 확률로 랜덤 선택
          const goLeft = Math.random() < 0.5;

          let targetX;
          let wallAngle;

          if (goLeft) {
            // 왼쪽 벽 바깥으로 배치 (랜덤 오프셋 추가)
            const randomXOffset = Math.random() * 15 * spreadMultiplier; // 슬라이더로 조절 가능
            targetX = topFrameLeft - 3 - randomXOffset;
            body.plugin.side = "left";

            // 왼쪽 벽의 기울기 계산 (더 많은 랜덤성)
            const wallSlope =
              (frameTopLeft - frameLeft) / (frameTop - frameBottom);
            wallAngle =
              Math.atan(wallSlope) +
              (Math.random() - 0.5) * 0.4 * spreadMultiplier; // 슬라이더로 조절
          } else {
            // 오른쪽 벽 바깥으로 배치 (랜덤 오프셋 추가)
            const randomXOffset = Math.random() * 15 * spreadMultiplier; // 슬라이더로 조절 가능
            targetX = topFrameRight + 3 + randomXOffset;
            body.plugin.side = "right";

            // 오른쪽 벽의 기울기 계산 (더 많은 랜덤성)
            const wallSlope =
              (frameTopRight - frameRight) / (frameTop - frameBottom);
            wallAngle =
              Math.atan(wallSlope) +
              (Math.random() - 0.5) * 0.4 * spreadMultiplier; // 슬라이더로 조절
          }

          // 글자를 프레임 바깥으로 배치 (Y축에도 약간의 랜덤 추가)
          Body.setPosition(body, {
            x: targetX,
            y: body.position.y + (Math.random() - 0.5) * 5 * spreadMultiplier, // 슬라이더로 조절
          });

          // 글자의 각도를 벽의 기울기에 맞춤 (랜덤성 포함)
          Body.setAngle(body, wallAngle);

          // 현재 속도에 랜덤한 방향 추가 (퍼지는 효과)
          const currentVelocity = body.velocity;
          const randomVelocityX =
            (Math.random() - 0.5) * 0.4 * spreadMultiplier; // 슬라이더로 조절
          const randomVelocityY = Math.random() * 0.1 * spreadMultiplier; // 슬라이더로 조절

          Body.setVelocity(body, {
            x: currentVelocity.x * 0.3 + randomVelocityX, // 좌우 속도에 랜덤 추가
            y: Math.max(currentVelocity.y, 0) + 0.05 + randomVelocityY, // 아래로 + 랜덤
          });

          // 공기 저항 조절 (퍼짐 정도에 반비례)
          body.frictionAir = Math.max(0.05, 0.15 - spreadMultiplier * 0.03);

          // 중력 방향 전환 (이제 아래로)
          body.plugin.customGravity = 0.2;

          // 좌우로 흩날리는 불규칙한 움직임을 위한 파라미터
          body.plugin.floatPhaseX = Math.random() * Math.PI * 2; // 좌우 흔들림 위상
          body.plugin.floatSpeedX =
            0.5 + Math.random() * 2.0 * spreadMultiplier; // 슬라이더로 조절

          // 회전 속도에 더 많은 랜덤성 추가 (퍼지는 효과)
          Body.setAngularVelocity(
            body,
            (Math.random() - 0.5) * 0.08 * spreadMultiplier
          );
        }
      }

      // 떠오르는 단계 (1차 임계점 ~ 2차 임계점)
      if (body.plugin.floatingPhase && !body.plugin.hasOverflowed) {
        const floatForce =
          body.position.y < threshold1
            ? -0.00008
            : body.plugin.customGravity * 0.001;

        // 프레임 경계 체크 - 현재 Y 위치에서의 텍스트 영역 너비 계산
        const textWidth = getTextWidth();
        const currentYRatio = (frameBottom - body.position.y) / frameHeight;
        const currentTextWidth =
          textWidth.bottom - (textWidth.bottom - textWidth.top) * currentYRatio;
        const currentTextLeft = frameX - currentTextWidth / 2;
        const currentTextRight = frameX + currentTextWidth / 2;

        // 텍스트 영역 경계를 벗어나려 하면 강하게 안쪽으로 밀어내기
        let boundaryForceX = 0;
        const boundaryMargin = 10; // 경계에서 10px 이내면 힘 적용

        if (body.position.x < currentTextLeft + boundaryMargin) {
          // 왼쪽 경계 - 오른쪽으로 밀기
          const penetration =
            currentTextLeft + boundaryMargin - body.position.x;
          boundaryForceX = penetration * 0.0002; // 더 강하게
        } else if (body.position.x > currentTextRight - boundaryMargin) {
          // 오른쪽 경계 - 왼쪽으로 밀기
          const penetration =
            body.position.x - (currentTextRight - boundaryMargin);
          boundaryForceX = -penetration * 0.0002; // 더 강하게
        }

        Body.applyForce(body, body.position, {
          x: body.mass * boundaryForceX,
          y: body.mass * floatForce,
        });
      }

      // 오버플로우된 글자 페이드아웃 처리
      if (body.plugin.hasOverflowed && body.plugin.overflowStartTime) {
        const elapsed = currentTime - body.plugin.overflowStartTime;
        const floatDuration = 4000; // 4초간 흩날림 (투명해지기 전)
        const fadeOutDuration = 2000; // 그 후 2초에 걸쳐 페이드아웃

        // opacity 계산 - 4초 후부터 페이드 시작
        if (elapsed < floatDuration) {
          body.plugin.opacity = 1.0; // 완전 불투명 유지
        } else {
          const fadeElapsed = elapsed - floatDuration;
          body.plugin.opacity = Math.max(0, 1 - fadeElapsed / fadeOutDuration);
        }

        // 시간에 따라 중력을 점진적으로 증가 (용암처럼 점점 무거워짐)
        const gravityTransitionDuration = 4000; // 4초에 걸쳐 중력 증가
        if (elapsed < gravityTransitionDuration) {
          // 0.2 → 0.8으로 점진적 증가 (점점 빨리 흘러내림)
          const gravityProgress = elapsed / gravityTransitionDuration;
          body.plugin.customGravity = 0.2 + gravityProgress * 0.6;
        } else {
          body.plugin.customGravity = 0.8; // 최종적으로 아래로 흐름
        }

        // 프레임 경계 체크 - 배정된 쪽(side)의 바깥쪽 유지
        const currentYRatio = (frameBottom - body.position.y) / frameHeight;
        const currentFrameWidth =
          frameBottomWidth - (frameBottomWidth - frameTopWidth) * currentYRatio;
        const currentFrameLeft = frameX - currentFrameWidth / 2;
        const currentFrameRight = frameX + currentFrameWidth / 2;

        let boundaryForceX = 0;

        // 배정된 쪽의 벽 바깥에 유지
        if (body.plugin.side === "left") {
          // 왼쪽 벽 바깥에 있어야 함
          if (body.position.x > currentFrameLeft) {
            // 벽 안쪽으로 들어왔으면 강하게 밀어냄
            boundaryForceX = -0.001;
          }
        } else if (body.plugin.side === "right") {
          // 오른쪽 벽 바깥에 있어야 함
          if (body.position.x < currentFrameRight) {
            // 벽 안쪽으로 들어왔으면 강하게 밀어냄
            boundaryForceX = 0.001;
          }
        }

        // 시간에 따라 점차 퍼지는 효과
        const timeInSeconds = elapsed / 1000;
        const spreadProgress = Math.min(timeInSeconds / 3, 1); // 3초에 걸쳐 점차 퍼짐

        // 좌우로 흔들리는 불규칙한 힘 (시간에 따라 증가)
        let floatForceX =
          Math.sin(
            timeInSeconds * body.plugin.floatSpeedX + body.plugin.floatPhaseX
          ) *
          0.00008 *
          (1 + spreadProgress * 2); // 최대 3배까지 증가

        // 배정된 쪽으로 계속 흐르도록 약한 힘 추가 (시간에 따라 증가)
        if (body.plugin.side === "left") {
          floatForceX -= 0.00005 * (1 + spreadProgress * 3); // 왼쪽으로 점차 강하게
        } else if (body.plugin.side === "right") {
          floatForceX += 0.00005 * (1 + spreadProgress * 3); // 오른쪽으로 점차 강하게
        }

        // customGravity + 불규칙한 힘 + 경계 force 적용
        Body.applyForce(body, body.position, {
          x: body.mass * (floatForceX + boundaryForceX),
          y: body.mass * body.plugin.customGravity * 0.001,
        });

        // 완전히 투명해지면 삭제
        if (body.plugin.opacity <= 0) {
          bodiesToRemove.push(body);
        }
      }

      // 화면 밖으로 나가도 삭제
      if (body.plugin.hasOverflowed) {
        const isOutOfBounds =
          body.position.y > height + 200 ||
          body.position.x < -200 ||
          body.position.x > width + 200;

        if (isOutOfBounds) {
          bodiesToRemove.push(body);
        }
      }
    }
  });

  // 글자 제거
  bodiesToRemove.forEach((body) => {
    Composite.remove(world, body);
    // allLetters 배열에서도 제거
    const index = allLetters.indexOf(body);
    if (index > -1) {
      allLetters.splice(index, 1);
    }
  });
});

// 버튼 이벤트
document.getElementById("toggleSpawn").addEventListener("click", () => {
  isSpawning = !isSpawning;
  document.getElementById("toggleSpawn").textContent = isSpawning
    ? "⏸️ 생성 정지"
    : "▶️ 생성 시작";
});

document.getElementById("reset").addEventListener("click", () => {
  // 글자들만 제거 (벽은 제외)
  const allBodies = Composite.allBodies(world);
  allBodies.forEach((body) => {
    if (
      body.label &&
      body.label.length > 0 &&
      body.label !== "leftWall" &&
      body.label !== "rightWall"
    ) {
      Composite.remove(world, body);
    }
  });

  allLetters = [];
  currentCharIndex = 0;
  currentY = frameBottom - padding - fontSize / 2;

  const textWidth = getTextWidth();
  const yRatioReset = (frameBottom - currentY) / frameHeight;
  const resetLineWidth =
    textWidth.bottom - (textWidth.bottom - textWidth.top) * yRatioReset;
  currentX = frameX - resetLineWidth / 2;

  // 마지막 문장 상태 리셋
  isEndingPush = false;
  isSpawning = true;

  // 마무리 타이머가 있으면 정리
  if (endingPushInterval) {
    clearInterval(endingPushInterval);
    endingPushInterval = null;
  }

  document.getElementById("toggleSpawn").textContent = "⏸️ 생성 정지";
});

// 캔버스에 텍스트 렌더링 (페이드아웃 포함)
Events.on(render, "afterRender", () => {
  const context = render.context;
  const bodies = Composite.allBodies(world);

  context.font = `${fontSize}px Georgia, serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  bodies.forEach((body) => {
    if (
      body.label &&
      body.label.length > 0 &&
      body.label !== "Rectangle Body" &&
      body.label !== "leftWall" &&
      body.label !== "rightWall"
    ) {
      context.save();
      context.translate(body.position.x, body.position.y);
      context.rotate(body.angle);

      // 모든 글자 검은색 (opacity만 다름)
      if (body.plugin && body.plugin.hasOverflowed) {
        const opacity = body.plugin.opacity || 1;
        context.fillStyle = `rgba(26, 26, 26, ${opacity})`; // 검은색 + 페이드
      } else {
        context.fillStyle = "#1a1a1a"; // 검은색
      }
      context.fillText(body.label, 0, 0);

      context.restore();
    }
  });

  // 프레임 테두리 강조 (사다리꼴 - 상단 열림) - 조건부 렌더링
  if (showFrame) {
    context.strokeStyle = "#2a2a2a";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(frameLeft, frameBottom); // 좌하단
    context.lineTo(frameRight, frameBottom); // 우하단 (바닥선)
    context.lineTo(frameTopRight, frameTop); // 우상단 (우측벽)
    context.moveTo(frameTopLeft, frameTop); // 좌상단으로 이동 (선 안그음)
    context.lineTo(frameLeft, frameBottom); // 좌하단 (좌측벽)
    context.stroke();
  }
});

// 창 크기 조절 대응 (전체화면 포함)
window.addEventListener("resize", () => {
  const oldFrameBottom = frameBottom;
  const oldFrameX = frameX;

  // 새 화면 크기
  width = window.innerWidth;
  height = window.innerHeight;

  // 캔버스 크기 업데이트
  render.canvas.width = width;
  render.canvas.height = height;
  render.options.width = width;
  render.options.height = height;

  // 프레임 경계 재계산
  frameBounds = calculateFrameBounds();
  frameX = frameBounds.frameX;
  frameBottom = frameBounds.frameBottom;
  frameTop = frameBounds.frameTop;
  frameY = frameBounds.frameY;
  frameLeft = frameBounds.frameLeft;
  frameRight = frameBounds.frameRight;
  frameTopLeft = frameBounds.frameTopLeft;
  frameTopRight = frameBounds.frameTopRight;

  // 프레임 벽 재생성
  Composite.remove(world, [
    frameBottomWall,
    frameLeftWall,
    frameRightWall,
    outerGround,
  ]);

  const newFrameBottomWall = Bodies.rectangle(
    frameX,
    frameBottom,
    frameBottomWidth,
    wallThickness,
    {
      isStatic: true,
      render: { fillStyle: "#2a2a2a" },
      collisionFilter: {
        category: CATEGORY_FRAME,
        mask: CATEGORY_INSIDE_TEXT | CATEGORY_OVERFLOW_TEXT,
      },
    }
  );

  const newWalls = createFrameWalls();
  frameLeftWall = newWalls.leftWall;
  frameRightWall = newWalls.rightWall;

  const newOuterGround = Bodies.rectangle(width / 2, height + 25, width, 50, {
    isStatic: true,
    render: { fillStyle: "#f0f0f0" },
    collisionFilter: {
      category: CATEGORY_FRAME,
      mask: CATEGORY_OVERFLOW_TEXT,
    },
  });

  frameBottomWall = newFrameBottomWall;
  outerGround = newOuterGround;

  Composite.add(world, [
    frameBottomWall,
    frameLeftWall,
    frameRightWall,
    outerGround,
  ]);

  // 기존 글자들의 위치 조정 (Y축은 하단 기준으로, X축은 중앙 기준으로)
  const yOffset = frameBottom - oldFrameBottom;
  const xOffset = frameX - oldFrameX;

  allLetters.forEach((letter) => {
    if (letter.plugin && !letter.plugin.hasOverflowed) {
      Body.setPosition(letter, {
        x: letter.position.x + xOffset,
        y: letter.position.y + yOffset,
      });
    }
  });

  // 타이핑 위치 조정
  currentY += yOffset;
  currentX += xOffset;
});

console.log(
  "Text Overflow (Typing) initialized! 타이핑 방식으로 글이 써지고, 넘치면 흩어지며 사라집니다."
);

// 슬라이더 컨트롤 변수
let threshold1Distance = 130; // frameTop으로부터의 거리
let floatSpeed = 0.08; // 떠오르는 속도 (customGravity의 절대값)
let showFrame = false; // 프레임 표시 여부
let spreadMultiplier = 2.0; // 오버플로우 퍼짐 배율 (0.3-3.0)

// 슬라이더 이벤트 리스너
// 1. 입구 너비 (상단)
const topWidthSlider = document.getElementById("topWidthSlider");
const topWidthValue = document.getElementById("topWidthValue");
topWidthSlider.addEventListener("input", (e) => {
  frameTopWidth = parseInt(e.target.value);
  topWidthValue.textContent = frameTopWidth;

  // 프레임 벽 업데이트 (좌우 벽 재생성)
  Composite.remove(world, [frameLeftWall, frameRightWall]);

  const newWalls = createFrameWalls();
  frameLeftWall = newWalls.leftWall;
  frameRightWall = newWalls.rightWall;

  Composite.add(world, [frameLeftWall, frameRightWall]);
});

// 2. 바닥 너비
const bottomWidthSlider = document.getElementById("bottomWidthSlider");
const bottomWidthValue = document.getElementById("bottomWidthValue");
bottomWidthSlider.addEventListener("input", (e) => {
  frameBottomWidth = parseInt(e.target.value);
  bottomWidthValue.textContent = frameBottomWidth;

  // 프레임 경계 재계산
  const frameBounds = calculateFrameBounds();
  frameX = frameBounds.frameX;
  frameBottom = frameBounds.frameBottom;
  frameTop = frameBounds.frameTop;
  frameY = frameBounds.frameY;
  frameLeft = frameBounds.frameLeft;
  frameRight = frameBounds.frameRight;
  frameTopLeft = frameBounds.frameTopLeft;
  frameTopRight = frameBounds.frameTopRight;

  // 벽 재생성
  Composite.remove(world, [frameLeftWall, frameRightWall]);

  const newWalls = createFrameWalls();
  frameLeftWall = newWalls.leftWall;
  frameRightWall = newWalls.rightWall;

  Composite.add(world, [frameLeftWall, frameRightWall]);
});

// 3. 프레임 높이
const frameHeightSlider = document.getElementById("frameHeightSlider");
const frameHeightValue = document.getElementById("frameHeightValue");
frameHeightSlider.addEventListener("input", (e) => {
  frameHeight = parseInt(e.target.value);
  frameHeightValue.textContent = frameHeight;

  // 프레임 경계 재계산
  const frameBounds = calculateFrameBounds();
  frameX = frameBounds.frameX;
  frameBottom = frameBounds.frameBottom;
  frameTop = frameBounds.frameTop;
  frameY = frameBounds.frameY;
  frameLeft = frameBounds.frameLeft;
  frameRight = frameBounds.frameRight;
  frameTopLeft = frameBounds.frameTopLeft;
  frameTopRight = frameBounds.frameTopRight;

  // 벽 재생성
  Composite.remove(world, [frameLeftWall, frameRightWall]);

  const newWalls = createFrameWalls();
  frameLeftWall = newWalls.leftWall;
  frameRightWall = newWalls.rightWall;

  Composite.add(world, [frameLeftWall, frameRightWall]);
});

// 4. 1차 임계점 높이
const thresholdSlider = document.getElementById("thresholdSlider");
const thresholdValue = document.getElementById("thresholdValue");
thresholdSlider.addEventListener("input", (e) => {
  threshold1Distance = parseInt(e.target.value);
  thresholdValue.textContent = threshold1Distance;
});

// 5. 타이핑 속도
const typingSpeedSlider = document.getElementById("typingSpeedSlider");
const typingSpeedValue = document.getElementById("typingSpeedValue");
typingSpeedSlider.addEventListener("input", (e) => {
  spawnSpeed = parseInt(e.target.value);
  typingSpeedValue.textContent = spawnSpeed + "ms";

  // 인터벌 재설정
  clearInterval(spawnInterval);
  spawnInterval = setInterval(typeNextCharacter, spawnSpeed);
});

// 6. 떠오르는 속도
const floatSpeedSlider = document.getElementById("floatSpeedSlider");
const floatSpeedValue = document.getElementById("floatSpeedValue");
floatSpeedSlider.addEventListener("input", (e) => {
  floatSpeed = parseFloat(e.target.value);
  floatSpeedValue.textContent = floatSpeed.toFixed(2);
});

// 7. 프레임 패딩
const paddingSlider = document.getElementById("paddingSlider");
const paddingValue = document.getElementById("paddingValue");
paddingSlider.addEventListener("input", (e) => {
  framePadding = parseInt(e.target.value);
  paddingValue.textContent = framePadding;
});

// 8. 글자 크기
const fontSizeSlider = document.getElementById("fontSizeSlider");
const fontSizeValue = document.getElementById("fontSizeValue");
fontSizeSlider.addEventListener("input", (e) => {
  fontSize = parseInt(e.target.value);
  lineHeight = fontSize + 6;
  letterSpacing = fontSize;
  fontSizeValue.textContent = fontSize;
});

// 9. 오버플로우 퍼짐 정도
const spreadSlider = document.getElementById("spreadSlider");
const spreadValue = document.getElementById("spreadValue");
spreadSlider.addEventListener("input", (e) => {
  spreadMultiplier = parseFloat(e.target.value);
  spreadValue.textContent = spreadMultiplier.toFixed(1);
});

// 10. 프레임 표시/숨김
const showFrameCheckbox = document.getElementById("showFrameCheckbox");
showFrameCheckbox.addEventListener("change", (e) => {
  showFrame = e.target.checked;
});

// 11. 패널 최소화/펼치기 기능
const sliderPanel = document.querySelector(".slider-panel");
const minimizeButton = document.getElementById("minimizePanel");
const openPanelButton = document.getElementById("openPanelButton");

minimizeButton.addEventListener("click", () => {
  sliderPanel.classList.add("hidden");
  openPanelButton.classList.add("visible");
});

openPanelButton.addEventListener("click", () => {
  sliderPanel.classList.remove("hidden");
  openPanelButton.classList.remove("visible");
});

// 12. 키보드 P 버튼으로 생성 시작/정지
document.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") {
    // toggleSpawn 버튼과 같은 기능
    isSpawning = !isSpawning;
    document.getElementById("toggleSpawn").textContent = isSpawning
      ? "⏸️ 생성 정지"
      : "▶️ 생성 시작";
    console.log(isSpawning ? "▶️ 생성 시작" : "⏸️ 생성 정지");
  }
});
