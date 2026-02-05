export interface ScoreResult {
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  multiplier: number;
  totalPoints: number;
}

export class ScoreSystem {
  private score: number = 0;
  private streak: number = 0;
  private maxStreak: number = 0;
  private correctAnswers: number = 0;
  private totalAnswers: number = 0;

  calculateScore(correct: boolean, decisionTimeMs: number, hskLevel: number): ScoreResult {
    this.totalAnswers++;

    if (!correct) {
      this.streak = 0;
      return {
        basePoints: 0,
        speedBonus: 0,
        streakBonus: 0,
        multiplier: 1,
        totalPoints: 0,
      };
    }

    this.correctAnswers++;
    this.streak++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);

    // Base points
    const basePoints = 100;

    // Speed bonus (if answered in less than 1 second)
    const speedBonus = decisionTimeMs < 1000 ? 50 : 0;

    // Streak bonus
    let streakBonus = 0;
    if (this.streak === 5) streakBonus = 200;
    else if (this.streak === 10) streakBonus = 500;
    else if (this.streak > 10 && this.streak % 5 === 0) streakBonus = 300;

    // HSK level multiplier (1.0 to 2.0)
    const multiplier = 1 + (hskLevel - 1) * 0.2;

    const totalPoints = Math.floor((basePoints + speedBonus) * multiplier) + streakBonus;
    this.score += totalPoints;

    return {
      basePoints,
      speedBonus,
      streakBonus,
      multiplier,
      totalPoints,
    };
  }

  getScore(): number {
    return this.score;
  }

  getStreak(): number {
    return this.streak;
  }

  getMaxStreak(): number {
    return this.maxStreak;
  }

  getCorrectAnswers(): number {
    return this.correctAnswers;
  }

  getTotalAnswers(): number {
    return this.totalAnswers;
  }

  getAccuracy(): number {
    if (this.totalAnswers === 0) return 0;
    return Math.round((this.correctAnswers / this.totalAnswers) * 100);
  }

  reset(): void {
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.correctAnswers = 0;
    this.totalAnswers = 0;
  }
}
