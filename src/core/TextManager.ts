import Matter from 'matter-js';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { Letter, LetterPlugin } from '../objects/Letter';
import { textContent } from '../data/text';

export class TextManager {
  private world: PhysicsWorld;
  private letters: Matter.Body[] = [];
  private currentIndex: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  
  // Settings
  public fontSize: number;
  public lineHeight: number;
  public letterSpacing: number;
  public padding: number;
  public framePadding: number;
  
  // State
  public isSpawning: boolean = true;
  public isPaused: boolean = false;
  public isEndingPush: boolean = false;
  private endingPushInterval: number | null = null;
  private spawnInterval: number | null = null;
  public spawnSpeed: number = 65;

  constructor(world: PhysicsWorld) {
    this.world = world;
    
    const isMobile = window.innerWidth <= 768;
    this.fontSize = isMobile ? 16 : 22;
    this.lineHeight = isMobile ? 20 : 28;
    this.letterSpacing = isMobile ? 16 : 22;
    this.padding = isMobile ? 10 : 20;
    this.framePadding = isMobile ? 15 : 30;

    this.resetCursor();
  }

  private resetCursor() {
    const { frameBottom, frameX } = this.world.getFrameBounds();
    const frameHeight = this.world.frameHeight;
    this.currentY = frameBottom - this.padding - this.fontSize / 2;
    
    const textWidth = this.getTextWidth();
    const yRatio = (frameBottom - this.currentY) / frameHeight;
    const initialLineWidth = textWidth.bottom - (textWidth.bottom - textWidth.top) * yRatio;
    this.currentX = frameX - initialLineWidth / 2;
  }

  private getTextWidth() {
    return {
      bottom: this.world.frameBottomWidth - this.framePadding * 2,
      top: this.world.frameTopWidth - this.framePadding * 2,
    };
  }

  public startTyping() {
    if (this.spawnInterval) clearInterval(this.spawnInterval);
    this.spawnInterval = setInterval(() => this.typeNextCharacter(), this.spawnSpeed);
  }

  public stopTyping() {
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
  }

  public updateSpeed(speed: number) {
    this.spawnSpeed = speed;
    if (this.isSpawning && !this.isPaused) {
      this.startTyping();
    }
  }

  private typeNextCharacter() {
    if (!this.isSpawning || this.isPaused) return;

    // Check for pause marker "|||"
    if (textContent.substring(this.currentIndex, this.currentIndex + 3) === '|||') {
      this.currentIndex += 3;
      this.pushLettersUp(2);
      this.resetLine();
      this.isPaused = true;
      setTimeout(() => {
        this.isPaused = false;
      }, 2000);
      return;
    }

    this.addNextLetter();
  }

  private addNextLetter() {
    if (this.currentIndex >= textContent.length) {
      if (!this.isEndingPush) {
        this.isEndingPush = true;
        this.isSpawning = false;
        this.endingPushInterval = setInterval(() => {
          if (this.letters.length > 0) {
            this.pushLettersUp(1);
          } else {
            if (this.endingPushInterval) clearInterval(this.endingPushInterval);
          }
        }, 1800);
      }
      return;
    }

    const char = textContent[this.currentIndex];
    this.currentIndex++;

    if (char === '\n') return;

    const { frameBottom, frameX } = this.world.getFrameBounds();
    const frameHeight = this.world.frameHeight;
    const textWidth = this.getTextWidth();
    const yRatio = (frameBottom - this.currentY) / frameHeight;
    const currentLineWidth = textWidth.bottom - (textWidth.bottom - textWidth.top) * yRatio;
    const currentLineLeft = frameX - currentLineWidth / 2;
    const currentLineRight = frameX + currentLineWidth / 2;
    const charWidth = this.fontSize * 0.6;

    if (char === ' ') {
      this.currentX += this.letterSpacing * 0.7;
      if (this.currentX + charWidth / 2 > currentLineRight) {
        this.pushLettersUp(1);
        this.currentX = currentLineLeft;
      }
      return;
    }

    if (this.currentX + charWidth / 2 > currentLineRight) {
      this.pushLettersUp(1);
      this.currentX = currentLineLeft;
    }

    const letter = new Letter(
      char,
      this.currentX,
      this.currentY,
      this.fontSize,
      PhysicsWorld.CATEGORY_INSIDE_TEXT,
      PhysicsWorld.CATEGORY_FRAME
    );

    this.letters.push(letter.body);
    Matter.Composite.add(this.world.engine.world, letter.body);

    this.currentX += this.letterSpacing;
  }

  private resetLine() {
    const { frameBottom, frameX } = this.world.getFrameBounds();
    const frameHeight = this.world.frameHeight;
    const textWidth = this.getTextWidth();
    const yRatio = (frameBottom - this.currentY) / frameHeight;
    const resetLineWidth = textWidth.bottom - (textWidth.bottom - textWidth.top) * yRatio;
    this.currentX = frameX - resetLineWidth / 2;
  }

  private pushLettersUp(lines: number = 1) {
    const { frameBottom, frameX } = this.world.getFrameBounds();
    const frameHeight = this.world.frameHeight;
    const textWidth = this.getTextWidth();

    this.letters.forEach((body) => {
      const plugin = body.plugin as LetterPlugin;
      if (plugin && !plugin.hasOverflowed) {
        const oldY = body.position.y;
        const newY = oldY - this.lineHeight * lines;

        const oldYRatio = (frameBottom - oldY) / frameHeight;
        const oldLineWidth = textWidth.bottom - (textWidth.bottom - textWidth.top) * oldYRatio;

        const newYRatio = (frameBottom - newY) / frameHeight;
        const newLineWidth = textWidth.bottom - (textWidth.bottom - textWidth.top) * newYRatio;

        const offsetFromCenter = body.position.x - frameX;
        const widthRatio = newLineWidth / oldLineWidth;
        const newX = frameX + offsetFromCenter * widthRatio;

        Matter.Body.setPosition(body, { x: newX, y: newY });
      }
    });
  }

  public reset() {
    // Remove all letters
    this.letters.forEach(body => {
      Matter.Composite.remove(this.world.engine.world, body);
    });
    this.letters = [];
    this.currentIndex = 0;
    this.isEndingPush = false;
    this.isSpawning = true;
    
    if (this.endingPushInterval) {
      clearInterval(this.endingPushInterval);
      this.endingPushInterval = null;
    }

    this.resetCursor();
    this.startTyping();
  }

  public getLetters() {
    return this.letters;
  }

  public removeLetter(body: Matter.Body) {
    const index = this.letters.indexOf(body);
    if (index > -1) {
      this.letters.splice(index, 1);
      Matter.Composite.remove(this.world.engine.world, body);
    }
  }
}
