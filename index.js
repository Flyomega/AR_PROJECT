import { createPlayScreen } from './src/play_screen.js';
import { createMainScene } from './src/main.js';

function switchToMainMenu() {
    document.body.innerHTML = '';
    createPlayScreen(switchToMainScene);
  }

function switchToMainScene() {
    document.body.innerHTML = '';
    createMainScene(switchToMainMenu);
  }

// Start with the play screen
createPlayScreen(switchToMainScene);