"use strict";

import * as THREE from 'three';

import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

import Stats from 'three/examples/jsm/libs/stats.module';
import TWEEN from '@tweenjs/tween.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

let cachedModel = null;
let renderer, scene, camera, controls, stats, clock;
let animateId;
let exitButton;

let raycaster, plane;

// Arrays to store the main organs and draggable organs
let mainOrgans = [];
let draggableOrgans = [];
let dragControls;
let originalOrganPositions = new Map();

export function createMainScene(switchToMainMenu) {

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement = null;
  }

  initScene()

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
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window);
  controls.enablePan = false;
  controls.enableRotate = true;
  controls.dampingFactor = 0.25;
  controls.enableDamping = true;
  controls.maxDistance = 1.5;
  controls.minDistance = 0.5;

  raycaster = new THREE.Raycaster();
  plane = new THREE.Plane();

  clock = new THREE.Clock();
  stats = new Stats();
  document.body.appendChild(stats.dom);
}

function onModelLoaded(object) {
  console.log("Model loaded:", object);

  console.log("Object hierarchy:");
  logHierarchy(object);


  processLoadedModel(object);
  createDraggableOrgans();
  setupDragControls();

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

function createDraggableOrgans() {

  mainOrgans.forEach((organ, index) => {
    const draggableOrgan = new THREE.Mesh(organ.geometry, organ.material.clone());
    draggableOrgan.position.set(-2, 2 - (index * 0.3), 0);
    draggableOrgan.userData.originalOrgan = organ;
    draggableOrgan.name = organ.name + "_draggable";
    draggableOrgans.push(draggableOrgan);
    scene.add(draggableOrgan);

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  const originalPosition = originalOrganPositions.get(organ);
  if (originalPosition) {
    marker.position.copy(originalPosition);
    scene.add(marker);
    console.log(`Created marker for ${organ.name} at position:`, marker.position);
  } else {
    console.warn(`No original position found for ${organ.name}`);
  }

  console.log(`Created draggable organ: ${draggableOrgan.name} at position:`, draggableOrgan.position);
  console.log(`Created marker for ${organ.name} at position:`, marker.position);
  });

  console.log(`Created ${draggableOrgans.length} draggable organs.`);
}

function setupDragControls() {
  dragControls = new DragControls(draggableOrgans, camera, renderer.domElement);

  dragControls.addEventListener('dragstart', (event) => {
    // Disable orbit controls while dragging
    controls.enabled = false;
    event.object.material.emissive.set(0x00ff00)
    updateDragPlane(event.object);
  });

  dragControls.addEventListener('drag', (event) => {
    const intersectionPoint = getIntersectionPoint(event);
    if (intersectionPoint) {
      event.object.position.copy(intersectionPoint);
    }
  });

  dragControls.addEventListener('dragend', (event) => {
    controls.enabled = true; // Re-enable orbit controls
    event.object.material.emissive.set(0x000000);
    checkOrganPlacement(event.object);
  });

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
}

function updateDragPlane(object) {
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  plane.setFromNormalAndCoplanarPoint(cameraDirection, object.position);
}

function getIntersectionPoint(event) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(plane, true);
  if (intersects.length > 0) {
    return intersects[0].point;
  } else {
    return null;
  }
}

function onPointerDown(event) {
  const draggableOrgan = getDraggableOrganUnderMouse(event);
  if (draggableOrgan) {
    controls.enabled = false;
    dragControls.dispatchEvent({ type: 'dragstart', object: draggableOrgan });
  }
}

function getDraggableOrganUnderMouse(event) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(draggableOrgans);
  return intersects.length > 0 ? intersects[0].object : null;
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

function checkOrganPlacement(draggedOrgan) {
  const originalOrgan = draggedOrgan.userData.originalOrgan;
  const originalPosition = originalOrganPositions.get(originalOrgan);

  // Convert world positions to screen positions
  const draggedScreenPosition = worldToScreen(draggedOrgan.position);
  const originalScreenPosition = worldToScreen(originalPosition);

  const distance = draggedScreenPosition.distanceTo(originalScreenPosition);

  console.log(`Checking placement for ${draggedOrgan.name}:`);
  console.log(`  Dragged position:`, draggedOrgan.position);
  console.log(`  Original position:`, originalPosition);
  console.log(`  Distance:`, distance);

  // Increase the threshold for correct placement
  const threshold = 50;  // You might need to adjust this value

  if (distance < threshold) {
    // Correct placement
    originalOrgan.visible = true;
    originalOrgan.position.copy(originalPosition);
    scene.remove(draggedOrgan);
    draggableOrgans = draggableOrgans.filter(organ => organ !== draggedOrgan);
    console.log('Correct placement!', originalOrgan.name);
    
    //audio feedback
    const audio = new Audio('assets/sounds/Success 1 Sound Effect.mp3');
    audio.play();

    // Visual feedback for correct placement
    showFeedbackMarker(originalPosition, 0x00ff00);

  } else {
    // Incorrect placement
    console.log('Incorrect placement. Try again!');
    
    // Audio feedback
    const audio = new Audio('assets/sounds/wrong_sound.mp3');
    audio.play();

    // Visual feedback for incorrect placement
    showFeedbackMarker(draggedOrgan.position, 0xff0000);

    // Return to original position
    const index = draggableOrgans.indexOf(draggedOrgan);
    draggedOrgan.position.set(-2, 2 - (index * 0.3), 0);
  }
  // Check if all organs are placed
  if (draggableOrgans.length === 0) {
    console.log('All organs placed correctly! Game complete!');
    // Add game completion logic here
  }
}

function worldToScreen(worldPosition) {
  const vector = worldPosition.clone().project(camera);
  vector.x = (vector.x + 1) / 2 * window.innerWidth;
  vector.y = -(vector.y - 1) / 2 * window.innerHeight;
  return new THREE.Vector2(vector.x, vector.y);
}

function showFeedbackMarker(position, color) {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 32, 32),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 })
  );
  marker.position.copy(position);
  scene.add(marker);
  setTimeout(() => scene.remove(marker), 1500);
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
  draggableOrgans = [];
  if (dragControls) {
    dragControls.dispose();
    dragControls = null;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}