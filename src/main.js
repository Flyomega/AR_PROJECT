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
let victoryAnimationDuration = 5000; // 5 seconds
let baseModelGroup; // New group to contain the base model

let cachedModel = null;
let renderer, scene, camera, controls;
let startButtonMesh, countdownTextMesh, replayButtonMesh;

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
  loaderElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  loaderElement.style.display = 'flex';
  loaderElement.style.justifyContent = 'center';
  loaderElement.style.alignItems = 'center';
  loaderElement.style.zIndex = '1000';

  // Create and style the timer element
  timerElement = document.createElement('div');
  timerElement.id = 'timer';
  timerElement.style.position = 'fixed';
  timerElement.style.top = '50px';
  timerElement.style.right = '15px';
  timerElement.style.fontSize = '32px';
  timerElement.style.color = 'white';
  timerElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
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
  exitButton.style.fontSize = '16px';
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

  const light = new THREE.AmbientLight(0xffffff, 5.0);
  scene.add(light);

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

function playVictoryAnimation() {
  isVictoryAnimationPlaying = true;
  controls.enabled = false; // Disable orbital controls during animation

  // Create rotation animation
  const rotationTween = new TWEEN.Tween(baseModelGroup.rotation)
    .to(
      {
        y: baseModelGroup.rotation.y + Math.PI * 2, // Full 360° rotation
        x: baseModelGroup.rotation.x + Math.PI / 6  // Slight tilt
      },
      victoryAnimationDuration
    )
    .easing(TWEEN.Easing.Quadratic.InOut);

  // Create floating animation
  const floatTween = new TWEEN.Tween(baseModelGroup.position)
    .to(
      { y: baseModelGroup.position.y + 0.2 },
      victoryAnimationDuration / 2
    )
    .easing(TWEEN.Easing.Quadratic.InOut)
    .yoyo(true)
    .repeat(1);

  // Chain the completion callback to the rotation animation
  rotationTween.onComplete(() => {
    isVictoryAnimationPlaying = false;
    controls.enabled = true;
    createReplayButton();
  });

  // Start both animations
  rotationTween.start();
  floatTween.start();

  // Add particle effects
  createVictoryParticles();
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
  timerElement.textContent = `Timer: ${timerValue}s`;
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

  createStartButton();
  window.addEventListener('click', startbuttonclick, false);
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
    const buttonMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    startButtonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    startButtonMesh.position.set(-1.3, 1, 0); // Position the button next to the model
    startButtonMesh.lookAt(camera.position); // Make the button face the camera
    scene.add(startButtonMesh);
  });
}

function logHierarchy(object, indent = '') {
  console.log(indent + object.name + ' (Type: ' + object.type + ')');
  if (object.children) {
    object.children.forEach(child => logHierarchy(child, indent + '  '));
  }
}

function startbuttonclick(event) {
  // Get the canvas-relative mouse coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2();
  
  // Calculate mouse position relative to the canvas
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersection with the start button
  const intersects = raycaster.intersectObject(startButtonMesh, false);
  if (intersects.length > 0) {
    // Start the countdown timer
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
    const countdownMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    countdownTextMesh = new THREE.Mesh(countdownGeometry, countdownMaterial);
    countdownTextMesh.position.set(-1.2, 1, 0); // Position the countdown text
    countdownTextMesh.lookAt(camera.position); // Make the countdown text face the camera
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
      const countdownMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
      countdownTextMesh = new THREE.Mesh(countdownGeometry, countdownMaterial);
      countdownTextMesh.position.set(-1.2, 1, 0); // Position the countdown text
      countdownTextMesh.lookAt(camera.position); // Make the countdown text face the camera
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
  mainOrgans.sort(() => Math.random() - 0.5);
  currentOrganIndex = 0;
  let organName = mainOrgans[currentOrganIndex].name
  organName = cutName(organName);
  organDisplay.textContent = `Place the ${organName}`;
  console.log('Game started!');
  timerValue = 0;
  startTimer();
}

function resetGame() {
  // Reset countdown
  countdownValue = 3;
  
  // Reset and hide all organs
  mainOrgans.forEach(organ => {
    organ.visible = false;
  });
  
  // Remove replay button
  if (replayButtonMesh) {
    scene.remove(replayButtonMesh);
  }
  
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
    const buttonMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    replayButtonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    replayButtonMesh.position.set(-1.3, 1, 0); // Same position as start button
    replayButtonMesh.lookAt(camera.position);
    scene.add(replayButtonMesh);
  });
}

function processLoadedModel(object) {
  console.log("Processing loaded model");
  baseModel = object;

  const organNames = [
    'heart', 'liver', 'lung', 'kidney', 'stomach',
    'brain', 'intestine', 'pancreas', 'spleen', 'bladder',
    'esophagus', 'trachea', 'gallbladder', 'appendix', 'thyroid',
  ];
  const obstructParts = ['taenia', 'rib', 'mesocolon', 'sternum', 'cartilages', 'xiphoid', 'bronchi', 'mesocolic', 'colon', 'thymus'];

  function processObject(obj) {
    const name = obj.name.toLowerCase();
    const isMainOrgan = organNames.some(organName => name.toLowerCase().includes(organName));
    const isObstructPart = obstructParts.some(partName => name.toLowerCase().includes(partName));

    if (isMainOrgan) {
      console.log('Main organ:', obj.name);
      mainOrgans.push(obj);
      const rightorganPos = new THREE.Vector3();
      rightorganPos.copy(getobjectPos(obj));
      originalOrganPositions.set(obj, rightorganPos);
      obj.visible = false; // Hide the organ in the skeleton
    } else if (isObstructPart) {
      console.log('Obstruct part:', obj.name);
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

  // Start processing from the root object
  processObject(object);
}


function onMouseClick(event) {
  if (isVictoryAnimationPlaying) return;

  if (currentOrganIndex >= mainOrgans.length){
    // Check for replay button click when game is complete
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    if (replayButtonMesh) {
      const intersects = raycaster.intersectObject(replayButtonMesh, false);
      if (intersects.length > 0) {
        resetGame();
        return;
      }
    }
    return;
  }

  // Get the canvas-relative mouse coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2();
  
  // Calculate mouse position relative to the canvas
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  
  // Create an array of meshes to check for intersection, excluding organs
  const meshesToCheck = [];
  baseModel.traverse((child) => {
    if (child.isMesh && !mainOrgans.includes(child)) {
      meshesToCheck.push(child);
    }
  });
  
  const intersects = raycaster.intersectObjects(meshesToCheck, false);
  
  if (intersects.length > 0) {
    const clickPoint = intersects[0].point;
    const currentOrgan = mainOrgans[currentOrganIndex];
    const targetPosition = originalOrganPositions.get(currentOrgan);

    // Calculate distance between click and target position
    const distance = clickPoint.distanceTo(targetPosition);
    
    // Adjust threshold based on model scale
    const threshold = 0.07;

    console.log('Click position:', clickPoint);
    console.log('Target position:', targetPosition);
    console.log('Distance:', distance);

    if (distance < threshold) {
      // Correct placement
      currentOrgan.visible = true;
      createFlashingEffect(currentOrgan);
      playSound('assets/sounds/Success 1 Sound Effect.mp3');
      currentOrganIndex++;
      updateOrganDisplay();

      if (currentOrganIndex >= mainOrgans.length) {
        stopTimer();
        setTimeout(() => {
          createReplayButton();
        }, 500);
      }
    } else {
      // Incorrect placement
      showDebugPoint(clickPoint, 0x808080); // Green for click point
      playSound('assets/sounds/wrong_sound.mp3');
    }
  }
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
  organDisplay.style.top = '20px';
  organDisplay.style.left = '50%';
  organDisplay.style.transform = 'translateX(-50%)';
  organDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  organDisplay.style.color = 'white';
  organDisplay.style.fontSize = '30px';
  organDisplay.style.fontWeight = 'bold';
  organDisplay.style.zIndex = '1000';
  document.body.appendChild(organDisplay);
}

function updateOrganDisplay() {
  if (currentOrganIndex < mainOrgans.length) {
    let nextOrgan = mainOrgans[currentOrganIndex]
    if (nextOrgan && nextOrgan.name) {
      let organName = cutName(nextOrgan.name); 
      organDisplay.textContent = `Place the ${organName}`;
    }
  } 
  else {
    organDisplay.textContent = `Congratulations! You placed all organs in ${timerValue} seconds`;
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

  // Remove the timer element
  if (timerElement && timerElement.parentNode) {
    timerElement.parentNode.removeChild(timerElement);
  }

  camera = null;
  startButtonMesh = null;
  countdownTextMesh = null;
  countdownValue = 3;

  mainOrgans = [];
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}