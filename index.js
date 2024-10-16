import { createPlayScreen, cleanupPlayScreen } from './src/play_screen';
import { createMainScene, cleanupMainScene } from './src/main';

let currentScene = null;

function switchToPlayScreen() {
  if (currentScene === 'main') {
    cleanupMainScene();
  }
  createPlayScreen(switchToMainScene);
  currentScene = 'play';
}

function switchToMainScene() {
  if (currentScene === 'play') {
    cleanupPlayScreen();
  }
  createMainScene(switchToPlayScreen);
  currentScene = 'main';
}

// Start with the play screen
switchToPlayScreen();