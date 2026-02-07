import Phaser from 'phaser';
import { parseAnkiCSV, saveCustomDeck, loadCustomDeck, clearCustomDeck, hasCustomDeck } from '../utils/csvParser';

export class TitleScene extends Phaser.Scene {
  private useCustomDeck: boolean = false;
  private customDeckStatusText!: Phaser.GameObjects.Text;
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
    const deckY = height * 0.92;

    // Custom deck status text
    this.customDeckStatusText = this.add.text(width / 2, deckY - 25, '', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.updateDeckStatusText();

    // Upload CSV button
    const uploadButton = this.add.container(width / 2 - 70, deckY + 10);
    const uploadBg = this.add.graphics();
    uploadBg.fillStyle(0x0f3460, 1);
    uploadBg.fillRoundedRect(-55, -18, 110, 36, 8);
    const uploadText = this.add.text(0, 0, 'Upload CSV', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    uploadButton.add([uploadBg, uploadText]);
    uploadButton.setSize(110, 36);
    uploadButton.setInteractive({ useHandCursor: true });

    uploadButton.on('pointerover', () => {
      uploadBg.clear();
      uploadBg.fillStyle(0x1a4a7a, 1);
      uploadBg.fillRoundedRect(-55, -18, 110, 36, 8);
    });

    uploadButton.on('pointerout', () => {
      uploadBg.clear();
      uploadBg.fillStyle(0x0f3460, 1);
      uploadBg.fillRoundedRect(-55, -18, 110, 36, 8);
    });

    uploadButton.on('pointerdown', () => {
      this.fileInput.click();
    });

    // Clear deck button (only if custom deck exists)
    if (hasCustomDeck()) {
      const clearButton = this.add.container(width / 2 + 70, deckY + 10);
      const clearBg = this.add.graphics();
      clearBg.fillStyle(0x4a3030, 1);
      clearBg.fillRoundedRect(-55, -18, 110, 36, 8);
      const clearText = this.add.text(0, 0, 'Use HSK', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5);
      clearButton.add([clearBg, clearText]);
      clearButton.setSize(110, 36);
      clearButton.setInteractive({ useHandCursor: true });

      clearButton.on('pointerover', () => {
        clearBg.clear();
        clearBg.fillStyle(0x6a4040, 1);
        clearBg.fillRoundedRect(-55, -18, 110, 36, 8);
      });

      clearButton.on('pointerout', () => {
        clearBg.clear();
        clearBg.fillStyle(0x4a3030, 1);
        clearBg.fillRoundedRect(-55, -18, 110, 36, 8);
      });

      clearButton.on('pointerdown', () => {
        clearCustomDeck();
        this.useCustomDeck = false;
        this.scene.restart();
      });
    }
  }

  private updateDeckStatusText(): void {
    const customDeck = loadCustomDeck();
    if (customDeck && customDeck.length > 0) {
      this.customDeckStatusText.setText(`Custom Deck: ${customDeck.length} words`);
      this.customDeckStatusText.setColor('#00cc66');
    } else {
      this.customDeckStatusText.setText('Using HSK 1-6 vocabulary');
      this.customDeckStatusText.setColor('#888888');
    }
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
