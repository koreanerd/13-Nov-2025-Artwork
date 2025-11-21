# Memory & Forgetting (Interactive Artwork)

> "기억은 고정되지 않는다. 그때 그렇게 중요했던 일도, 시간이 지나면 다 희미해진다."

This is an interactive generative artwork that visualizes the concept of memory and forgetting using physics simulations. Text falls into a container, stacks up, and eventually overflows and fades away, representing how our memories are reconstructed and eventually forgotten over time.

🔗 **Live Demo:** [https://reliable-pithivier-ef0a55.netlify.app/](https://reliable-pithivier-ef0a55.netlify.app/)

## Tech Stack

- **Language:** TypeScript
- **Build Tool:** Vite
- **Physics Engine:** Matter.js
- **Rendering:** HTML5 Canvas (via Matter.js Render)

## Features

- **Physics-based Typography:** Letters are physical bodies that stack and interact.
- **Overflow & Fading:** When the container fills up, letters spill out and fade away.
- **Interactive Controls:**
  - Adjust gravity and float speed
  - Change container dimensions
  - Control typing speed
  - Toggle frame visibility

## Project Structure

This project uses a modular architecture:

- `src/core/PhysicsWorld.ts`: Manages the physics engine and world boundaries.
- `src/core/TextManager.ts`: Handles text generation, typing effects, and layout.
- `src/objects/Letter.ts`: Encapsulates individual letter physics and behavior.
- `src/ui/UIManager.ts`: Handles user interface controls (sliders, buttons).
- `src/main.ts`: Application entry point.

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```
