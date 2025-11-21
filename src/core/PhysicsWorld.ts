import Matter from 'matter-js';

export class PhysicsWorld {
  public engine: Matter.Engine;
  public render: Matter.Render;
  public runner: Matter.Runner;
  public width: number;
  public height: number;

  // Frame properties
  public frameBottomWidth: number;
  public frameTopWidth: number;
  public frameHeight: number;
  public frameBottomMargin: number;
  public wallThickness: number = 0;

  // Frame bodies
  public frameBottomWall!: Matter.Body;
  public frameLeftWall!: Matter.Body;
  public frameRightWall!: Matter.Body;
  public outerGround!: Matter.Body;

  // Collision Categories
  public static readonly CATEGORY_FRAME = 0x0001;
  public static readonly CATEGORY_INSIDE_TEXT = 0x0002;
  public static readonly CATEGORY_OVERFLOW_TEXT = 0x0004;

  constructor(containerId: string) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Initialize Engine
    this.engine = Matter.Engine.create();
    this.engine.world.gravity.y = 0; // Custom gravity for letters

    // Initialize Render
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);

    this.render = Matter.Render.create({
      element: container,
      engine: this.engine,
      options: {
        width: this.width,
        height: this.height,
        wireframes: false,
        background: '#ffffff',
      },
    });

    // Initialize Runner
    this.runner = Matter.Runner.create();

    // Initial Frame Settings (Mobile responsive)
    const isMobile = this.width <= 768;
    this.frameBottomWidth = isMobile ? Math.min(this.width * 0.85, 500) : 1800;
    this.frameTopWidth = isMobile ? 50 : 100;
    this.frameHeight = isMobile ? Math.min(this.height * 0.7, 600) : 925;
    this.frameBottomMargin = isMobile ? 30 : 0;

    this.createBoundaries();
    this.setupMouseControl();
    this.setupResizeHandler();
  }

  public start() {
    Matter.Render.run(this.render);
    Matter.Runner.run(this.runner, this.engine);
  }

  private createBoundaries() {
    const { frameX, frameBottom, frameTop, frameY, frameLeft, frameRight, frameTopLeft, frameTopRight } = this.calculateFrameBounds();

    // Bottom Wall
    this.frameBottomWall = Matter.Bodies.rectangle(
      frameX,
      frameBottom - this.wallThickness / 2,
      this.frameBottomWidth,
      this.wallThickness,
      {
        isStatic: true,
        render: { fillStyle: '#2a2a2a' },
        collisionFilter: {
          category: PhysicsWorld.CATEGORY_FRAME,
          mask: PhysicsWorld.CATEGORY_INSIDE_TEXT | PhysicsWorld.CATEGORY_OVERFLOW_TEXT,
        },
      }
    );

    // Left Wall
    const leftWallVertices = [
      { x: frameLeft, y: frameBottom },
      { x: frameLeft, y: frameBottom },
      { x: frameTopLeft, y: frameTop },
      { x: frameTopLeft, y: frameTop },
    ];

    this.frameLeftWall = Matter.Bodies.fromVertices(
      (frameLeft + frameTopLeft) / 2,
      frameY,
      [leftWallVertices], // Matter.js expects array of arrays for vertices
      {
        isStatic: true,
        render: { fillStyle: '#2a2a2a' },
        collisionFilter: {
          category: PhysicsWorld.CATEGORY_FRAME,
          mask: PhysicsWorld.CATEGORY_INSIDE_TEXT | PhysicsWorld.CATEGORY_OVERFLOW_TEXT,
        },
        label: 'leftWall',
      },
      true // flag for internal decomposition if needed
    );

    // Right Wall
    const rightWallVertices = [
      { x: frameRight, y: frameBottom },
      { x: frameRight, y: frameBottom },
      { x: frameTopRight, y: frameTop },
      { x: frameTopRight, y: frameTop },
    ];

    this.frameRightWall = Matter.Bodies.fromVertices(
      (frameRight + frameTopRight) / 2,
      frameY,
      [rightWallVertices],
      {
        isStatic: true,
        render: { fillStyle: '#2a2a2a' },
        collisionFilter: {
          category: PhysicsWorld.CATEGORY_FRAME,
          mask: PhysicsWorld.CATEGORY_INSIDE_TEXT | PhysicsWorld.CATEGORY_OVERFLOW_TEXT,
        },
        label: 'rightWall',
      },
      true
    );

    // Outer Ground (catch overflow)
    this.outerGround = Matter.Bodies.rectangle(this.width / 2, this.height + 25, this.width, 50, {
      isStatic: true,
      render: { fillStyle: '#f0f0f0' },
      collisionFilter: {
        category: PhysicsWorld.CATEGORY_FRAME,
        mask: PhysicsWorld.CATEGORY_OVERFLOW_TEXT,
      },
    });

    Matter.Composite.add(this.engine.world, [
      this.frameBottomWall,
      this.frameLeftWall,
      this.frameRightWall,
      this.outerGround,
    ]);
  }

  public updateBoundaries() {
    // Remove old walls
    Matter.Composite.remove(this.engine.world, [
      this.frameBottomWall,
      this.frameLeftWall,
      this.frameRightWall,
      this.outerGround,
    ]);

    // Re-create walls with new dimensions
    this.createBoundaries();
  }

  private calculateFrameBounds() {
    const frameX = this.width / 2;
    const frameBottom = this.height - this.frameBottomMargin;
    const frameTop = frameBottom - this.frameHeight;
    const frameY = frameBottom - this.frameHeight / 2;
    const frameLeft = frameX - this.frameBottomWidth / 2;
    const frameRight = frameX + this.frameBottomWidth / 2;
    const frameTopLeft = frameX - this.frameTopWidth / 2;
    const frameTopRight = frameX + this.frameTopWidth / 2;

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

  private setupMouseControl() {
    const mouse = Matter.Mouse.create(this.render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(this.engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
      collisionFilter: {
        mask: PhysicsWorld.CATEGORY_INSIDE_TEXT | PhysicsWorld.CATEGORY_OVERFLOW_TEXT,
      },
    });

    Matter.Composite.add(this.engine.world, mouseConstraint);
    this.render.mouse = mouse;
  }

  private setupResizeHandler() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.render.canvas.width = this.width;
      this.render.canvas.height = this.height;
      this.render.options.width = this.width;
      this.render.options.height = this.height;

      this.updateBoundaries();
    });
  }

  // Helper to get current frame bounds for other modules
  public getFrameBounds() {
    return this.calculateFrameBounds();
  }
}
