import { PhysicsWorld } from '../core/PhysicsWorld';
import { TextManager } from '../core/TextManager';

export class UIManager {
  private world: PhysicsWorld;
  private textManager: TextManager;

  // Parameters controlled by UI
  public params = {
    threshold1: 130,
    floatSpeed: 0.08,
    spreadMultiplier: 2.0,
    showFrame: false,
  };

  constructor(world: PhysicsWorld, textManager: TextManager) {
    this.world = world;
    this.textManager = textManager;
    this.setupEventListeners();
    this.setupPanelToggle();
  }

  private setupEventListeners() {
    // Sliders
    this.bindSlider('topWidthSlider', 'topWidthValue', (val) => {
      this.world.frameTopWidth = val;
      this.world.updateBoundaries();
    });

    this.bindSlider('bottomWidthSlider', 'bottomWidthValue', (val) => {
      this.world.frameBottomWidth = val;
      this.world.updateBoundaries();
    });

    this.bindSlider('frameHeightSlider', 'frameHeightValue', (val) => {
      this.world.frameHeight = val;
      this.world.updateBoundaries();
    });

    this.bindSlider('thresholdSlider', 'thresholdValue', (val) => {
      this.params.threshold1 = val;
    });

    this.bindSlider('typingSpeedSlider', 'typingSpeedValue', (val) => {
      this.textManager.updateSpeed(val);
      return `${val}ms`;
    });

    this.bindSlider('floatSpeedSlider', 'floatSpeedValue', (val) => {
      this.params.floatSpeed = val;
    });

    this.bindSlider('paddingSlider', 'paddingValue', (val) => {
      this.textManager.framePadding = val;
    });

    this.bindSlider('fontSizeSlider', 'fontSizeValue', (val) => {
      this.textManager.fontSize = val;
      // Note: Changing font size dynamically might require recreating letters or complex scaling
      // For now, we just update the property for future letters
    });

    this.bindSlider('spreadSlider', 'spreadValue', (val) => {
      this.params.spreadMultiplier = val;
    });

    // Checkbox
    const showFrameCheckbox = document.getElementById('showFrameCheckbox') as HTMLInputElement;
    if (showFrameCheckbox) {
      showFrameCheckbox.addEventListener('change', (e) => {
        this.params.showFrame = (e.target as HTMLInputElement).checked;
      });
    }

    // Buttons
    const toggleSpawnBtn = document.getElementById('toggleSpawn');
    if (toggleSpawnBtn) {
      toggleSpawnBtn.addEventListener('click', () => {
        this.textManager.isSpawning = !this.textManager.isSpawning;
        toggleSpawnBtn.textContent = this.textManager.isSpawning ? '⏸️ 생성 정지' : '▶️ 생성 시작';
        if (this.textManager.isSpawning) {
            this.textManager.startTyping();
        } else {
            this.textManager.stopTyping();
        }
      });
    }

    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.textManager.reset();
        const toggleSpawnBtn = document.getElementById('toggleSpawn');
        if (toggleSpawnBtn) toggleSpawnBtn.textContent = '⏸️ 생성 정지';
      });
    }
  }

  private bindSlider(id: string, displayId: string, callback: (val: number) => void | string) {
    const slider = document.getElementById(id) as HTMLInputElement;
    const display = document.getElementById(displayId);

    if (slider && display) {
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        const displayVal = callback(val);
        display.textContent = displayVal ? displayVal.toString() : val.toString();
      });
    }
  }

  private setupPanelToggle() {
    const panel = document.querySelector('.slider-panel');
    const minimizeBtn = document.getElementById('minimizePanel');
    const openBtn = document.getElementById('openPanelButton');

    if (panel && minimizeBtn && openBtn) {
      minimizeBtn.addEventListener('click', () => {
        panel.classList.add('hidden');
        openBtn.classList.add('visible');
      });

      openBtn.addEventListener('click', () => {
        panel.classList.remove('hidden');
        openBtn.classList.remove('visible');
      });
    }
  }
}
