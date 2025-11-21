import Matter from 'matter-js';

export interface LetterPlugin {
  isInside: boolean;
  hasOverflowed: boolean;
  isSeparated: boolean;
  floatingPhase: boolean;
  customGravity?: number;
  overflowStartTime?: number;
  side?: 'left' | 'right';
  opacity?: number;
  floatPhaseX?: number;
  floatSpeedX?: number;
}

export class Letter {
  public body: Matter.Body;
  public char: string;

  constructor(char: string, x: number, y: number, fontSize: number, categoryInside: number, categoryFrame: number) {
    this.char = char;
    const charWidth = fontSize * 0.6;
    const charHeight = fontSize;

    this.body = Matter.Bodies.rectangle(x, y, charWidth, charHeight, {
      isStatic: true,
      render: {
        fillStyle: 'rgba(0, 0, 0, 0)',
        strokeStyle: 'rgba(0, 0, 0, 0)',
        lineWidth: 0,
      },
      friction: 0.8,
      restitution: 0.05,
      density: 0.002,
      frictionAir: 0.01,
      label: char,
      collisionFilter: {
        category: categoryInside,
        mask: categoryFrame | categoryInside,
      },
      plugin: {
        isInside: true,
        hasOverflowed: false,
        isSeparated: false,
        floatingPhase: false,
      } as LetterPlugin,
    });
  }
}
