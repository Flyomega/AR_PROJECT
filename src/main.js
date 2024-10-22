"use strict";

import * as THREE from 'three';

import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

import Stats from 'three/examples/jsm/libs/stats.module';
import TWEEN from '@tweenjs/tween.js';

let cachedModel = null;
let renderer, scene, camera, controls, stats, clock;
let animateId;
let exitButton;
let raycaster;

// Arrays to store the main organs and draggable organs
let mainOrgans = [];
let originalOrganPositions = new Map();
let currentOrganIndex = 0;
let organDisplay;
let baseModel;

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

  clock = new THREE.Clock();
  stats = new Stats();
  document.body.appendChild(stats.dom);

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
  controls.maxDistance = 1.5;
  controls.minDistance = 0.5;

  raycaster = new THREE.Raycaster();
}


function onModelLoaded(object) {
  console.log("Model loaded:", object);

  console.log("Object hierarchy:");
  logHierarchy(object);

  processLoadedModel(object);

  // Set camera position and controls
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);
  camera.position.set(center.x, center.y, center.z + size.z + 1);
  camera.lookAt(center);

  controls.target.copy(center);
  controls.update();

  scene.add(object);

  // Camera travel animation
  const startPosition = { x: center.x, y: center.y + 4, z: center.z + size.z + 5 };
  const endPosition = { x: center.x, y: center.y, z: center.z + size.z + 1 };

  new TWEEN.Tween(startPosition)
    .to(endPosition, 3000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.set(startPosition.x, startPosition.y, startPosition.z);
      camera.lookAt(center);
    })
    .start();
}

function logHierarchy(object, indent = '') {
  console.log(indent + object.name + ' (Type: ' + object.type + ')');
  if (object.children) {
    object.children.forEach(child => logHierarchy(child, indent + '  '));
  }
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
  updateOrganDisplay();
}


function onMouseClick(event) {
  if (currentOrganIndex >= mainOrgans.length) return;

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
      playSound('assets/sounds/Success 1 Sound Effect.mp3');
      currentOrganIndex++;
    } else {
      // Incorrect placement
      showDebugPoint(clickPoint, 0x808080); // Green for click point
      playSound('assets/sounds/wrong_sound.mp3');
    }
    
    updateOrganDisplay();
    
    if (currentOrganIndex >= mainOrgans.length) {
      setTimeout(() => {
        alert('Congratulations! You have completed the game!');
      }, 1000);
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
  organDisplay.style.left = '20px';
  organDisplay.style.padding = '15px';
  organDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  organDisplay.style.color = 'white';
  organDisplay.style.borderRadius = '10px';
  organDisplay.style.fontSize = '20px';
  organDisplay.style.zIndex = '1000';
  document.body.appendChild(organDisplay);
}

function updateOrganDisplay() {
  if (currentOrganIndex < mainOrgans.length) {
    const organName = mainOrgans[currentOrganIndex].name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
      .trim()
      .toLowerCase();
    organDisplay.textContent = `Place the ${organName}`;
  } else {
    organDisplay.textContent = 'Congratulations! All organs placed correctly!';
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

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  controls.update();
  TWEEN.update();
  renderer.render(scene, camera);
  stats.update();
}

export function cleanupMainScene() {
  cancelAnimationFrame(animateId);
  window.removeEventListener('resize', onWindowResize, false);
  window.removeEventListener('click', onMouseClick, false);

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
  renderer = null;

  if (controls) {
    controls.dispose();
    controls = null;
  }

  if (stats && stats.dom && stats.dom.parentNode) {
    stats.dom.parentNode.removeChild(stats.dom);
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

  camera = null;
  clock = null;

  mainOrgans = [];
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}