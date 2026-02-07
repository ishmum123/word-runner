import { Game3D } from './Game3D';
import { hasCustomDeck } from '../utils/csvParser';

function showTitleScreen(): void {
  const container = document.getElementById('app')!;
  container.innerHTML = '';
  container.style.cssText = `
    width: 100vw;
    height: 100vh;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: Arial, sans-serif;
    position: relative;
    overflow: hidden;
  `;

  // Title
  const title = document.createElement('div');
  title.innerHTML = `
    <h1 style="color: #e94560; font-size: 64px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">WORD</h1>
    <h1 style="color: #0f3460; font-size: 64px; margin: 0; -webkit-text-stroke: 2px #e94560;">RUNNER</h1>
    <p style="color: white; font-size: 32px; margin-top: 10px;">汉语跑酷</p>
    <p style="color: #c9a227; font-size: 18px; margin-top: 5px;">3D Edition</p>
  `;
  title.style.textAlign = 'center';
  container.appendChild(title);

  // Instructions
  const instructions = document.createElement('div');
  instructions.style.cssText = 'text-align: center; margin: 30px 0;';
  instructions.innerHTML = `
    <p style="color: #aaaaaa; font-size: 18px;">Learn Chinese while you run!</p>
    <p style="color: #888888; font-size: 16px; margin-top: 10px;">Match words with their translations</p>
    <div style="margin-top: 20px; color: #888888;">
      <p>Controls: A/W/D or Arrow Keys</p>
      <p>Mobile: Swipe Left/Up/Right</p>
    </div>
  `;
  container.appendChild(instructions);

  // Start button
  const startBtn = document.createElement('button');
  startBtn.textContent = 'START';
  startBtn.style.cssText = `
    background: #e94560;
    color: white;
    border: none;
    padding: 20px 60px;
    font-size: 28px;
    font-weight: bold;
    border-radius: 15px;
    cursor: pointer;
    margin-top: 20px;
    transition: background 0.2s;
  `;
  startBtn.onmouseover = () => startBtn.style.background = '#ff6b6b';
  startBtn.onmouseout = () => startBtn.style.background = '#e94560';
  startBtn.onclick = () => startGame(hasCustomDeck());
  container.appendChild(startBtn);

  // Custom deck status
  const deckStatus = document.createElement('div');
  deckStatus.style.cssText = 'margin-top: 30px; text-align: center;';

  const customDeck = hasCustomDeck();
  if (customDeck) {
    deckStatus.innerHTML = `
      <p style="color: #00cc66; font-size: 14px;">Custom Deck Loaded</p>
      <button id="useHskBtn" style="background: #4a3030; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 10px;">Use HSK Instead</button>
    `;
  } else {
    deckStatus.innerHTML = `
      <p style="color: #888888; font-size: 14px;">Using HSK 1-6 Vocabulary</p>
      <label style="background: #0f3460; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: inline-block; margin-top: 10px;">
        Upload Custom CSV
        <input type="file" accept=".csv,.txt" style="display: none;" id="csvInput">
      </label>
    `;
  }
  container.appendChild(deckStatus);

  // Handle CSV upload
  setTimeout(() => {
    const csvInput = document.getElementById('csvInput') as HTMLInputElement;
    if (csvInput) {
      csvInput.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          const { parseAnkiCSV, saveCustomDeck } = await import('../utils/csvParser');
          const result = parseAnkiCSV(text);
          if (result.words.length > 0) {
            saveCustomDeck(result.words);
            showTitleScreen();
          } else {
            alert('No valid words found in CSV');
          }
        }
      };
    }

    const useHskBtn = document.getElementById('useHskBtn');
    if (useHskBtn) {
      useHskBtn.onclick = async () => {
        const { clearCustomDeck } = await import('../utils/csvParser');
        clearCustomDeck();
        showTitleScreen();
      };
    }
  }, 0);

  // Keyboard start
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      document.removeEventListener('keydown', handleKeydown);
      startGame(hasCustomDeck());
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

function startGame(useCustomDeck: boolean): void {
  const container = document.getElementById('app')!;
  container.innerHTML = '';
  container.style.cssText = `
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
  `;

  new Game3D(container, useCustomDeck);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  showTitleScreen();
});
