import Phaser from 'phaser';
import type { GameStats } from '../types';

export class GameOverScene extends Phaser.Scene {
  private stats!: GameStats;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameStats): void {
    this.stats = data;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f0f1a, 0x0f0f1a);
    bg.fillRect(0, 0, width, height);

    // Game Over title
    this.add.text(width / 2, height * 0.1, 'GAME OVER', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial',
      color: '#e94560',
    }).setOrigin(0.5);

    // Stats panel
    const panelY = height * 0.25;
    const panelHeight = height * 0.45;

    const panel = this.add.graphics();
    panel.fillStyle(0x16213e, 0.9);
    panel.fillRoundedRect(40, panelY, width - 80, panelHeight, 20);

    // Stats
    const statsStartY = panelY + 30;
    const lineHeight = 50;

    const statsConfig = {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    };

    const valueConfig = {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: '#e94560',
    };

    // Final Score
    this.add.text(60, statsStartY, 'Final Score', statsConfig);
    this.add.text(width - 60, statsStartY, this.stats.finalScore.toLocaleString(), valueConfig).setOrigin(1, 0);

    // Distance
    this.add.text(60, statsStartY + lineHeight, 'Distance', statsConfig);
    this.add.text(width - 60, statsStartY + lineHeight, `${this.stats.distance}m`, valueConfig).setOrigin(1, 0);

    // Accuracy
    const accuracy = this.stats.totalAnswers > 0
      ? Math.round((this.stats.correctAnswers / this.stats.totalAnswers) * 100)
      : 0;
    this.add.text(60, statsStartY + lineHeight * 2, 'Accuracy', statsConfig);
    this.add.text(width - 60, statsStartY + lineHeight * 2, `${accuracy}%`, valueConfig).setOrigin(1, 0);

    // Words Learned
    this.add.text(60, statsStartY + lineHeight * 3, 'Correct Answers', statsConfig);
    this.add.text(width - 60, statsStartY + lineHeight * 3, `${this.stats.correctAnswers}/${this.stats.totalAnswers}`, valueConfig).setOrigin(1, 0);

    // Best Streak
    this.add.text(60, statsStartY + lineHeight * 4, 'Best Streak', statsConfig);
    this.add.text(width - 60, statsStartY + lineHeight * 4, `${this.stats.maxStreak}`, valueConfig).setOrigin(1, 0);

    // Highest HSK Level / Custom Deck
    if (this.stats.useCustomDeck) {
      this.add.text(60, statsStartY + lineHeight * 5, 'Deck', statsConfig);
      this.add.text(width - 60, statsStartY + lineHeight * 5, 'Custom', valueConfig).setOrigin(1, 0);
    } else {
      this.add.text(60, statsStartY + lineHeight * 5, 'Highest Level', statsConfig);
      this.add.text(width - 60, statsStartY + lineHeight * 5, `Level ${this.stats.highestLevel}`, valueConfig).setOrigin(1, 0);
    }

    // Performance message
    let message = '';
    let messageColor = '#ffffff';

    if (accuracy >= 90) {
      message = '太棒了! (Excellent!)';
      messageColor = '#00ff00';
    } else if (accuracy >= 70) {
      message = '很好! (Good job!)';
      messageColor = '#88ff88';
    } else if (accuracy >= 50) {
      message = '加油! (Keep trying!)';
      messageColor = '#ffff00';
    } else {
      message = '继续努力! (Keep practicing!)';
      messageColor = '#ff8888';
    }

    this.add.text(width / 2, panelY + panelHeight - 30, message, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: messageColor,
    }).setOrigin(0.5);

    // Buttons
    const buttonY = height * 0.78;

    // Retry button
    this.createButton(width / 2 - 110, buttonY, 'RETRY', 0xe94560, () => {
      this.scene.start('GameScene', { useCustomDeck: this.stats.useCustomDeck });
    });

    // Menu button
    this.createButton(width / 2 + 110, buttonY, 'MENU', 0x0f3460, () => {
      this.scene.start('TitleScene');
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene', { useCustomDeck: this.stats.useCustomDeck });
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      this.scene.start('GameScene', { useCustomDeck: this.stats.useCustomDeck });
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('TitleScene');
    });

    // Animate stats appearing
    const statElements = this.children.list.slice(3);
    statElements.forEach((child, index) => {
      if (child instanceof Phaser.GameObjects.Text) {
        child.setAlpha(0);
        this.tweens.add({
          targets: child,
          alpha: 1,
          duration: 300,
          delay: index * 50,
        });
      }
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-80, -25, 160, 50, 12);

    const label = this.add.text(0, 0, text, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    button.add([bg, label]);
    button.setSize(160, 50);
    button.setInteractive({ useHandCursor: true });

    const hoverColor = Phaser.Display.Color.ValueToColor(color).lighten(20).color;

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-80, -25, 160, 50, 12);
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-80, -25, 160, 50, 12);
    });

    button.on('pointerdown', callback);

    return button;
  }
}
