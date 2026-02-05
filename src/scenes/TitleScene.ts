import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
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
      this.scene.start('GameScene');
    });

    // Keyboard start
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      this.scene.start('GameScene');
    });

    // Animate title
    this.tweens.add({
      targets: [this.children.list[1], this.children.list[2]],
      y: '+=5',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
