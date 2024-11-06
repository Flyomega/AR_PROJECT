"use strict";

import * as THREE from 'three';

import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

import TWEEN from '@tweenjs/tween.js';

let isVictoryAnimationPlaying = false;
let victoryAnimationDuration = 4000; // 5 seconds
let baseModelGroup; // New group to contain the base model
let organGroups = new Map();
let gameMode = null; // 'simple' or 'advanced'


let game_music = new Audio('assets/sounds/game_music.mp3');

let cachedModel = null;
let renderer, scene, camera, controls;
let startButtonMesh, countdownTextMesh, replayButtonMesh;
let isGameActive = false; // New flag to track if game is in progress
let isReplayMode = false; // New flag to track if in replay mode

let countdownInterval;
let countdownValue = 3;

let animateId;
let exitButton;
let raycaster;

let timerElement; // Timer element
let timerInterval; // Timer interval
let timerValue = 0; // Initial timer value

// Arrays to store the main organs and draggable organs
let mainOrgans = [];
let originalOrganPositions = new Map();
let currentOrganIndex = 0;
let organDisplay;
let baseModel;

const originalMaterials = new Map();

export function createMainScene(switchToMainMenu) {

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement = null;
  }

  initScene()
  createOrganDisplay();

  // Create and style the loader element
  const loaderElement = document.createElement('div');
  loaderElement.id = 'loader';
  loaderElement.style.position = 'fixed';
  loaderElement.style.top = '0';
  loaderElement.style.left = '0';
  loaderElement.style.width = '100%';
  loaderElement.style.height = '100%';
  loaderElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  loaderElement.style.display = 'flex';
  loaderElement.style.justifyContent = 'center';
  loaderElement.style.alignItems = 'center';
  loaderElement.style.zIndex = '1000';

  // Create and style the timer element
  timerElement = document.createElement('div');
  timerElement.id = 'timer';
  timerElement.style.position = 'fixed';
  timerElement.style.top = '60px';
  timerElement.style.right = '15px';
  timerElement.style.fontSize = '32px';
  timerElement.style.textShadow = '3px 3px 3px black';
  timerElement.style.color = 'white';
  timerElement.style.padding = '10px';
  timerElement.style.borderRadius = '5px';
  document.body.appendChild(timerElement);

  // Initialize the timer value
  timerValue = 0;

  // Use an SVG or GIF for the loader
  loaderElement.innerHTML = `
    <div id="logo-container">
      <img src="./assets/loader/Rolling@1x-1.0s-200px-200px.svg" alt="Loading SVG" id="logo" />
      <div id="loading-text">Loading</div>
    </div>
    `;

  // Create and style the exit button
  exitButton = document.createElement('button');
  exitButton.innerText = 'Exit';
  exitButton.style.position = 'absolute';
  exitButton.style.top = '10px';
  exitButton.style.right = '10px';
  exitButton.style.padding = '10px 20px';
  exitButton.style.fontSize = '24px';
  exitButton.style.cursor = 'pointer';
  exitButton.style.backgroundColor = '#ff4c4c';
  exitButton.style.color = 'white';
  exitButton.style.border = 'none';
  exitButton.style.borderRadius = '5px';
  exitButton.style.zIndex = '1000';
  document.body.appendChild(exitButton);

  // Add event listener to handle exit button click
  exitButton.addEventListener('click', () => {
    // Remove the current scene and switch to the main menu
    cleanupMainScene();
    switchToMainMenu();
  });

  document.body.appendChild(loaderElement);

  // CSS for animation and blur effect
  const style = document.createElement('style');
  style.textContent = `
  #loader {
    backdrop-filter: blur(10px);
    display: flex;
  }

  #logo {
    width: 150px;
    height: 150px;
    animation: spin 1s linear infinite;
  }

  #loading-text {
    color: white;
    font-size: 24px;
    margin-top: 20px;
    text-align: center;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  `;

  document.head.appendChild(style);

  console.log(document.getElementById('loader'));
  const objLoader = new OBJLoader();
  const mtlLoader = new MTLLoader();

  if (cachedModel) {
    // Use the cached model if it exists
    onModelLoaded(cachedModel.clone());
    loaderElement.style.display = 'none'; // Hide the loader
  } else {
    // Load the materials first
    mtlLoader.load('assets/models/source/Z-Anatomy-Layers1-7.mtl', (materials) => {
      materials.preload();
      objLoader.setMaterials(materials);
      // Load the model and cache it
      objLoader.load(
        'assets/models/source/Z-Anatomy-Layers1-7.obj',
        (object) => {
          cachedModel = object.clone(); // Cache the loaded model
          onModelLoaded(object);
          loaderElement.style.display = 'none'; // Hide the loader
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
          console.error('An error occurred:', error);
        }
      );
    });
  }

  console.log('Removed main organs:', mainOrgans);


  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('click', onMouseClick, false);

  animate();
}


function initScene() {
  scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('assets/images/background1.jpg', (texture) => {
    // Créer une géométrie sphérique inversée pour afficher la texture 360
    const sphereGeometry = new THREE.SphereGeometry(500, 60, 40); // Grand rayon pour couvrir la scène
    sphereGeometry.scale(-1, 1, 1); // Inverser la sphère pour que l'intérieur soit visible

    // Appliquer la texture à un matériau standard
    const material = new THREE.MeshBasicMaterial({
      map: texture,
    });

    // Créer la sphère et l'ajouter à la scène
    const sphere = new THREE.Mesh(sphereGeometry, material);
    scene.add(sphere);
  });

  const light = new THREE.AmbientLight(0xffffff, 5.0);
  scene.add(light);

  const pointLight = new THREE.PointLight(0xffffff, 200);
  pointLight.position.set(0, 5, 0);

  scene.add(pointLight);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableRotate = true;
  controls.dampingFactor = 0.25;
  controls.enableDamping = true;
  controls.maxDistance = 2;
  controls.minDistance = 0.7;

  raycaster = new THREE.Raycaster();
}

function createVictoryParticles() {
  const particleCount = 100;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  // Create particles around the model
  const box = new THREE.Box3().setFromObject(baseModelGroup);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  for (let i = 0; i < particleCount; i++) {
    // Position
    const radius = 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i * 3] = center.x + radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = center.y + radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = center.z + radius * Math.cos(phi);

    // Color - golden particles
    colors[i * 3] = 1;  // R
    colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;  // G
    colors[i * 3 + 2] = 0;  // B
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Animate particles
  const startTime = Date.now();

  function animateParticles() {
    const elapsedTime = Date.now() - startTime;

    if (elapsedTime < victoryAnimationDuration) {
      const positions = geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        // Spiral upward movement
        const theta = elapsedTime * 0.001 + i;
        const radius = 1.5 + (elapsedTime / victoryAnimationDuration) * 0.5;

        positions[i * 3] = center.x + radius * Math.cos(theta);
        positions[i * 3 + 1] += 0.005; // Move up
        positions[i * 3 + 2] = center.z + radius * Math.sin(theta);
      }

      geometry.attributes.position.needsUpdate = true;
      material.opacity = 1 - (elapsedTime / victoryAnimationDuration);

      requestAnimationFrame(animateParticles);
    } else {
      scene.remove(particles);
      geometry.dispose();
      material.dispose();
    }
  }

  animateParticles();
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerValue++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimerDisplay() {
  timerElement.textContent = `TIMER: ${timerValue}s`;
}

function onModelLoaded(object) {
  console.log("Model loaded:", object);

  console.log("Object hierarchy:");

  // Create a group and add the model to it
  baseModelGroup = new THREE.Group();
  baseModelGroup.add(object);
  processLoadedModel(object);

  // Set camera position and controls
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);

  camera.position.set(center.x, center.y + 0.2, center.z + size.z + 1.5);
  camera.lookAt(center);

  controls.target.copy(center);
  controls.update();

  scene.add(baseModelGroup);

  // Camera travel animation
  const startPosition = { x: center.x, y: center.y + 4, z: center.z + size.z + 5 };
  const endPosition = { x: center.x, y: center.y + 0.2, z: center.z + size.z + 1.5 };

  new TWEEN.Tween(startPosition)
    .to(endPosition, 3000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.set(startPosition.x, startPosition.y, startPosition.z);
    })
    .start();

  createDifficultySelection();
}

function createDifficultySelection() {
  // Create the difficulty selection UI
  const container = document.createElement('div');
  container.id = 'difficulty-select';
  container.style.position = 'fixed';
  container.style.top = '50%';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -50%)';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.padding = '20px';
  container.style.borderRadius = '10px';
  container.style.textAlign = 'center';
  container.style.zIndex = '1000';

  const title = document.createElement('h2');
  title.textContent = 'Select Difficulty';
  title.style.color = 'white';
  title.style.marginBottom = '20px';

  const simpleBtn = createDifficultyButton('Simple Mode', 'Place entire organs');
  const advancedBtn = createDifficultyButton('Advanced Mode', 'Place individual organ parts');

  container.appendChild(title);
  container.appendChild(simpleBtn);
  container.appendChild(advancedBtn);
  document.body.appendChild(container);

  // Add event listeners
  simpleBtn.addEventListener('click', () => {
    selectDifficulty('simple');
    container.remove();
  });

  advancedBtn.addEventListener('click', () => {
    selectDifficulty('advanced');
    container.remove();
  });
}

function createDifficultyButton(text, description) {
  const button = document.createElement('div');
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.padding = '15px';
  button.style.margin = '10px';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';
  button.style.transition = 'background-color 0.3s';

  const title = document.createElement('div');
  title.textContent = text;
  title.style.fontSize = '18px';
  title.style.fontWeight = 'bold';

  const desc = document.createElement('div');
  desc.textContent = description;
  desc.style.fontSize = '14px';
  desc.style.marginTop = '5px';
  desc.style.opacity = '0.8';

  button.appendChild(title);
  button.appendChild(desc);

  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#45a049';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#4CAF50';
  });

  return button;
}

function selectDifficulty(mode) {
  gameMode = mode;
  // Reset/prepare organs based on selected mode
  resetOrgansForMode();
  // Create start button
  createStartButton();
  window.addEventListener('click', startbuttonclick, false);
}

function resetOrgansForMode() {
  mainOrgans = []; // Clear existing organs
  originalOrganPositions.clear();

  if (gameMode === 'simple') {
    // Group organs together
    setupSimpleMode();
  } else {
    // Individual organ parts
    setupAdvancedMode();
  }
}

function setupSimpleMode() {
  const organDefinitions = {
    liver: ['liver', 'hepatic'],
    heart: ['heart', 'cardiac', 'atrium', 'ventricle'],
    lungs: ['lung', 'pulmonary'],
    kidneys: ['kidney', 'renal'],
    stomach: ['stomach', 'gastric'],
    brain: ['brain', 'cerebral', 'cerebellum'],
    intestines: ['intestine', 'bowel', 'colon', 'duodenum'],
    pancreas: ['pancreas', 'pancreatic'],
    spleen: ['spleen', 'splenic'],
    bladder: ['bladder', 'urinary']
  };

  // Clear existing organ groups
  organGroups.clear();

  // Initialize organ groups
  Object.keys(organDefinitions).forEach(organName => {
    organGroups.set(organName, {
      parts: [],
      center: new THREE.Vector3(),
      visible: false
    });
  });

  // Process and group organs
  baseModel.traverse((obj) => {
    const name = obj.name.toLowerCase();

    for (const [organName, keywords] of Object.entries(organDefinitions)) {
      if (keywords.some(keyword => name.includes(keyword.toLowerCase()))) {
        const group = organGroups.get(organName);
        group.parts.push(obj);
        obj.visible = false;
        break;
      }
    }
  });

  // Calculate centers and create main organs
  organGroups.forEach((group, organName) => {
    if (group.parts.length > 0) {
      let centerSum = new THREE.Vector3();
      let totalPoints = 0;

      group.parts.forEach(part => {
        if (part.geometry) {
          part.geometry.computeBoundingBox();
          const center = new THREE.Vector3();
          part.geometry.boundingBox.getCenter(center);
          part.localToWorld(center);
          centerSum.add(center);
          totalPoints++;
        }
      });

      if (totalPoints > 0) {
        group.center.copy(centerSum.divideScalar(totalPoints));
        mainOrgans.push({
          name: organName,
          parts: group.parts,
          center: group.center
        });
        originalOrganPositions.set(organName, group.center.clone());
      }
    }
  });
}

function setupAdvancedMode() {
  const organNames = [
    'heart', 'liver', 'lung', 'kidney', 'stomach',
    'brain', 'intestine', 'pancreas', 'spleen', 'bladder',
    'esophagus', 'trachea', 'gallbladder', 'appendix', 'thyroid',
  ];

  baseModel.traverse((obj) => {
    const name = obj.name.toLowerCase();
    if (organNames.some(organName => name.includes(organName))) {
      mainOrgans.push(obj);
      const organPos = getobjectPos(obj);
      originalOrganPositions.set(obj, organPos.clone());
      obj.visible = false;
    }
  });
}

function createFlashingEffect(organ) {
  // Store the original material if not already stored
  if (!originalMaterials.has(organ)) {
    originalMaterials.set(organ, organ.material.clone());
  }

  // Create a bright emissive material for the flash
  const flashMaterial = new THREE.MeshStandardMaterial({
    color: organ.material.color,
    emissive: new THREE.Color(0x00ff00),
    emissiveIntensity: 1,
    metalness: 0.5,
    roughness: 0.5
  });

  let flashCount = 0;
  const maxFlashes = 3;
  const flashDuration = 200; // milliseconds

  const flash = () => {
    if (flashCount >= maxFlashes * 2) {
      // Restore original material
      organ.material = originalMaterials.get(organ);
      return;
    }

    // Toggle between flash and original material
    organ.material = flashCount % 2 === 0 ? flashMaterial : originalMaterials.get(organ);
    flashCount++;

    setTimeout(flash, flashDuration);
  };

  // Start the flashing
  flash();
}

function createStartButton() {
  const fontLoader = new FontLoader();
  fontLoader.load('assets/fonts/DynaPuff_Regular.json', (font) => {
    const buttonGeometry = new TextGeometry('Start', {
      font,
      size: 0.2,
      depth: 0.1,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.01,
      bevelOffset: 0,
      bevelSegments: 5
    });
    const buttonMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff , wireframe: false});
    const buttonMaterialBlack = new THREE.MeshPhongMaterial({ color: 0x000000, wireframe: true });
    startButtonMesh = new THREE.Mesh(buttonGeometry, [buttonMaterial, buttonMaterialBlack]);
    startButtonMesh.position.set(-1.3, 1, 0); // Position the button next to the model
    startButtonMesh.lookAt(camera.position); // Make the button face the camera
    scene.add(startButtonMesh);

  });
}

function startbuttonclick(event) {
  if (!startButtonMesh) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(startButtonMesh);
  if (intersects.length > 0) {
    scene.remove(startButtonMesh);
    startCountdown();
  }
}

function startCountdown() {
  // Remove the start button
  scene.remove(startButtonMesh);

  // Create the countdown text
  const fontLoader = new FontLoader();
  fontLoader.load('assets/fonts/DynaPuff_Regular.json', (font) => {
    const countdownGeometry = new TextGeometry(countdownValue.toString(), {
      font,
      size: 0.2,
      depth: 0.1,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.01,
      bevelOffset: 0,
      bevelSegments: 5
    });
    const countdownMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff , wireframe: false});
    const buttonMaterialBlack = new THREE.MeshPhongMaterial({ color: 0x000000, wireframe: true });
    countdownTextMesh = new THREE.Mesh(countdownGeometry, [countdownMaterial, buttonMaterialBlack]);
    countdownTextMesh.position.set(-1.2, 1, 0);
    countdownTextMesh.lookAt(camera.position);
    scene.add(countdownTextMesh);

    // Start the countdown interval
    countdownInterval = setInterval(updateCountdown, 1000);
  });
}


function updateCountdown() {
  countdownValue--;
  if (countdownValue > 0) {
    // Update the countdown text
    scene.remove(countdownTextMesh);
    const fontLoader = new FontLoader();
    fontLoader.load('assets/fonts/DynaPuff_Regular.json', (font) => {
      const countdownGeometry = new TextGeometry(countdownValue.toString(), {
        font,
        size: 0.2,
        depth: 0.1,
        curveSegments: 6,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 5
      });
      const countdownMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff , wireframe: false});
      const buttonMaterialBlack = new THREE.MeshPhongMaterial({ color: 0x000000, wireframe: true });
      countdownTextMesh = new THREE.Mesh(countdownGeometry, [countdownMaterial, buttonMaterialBlack]);
      countdownTextMesh.position.set(-1.2, 1, 0);
      countdownTextMesh.lookAt(camera.position);
      scene.add(countdownTextMesh);
    });
  } else {
    // Countdown finished, start the game
    clearInterval(countdownInterval);
    scene.remove(countdownTextMesh);
    startGame();
    window.removeEventListener('click', startbuttonclick, false);
  }
}

//i want to cut the name if some regex is found.
// the regexes are : "*generated*" or "*mesh*" or "*grp*"
function cutName(name) {
  let regex = name.split(/(_generated|_grp|_mesh|_Mesh)/);
  return regex.length > 1 ? regex[0] : name;
}

function startGame() {
  game_music.play();
  mainOrgans.sort(() => Math.random() - 0.5);
  currentOrganIndex = 0;
  let organName = mainOrgans[currentOrganIndex].name;
  organName = cutName(organName);
  organDisplay.textContent = `Place the ${organName}`;
  console.log('Game started!');
  timerValue = 0;
  startTimer();
  isGameActive = true;
  isReplayMode = false;
}

function resetGame() {
  // Remove replay button if it exists
  if (replayButtonMesh) {
    scene.remove(replayButtonMesh);
    replayButtonMesh = null;
  }

  // Reset countdown and game state
  countdownValue = 3;
  isGameActive = false;
  isReplayMode = false;

  // Reset and hide all organs
  mainOrgans.forEach(organ => {
    if (gameMode === 'simple') {
      organ.parts.forEach(part => {
        part.visible = false;
      });
    } else {
      organ.visible = false;
    }
  });

  // Reset timer
  stopTimer();
  timerValue = 0;
  updateTimerDisplay();

  // Start new countdown
  startCountdown();
}

function createReplayButton() {
  const fontLoader = new FontLoader();
  fontLoader.load('assets/fonts/DynaPuff_Regular.json', (font) => {
    const buttonGeometry = new TextGeometry('Replay', {
      font,
      size: 0.2,
      depth: 0.1,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.01,
      bevelOffset: 0,
      bevelSegments: 5
    });
    const buttonMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: false });
    const buttonMaterialBlack = new THREE.MeshPhongMaterial({ color: 0x000000, wireframe: true });
    replayButtonMesh = new THREE.Mesh(buttonGeometry, [buttonMaterial, buttonMaterialBlack]);
    replayButtonMesh.position.set(-1.3, 1, 0); // Same position as start button
    replayButtonMesh.lookAt(camera.position);
    scene.add(replayButtonMesh);
  });
}

function processLoadedModel(object) {
  console.log("Processing loaded model");
  baseModel = object;

  // Define organ groups with their related parts
  const organDefinitions = {
    liver: ['liver', 'hepatic'],
    heart: ['heart', 'cardiac', 'atrium', 'ventricle'],
    lungs: ['lung', 'pulmonary'],
    kidneys: ['kidney', 'renal'],
    stomach: ['stomach', 'gastric'],
    brain: ['brain', 'cerebral', 'cerebellum'],
    intestines: ['intestine', 'bowel', 'colon', 'duodenum'],
    pancreas: ['pancreas', 'pancreatic'],
    spleen: ['spleen', 'splenic'],
    bladder: ['bladder', 'urinary']
  };

  const obstructParts = ['taenia', 'rib', 'mesocolon', 'sternum', 'cartilages', 'xiphoid', 'bronchi', 'mesocolic', 'thymus'];

  // Initialize organ groups
  Object.keys(organDefinitions).forEach(organName => {
    organGroups.set(organName, {
      parts: [],
      center: new THREE.Vector3(),
      visible: false
    });
  });

  function processObject(obj) {
    const name = obj.name.toLowerCase();

    // Check if object belongs to any organ group
    let belongsToOrgan = false;
    for (const [organName, keywords] of Object.entries(organDefinitions)) {
      if (keywords.some(keyword => name.includes(keyword.toLowerCase()))) {
        organGroups.get(organName).parts.push(obj);
        belongsToOrgan = true;
        break;
      }
    }

    // Handle obstruct parts
    if (!belongsToOrgan && obstructParts.some(part => name.includes(part.toLowerCase()))) {
      hideObjectAndChildren(obj);
    }

    // Process children recursively
    if (obj.children) {
      obj.children.forEach(processObject);
    }
  }

  function hideObjectAndChildren(obj) {
    obj.visible = false;
    if (obj.children) {
      obj.children.forEach(hideObjectAndChildren);
    }
  }

  // Process the model
  processObject(object);

  // Calculate center positions for each organ group
  organGroups.forEach((group, organName) => {
    if (group.parts.length > 0) {
      let centerSum = new THREE.Vector3();
      let totalPoints = 0;

      group.parts.forEach(part => {
        if (part.geometry) {
          part.geometry.computeBoundingBox();
          const center = new THREE.Vector3();
          part.geometry.boundingBox.getCenter(center);
          part.localToWorld(center);
          centerSum.add(center);
          totalPoints++;
        }
      });

      if (totalPoints > 0) {
        group.center.copy(centerSum.divideScalar(totalPoints));
        mainOrgans.push({
          name: organName,
          parts: group.parts,
          center: group.center
        });
        originalOrganPositions.set(organName, group.center.clone());
      }
    }
  });

  // Hide all organ parts initially
  mainOrgans.forEach(organ => {
    organ.parts.forEach(part => {
      part.visible = false;
    });
  });
}


function onMouseClick(event) {
  // Check if the difficulty selection container is visible
  const difficultySelectContainer = document.getElementById('difficulty-select');
  if (difficultySelectContainer && difficultySelectContainer.style.display !== 'none') {
    return; // Disable organ placement
  }

  if (isVictoryAnimationPlaying) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Handle replay button click
  if (replayButtonMesh) {
    const replayIntersects = raycaster.intersectObject(replayButtonMesh);
    if (replayIntersects.length > 0) {
      resetGame();
      return;
    }
  }

  // Only process organ placement if the game is active
  if (!isGameActive) return;

  const meshesToCheck = [];
  if (gameMode === 'simple') {
    baseModel.traverse((child) => {
      if (child.isMesh && !mainOrgans.some(organ => organ.parts && organ.parts.includes(child))) {
        meshesToCheck.push(child);
      }
    });
  } else {
    baseModel.traverse((child) => {
      if (child.isMesh && !mainOrgans.includes(child)) {
        meshesToCheck.push(child);
      }
    });
  }

  const intersects = raycaster.intersectObjects(meshesToCheck, false);

  if (intersects.length > 0) {
    handleOrganPlacement(intersects[0].point);
  }
}

function handleOrganPlacement(clickPoint) {
  const currentOrgan = mainOrgans[currentOrganIndex];
  const targetPosition = gameMode === 'simple' ?
    originalOrganPositions.get(currentOrgan.name) :
    originalOrganPositions.get(currentOrgan);

  const distance = clickPoint.distanceTo(targetPosition);
  const threshold = 0.08;

  console.log(distance);

  if (distance < threshold) {
    if (gameMode === 'simple') {
      currentOrgan.parts.forEach(part => {
        part.visible = true;
        createFlashingEffect(part);
      });
    } else {
      currentOrgan.visible = true;
      createFlashingEffect(currentOrgan);
    }

    playSound('assets/sounds/Success 1 Sound Effect.mp3');
    currentOrganIndex++;
    updateOrganDisplay();

    if (currentOrganIndex >= mainOrgans.length) {
      handleGameCompletion();
    }
  } else {
    showDebugPoint(clickPoint, 0x808080);
    playSound('assets/sounds/wrong_sound.mp3');
  }
}

function handleGameCompletion() {
  isGameActive = false;
  game_music.pause();
  playSound('assets/sounds/Victory Sound Effect.mp3');
  createVictoryParticles();
  stopTimer();

  // Wait for victory animation to complete before showing replay button
  setTimeout(() => {
    createReplayButton();
    organDisplay.textContent = '';
    isReplayMode = true;
  }, victoryAnimationDuration);
}

// Add debug visualization function
function showDebugPoint(position, color) {
  const debugSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    new THREE.MeshBasicMaterial({ color: color })
  );
  debugSphere.position.copy(position);
  scene.add(debugSphere);

  // Remove debug sphere after 2 seconds
  setTimeout(() => {
    scene.remove(debugSphere);
  }, 200);
}

function createOrganDisplay() {
  organDisplay = document.createElement('div');
  organDisplay.style.position = 'fixed';
  organDisplay.style.top = '25px';
  organDisplay.style.left = '50%';
  organDisplay.style.transform = 'translateX(-50%)';
  organDisplay.style.color = 'white';
  organDisplay.style.textTransform = 'uppercase';
  organDisplay.style.textAlign = 'center';
  organDisplay.style.textShadow = '3px 3px 3px black';
  organDisplay.style.fontSize = '38px';
  organDisplay.style.fontWeight = 'bold';
  organDisplay.style.zIndex = '1000';
  document.body.appendChild(organDisplay);
}

function updateOrganDisplay() {
  if (currentOrganIndex < mainOrgans.length) {
    const nextOrgan = mainOrgans[currentOrganIndex];
    const organName = gameMode === 'simple' ?
      nextOrgan.name :
      cutName(nextOrgan.name);
    organDisplay.textContent = `Place the ${organName}`;
  } else {
    const modeText = gameMode === 'simple' ? 'Simple Mode' : 'Advanced Mode';
    organDisplay.textContent = `Congratulations! ${modeText} completed in ${timerValue} seconds!`;
  }
}

const getobjectPos = (bone) => {
  if (!bone.geometry) {
    console.error("L'os n'a pas de géométrie définie.");
    return new THREE.Vector3(0, 0, 0);
  }

  bone.geometry.computeBoundingBox();
  const boundingBox = bone.geometry.boundingBox;
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  bone.localToWorld(center);

  return center;
};

function playSound(soundPath) {
  const audio = new Audio(soundPath);
  audio.play().catch(error => {
    console.warn('Audio playback failed:', error);
  });
}

function stopSound(soundPath) {
  const audio = new Audio(soundPath);
  audio.pause();
}

function animate() {
  animateId = requestAnimationFrame(animate);

  controls.update();
  TWEEN.update();
  renderer.render(scene, camera);

  if (startButtonMesh) {
    startButtonMesh.lookAt(camera.position);
  }

  if (replayButtonMesh) {
    replayButtonMesh.lookAt(camera.position);
  }
}

export function cleanupMainScene() {
  cancelAnimationFrame(animateId);
  window.removeEventListener('resize', onWindowResize, false);
  window.removeEventListener('click', onMouseClick, false);

  originalMaterials.clear();

  if (organDisplay && organDisplay.parentNode) {
    organDisplay.parentNode.removeChild(organDisplay);
  }

  if (exitButton && exitButton.parentNode) {
    exitButton.parentNode.removeChild(exitButton);
  }
  exitButton = null;

  if (renderer && renderer.domElement && renderer.domElement.parentNode) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  if (baseModelGroup) {
    scene.remove(baseModelGroup);
    baseModelGroup = null;
  }

  if (replayButtonMesh) {
    scene.remove(replayButtonMesh);
    replayButtonMesh = null;
  }

  //delete the selection menu 
  const difficultySelectContainer = document.getElementById('difficulty-select');
  if (difficultySelectContainer && difficultySelectContainer.parentNode) {
    difficultySelectContainer.parentNode.removeChild(difficultySelectContainer);
  }

  renderer = null;

  if (controls) {
    controls.dispose();
    controls = null;
  }

  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    scene = null;
  }

  if (timerElement && timerElement.parentNode) {
    stopTimer();
    timerElement.parentNode.removeChild(timerElement);
  }

  if (game_music){
    game_music.pause();
    game_music.currentTime = 0;
  }

  camera = null;
  startButtonMesh = null;
  countdownTextMesh = null;
  countdownValue = 3;
  isGameActive = false;
  isReplayMode = false;
  isVictoryAnimationPlaying = false;


  mainOrgans = [];
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}