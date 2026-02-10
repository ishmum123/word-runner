import type { Language } from '../types';
import { Game3D } from './Game3D';
import { hasCustomDeck } from '../utils/csvParser';

const LANGUAGE_STORAGE_KEY = 'wordrunner-language';
let selectedLanguage: Language = (localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language) || 'chinese';

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
  const subtitles: Record<Language, string> = {
    chinese: '汉语跑酷',
    arabic: 'عداء الكلمات',
    japanese: '日本語ランナー',
  };
  const subtitle = subtitles[selectedLanguage];
  title.innerHTML = `
    <h1 style="color: #e94560; font-size: 64px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">WORD</h1>
    <h1 style="color: #0f3460; font-size: 64px; margin: 0; -webkit-text-stroke: 2px #e94560;">RUNNER</h1>
    <p style="color: white; font-size: 32px; margin-top: 10px;">${subtitle}</p>
    <p style="color: #c9a227; font-size: 18px; margin-top: 5px;">3D Edition</p>
  `;
  title.style.textAlign = 'center';
  container.appendChild(title);

  // Language selector
  const langSelector = document.createElement('div');
  langSelector.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin: 20px 0; align-items: center;';

  const langOptions: { id: Language; label: string }[] = [
    { id: 'chinese', label: '中文 Chinese' },
    { id: 'arabic', label: 'العربية Arabic' },
    { id: 'japanese', label: '日本語 Japanese' },
  ];

  langOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    const isSelected = selectedLanguage === opt.id;
    btn.style.cssText = `
      background: ${isSelected ? '#c9a227' : '#2a2030'};
      color: ${isSelected ? '#1a1a2e' : '#c9a227'};
      border: 2px solid #c9a227;
      padding: 10px 24px;
      font-size: 18px;
      font-weight: bold;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    btn.onclick = () => {
      selectedLanguage = opt.id;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, opt.id);
      showTitleScreen();
    };
    langSelector.appendChild(btn);
  });
  container.appendChild(langSelector);

  // Instructions
  const instructions = document.createElement('div');
  instructions.style.cssText = 'text-align: center; margin: 20px 0;';
  const learnTexts: Record<Language, string> = {
    chinese: 'Learn Chinese while you run!',
    arabic: 'Learn Arabic while you run!',
    japanese: 'Learn Japanese while you run!',
  };
  const learnText = learnTexts[selectedLanguage];
  instructions.innerHTML = `
    <p style="color: #aaaaaa; font-size: 18px;">${learnText}</p>
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

  // Always start game with built-in vocabulary (CSV upload removed)

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

  new Game3D(container, useCustomDeck, selectedLanguage);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  showTitleScreen();
});
