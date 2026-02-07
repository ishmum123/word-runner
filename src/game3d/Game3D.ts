import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { Lane, GameStats } from '../types';
import { WordManager, type WordQuestion } from '../systems/WordManager';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DifficultySystem } from '../systems/DifficultySystem';
import { soundManager } from '../audio/SoundManager';
import { loadCustomDeck } from '../utils/csvParser';

interface Gate3D {
  group: THREE.Group;
  progress: number;
  question: WordQuestion;
  processed: boolean;
  spawnTime: number;
  textMeshes: THREE.Mesh[];
}

export class Game3D {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Player
  private player!: THREE.Group;
  private mixer!: THREE.AnimationMixer;
  private runAction!: THREE.AnimationAction;
  private currentLane: Lane = 'center';
  private targetX: number = 0;
  private isMoving: boolean = false;

  // Game systems
  private wordManager: WordManager;
  private scoreSystem: ScoreSystem;
  private difficultySystem: DifficultySystem;

  // Game state
  private distance: number = 0;
  private lives: number = 3;
  private gameSpeed: number = 1;
  private gates: Gate3D[] = [];
  private lastGateSpawnTime: number = 0;
  private questionStartTime: number = 0;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private useCustomDeck: boolean = false;

  // Track
  private track!: THREE.Mesh;

  // UI elements (HTML overlay)
  private uiContainer!: HTMLElement;
  private scoreElement!: HTMLElement;
  private livesElement!: HTMLElement;
  private questionElement!: HTMLElement;
  private hskElement!: HTMLElement;
  private pauseOverlay!: HTMLElement;
  private feedbackElement!: HTMLElement;

  // Constants
  private readonly LANE_WIDTH = 2;
  private readonly GATE_TRAVEL_TIME = 4000;
  private readonly GATE_SPACING_TIME = 4500;
  private readonly GATE_START_Z = -50;
  private readonly PLAYER_Z = 0;

  constructor(container: HTMLElement, useCustomDeck: boolean = false) {
    this.container = container;
    this.useCustomDeck = useCustomDeck;
    this.clock = new THREE.Clock();

    this.wordManager = new WordManager();
    this.scoreSystem = new ScoreSystem();
    this.difficultySystem = new DifficultySystem();

    if (this.useCustomDeck) {
      const customWords = loadCustomDeck();
      if (customWords && customWords.length > 0) {
        this.wordManager.setCustomWords(customWords);
      }
    }

    this.difficultySystem.setLevelChangeCallback((newLevel) => {
      soundManager.play('levelUp');
      this.showLevelUp(newLevel);
    });

    this.init();
  }

  private async init(): Promise<void> {
    this.setupScene();
    this.setupLighting();
    this.setupTrack();
    this.createUI();
    await this.loadPlayer();
    this.setupInput();
    this.spawnGate();
    this.animate();
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(0, 1, -10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this.onResize());
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    // Gold accent lights
    const goldLight1 = new THREE.PointLight(0xc9a227, 0.5, 30);
    goldLight1.position.set(-5, 3, -20);
    this.scene.add(goldLight1);

    const goldLight2 = new THREE.PointLight(0xc9a227, 0.5, 30);
    goldLight2.position.set(5, 3, -20);
    this.scene.add(goldLight2);
  }

  private setupTrack(): void {
    // Main track
    const trackGeometry = new THREE.PlaneGeometry(8, 200, 1, 1);
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.8,
      metalness: 0.2,
    });
    this.track = new THREE.Mesh(trackGeometry, trackMaterial);
    this.track.rotation.x = -Math.PI / 2;
    this.track.position.y = 0;
    this.track.position.z = -50;
    this.track.receiveShadow = true;
    this.scene.add(this.track);

    // Lane dividers
    const dividerGeometry = new THREE.BoxGeometry(0.05, 0.02, 200);
    const dividerMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0xc9a227, emissiveIntensity: 0.3 });

    const leftDivider = new THREE.Mesh(dividerGeometry, dividerMaterial);
    leftDivider.position.set(-this.LANE_WIDTH / 2, 0.01, -50);
    this.scene.add(leftDivider);

    const rightDivider = new THREE.Mesh(dividerGeometry, dividerMaterial);
    rightDivider.position.set(this.LANE_WIDTH / 2, 0.01, -50);
    this.scene.add(rightDivider);

    // Track edges
    const edgeGeometry = new THREE.BoxGeometry(0.1, 0.3, 200);
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0xc9a227, emissiveIntensity: 0.5 });

    const leftEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    leftEdge.position.set(-4, 0.15, -50);
    this.scene.add(leftEdge);

    const rightEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    rightEdge.position.set(4, 0.15, -50);
    this.scene.add(rightEdge);

    // Ground plane (extends beyond track)
    const groundGeometry = new THREE.PlaneGeometry(100, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x15152a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.position.z = -50;
    this.scene.add(ground);
  }

  private async loadPlayer(): Promise<void> {
    const loader = new FBXLoader();

    try {
      const fbx = await loader.loadAsync('/word-runner/assets/3d/runner.fbx');
      this.player = fbx;
      this.player.scale.set(0.02, 0.02, 0.02);
      this.player.position.set(0, 0, this.PLAYER_Z);
      this.player.rotation.y = Math.PI; // Face away from camera

      this.player.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(this.player);

      // Setup animation
      this.mixer = new THREE.AnimationMixer(this.player);
      if (fbx.animations.length > 0) {
        this.runAction = this.mixer.clipAction(fbx.animations[0]);
        this.runAction.play();
      }
    } catch (error) {
      console.error('Failed to load player model:', error);
      // Fallback to simple box
      const geometry = new THREE.BoxGeometry(0.5, 1.5, 0.3);
      const material = new THREE.MeshStandardMaterial({ color: 0xc04040 });
      const fallbackPlayer = new THREE.Mesh(geometry, material);
      fallbackPlayer.position.y = 0.75;
      this.player = new THREE.Group();
      this.player.add(fallbackPlayer);
      this.player.position.set(0, 0, this.PLAYER_Z);
      this.scene.add(this.player);
    }
  }

  private createUI(): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: Arial, sans-serif;
    `;
    this.container.appendChild(this.uiContainer);

    // Top bar
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: rgba(10, 5, 16, 0.9);
      border-bottom: 2px solid #c9a227;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px;
    `;
    this.uiContainer.appendChild(topBar);

    // Lives
    this.livesElement = document.createElement('div');
    this.livesElement.style.cssText = 'font-size: 24px;';
    this.updateLivesDisplay();
    topBar.appendChild(this.livesElement);

    // Pause button
    const pauseBtn = document.createElement('button');
    pauseBtn.innerHTML = '❚❚';
    pauseBtn.style.cssText = `
      pointer-events: auto;
      background: #2a2030;
      border: 2px solid #c9a227;
      color: #c9a227;
      font-size: 18px;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    `;
    pauseBtn.onclick = () => this.togglePause();
    topBar.appendChild(pauseBtn);

    // Score
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.cssText = 'color: #c9a227; font-size: 28px; font-weight: bold;';
    this.scoreElement.textContent = '0';
    topBar.appendChild(this.scoreElement);

    // Question box
    this.questionElement = document.createElement('div');
    this.questionElement.style.cssText = `
      position: absolute;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 5, 16, 0.95);
      border: 3px solid #c9a227;
      border-radius: 12px;
      padding: 15px 40px;
      color: white;
      font-size: 32px;
      text-align: center;
    `;
    this.uiContainer.appendChild(this.questionElement);

    // HSK level (bottom)
    this.hskElement = document.createElement('div');
    this.hskElement.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #c9a227;
      font-size: 20px;
      font-weight: bold;
    `;
    this.uiContainer.appendChild(this.hskElement);

    // Feedback element
    this.feedbackElement = document.createElement('div');
    this.feedbackElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 48px;
      font-weight: bold;
      text-shadow: 2px 2px 4px black;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
    `;
    this.uiContainer.appendChild(this.feedbackElement);

    // Pause overlay
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
    `;
    this.pauseOverlay.innerHTML = `
      <h1 style="color: #c9a227; font-size: 48px; margin-bottom: 40px;">PAUSED</h1>
      <button id="resumeBtn" style="background: #2a6a30; color: white; border: none; padding: 15px 50px; font-size: 24px; border-radius: 10px; cursor: pointer; margin: 10px;">RESUME</button>
      <button id="quitBtn" style="background: #6a2a2a; color: white; border: none; padding: 15px 50px; font-size: 24px; border-radius: 10px; cursor: pointer; margin: 10px;">QUIT</button>
    `;
    this.uiContainer.appendChild(this.pauseOverlay);

    this.pauseOverlay.querySelector('#resumeBtn')?.addEventListener('click', () => this.togglePause());
    this.pauseOverlay.querySelector('#quitBtn')?.addEventListener('click', () => this.quit());
  }

  private setupInput(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        this.togglePause();
        return;
      }

      if (this.isPaused || this.isGameOver) return;

      switch (e.key) {
        case 'a':
        case 'A':
        case 'ArrowLeft':
          this.moveToLane('left');
          break;
        case 'w':
        case 'W':
        case 'ArrowUp':
          this.moveToLane('center');
          break;
        case 'd':
        case 'D':
        case 'ArrowRight':
          this.moveToLane('right');
          break;
      }
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchStartY = 0;

    this.renderer.domElement.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    this.renderer.domElement.addEventListener('touchend', (e) => {
      if (this.isPaused || this.isGameOver) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < -40) this.moveToLane('left');
        else if (deltaX > 40) this.moveToLane('right');
      } else if (deltaY < -40) {
        this.moveToLane('center');
      }
    });
  }

  private moveToLane(lane: Lane): void {
    if (this.isMoving || this.isPaused) return;

    this.currentLane = lane;
    this.isMoving = true;
    soundManager.play('whoosh');

    switch (lane) {
      case 'left':
        this.targetX = -this.LANE_WIDTH;
        break;
      case 'center':
        this.targetX = 0;
        break;
      case 'right':
        this.targetX = this.LANE_WIDTH;
        break;
    }
  }

  private spawnGate(): void {
    const settings = this.difficultySystem.getCurrentSettings();
    const question = this.wordManager.generateQuestion(settings.hskLevel);

    if (this.gates.length === 0) {
      this.questionStartTime = performance.now();
      this.updateQuestionDisplay(question);
    }

    const gate = this.createGate(question);
    this.gates.push(gate);
    this.lastGateSpawnTime = performance.now();
  }

  private createGate(question: WordQuestion): Gate3D {
    const group = new THREE.Group();
    group.position.z = this.GATE_START_Z;

    // Gate frame (pillars)
    const pillarGeometry = new THREE.BoxGeometry(0.3, 4, 0.3);
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.7,
      metalness: 0.3
    });

    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-4, 2, 0);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(4, 2, 0);
    rightPillar.castShadow = true;
    group.add(rightPillar);

    // Top beam
    const beamGeometry = new THREE.BoxGeometry(8.6, 0.4, 0.3);
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 0xc9a227,
      emissiveIntensity: 0.2
    });
    const topBeam = new THREE.Mesh(beamGeometry, beamMaterial);
    topBeam.position.set(0, 4, 0);
    group.add(topBeam);

    // Word panels
    const textMeshes: THREE.Mesh[] = [];
    const lanes: Lane[] = ['left', 'center', 'right'];
    const isChineseToEnglish = question.mode === 'chinese-to-english';

    question.options.forEach((option) => {
      const laneIndex = lanes.indexOf(option.lane);
      const x = (laneIndex - 1) * this.LANE_WIDTH;

      // Panel background
      const panelGeometry = new THREE.BoxGeometry(1.8, 1.2, 0.1);
      const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1015,
        roughness: 0.9,
        metalness: 0.1
      });
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(x, 2.5, 0.2);
      group.add(panel);

      // Gold border for panel
      const borderGeometry = new THREE.BoxGeometry(1.9, 1.3, 0.05);
      const borderMaterial = new THREE.MeshStandardMaterial({
        color: 0xc9a227,
        emissive: 0xc9a227,
        emissiveIntensity: 0.3
      });
      const border = new THREE.Mesh(borderGeometry, borderMaterial);
      border.position.set(x, 2.5, 0.15);
      group.add(border);

      // Create text using canvas texture
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1a1015';
      ctx.fillRect(0, 0, 256, 128);

      if (isChineseToEnglish) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(option.word.english, 128, 75);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(option.word.chinese, 128, 60);
        ctx.fillStyle = '#c9a227';
        ctx.font = '20px Arial';
        ctx.fillText(option.word.pinyin, 128, 100);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const textGeometry = new THREE.PlaneGeometry(1.6, 0.8);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(x, 2.5, 0.26);
      group.add(textMesh);
      textMeshes.push(textMesh);
    });

    this.scene.add(group);

    return {
      group,
      progress: 0,
      question,
      processed: false,
      spawnTime: performance.now(),
      textMeshes
    };
  }

  private updateQuestionDisplay(question: WordQuestion): void {
    if (question.mode === 'chinese-to-english') {
      this.questionElement.innerHTML = `${question.correctWord.chinese}<br><span style="font-size: 18px; color: #c9a227;">${question.correctWord.pinyin}</span>`;
    } else {
      this.questionElement.textContent = question.correctWord.english;
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.pauseOverlay.style.display = this.isPaused ? 'flex' : 'none';

    if (!this.isPaused) {
      // Clock handles timing automatically when resuming
      this.clock.start();
    }
  }

  private quit(): void {
    this.isGameOver = true;
    this.dispose();
    window.location.reload();
  }

  private updateLivesDisplay(): void {
    let hearts = '';
    for (let i = 0; i < 3; i++) {
      hearts += i < this.lives ? '❤️' : '🖤';
    }
    this.livesElement.textContent = hearts;
  }

  private showFeedback(correct: boolean, text: string): void {
    this.feedbackElement.textContent = text;
    this.feedbackElement.style.color = correct ? '#00ff00' : '#ff3333';
    this.feedbackElement.style.opacity = '1';
    this.feedbackElement.style.transform = 'translate(-50%, -50%) scale(1)';

    const duration = correct ? 900 : 3000;

    setTimeout(() => {
      this.feedbackElement.style.opacity = '0';
      this.feedbackElement.style.transform = 'translate(-50%, -50%) scale(1.5)';
    }, duration);
  }

  private showLevelUp(level: number): void {
    const levelUp = document.createElement('div');
    levelUp.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10, 5, 16, 0.95);
      border: 3px solid #c9a227;
      border-radius: 12px;
      padding: 30px 50px;
      text-align: center;
    `;
    levelUp.innerHTML = `
      <div style="color: #c9a227; font-size: 48px; font-weight: bold;">HSK ${level}</div>
      <div style="color: white; font-size: 24px;">LEVEL UP!</div>
    `;
    this.uiContainer.appendChild(levelUp);

    setTimeout(() => levelUp.remove(), 2000);
  }

  private processGateCollision(gate: Gate3D): void {
    const isCorrect = this.currentLane === gate.question.correctLane;
    const decisionTime = performance.now() - this.questionStartTime;

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
      }
    } else {
      soundManager.play('wrong');
      const correctAnswer = gate.question.mode === 'chinese-to-english'
        ? gate.question.correctWord.english
        : `${gate.question.correctWord.chinese}\n${gate.question.correctWord.pinyin}`;
      this.showFeedback(false, correctAnswer);
      this.lives--;
      this.updateLivesDisplay();
      soundManager.play('lifeLost');

      if (this.lives <= 0) {
        this.gameOver();
      }
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    soundManager.play('gameOver');

    const stats: GameStats = {
      finalScore: this.scoreSystem.getScore(),
      distance: Math.floor(this.distance),
      correctAnswers: this.scoreSystem.getCorrectAnswers(),
      totalAnswers: this.scoreSystem.getTotalAnswers(),
      maxStreak: this.scoreSystem.getMaxStreak(),
      highestHSK: this.difficultySystem.getCurrentSettings().hskLevel,
      useCustomDeck: this.wordManager.hasCustomWords(),
    };

    // Show game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
    `;

    const accuracy = stats.totalAnswers > 0
      ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100)
      : 0;

    gameOverScreen.innerHTML = `
      <h1 style="color: #e94560; font-size: 48px; margin-bottom: 30px;">GAME OVER</h1>
      <div style="background: #16213e; padding: 30px 50px; border-radius: 16px; margin-bottom: 30px;">
        <div style="color: white; font-size: 20px; margin: 10px 0;">Score: <span style="color: #e94560; font-weight: bold;">${stats.finalScore}</span></div>
        <div style="color: white; font-size: 20px; margin: 10px 0;">Distance: <span style="color: #e94560; font-weight: bold;">${stats.distance}m</span></div>
        <div style="color: white; font-size: 20px; margin: 10px 0;">Accuracy: <span style="color: #e94560; font-weight: bold;">${accuracy}%</span></div>
        <div style="color: white; font-size: 20px; margin: 10px 0;">Best Streak: <span style="color: #e94560; font-weight: bold;">${stats.maxStreak}</span></div>
      </div>
      <button id="retryBtn" style="background: #e94560; color: white; border: none; padding: 15px 50px; font-size: 24px; border-radius: 10px; cursor: pointer; margin: 10px;">RETRY</button>
      <button id="menuBtn" style="background: #0f3460; color: white; border: none; padding: 15px 50px; font-size: 24px; border-radius: 10px; cursor: pointer; margin: 10px;">MENU</button>
    `;
    this.uiContainer.appendChild(gameOverScreen);

    gameOverScreen.querySelector('#retryBtn')?.addEventListener('click', () => {
      this.dispose();
      window.location.reload();
    });

    gameOverScreen.querySelector('#menuBtn')?.addEventListener('click', () => {
      this.dispose();
      window.location.reload();
    });
  }

  private animate(): void {
    if (this.isGameOver) return;

    requestAnimationFrame(() => this.animate());

    if (this.isPaused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const delta = this.clock.getDelta();
    const now = performance.now();

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Update game systems
    const settings = this.difficultySystem.update(this.scoreSystem.getCorrectAnswers());
    this.gameSpeed = settings.speedMultiplier;

    // Update distance
    this.distance += 100 * this.gameSpeed * delta;

    // Smooth player movement
    if (this.player) {
      const moveSpeed = 10 * delta;
      const dx = this.targetX - this.player.position.x;
      if (Math.abs(dx) > 0.01) {
        this.player.position.x += dx * moveSpeed * 5;
      } else {
        this.player.position.x = this.targetX;
        this.isMoving = false;
      }
    }

    // Update gates
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const gate = this.gates[i];
      const elapsed = now - gate.spawnTime;
      gate.progress = elapsed / (this.GATE_TRAVEL_TIME / this.gameSpeed);

      // Move gate towards player
      gate.group.position.z = this.GATE_START_Z + (this.PLAYER_Z - this.GATE_START_Z) * gate.progress;

      // Check collision
      if (gate.progress >= 0.98 && !gate.processed) {
        this.processGateCollision(gate);
        gate.processed = true;
      }

      // Remove passed gates
      if (gate.progress >= 1.15) {
        this.scene.remove(gate.group);
        gate.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        this.gates.splice(i, 1);

        // Update question for next gate
        if (this.gates.length > 0) {
          this.questionStartTime = now;
          this.updateQuestionDisplay(this.gates[0].question);
        }
      }
    }

    // Spawn new gates
    const timeSinceLastSpawn = now - this.lastGateSpawnTime;
    if (this.gates.length === 0 || timeSinceLastSpawn > this.GATE_SPACING_TIME / this.gameSpeed) {
      this.spawnGate();
    }

    // Update UI
    this.scoreElement.textContent = this.scoreSystem.getScore().toString();
    this.hskElement.textContent = this.wordManager.hasCustomWords() ? 'Custom' : `HSK ${settings.hskLevel}`;

    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  public dispose(): void {
    this.isGameOver = true;

    // Remove event listeners
    window.removeEventListener('resize', () => this.onResize());

    // Dispose Three.js resources
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.renderer.dispose();

    // Remove DOM elements
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    if (this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
  }
}
