import Phaser from 'phaser';
import { parseAnkiCSV, saveCustomDeck, loadCustomDeck, clearCustomDeck, hasCustomDeck } from '../utils/csvParser';

export class TitleScene extends Phaser.Scene {
  private useCustomDeck: boolean = false;
  private fileInput!: HTMLInputElement;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.useCustomDeck = hasCustomDeck();
    const { width, height } = this.cameras.main;

    // Background gradient effect
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e);
    graphics.fillRect(0, 0, width, height);

    // Title
    this.add.text(width / 2, height * 0.2, 'WORD', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Arial',
      color: '#e94560',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.28, 'RUNNER', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Arial',
      color: '#0f3460',
      stroke: '#e94560',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Chinese subtitle
    this.add.text(width / 2, height * 0.38, '汉语跑酷', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(width / 2, height * 0.5, 'Learn Chinese while you run!', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.55, 'Match English words with\ntheir Chinese translations', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#888888',
      align: 'center',
    }).setOrigin(0.5);

    // Controls info
    const controlsY = height * 0.68;
    this.add.text(width / 2, controlsY, 'Controls:', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, controlsY + 30, 'Mobile: Swipe Left/Up/Right', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(width / 2, controlsY + 50, 'Desktop: A/W/D or Arrow Keys', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.container(width / 2, height * 0.85);

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0xe94560, 1);
    buttonBg.fillRoundedRect(-100, -30, 200, 60, 15);

    const buttonText = this.add.text(0, 0, 'START', {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    startButton.add([buttonBg, buttonText]);
    startButton.setSize(200, 60);
    startButton.setInteractive({ useHandCursor: true });

    // Button hover effect
    startButton.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0xff6b6b, 1);
      buttonBg.fillRoundedRect(-100, -30, 200, 60, 15);
    });

    startButton.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0xe94560, 1);
      buttonBg.fillRoundedRect(-100, -30, 200, 60, 15);
    });

    startButton.on('pointerdown', () => {
      this.startGame();
    });

    // Keyboard start
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.startGame();
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      this.startGame();
    });

    // Custom deck section
    this.createCustomDeckUI();

    // Animate title
    this.tweens.add({
      targets: [this.children.list[1], this.children.list[2]],
      y: '+=5',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Create hidden file input
    this.createFileInput();
  }

  private startGame(): void {
    this.scene.start('GameScene', { useCustomDeck: this.useCustomDeck });
  }

  private createCustomDeckUI(): void {
    const { width, height } = this.cameras.main;
    const deckY = height * 0.94;

    const customDeck = loadCustomDeck();
    const hasCustom = customDeck && customDeck.length > 0;

    // Single button showing current deck with option to change
    const deckButton = this.add.container(width / 2, deckY);
    const deckBg = this.add.graphics();

    // Different colors based on deck type
    const bgColor = hasCustom ? 0x0f3460 : 0x2a2a3e;
    const hoverColor = hasCustom ? 0x1a4a7a : 0x3a3a4e;

    deckBg.fillStyle(bgColor, 1);
    deckBg.fillRoundedRect(-120, -22, 240, 44, 8);

    // Button text shows current deck info
    const buttonLabel = hasCustom
      ? `Custom: ${customDeck.length} words`
      : 'Deck: HSK 1-6';

    const deckText = this.add.text(hasCustom ? -15 : 0, 0, buttonLabel, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: hasCustom ? '#00cc66' : '#aaaaaa',
    }).setOrigin(0.5);

    deckButton.add([deckBg, deckText]);

    // Add change indicator
    const changeText = this.add.text(hasCustom ? 85 : 95, 0, '[change]', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#666666',
    }).setOrigin(0.5);
    deckButton.add(changeText);

    deckButton.setSize(240, 44);
    deckButton.setInteractive({ useHandCursor: true });

    deckButton.on('pointerover', () => {
      deckBg.clear();
      deckBg.fillStyle(hoverColor, 1);
      deckBg.fillRoundedRect(-120, -22, 240, 44, 8);
    });

    deckButton.on('pointerout', () => {
      deckBg.clear();
      deckBg.fillStyle(bgColor, 1);
      deckBg.fillRoundedRect(-120, -22, 240, 44, 8);
    });

    deckButton.on('pointerdown', () => {
      if (hasCustom) {
        // If custom deck exists, clear it and use HSK
        clearCustomDeck();
        this.useCustomDeck = false;
        this.scene.restart();
      } else {
        // If using HSK, allow upload of custom deck
        this.fileInput.click();
      }
    });
  }

  private createFileInput(): void {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.csv,.txt';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    this.fileInput.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.handleFileUpload(file);
      }
      // Reset input so same file can be selected again
      this.fileInput.value = '';
    });

    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      if (this.fileInput && this.fileInput.parentNode) {
        this.fileInput.parentNode.removeChild(this.fileInput);
      }
    });
  }

  private handleFileUpload(file: File): void {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        this.showError('Failed to read file');
        return;
      }

      const result = parseAnkiCSV(content);

      if (result.words.length === 0) {
        const errorMsg = result.errors.length > 0
          ? result.errors[0]
          : 'No valid words found in CSV';
        this.showError(errorMsg);
        return;
      }

      // Save the custom deck
      saveCustomDeck(result.words);
      this.useCustomDeck = true;

      // Show success and restart scene
      this.showSuccess(`Loaded ${result.words.length} words!`);

      // Restart scene to update UI
      this.time.delayedCall(1500, () => {
        this.scene.restart();
      });
    };

    reader.onerror = () => {
      this.showError('Failed to read file');
    };

    reader.readAsText(file);
  }

  private showError(message: string): void {
    const { width, height } = this.cameras.main;
    const errorText = this.add.text(width / 2, height / 2, message, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ff4444',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: errorText,
      alpha: 0,
      delay: 2500,
      duration: 500,
      onComplete: () => errorText.destroy(),
    });
  }

  private showSuccess(message: string): void {
    const { width, height } = this.cameras.main;
    const successText = this.add.text(width / 2, height / 2, message, {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#00cc66',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: successText,
      scale: 1.2,
      yoyo: true,
      duration: 300,
    });
  }
}
