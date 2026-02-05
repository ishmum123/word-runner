# Word Runner 汉语跑酷

A Temple Run-style endless runner game for learning Chinese vocabulary. Match English words with their correct Chinese translations to survive!

**[Play Now](https://ishmum123.github.io/word-runner/)** - No installation required!

## How to Play

1. An English word appears at the top of the screen
2. Three Chinese word options approach on the left, center, and right paths
3. Move to the lane with the correct translation before it reaches you
4. Correct answers earn points; wrong answers cost a life
5. Survive as long as possible and master HSK vocabulary!

## Controls

### Desktop
| Action | Keys |
|--------|------|
| Move Left | `A` or `←` |
| Move Center | `W` or `↑` |
| Move Right | `D` or `→` |

### Mobile
| Action | Gesture |
|--------|---------|
| Move Left | Swipe Left |
| Move Center | Swipe Up |
| Move Right | Swipe Right |

## Features

- **HSK 1-6 Vocabulary**: Over 500 words across all HSK levels
- **Progressive Difficulty**: HSK level increases every 50 correct answers
- **Lives System**: Start with 3 lives, earn extra lives every 10 correct answers
- **Streak Bonuses**: Build combos for bonus points
- **Sound Effects**: Audio feedback for correct/wrong answers

## Scoring

| Action | Points |
|--------|--------|
| Correct answer | +100 |
| Speed bonus (< 1s) | +50 |
| 5 streak | +200 |
| 10 streak | +500 |
| HSK multiplier | ×1.0 - ×1.25 |

## Installation

```bash
# Clone the repository
git clone git@github.com:ishmum123/word-runner.git
cd word-runner

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **Framework**: Phaser 3
- **Language**: TypeScript
- **Build Tool**: Vite
- **Audio**: Howler.js

## Project Structure

```
src/
├── main.ts              # Entry point
├── types.ts             # TypeScript interfaces
├── scenes/
│   ├── TitleScene.ts    # Start screen
│   ├── GameScene.ts     # Main gameplay
│   └── GameOverScene.ts # Results screen
├── systems/
│   ├── WordManager.ts   # Word selection logic
│   ├── ScoreSystem.ts   # Scoring and streaks
│   └── DifficultySystem.ts # HSK progression
├── data/
│   ├── hsk1.ts - hsk6.ts # Vocabulary databases
│   └── index.ts
└── audio/
    └── SoundManager.ts  # Sound effects
```

## License

MIT
