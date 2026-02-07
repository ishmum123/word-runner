# CLAUDE.md - Agent Guide for Word Runner

This file provides context for AI agents working on this codebase.

## Project Overview

Word Runner is a 3D game built with Three.js, TypeScript, and Vite. It's an endless runner where players learn Chinese vocabulary by selecting correct translations. The game features bidirectional question modes (Chinese↔English) and supports custom vocabulary via Anki CSV import.

## Build & Run Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build (outputs to dist/)
```

## Pre-Push Checklist

**IMPORTANT: Always run `npm run build` before pushing to verify the code compiles without errors.** GitHub Actions will fail on TypeScript errors, so catch them locally first.

## Architecture

### Core Game Loop

The game uses Three.js for 3D rendering with HTML overlay for UI:

1. **Title Screen** (`src/game3d/index.ts`) → Start screen with CSV upload option
2. **Game3D** (`src/game3d/Game3D.ts`) → Main 3D gameplay loop
3. **Game Over** → Shows stats overlay, retry or menu options

### Gate System (Game3D.ts)

Gates are the core mechanic - 3D arch structures with word panels that move toward the player.

```typescript
interface Gate3D {
  group: THREE.Group;      // 3D group containing all gate elements
  progress: number;        // 0 = spawned, 1 = at player
  question: WordQuestion;  // The word data
  processed: boolean;      // Has collision been handled?
  spawnTime: number;       // When gate was created
  textMeshes: THREE.Mesh[]; // Text panels for each option
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
| `src/game3d/Game3D.ts` | Main 3D gameplay - gates, player, collision |
| `src/game3d/index.ts` | Title screen and game initialization |
| `src/systems/DifficultySystem.ts` | HSK progression logic |
| `src/systems/WordManager.ts` | Word selection and distractors |
| `src/systems/ScoreSystem.ts` | Points, streaks, accuracy |
| `src/utils/csvParser.ts` | Anki CSV import for custom vocabulary |
| `src/data/hsk1-6.ts` | Vocabulary databases (~100 words each) |
| `src/audio/SoundManager.ts` | Synthesized sound effects |

## Common Modifications

### Adjust Game Speed
Edit `GATE_TRAVEL_TIME` and `GATE_SPACING_TIME` in Game3D.ts.

### Change HSK Progression
Edit `CORRECT_ANSWERS_PER_LEVEL` in DifficultySystem.ts (default: 50).

### Add New Words
Add to the appropriate `src/data/hskN.ts` file:
```typescript
{ chinese: '词', pinyin: 'cí', english: 'word', category: 'education' }
```

### Modify Gate Appearance
The `createGate()` method in Game3D.ts handles all gate visuals including panels, text, and frame.

### Adjust Player/Camera Position
Change `PLAYER_Z` constant or camera position in `setupScene()` in Game3D.ts.

## Important Patterns

### Three.js Groups
All gate elements are added to a THREE.Group, which handles positioning. When destroying gates, traverse and dispose geometries/materials to prevent memory leaks.

### TypeScript Strict Mode
Project uses `verbatimModuleSyntax` - use `import type` for type-only imports:
```typescript
import type { Word } from '../types';  // Correct
import { Word } from '../types';        // Will error
```

### Canvas Textures for Text
Text is rendered to HTML canvas elements, then used as Three.js textures on planes. Use `LinearFilter` and disable mipmaps for crisp text.

## Gotchas

1. **Gate progress must exceed 1.0** for removal - don't cap it with `Math.min(1, ...)`

2. **Sound on first interaction** - Browsers require user interaction before playing audio

3. **Type imports** - Use `import type` for interfaces/types due to tsconfig settings

4. **Memory leaks** - Always dispose Three.js geometries and materials when removing objects

5. **Perspective scaling** - Gates appear larger as they approach due to perspective camera - this is expected 3D behavior

## Testing Locally

```bash
npm run dev
# Open http://localhost:5173
# Use A/W/D or arrow keys to play
```

## Deployment

Build outputs to `dist/` folder - can be deployed to any static hosting (Netlify, Vercel, GitHub Pages).
