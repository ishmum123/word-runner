export interface DifficultySettings {
  hskLevel: number;
  speedMultiplier: number;
  decisionTime: number;
}

// HSK level increases every 50 correct answers
const CORRECT_ANSWERS_PER_LEVEL = 50;

const LEVEL_SETTINGS = [
  { hskLevel: 1, speed: 1.0, decisionTime: 3000 },
  { hskLevel: 2, speed: 1.05, decisionTime: 2800 },
  { hskLevel: 3, speed: 1.1, decisionTime: 2600 },
  { hskLevel: 4, speed: 1.15, decisionTime: 2400 },
  { hskLevel: 5, speed: 1.2, decisionTime: 2200 },
  { hskLevel: 6, speed: 1.25, decisionTime: 2000 },
];

export class DifficultySystem {
  private currentSettings: DifficultySettings;
  private onLevelChange?: (newLevel: number) => void;

  constructor() {
    this.currentSettings = {
      hskLevel: 1,
      speedMultiplier: 1.0,
      decisionTime: 3000,
    };
  }

  setLevelChangeCallback(callback: (newLevel: number) => void): void {
    this.onLevelChange = callback;
  }

  update(correctAnswers: number): DifficultySettings {
    const previousLevel = this.currentSettings.hskLevel;

    // Calculate level based on correct answers (50 per level, max level 6)
    const newLevel = Math.min(6, Math.floor(correctAnswers / CORRECT_ANSWERS_PER_LEVEL) + 1);
    const levelIndex = newLevel - 1;
    const settings = LEVEL_SETTINGS[levelIndex];

    this.currentSettings = {
      hskLevel: settings.hskLevel,
      speedMultiplier: settings.speed,
      decisionTime: settings.decisionTime,
    };

    // Notify on level change
    if (this.currentSettings.hskLevel !== previousLevel && this.onLevelChange) {
      this.onLevelChange(this.currentSettings.hskLevel);
    }

    return this.currentSettings;
  }

  getCurrentSettings(): DifficultySettings {
    return { ...this.currentSettings };
  }

  reset(): void {
    this.currentSettings = {
      hskLevel: 1,
      speedMultiplier: 1.0,
      decisionTime: 3000,
    };
  }
}
