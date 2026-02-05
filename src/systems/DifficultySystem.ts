export interface DifficultySettings {
  hskLevel: number;
  speedMultiplier: number;
  decisionTime: number;
}

const DIFFICULTY_THRESHOLDS = [
  { distance: 0, hskLevel: 1, speed: 1.0, decisionTime: 3000 },
  { distance: 500, hskLevel: 2, speed: 1.1, decisionTime: 2700 },
  { distance: 1500, hskLevel: 3, speed: 1.2, decisionTime: 2400 },
  { distance: 3000, hskLevel: 4, speed: 1.3, decisionTime: 2100 },
  { distance: 5000, hskLevel: 5, speed: 1.4, decisionTime: 1800 },
  { distance: 8000, hskLevel: 6, speed: 1.5, decisionTime: 1500 },
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

  update(distance: number): DifficultySettings {
    const previousLevel = this.currentSettings.hskLevel;

    // Find appropriate difficulty tier
    for (let i = DIFFICULTY_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = DIFFICULTY_THRESHOLDS[i];
      if (distance >= threshold.distance) {
        this.currentSettings = {
          hskLevel: threshold.hskLevel,
          speedMultiplier: threshold.speed,
          decisionTime: threshold.decisionTime,
        };
        break;
      }
    }

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
