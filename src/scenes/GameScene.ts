import Phaser from 'phaser';
import type { Lane, GameStats } from '../types';
import { WordManager, type WordQuestion } from '../systems/WordManager';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DifficultySystem } from '../systems/DifficultySystem';
import { soundManager } from '../audio/SoundManager';

// Layout constants
const GATE_START_Y = 180; // Gates appear just below English word
const PLAYER_Y = 620; // Player position (moved up from bottom)
const VANISHING_POINT_X = 240;

// Track scaling
const TRACK_WIDTH_START = 80; // Width at spawn point
const TRACK_WIDTH_END = 420; // Width at player

// Timing
const GATE_TRAVEL_TIME = 6000; // 6 seconds to reach player
const GATE_SPACING_TIME = 6500; // Time between gate spawns (ms)

// Get lane X position based on progress (0 = top, 1 = player)
const getLaneX = (lane: Lane, progress: number): number => {
  const trackWidth = TRACK_WIDTH_START + (TRACK_WIDTH_END - TRACK_WIDTH_START) * progress;
  const laneOffset = trackWidth / 3;

  switch (lane) {
    case 'left': return VANISHING_POINT_X - laneOffset;
    case 'center': return VANISHING_POINT_X;
    case 'right': return VANISHING_POINT_X + laneOffset;
  }
};

interface Gate3D {
  container: Phaser.GameObjects.Container;
  progress: number; // 0 = just spawned at top, 1 = at player
  question: WordQuestion;
  processed: boolean;
  spawnTime: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerShadow!: Phaser.GameObjects.Graphics;
  private currentLane: Lane = 'center';
  private isMoving: boolean = false;

  private wordManager!: WordManager;
  private scoreSystem!: ScoreSystem;
  private difficultySystem!: DifficultySystem;

  private distance: number = 0;
  private lives: number = 3;
  private gameSpeed: number = 1;

  private questionStartTime: number = 0;
  private gates3D: Gate3D[] = [];
  private lastGateSpawnTime: number = 0;

  private trackGraphics!: Phaser.GameObjects.Graphics;

  // UI Elements
  private scoreText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private hskText!: Phaser.GameObjects.Text;
  private livesContainer!: Phaser.GameObjects.Container;
  private englishWordText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;

  // Input
  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  private isSwiping: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.resetGameState();
    this.createBackground();
    this.createTrack();
    this.createPlayer();
    this.createUI();
    this.setupInput();
    this.spawnGate();
  }

  private resetGameState(): void {
    this.wordManager = new WordManager();
    this.scoreSystem = new ScoreSystem();
    this.difficultySystem = new DifficultySystem();

    this.difficultySystem.setLevelChangeCallback((newLevel) => {
      soundManager.play('levelUp');
      this.showLevelUpNotification(newLevel);
    });

    this.distance = 0;
    this.lives = 3;
    this.gameSpeed = 1;
    this.currentLane = 'center';
    this.gates3D = [];
    this.lastGateSpawnTime = 0;
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    const bg = this.add.graphics();

    // Dark gradient background
    bg.fillGradientStyle(0x0a0510, 0x0a0510, 0x15102a, 0x15102a);
    bg.fillRect(0, 0, width, height);

    // Distant mountains/temple silhouette
    bg.fillStyle(0x12081a, 0.9);
    bg.fillTriangle(40, GATE_START_Y + 20, 120, GATE_START_Y - 30, 200, GATE_START_Y + 20);
    bg.fillTriangle(180, GATE_START_Y + 20, 250, GATE_START_Y - 20, 320, GATE_START_Y + 20);
    bg.fillTriangle(280, GATE_START_Y + 20, 360, GATE_START_Y - 35, 440, GATE_START_Y + 20);
  }

  private createTrack(): void {
    this.trackGraphics = this.add.graphics();
    this.drawTrack();
  }

  private drawTrack(): void {
    this.trackGraphics.clear();

    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const p1 = i / steps;
      const p2 = (i + 1) / steps;

      const y1 = GATE_START_Y + (PLAYER_Y - GATE_START_Y) * p1;
      const y2 = GATE_START_Y + (PLAYER_Y - GATE_START_Y) * p2;

      const w1 = TRACK_WIDTH_START + (TRACK_WIDTH_END - TRACK_WIDTH_START) * p1;
      const w2 = TRACK_WIDTH_START + (TRACK_WIDTH_END - TRACK_WIDTH_START) * p2;

      // Track surface with depth shading
      const brightness = Math.floor(30 + 25 * p1);
      const trackColor = (brightness << 16) | ((brightness + 8) << 8) | (brightness - 5);

      this.trackGraphics.fillStyle(trackColor, 1);
      this.trackGraphics.beginPath();
      this.trackGraphics.moveTo(VANISHING_POINT_X - w1 / 2, y1);
      this.trackGraphics.lineTo(VANISHING_POINT_X + w1 / 2, y1);
      this.trackGraphics.lineTo(VANISHING_POINT_X + w2 / 2, y2);
      this.trackGraphics.lineTo(VANISHING_POINT_X - w2 / 2, y2);
      this.trackGraphics.closePath();
      this.trackGraphics.fillPath();

      // Horizontal lines for depth
      if (i % 4 === 0) {
        this.trackGraphics.lineStyle(1 + p1 * 2, 0x1a1520, 0.5);
        this.trackGraphics.lineBetween(VANISHING_POINT_X - w1 / 2, y1, VANISHING_POINT_X + w1 / 2, y1);
      }

      // Lane dividers
      if (p1 > 0.1) {
        this.trackGraphics.lineStyle(1 + p1, 0x2a2030, 0.4);
        const laneW = w1 / 3;
        this.trackGraphics.lineBetween(VANISHING_POINT_X - laneW / 2, y1, VANISHING_POINT_X - laneW / 2, y2);
        this.trackGraphics.lineBetween(VANISHING_POINT_X + laneW / 2, y1, VANISHING_POINT_X + laneW / 2, y2);
      }
    }

    // Track edges with gold trim
    this.trackGraphics.lineStyle(3, 0xc9a227, 0.8);
    this.trackGraphics.lineBetween(
      VANISHING_POINT_X - TRACK_WIDTH_START / 2, GATE_START_Y,
      VANISHING_POINT_X - TRACK_WIDTH_END / 2, PLAYER_Y + 80
    );
    this.trackGraphics.lineBetween(
      VANISHING_POINT_X + TRACK_WIDTH_START / 2, GATE_START_Y,
      VANISHING_POINT_X + TRACK_WIDTH_END / 2, PLAYER_Y + 80
    );
  }

  private createPlayer(): void {
    const playerX = getLaneX('center', 1);

    this.playerShadow = this.add.graphics();
    this.playerShadow.fillStyle(0x000000, 0.4);
    this.playerShadow.fillEllipse(playerX, PLAYER_Y + 45, 50, 15);

    this.player = this.add.container(playerX, PLAYER_Y);

    const body = this.add.graphics();

    // Simple back view runner (no facial features)
    // Legs
    body.fillStyle(0x2a3a4a, 1);
    body.fillRoundedRect(-14, 15, 10, 35, 4);
    body.fillRoundedRect(4, 15, 10, 35, 4);

    // Torso
    body.fillStyle(0xc04040, 1);
    body.fillRoundedRect(-18, -22, 36, 42, 6);

    // Back fold
    body.fillStyle(0xa03030, 1);
    body.fillRect(-2, -18, 4, 35);

    // Arms (sleeves)
    body.fillStyle(0xc04040, 1);
    body.fillRoundedRect(-26, -18, 10, 30, 4);
    body.fillRoundedRect(16, -18, 10, 30, 4);

    // Head - just hair
    body.fillStyle(0x2a1a0a, 1);
    body.fillCircle(0, -38, 18);
    body.fillEllipse(0, -45, 20, 14);

    this.player.add(body);
    this.player.setScale(0.85);

    // Running bob
    this.tweens.add({
      targets: this.player,
      y: PLAYER_Y - 6,
      duration: 140,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updatePlayerShadow(): void {
    this.playerShadow.clear();
    this.playerShadow.fillStyle(0x000000, 0.4);
    this.playerShadow.fillEllipse(this.player.x, PLAYER_Y + 45, 50, 15);
  }

  private createUI(): void {
    const { width } = this.cameras.main;

    // Top bar (opaque)
    const topBar = this.add.graphics();
    topBar.fillStyle(0x0a0510, 1);
    topBar.fillRect(0, 0, width, 65);
    topBar.lineStyle(2, 0xc9a227, 0.7);
    topBar.lineBetween(0, 65, width, 65);

    // Lives
    this.livesContainer = this.add.container(20, 32);
    this.updateLivesDisplay();

    // Score
    this.scoreText = this.add.text(width - 20, 15, '0', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#c9a227',
    }).setOrigin(1, 0);

    this.add.text(width - 20, 48, 'SCORE', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(1, 0);

    // Streak
    this.streakText = this.add.text(width / 2, 52, '', {
      fontSize: '14px',
      fontFamily: 'Arial Black',
      color: '#ff6600',
    }).setOrigin(0.5);

    // English word prompt
    const promptBg = this.add.graphics();
    promptBg.fillStyle(0x0a0510, 1);
    promptBg.fillRoundedRect(width / 2 - 160, 75, 320, 65, 10);
    promptBg.lineStyle(3, 0xc9a227, 0.9);
    promptBg.strokeRoundedRect(width / 2 - 160, 75, 320, 65, 10);

    this.englishWordText = this.add.text(width / 2, 107, '', {
      fontSize: '36px',
      fontFamily: 'Georgia, serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Bottom bar (OPAQUE - not transparent)
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(0x0a0510, 1); // Fully opaque
    bottomBar.fillRect(0, 720, width, 80); // Extended height
    bottomBar.lineStyle(2, 0xc9a227, 0.7);
    bottomBar.lineBetween(0, 720, width, 720);

    this.hskText = this.add.text(20, 740, 'HSK 1', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#c9a227',
    });

    this.distanceText = this.add.text(width - 20, 740, '0m', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(1, 0);
  }

  private updateLivesDisplay(): void {
    this.livesContainer.removeAll(true);

    for (let i = 0; i < 3; i++) {
      const heart = this.add.graphics();
      heart.fillStyle(i < this.lives ? 0xc04040 : 0x3a3a3a, 1);
      const hx = i * 40;
      heart.fillCircle(hx + 10, 0, 12);
      heart.fillCircle(hx + 26, 0, 12);
      heart.fillTriangle(hx, 4, hx + 36, 4, hx + 18, 26);
      this.livesContainer.add(heart);
    }
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-A', () => this.moveToLane('left'));
    this.input.keyboard?.on('keydown-LEFT', () => this.moveToLane('left'));
    this.input.keyboard?.on('keydown-W', () => this.moveToLane('center'));
    this.input.keyboard?.on('keydown-UP', () => this.moveToLane('center'));
    this.input.keyboard?.on('keydown-D', () => this.moveToLane('right'));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveToLane('right'));

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
      this.isSwiping = true;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isSwiping) return;
      this.isSwiping = false;

      const deltaX = pointer.x - this.swipeStartX;
      const deltaY = pointer.y - this.swipeStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < -40) this.moveToLane('left');
        else if (deltaX > 40) this.moveToLane('right');
      } else if (deltaY < -40) {
        this.moveToLane('center');
      }
    });
  }

  private moveToLane(lane: Lane): void {
    if (this.isMoving) return;
    this.currentLane = lane;
    this.isMoving = true;
    soundManager.play('whoosh');

    const targetX = getLaneX(lane, 1);

    this.tweens.add({
      targets: this.player,
      x: targetX,
      duration: 120,
      ease: 'Power2',
      onComplete: () => { this.isMoving = false; },
    });
  }

  private spawnGate(): void {
    const settings = this.difficultySystem.getCurrentSettings();
    const question = this.wordManager.generateQuestion(settings.hskLevel);

    if (this.gates3D.length === 0) {
      this.questionStartTime = this.time.now;
      this.englishWordText.setText(question.correctWord.english);
    }

    const gate: Gate3D = {
      container: this.add.container(VANISHING_POINT_X, GATE_START_Y),
      progress: 0,
      question: question,
      processed: false,
      spawnTime: this.time.now,
    };

    this.gates3D.push(gate);
    this.lastGateSpawnTime = this.time.now;
  }

  private renderGate(gate: Gate3D): void {
    gate.container.removeAll(true);

    const p = gate.progress;
    const y = GATE_START_Y + (PLAYER_Y - GATE_START_Y) * p;

    // Scale: start at 0.4 (readable), grow to 1.0
    const scale = 0.4 + 0.6 * p;

    // Alpha: fade in quickly, stay visible
    const alpha = Math.min(1, p * 5 + 0.3);

    gate.container.setPosition(VANISHING_POINT_X, y);
    gate.container.setScale(scale);
    gate.container.setAlpha(alpha);
    gate.container.setDepth(100 + Math.floor(p * 100));

    const trackWidth = TRACK_WIDTH_START + (TRACK_WIDTH_END - TRACK_WIDTH_START) * p;
    const gateWidth = trackWidth / scale;
    const gateHeight = 100;

    const gfx = this.add.graphics();

    // Gate pillars
    const pillarW = 25;

    // Left pillar
    gfx.fillStyle(0x4a3a2a, 1);
    gfx.fillRect(-gateWidth / 2 - pillarW, -gateHeight, pillarW, gateHeight + 25);
    gfx.fillStyle(0x5a4a3a, 0.6);
    gfx.fillRect(-gateWidth / 2 - pillarW, -gateHeight, 8, gateHeight + 25);

    // Right pillar
    gfx.fillStyle(0x4a3a2a, 1);
    gfx.fillRect(gateWidth / 2, -gateHeight, pillarW, gateHeight + 25);
    gfx.fillStyle(0x5a4a3a, 0.6);
    gfx.fillRect(gateWidth / 2, -gateHeight, 8, gateHeight + 25);

    // Top beam
    gfx.fillStyle(0x5a4a3a, 1);
    gfx.fillRect(-gateWidth / 2 - pillarW - 8, -gateHeight - 18, gateWidth + pillarW * 2 + 16, 22);

    // Gold trim
    gfx.lineStyle(3, 0xc9a227, 0.9);
    gfx.strokeRect(-gateWidth / 2 - pillarW - 8, -gateHeight - 18, gateWidth + pillarW * 2 + 16, 22);

    // Torches
    const torchY = -gateHeight + 25;
    gfx.fillStyle(0xff6600, 0.4);
    gfx.fillCircle(-gateWidth / 2 - pillarW / 2, torchY, 15);
    gfx.fillCircle(gateWidth / 2 + pillarW / 2, torchY, 15);
    gfx.fillStyle(0xffaa00, 0.9);
    gfx.fillCircle(-gateWidth / 2 - pillarW / 2, torchY, 8);
    gfx.fillCircle(gateWidth / 2 + pillarW / 2, torchY, 8);

    gate.container.add(gfx);

    // Word tablets - BIG and readable
    const lanes: Lane[] = ['left', 'center', 'right'];
    const laneWidth = gateWidth / 3;

    gate.question.options.forEach((option) => {
      const laneIndex = lanes.indexOf(option.lane);
      const x = (laneIndex - 1) * laneWidth;

      const tabletGfx = this.add.graphics();

      // Stone tablet background
      tabletGfx.fillStyle(0x1a1015, 0.95);
      tabletGfx.fillRoundedRect(x - 70, -85, 140, 90, 8);

      // Gold border
      tabletGfx.lineStyle(3, 0xc9a227, 0.9);
      tabletGfx.strokeRoundedRect(x - 70, -85, 140, 90, 8);

      gate.container.add(tabletGfx);

      // Chinese word - LARGE font
      const wordText = this.add.text(x, -55, option.word.chinese, {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Pinyin
      const pinyinText = this.add.text(x, -20, option.word.pinyin, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#c9a227',
      }).setOrigin(0.5);

      gate.container.add([wordText, pinyinText]);
    });
  }

  update(time: number, delta: number): void {
    // Update difficulty based on CORRECT ANSWERS (not distance)
    const settings = this.difficultySystem.update(this.scoreSystem.getCorrectAnswers());
    this.gameSpeed = settings.speedMultiplier;

    // Update distance for display
    this.distance += (100 * this.gameSpeed * delta) / 1000;

    // Update gates
    for (let i = this.gates3D.length - 1; i >= 0; i--) {
      const gate = this.gates3D[i];

      // Progress based on time since spawn
      const elapsed = time - gate.spawnTime;
      gate.progress = Math.min(1, elapsed / (GATE_TRAVEL_TIME / this.gameSpeed));

      this.renderGate(gate);

      // Collision when gate reaches player (progress >= 0.95)
      if (gate.progress >= 0.95 && !gate.processed) {
        this.processGateCollision(gate);
        gate.processed = true;
      }

      // Remove passed gates
      if (gate.progress >= 1.1) {
        gate.container.destroy();
        this.gates3D.splice(i, 1);

        // Update English word to next gate
        if (this.gates3D.length > 0) {
          this.questionStartTime = this.time.now;
          this.englishWordText.setText(this.gates3D[0].question.correctWord.english);
        }
      }
    }

    // Spawn new gates based on time
    const timeSinceLastSpawn = time - this.lastGateSpawnTime;
    if (this.gates3D.length === 0 || timeSinceLastSpawn > GATE_SPACING_TIME / this.gameSpeed) {
      this.spawnGate();
    }

    // Update player shadow
    this.updatePlayerShadow();

    // Update UI
    this.scoreText.setText(this.scoreSystem.getScore().toString());
    this.distanceText.setText(`${Math.floor(this.distance)}m`);
    this.hskText.setText(`HSK ${settings.hskLevel}`);

    const streak = this.scoreSystem.getStreak();
    this.streakText.setText(streak >= 3 ? `${streak} STREAK!` : '');
  }

  private processGateCollision(gate: Gate3D): void {
    const isCorrect = this.currentLane === gate.question.correctLane;
    const decisionTime = this.time.now - this.questionStartTime;

    const result = this.scoreSystem.calculateScore(
      isCorrect,
      decisionTime,
      this.difficultySystem.getCurrentSettings().hskLevel
    );

    if (isCorrect) {
      soundManager.play('correct');
      this.showFeedback(true, `+${result.totalPoints}`);
      if (result.streakBonus > 0) soundManager.play('streak');

      if (this.scoreSystem.getCorrectAnswers() % 10 === 0 && this.lives < 3) {
        this.lives++;
        this.updateLivesDisplay();
        this.showNotification('+1 LIFE');
      }
    } else {
      soundManager.play('wrong');
      this.showFeedback(false, gate.question.correctWord.chinese);
      this.lives--;
      this.updateLivesDisplay();
      soundManager.play('lifeLost');
      this.cameras.main.shake(250, 0.02);

      if (this.lives <= 0) this.gameOver();
    }
  }

  private showFeedback(correct: boolean, text: string): void {
    const { width } = this.cameras.main;

    const feedback = this.add.text(width / 2, PLAYER_Y - 60, text, {
      fontSize: '42px',
      fontFamily: 'Arial Black',
      color: correct ? '#00ff00' : '#ff3333',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: feedback,
      y: PLAYER_Y - 140,
      alpha: 0,
      scale: 1.5,
      duration: 900,
      onComplete: () => feedback.destroy(),
    });
  }

  private showNotification(text: string): void {
    const { width, height } = this.cameras.main;
    const notification = this.add.text(width / 2, height / 2 - 50, text, {
      fontSize: '40px',
      fontFamily: 'Arial Black',
      color: '#c9a227',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: notification,
      scale: 1.6,
      alpha: 0,
      duration: 1200,
      onComplete: () => notification.destroy(),
    });
  }

  private showLevelUpNotification(level: number): void {
    const { width, height } = this.cameras.main;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0510, 0.98);
    bg.fillRoundedRect(width / 2 - 140, height / 2 - 100, 280, 120, 12);
    bg.lineStyle(4, 0xc9a227, 1);
    bg.strokeRoundedRect(width / 2 - 140, height / 2 - 100, 280, 120, 12);

    const text = this.add.text(width / 2, height / 2 - 55, `HSK ${level}`, {
      fontSize: '52px',
      fontFamily: 'Arial Black',
      color: '#c9a227',
    }).setOrigin(0.5);

    const subtext = this.add.text(width / 2, height / 2 - 5, 'LEVEL UP!', {
      fontSize: '22px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [bg, text, subtext],
      alpha: 0,
      delay: 1800,
      duration: 500,
      onComplete: () => { bg.destroy(); text.destroy(); subtext.destroy(); },
    });
  }

  private gameOver(): void {
    soundManager.play('gameOver');

    const stats: GameStats = {
      finalScore: this.scoreSystem.getScore(),
      distance: Math.floor(this.distance),
      correctAnswers: this.scoreSystem.getCorrectAnswers(),
      totalAnswers: this.scoreSystem.getTotalAnswers(),
      maxStreak: this.scoreSystem.getMaxStreak(),
      highestHSK: this.difficultySystem.getCurrentSettings().hskLevel,
    };

    this.scene.start('GameOverScene', stats);
  }
}
