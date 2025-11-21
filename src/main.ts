import Matter from 'matter-js';
import { PhysicsWorld } from './core/PhysicsWorld';
import { TextManager } from './core/TextManager';
import { UIManager } from './ui/UIManager';
import { LetterPlugin } from './objects/Letter';

// Initialize modules
const world = new PhysicsWorld('canvas-container');
const textManager = new TextManager(world);
const uiManager = new UIManager(world, textManager);

// Start physics engine
world.start();

// Start typing
textManager.startTyping();

// Main Update Loop
Matter.Events.on(world.engine, 'beforeUpdate', () => {
  const currentTime = Date.now();
  const { frameTop, frameBottom, frameX, frameTopLeft, frameLeft, frameTopRight, frameRight } = world.getFrameBounds();
  const { frameHeight, frameBottomWidth, frameTopWidth } = world;
  
  const threshold1 = frameTop + uiManager.params.threshold1;
  const spreadMultiplier = uiManager.params.spreadMultiplier;

  const letters = textManager.getLetters();
  const bodiesToRemove: Matter.Body[] = [];

  letters.forEach((body) => {
    const plugin = body.plugin as LetterPlugin;
    if (!plugin) return;

    // 1. Check Threshold 1 (Anti-gravity start)
    if (plugin.isInside && !plugin.isSeparated && body.position.y < threshold1) {
      plugin.isSeparated = true;
      Matter.Body.setStatic(body, false);

      // Random jitter
      const randomOffsetX = (Math.random() - 0.5) * 0.2;
      const randomOffsetY = (Math.random() - 0.5) * 0.1;
      Matter.Body.setPosition(body, {
        x: body.position.x + randomOffsetX,
        y: body.position.y + randomOffsetY,
      });

      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.01);

      // Float velocity
      const floatVelocityX = (Math.random() - 0.5) * 0.02;
      const floatVelocityY = -0.15 - Math.random() * 0.15;
      Matter.Body.setVelocity(body, { x: floatVelocityX, y: floatVelocityY });

      body.frictionAir = 0.08;
      plugin.customGravity = -uiManager.params.floatSpeed;
      plugin.floatingPhase = true;
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.01);
    }

    // 2. Check Threshold 2 (Overflow)
    if (plugin.isInside && !plugin.hasOverflowed && plugin.floatingPhase) {
      if (body.position.y < frameTop) {
        plugin.hasOverflowed = true;
        plugin.isInside = false;
        plugin.floatingPhase = false;
        plugin.overflowStartTime = currentTime;

        body.collisionFilter.category = PhysicsWorld.CATEGORY_OVERFLOW_TEXT;
        body.collisionFilter.mask = PhysicsWorld.CATEGORY_FRAME | PhysicsWorld.CATEGORY_OVERFLOW_TEXT;

        // Calculate overflow position
        const topYRatio = (frameBottom - frameTop) / frameHeight;
        const topFrameWidth = frameBottomWidth - (frameBottomWidth - frameTopWidth) * topYRatio;
        const topFrameLeft = frameX - topFrameWidth / 2;
        const topFrameRight = frameX + topFrameWidth / 2;

        const goLeft = Math.random() < 0.5;
        let targetX;
        let wallAngle;

        if (goLeft) {
          const randomXOffset = Math.random() * 15 * spreadMultiplier;
          targetX = topFrameLeft - 3 - randomXOffset;
          plugin.side = 'left';
          
          const wallSlope = (frameTopLeft - frameLeft) / (frameTop - frameBottom);
          wallAngle = Math.atan(wallSlope) + (Math.random() - 0.5) * 0.4 * spreadMultiplier;
        } else {
          const randomXOffset = Math.random() * 15 * spreadMultiplier;
          targetX = topFrameRight + 3 + randomXOffset;
          plugin.side = 'right';

          const wallSlope = (frameTopRight - frameRight) / (frameTop - frameBottom);
          wallAngle = Math.atan(wallSlope) + (Math.random() - 0.5) * 0.4 * spreadMultiplier;
        }

        Matter.Body.setPosition(body, {
          x: targetX,
          y: body.position.y + (Math.random() - 0.5) * 5 * spreadMultiplier,
        });

        Matter.Body.setAngle(body, wallAngle);

        const currentVelocity = body.velocity;
        const randomVelocityX = (Math.random() - 0.5) * 0.4 * spreadMultiplier;
        const randomVelocityY = Math.random() * 0.1 * spreadMultiplier;

        Matter.Body.setVelocity(body, {
          x: currentVelocity.x * 0.3 + randomVelocityX,
          y: Math.max(currentVelocity.y, 0) + 0.05 + randomVelocityY,
        });

        body.frictionAir = Math.max(0.05, 0.15 - spreadMultiplier * 0.03);
        plugin.customGravity = 0.2;
        plugin.floatPhaseX = Math.random() * Math.PI * 2;
        plugin.floatSpeedX = 0.5 + Math.random() * 2.0 * spreadMultiplier;
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08 * spreadMultiplier);
      }
    }

    // 3. Floating Phase Logic
    if (plugin.floatingPhase && !plugin.hasOverflowed) {
      const floatForce = body.position.y < threshold1 ? -0.00008 : (plugin.customGravity || 0) * 0.001;
      
      // Boundary check to keep inside trapezoid
      const textWidth = {
          bottom: world.frameBottomWidth - textManager.framePadding * 2,
          top: world.frameTopWidth - textManager.framePadding * 2
      };
      const currentYRatio = (frameBottom - body.position.y) / frameHeight;
      const currentTextWidth = textWidth.bottom - (textWidth.bottom - textWidth.top) * currentYRatio;
      const currentTextLeft = frameX - currentTextWidth / 2;
      const currentTextRight = frameX + currentTextWidth / 2;

      let boundaryForceX = 0;
      const boundaryMargin = 10;

      if (body.position.x < currentTextLeft + boundaryMargin) {
        const penetration = currentTextLeft + boundaryMargin - body.position.x;
        boundaryForceX = penetration * 0.0002;
      } else if (body.position.x > currentTextRight - boundaryMargin) {
        const penetration = body.position.x - (currentTextRight - boundaryMargin);
        boundaryForceX = -penetration * 0.0002;
      }

      Matter.Body.applyForce(body, body.position, {
        x: body.mass * boundaryForceX,
        y: body.mass * floatForce,
      });
    }

    // 4. Overflow Logic (Fading & Falling)
    if (plugin.hasOverflowed && plugin.overflowStartTime) {
      const elapsed = currentTime - plugin.overflowStartTime;
      const floatDuration = 4000;
      const fadeOutDuration = 2000;

      // Opacity
      if (elapsed < floatDuration) {
        plugin.opacity = 1.0;
      } else {
        const fadeElapsed = elapsed - floatDuration;
        plugin.opacity = Math.max(0, 1 - fadeElapsed / fadeOutDuration);
      }

      // Gravity transition
      const gravityTransitionDuration = 4000;
      if (elapsed < gravityTransitionDuration) {
        const gravityProgress = elapsed / gravityTransitionDuration;
        plugin.customGravity = 0.2 + gravityProgress * 0.6;
      } else {
        plugin.customGravity = 0.8;
      }

      // Boundary check (keep outside)
      const currentYRatio = (frameBottom - body.position.y) / frameHeight;
      const currentFrameWidth = frameBottomWidth - (frameBottomWidth - frameTopWidth) * currentYRatio;
      const currentFrameLeft = frameX - currentFrameWidth / 2;
      const currentFrameRight = frameX + currentFrameWidth / 2;

      let boundaryForceX = 0;

      if (plugin.side === 'left') {
        if (body.position.x > currentFrameLeft) {
          boundaryForceX = -0.001;
        }
      } else if (plugin.side === 'right') {
        if (body.position.x < currentFrameRight) {
          boundaryForceX = 0.001;
        }
      }

      // Spread effect
      const timeInSeconds = elapsed / 1000;
      const spreadProgress = Math.min(timeInSeconds / 3, 1);

      let floatForceX = Math.sin(timeInSeconds * (plugin.floatSpeedX || 1) + (plugin.floatPhaseX || 0)) * 0.00008 * (1 + spreadProgress * 2);

      if (plugin.side === 'left') {
        floatForceX -= 0.00005 * (1 + spreadProgress * 3);
      } else if (plugin.side === 'right') {
        floatForceX += 0.00005 * (1 + spreadProgress * 3);
      }

      Matter.Body.applyForce(body, body.position, {
        x: body.mass * (floatForceX + boundaryForceX),
        y: body.mass * (plugin.customGravity || 0) * 0.001,
      });

      if ((plugin.opacity || 0) <= 0) {
        bodiesToRemove.push(body);
      }
    }

    // 5. Out of bounds check
    if (plugin.hasOverflowed) {
      const isOutOfBounds = body.position.y > world.height + 200 || body.position.x < -200 || body.position.x > world.width + 200;
      if (isOutOfBounds) {
        bodiesToRemove.push(body);
      }
    }
  });

  // Remove bodies
  bodiesToRemove.forEach((body) => {
    textManager.removeLetter(body);
  });
});

// Custom Render Loop (for text and frame lines)
Matter.Events.on(world.render, 'afterRender', () => {
  const context = world.render.context;
  const letters = textManager.getLetters();

  context.font = `${textManager.fontSize}px Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  letters.forEach((body) => {
    const plugin = body.plugin as LetterPlugin;
    if (!plugin) return;

    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);

    if (plugin.hasOverflowed) {
      const opacity = plugin.opacity !== undefined ? plugin.opacity : 1;
      context.fillStyle = `rgba(26, 26, 26, ${opacity})`;
    } else {
      context.fillStyle = '#1a1a1a';
    }
    context.fillText(body.label, 0, 0);
    context.restore();
  });

  // Draw Frame Lines if enabled
  if (uiManager.params.showFrame) {
    const { frameLeft, frameBottom, frameRight, frameTopRight, frameTop, frameTopLeft } = world.getFrameBounds();
    context.strokeStyle = '#2a2a2a';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(frameLeft, frameBottom);
    context.lineTo(frameRight, frameBottom);
    context.lineTo(frameTopRight, frameTop);
    context.moveTo(frameTopLeft, frameTop);
    context.lineTo(frameLeft, frameBottom);
    context.stroke();
  }
});
