# CLAUDE.md - Agent Guide for Word Runner

This file provides context for AI agents working on this codebase.

## Project Overview

Word Runner is a Phaser 3 game built with TypeScript and Vite. It's an endless runner where players learn Chinese vocabulary by selecting correct translations.

## Build & Run Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build (outputs to dist/)
```

## Architecture

### Core Game Loop

The game uses Phaser 3's scene system:

1. **TitleScene** → Start screen, press START or SPACE/ENTER
2. **GameScene** → Main gameplay loop
3. **GameOverScene** → Shows stats, retry or menu options

### Gate System (GameScene.ts)

Gates are the core mechanic - they contain Chinese word options and move toward the player.

```typescript
interface Gate3D {
  container: Phaser.GameObjects.Container;  // Visual elements
  progress: number;      // 0 = spawned, 1 = at player
  question: WordQuestion; // The word data
  processed: boolean;    // Has collision been handled?
  spawnTime: number;     // When gate was created
}
```

**Key timing constants:**
- `GATE_TRAVEL_TIME` - How long gates take to reach player (ms)
- `GATE_SPACING_TIME` - Time between gate spawns (ms)

**Gate lifecycle:**
1. Spawn at `GATE_START_Y` (near English word prompt)
2. Move down screen based on `progress` (time-based)
3. Collision check at `progress >= 0.98`
4. Destroyed at `progress >= 1.15`

### Difficulty System (DifficultySystem.ts)

HSK level increases every 50 correct answers (not distance-based):
- HSK 1: 0-49 correct
- HSK 2: 50-99 correct
- ...up to HSK 6

Speed multiplier increases slightly with each level.

### Word Selection (WordManager.ts)

- Pulls words from current HSK level + one level below
- Avoids repeating words within last 20 questions
- Prefers same-category distractors for harder choices

### Scoring (ScoreSystem.ts)

- Base: 100 points per correct answer
- Speed bonus: +50 if answered in < 1 second
- Streak bonuses at 5, 10, and every 5 after
- HSK multiplier: 1.0 to 1.25 based on level

## Key Files

| File | Purpose |
|------|---------|
| `src/scenes/GameScene.ts` | Main gameplay - gates, player, collision |
| `src/systems/DifficultySystem.ts` | HSK progression logic |
| `src/systems/WordManager.ts` | Word selection and distractors |
| `src/systems/ScoreSystem.ts` | Points, streaks, accuracy |
| `src/data/hsk1-6.ts` | Vocabulary databases (~100 words each) |
| `src/audio/SoundManager.ts` | Synthesized sound effects |

## Common Modifications

### Adjust Game Speed
Edit `GATE_TRAVEL_TIME` and `GATE_SPACING_TIME` in GameScene.ts.

### Change HSK Progression
Edit `CORRECT_ANSWERS_PER_LEVEL` in DifficultySystem.ts (default: 50).

### Add New Words
Add to the appropriate `src/data/hskN.ts` file:
```typescript
{ chinese: '词', pinyin: 'cí', english: 'word', category: 'education' }
```

### Modify Gate Appearance
The `renderGate()` method in GameScene.ts handles all gate visuals.

### Adjust Player Position
Change `PLAYER_Y` constant in GameScene.ts.

## Important Patterns

### Gate Rendering
Gates are re-rendered every frame (container cleared and rebuilt). This allows smooth position updates but creates objects each frame - keep render logic efficient.

### TypeScript Strict Mode
Project uses `verbatimModuleSyntax` - use `import type` for type-only imports:
```typescript
import type { Word } from '../types';  // Correct
import { Word } from '../types';        // Will error
```

### Phaser Containers
All gate elements are added to a container, which handles positioning/scaling. When destroying gates, use `container.destroy(true)` to destroy children.

## Gotchas

1. **Gate progress must exceed 1.0** for removal - don't cap it with `Math.min(1, ...)`

2. **Sound on first interaction** - Browsers require user interaction before playing audio

3. **Type imports** - Use `import type` for interfaces/types due to tsconfig settings

4. **Container children** - When calling `container.removeAll(true)`, the `true` destroys children

## Testing Locally

```bash
npm run dev
# Open http://localhost:5173
# Use A/W/D or arrow keys to play
```

## Deployment

Build outputs to `dist/` folder - can be deployed to any static hosting (Netlify, Vercel, GitHub Pages).
