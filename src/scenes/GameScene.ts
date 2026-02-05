import Phaser from 'phaser';
import type { Lane, GameStats } from '../types';
import { WordManager, type WordQuestion } from '../systems/WordManager';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DifficultySystem } from '../systems/DifficultySystem';
import { soundManager } from '../audio/SoundManager';

// 3D Perspective - player runs INTO the screen
const HORIZON_Y = 250;
const GROUND_Y = 800;
const VANISHING_POINT_X = 240;

// Track scaling
const TRACK_WIDTH_FAR = 30;
const TRACK_WIDTH_NEAR = 450;

const BASE_SPEED = 100; // Slower base speed
const GATE_SPACING = 2000; // Much more spacing between gates
const MAX_Z = 3000; // How far we can see

// Get lane X position based on depth (z)
const getLaneX = (lane: Lane, z: number): number => {
  const t = Math.max(0, 1 - z / MAX_Z);
  const trackWidth = TRACK_WIDTH_FAR + (TRACK_WIDTH_NEAR - TRACK_WIDTH_FAR) * t;
  const laneOffset = trackWidth / 3;

  switch (lane) {
    case 'left': return VANISHING_POINT_X - laneOffset;
    case 'center': return VANISHING_POINT_X;
    case 'right': return VANISHING_POINT_X + laneOffset;
  }
};

// Get Y position based on depth
const getYFromZ = (z: number): number => {
  const t = Math.max(0, 1 - z / MAX_Z);
  return HORIZON_Y + (GROUND_Y - HORIZON_Y) * Math.pow(t, 0.7);
};

// Get scale based on depth
const getScaleFromZ = (z: number): number => {
  const t = Math.max(0, 1 - z / MAX_Z);
  return 0.1 + 0.9 * Math.pow(t, 0.8);
};

interface Gate3D {
  container: Phaser.GameObjects.Container;
  z: number;
  question: WordQuestion;
  processed: boolean;
}

interface TrackTile {
  graphics: Phaser.GameObjects.Graphics;
  z: number;
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
  private nextGateZ: number = GATE_SPACING;

  private trackTiles: TrackTile[] = [];
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

    // Spawn first gate
    this.spawnGate();

    // Initialize track tiles
    for (let z = 0; z < MAX_Z; z += 80) {
      this.spawnTrackTile(z);
    }
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
    this.nextGateZ = GATE_SPACING;
    this.trackTiles = [];
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    const bg = this.add.graphics();

    // Dark sky gradient
    bg.fillGradientStyle(0x0a0510, 0x0a0510, 0x1a1025, 0x1a1025);
    bg.fillRect(0, 0, width, HORIZON_Y + 50);

    // Atmospheric fog at horizon
    bg.fillGradientStyle(0x2a2035, 0x2a2035, 0x1a1520, 0x1a1520, 0.8);
    bg.fillRect(0, HORIZON_Y - 30, width, 80);

    // Ground/jungle
    bg.fillGradientStyle(0x1a2510, 0x1a2510, 0x0a1508, 0x0a1508);
    bg.fillRect(0, HORIZON_Y, width, height - HORIZON_Y);

    // Distant mountain/temple silhouettes
    bg.fillStyle(0x15101a, 0.9);
    bg.fillTriangle(60, HORIZON_Y, 150, HORIZON_Y - 80, 240, HORIZON_Y);
    bg.fillTriangle(200, HORIZON_Y, 280, HORIZON_Y - 50, 360, HORIZON_Y);
    bg.fillTriangle(320, HORIZON_Y, 400, HORIZON_Y - 70, 480, HORIZON_Y);

    // Temple structure at vanishing point
    bg.fillStyle(0x1a1520, 1);
    bg.fillRect(VANISHING_POINT_X - 25, HORIZON_Y - 40, 50, 40);
    bg.fillTriangle(VANISHING_POINT_X - 35, HORIZON_Y - 40, VANISHING_POINT_X, HORIZON_Y - 70, VANISHING_POINT_X + 35, HORIZON_Y - 40);
  }

  private createTrack(): void {
    this.trackGraphics = this.add.graphics();
  }

  private spawnTrackTile(z: number): void {
    const tile: TrackTile = {
      graphics: this.add.graphics(),
      z: z
    };
    this.trackTiles.push(tile);
  }

  private drawTrack(): void {
    this.trackGraphics.clear();

    // Draw the main track surface
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const z1 = (i / steps) * MAX_Z;
      const z2 = ((i + 1) / steps) * MAX_Z;

      const y1 = getYFromZ(z1);
      const y2 = getYFromZ(z2);

      const t1 = 1 - z1 / MAX_Z;
      const t2 = 1 - z2 / MAX_Z;

      const w1 = TRACK_WIDTH_FAR + (TRACK_WIDTH_NEAR - TRACK_WIDTH_FAR) * t1;
      const w2 = TRACK_WIDTH_FAR + (TRACK_WIDTH_NEAR - TRACK_WIDTH_FAR) * t2;

      // Track color gets lighter as it gets closer
      const brightness = Math.floor(40 + 30 * t1);
      const trackColor = (brightness << 16) | ((brightness + 10) << 8) | (brightness - 10);

      this.trackGraphics.fillStyle(trackColor, 1);
      this.trackGraphics.beginPath();
      this.trackGraphics.moveTo(VANISHING_POINT_X - w1 / 2, y1);
      this.trackGraphics.lineTo(VANISHING_POINT_X + w1 / 2, y1);
      this.trackGraphics.lineTo(VANISHING_POINT_X + w2 / 2, y2);
      this.trackGraphics.lineTo(VANISHING_POINT_X - w2 / 2, y2);
      this.trackGraphics.closePath();
      this.trackGraphics.fillPath();
    }

    // Track edges with glow
    this.trackGraphics.lineStyle(3, 0xc9a227, 0.8);
    this.trackGraphics.beginPath();
    this.trackGraphics.moveTo(VANISHING_POINT_X - TRACK_WIDTH_FAR / 2, HORIZON_Y);
    this.trackGraphics.lineTo(VANISHING_POINT_X - TRACK_WIDTH_NEAR / 2, GROUND_Y);
    this.trackGraphics.strokePath();

    this.trackGraphics.beginPath();
    this.trackGraphics.moveTo(VANISHING_POINT_X + TRACK_WIDTH_FAR / 2, HORIZON_Y);
    this.trackGraphics.lineTo(VANISHING_POINT_X + TRACK_WIDTH_NEAR / 2, GROUND_Y);
    this.trackGraphics.strokePath();
  }

  private renderTrackTiles(): void {
    for (const tile of this.trackTiles) {
      tile.graphics.clear();

      if (tile.z < 0 || tile.z > MAX_Z) continue;

      const y = getYFromZ(tile.z);
      const t = 1 - tile.z / MAX_Z;
      const w = TRACK_WIDTH_FAR + (TRACK_WIDTH_NEAR - TRACK_WIDTH_FAR) * t;

      if (t < 0.02) continue;

      // Horizontal tile line
      tile.graphics.lineStyle(1 + t * 3, 0x2a2520, 0.3 + t * 0.5);
      tile.graphics.beginPath();
      tile.graphics.moveTo(VANISHING_POINT_X - w / 2, y);
      tile.graphics.lineTo(VANISHING_POINT_X + w / 2, y);
      tile.graphics.strokePath();

      // Lane markers (vertical dashes)
      if (t > 0.1) {
        const laneW = w / 3;
        tile.graphics.lineStyle(1 + t * 2, 0x3a3530, 0.2 + t * 0.3);

        // Left lane marker
        tile.graphics.beginPath();
        tile.graphics.moveTo(VANISHING_POINT_X - laneW / 2, y - 2);
        tile.graphics.lineTo(VANISHING_POINT_X - laneW / 2, y + 2);
        tile.graphics.strokePath();

        // Right lane marker
        tile.graphics.beginPath();
        tile.graphics.moveTo(VANISHING_POINT_X + laneW / 2, y - 2);
        tile.graphics.lineTo(VANISHING_POINT_X + laneW / 2, y + 2);
        tile.graphics.strokePath();
      }
    }
  }

  private createPlayer(): void {
    // Player is at z=0, viewed from BEHIND (running into screen)
    const playerZ = 50;
    const playerX = getLaneX('center', playerZ);
    const playerY = getYFromZ(playerZ);

    // Shadow first (rendered below player)
    this.playerShadow = this.add.graphics();

    this.player = this.add.container(playerX, playerY);

    const body = this.add.graphics();

    // === SIMPLE BACK VIEW OF RUNNER (no facial features) ===

    // Legs (dark pants)
    body.fillStyle(0x2a3a4a, 1);
    body.fillRoundedRect(-16, 20, 12, 40, 4); // Left leg
    body.fillRoundedRect(4, 20, 12, 40, 4);   // Right leg

    // Torso (shirt) - back view
    body.fillStyle(0xc04040, 1);
    body.fillRoundedRect(-20, -25, 40, 50, 6);

    // Back detail (shirt fold)
    body.fillStyle(0xa03030, 1);
    body.fillRect(-2, -20, 4, 40);

    // Arms (sleeves, no skin)
    body.fillStyle(0xc04040, 1);
    body.fillRoundedRect(-28, -20, 10, 35, 4); // Left arm
    body.fillRoundedRect(18, -20, 10, 35, 4);  // Right arm

    // Head - just hair covering entire back of head
    body.fillStyle(0x2a1a0a, 1);
    body.fillCircle(0, -45, 20);
    body.fillEllipse(0, -52, 22, 15);

    this.player.add(body);
    this.player.setScale(0.9);

    // Running animation - bob up and down
    this.tweens.add({
      targets: this.player,
      y: playerY - 8,
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updatePlayerPosition(): void {
    const playerZ = 50;

    // Update shadow
    this.playerShadow.clear();
    this.playerShadow.fillStyle(0x000000, 0.3);
    this.playerShadow.fillEllipse(this.player.x, getYFromZ(playerZ) + 55, 50, 15);
  }

  private createUI(): void {
    const { width } = this.cameras.main;

    // Top bar
    const topBar = this.add.graphics();
    topBar.fillStyle(0x0a0510, 0.9);
    topBar.fillRect(0, 0, width, 65);
    topBar.lineStyle(2, 0xc9a227, 0.6);
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
    promptBg.fillStyle(0x0a0510, 0.95);
    promptBg.fillRoundedRect(width / 2 - 160, 75, 320, 65, 10);
    promptBg.lineStyle(3, 0xc9a227, 0.9);
    promptBg.strokeRoundedRect(width / 2 - 160, 75, 320, 65, 10);

    this.englishWordText = this.add.text(width / 2, 107, '', {
      fontSize: '36px',
      fontFamily: 'Georgia, serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Bottom bar
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(0x0a0510, 0.9);
    bottomBar.fillRect(0, 755, width, 45);
    bottomBar.lineStyle(2, 0xc9a227, 0.6);
    bottomBar.lineBetween(0, 755, width, 755);

    this.hskText = this.add.text(20, 772, 'HSK 1', {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#c9a227',
    });

    this.distanceText = this.add.text(width - 20, 772, '0m', {
      fontSize: '18px',
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

    const playerZ = 50;
    const targetX = getLaneX(lane, playerZ);

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
      container: this.add.container(VANISHING_POINT_X, HORIZON_Y),
      z: this.nextGateZ,
      question: question,
      processed: false,
    };

    this.gates3D.push(gate);
    this.nextGateZ += GATE_SPACING;
  }

  private renderGate(gate: Gate3D): void {
    gate.container.removeAll(true);

    if (gate.z < 0 || gate.z > MAX_Z) {
      gate.container.setVisible(false);
      return;
    }

    const y = getYFromZ(gate.z);
    const scale = getScaleFromZ(gate.z);
    const t = 1 - gate.z / MAX_Z;

    if (t < 0.03) {
      gate.container.setVisible(false);
      return;
    }

    gate.container.setVisible(true);
    gate.container.setPosition(VANISHING_POINT_X, y);
    gate.container.setScale(scale);
    gate.container.setAlpha(0.3 + 0.7 * t);
    gate.container.setDepth(1000 - gate.z);

    const trackWidth = TRACK_WIDTH_FAR + (TRACK_WIDTH_NEAR - TRACK_WIDTH_FAR) * t;
    const gateWidth = trackWidth / scale;
    const gateHeight = 120;

    const gfx = this.add.graphics();

    // Temple gate pillars
    const pillarW = 30;

    // Left pillar
    gfx.fillStyle(0x4a3a2a, 1);
    gfx.fillRect(-gateWidth / 2 - pillarW, -gateHeight, pillarW, gateHeight + 30);
    gfx.fillStyle(0x5a4a3a, 0.5);
    gfx.fillRect(-gateWidth / 2 - pillarW, -gateHeight, 10, gateHeight + 30);

    // Right pillar
    gfx.fillStyle(0x4a3a2a, 1);
    gfx.fillRect(gateWidth / 2, -gateHeight, pillarW, gateHeight + 30);
    gfx.fillStyle(0x5a4a3a, 0.5);
    gfx.fillRect(gateWidth / 2, -gateHeight, 10, gateHeight + 30);

    // Top beam
    gfx.fillStyle(0x5a4a3a, 1);
    gfx.fillRect(-gateWidth / 2 - pillarW - 10, -gateHeight - 20, gateWidth + pillarW * 2 + 20, 25);

    // Gold trim
    gfx.lineStyle(4, 0xc9a227, 0.9);
    gfx.strokeRect(-gateWidth / 2 - pillarW - 10, -gateHeight - 20, gateWidth + pillarW * 2 + 20, 25);

    // Torches
    if (t > 0.15) {
      const torchY = -gateHeight + 30;
      // Glow
      gfx.fillStyle(0xff6600, 0.3);
      gfx.fillCircle(-gateWidth / 2 - pillarW / 2, torchY, 20);
      gfx.fillCircle(gateWidth / 2 + pillarW / 2, torchY, 20);
      // Flame
      gfx.fillStyle(0xff9933, 0.9);
      gfx.fillCircle(-gateWidth / 2 - pillarW / 2, torchY, 10);
      gfx.fillCircle(gateWidth / 2 + pillarW / 2, torchY, 10);
      gfx.fillStyle(0xffcc00, 1);
      gfx.fillCircle(-gateWidth / 2 - pillarW / 2, torchY - 3, 5);
      gfx.fillCircle(gateWidth / 2 + pillarW / 2, torchY - 3, 5);
    }

    gate.container.add(gfx);

    // Word tablets
    const lanes: Lane[] = ['left', 'center', 'right'];
    const laneWidth = gateWidth / 3;

    gate.question.options.forEach((option) => {
      const laneIndex = lanes.indexOf(option.lane);
      const x = (laneIndex - 1) * laneWidth;

      const tabletGfx = this.add.graphics();

      // Stone tablet
      tabletGfx.fillStyle(0x1a1015, 0.95);
      tabletGfx.fillRoundedRect(x - 60, -90, 120, 85, 8);

      // Gold border
      tabletGfx.lineStyle(3, 0xc9a227, 0.9);
      tabletGfx.strokeRoundedRect(x - 60, -90, 120, 85, 8);

      gate.container.add(tabletGfx);

      const wordText = this.add.text(x, -60, option.word.chinese, {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5);

      const pinyinText = this.add.text(x, -28, option.word.pinyin, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#c9a227',
      }).setOrigin(0.5);

      gate.container.add([wordText, pinyinText]);
    });
  }

  update(_time: number, delta: number): void {
    const settings = this.difficultySystem.update(this.distance);
    this.gameSpeed = settings.speedMultiplier;

    // Movement speed
    const zSpeed = BASE_SPEED * this.gameSpeed * delta / 1000;
    this.distance += zSpeed;

    // Draw base track
    this.drawTrack();

    // Update track tiles (moving toward player)
    for (let i = this.trackTiles.length - 1; i >= 0; i--) {
      this.trackTiles[i].z -= zSpeed * 15;

      if (this.trackTiles[i].z < -50) {
        this.trackTiles[i].graphics.destroy();
        this.trackTiles.splice(i, 1);
        this.spawnTrackTile(MAX_Z);
      }
    }
    this.renderTrackTiles();

    // Update gates
    for (let i = this.gates3D.length - 1; i >= 0; i--) {
      const gate = this.gates3D[i];
      gate.z -= zSpeed * 15;
      this.renderGate(gate);

      // Collision at z near 50 (where player is)
      if (gate.z <= 60 && gate.z > 0 && !gate.processed) {
        this.processGateCollision(gate);
        gate.processed = true;
      }

      if (gate.z < -100) {
        gate.container.destroy();
        this.gates3D.splice(i, 1);

        if (this.gates3D.length > 0) {
          this.questionStartTime = this.time.now;
          this.englishWordText.setText(this.gates3D[0].question.correctWord.english);
        }
      }
    }

    // Spawn new gates
    const furthestGate = this.gates3D.length > 0 ? Math.max(...this.gates3D.map(g => g.z)) : 0;
    if (furthestGate < GATE_SPACING * 1.5) {
      this.spawnGate();
    }

    // Update player shadow
    this.updatePlayerPosition();

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
    const baseY = getYFromZ(50);

    const feedback = this.add.text(width / 2, baseY - 80, text, {
      fontSize: '42px',
      fontFamily: 'Arial Black',
      color: correct ? '#00ff00' : '#ff3333',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: feedback,
      y: baseY - 180,
      alpha: 0,
      scale: 1.5,
      duration: 900,
      onComplete: () => feedback.destroy(),
    });
  }

  private showNotification(text: string): void {
    const { width, height } = this.cameras.main;
    const notification = this.add.text(width / 2, height / 2, text, {
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
    bg.fillStyle(0x0a0510, 0.95);
    bg.fillRoundedRect(width / 2 - 140, height / 2 - 60, 280, 120, 12);
    bg.lineStyle(4, 0xc9a227, 1);
    bg.strokeRoundedRect(width / 2 - 140, height / 2 - 60, 280, 120, 12);

    const text = this.add.text(width / 2, height / 2 - 15, `HSK ${level}`, {
      fontSize: '52px',
      fontFamily: 'Arial Black',
      color: '#c9a227',
    }).setOrigin(0.5);

    const subtext = this.add.text(width / 2, height / 2 + 35, 'LEVEL UP!', {
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
