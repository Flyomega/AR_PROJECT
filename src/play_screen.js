import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

let renderer, scene, camera, controls;
let raycaster, mouse;
let playMesh, rulesMesh;
let animateId;

export function createPlayScreen(onPlay) {

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement = null;
  }

  initScene();

  const fontLoader = new FontLoader();
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    const titleGeometry = new TextGeometry('Skeleton Game', {
      font,
      size: 0.8,
      depth: 0.2,
      curveSegments: 4,
    });
    const titleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    centerText(titleMesh);
    titleMesh.position.y = 2;
    scene.add(titleMesh);

    const playGeometry = new TextGeometry('Play', {
      font,
      size: 0.5,
      depth: 0.2,
      curveSegments: 4,
    });
    const playMaterial = new THREE.MeshBasicMaterial({ color: 0x61dafb });
    playMesh = new THREE.Mesh(playGeometry, playMaterial);
    centerText(playMesh);
    playMesh.position.y = 0;
    scene.add(playMesh);

    const rulesGeometry = new TextGeometry('Rules', {
      font,
      size: 0.5,
      depth: 0.2,
    });
    const rulesMaterial = new THREE.MeshBasicMaterial({ color: 0x61dafb });
    rulesMesh = new THREE.Mesh(rulesGeometry, rulesMaterial);
    centerText(rulesMesh);
    rulesMesh.position.y = -1;
    scene.add(rulesMesh);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => onClick(event, onPlay));
  });

  camera.position.z = 5;

  window.addEventListener('resize', onWindowResize, false);

  animate();
}

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(light);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.enableZoom = false;
}

function onClick(event, onPlay) {
  if (!playMesh || !rulesMesh) return; // Ensure playMesh and rulesMesh are defined

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([playMesh, rulesMesh]);

  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    if (intersected === playMesh) {
      cleanupPlayScreen(); // Cleanup before switching to the main scene
      onPlay(); // Switch to the main scene
    } else if (intersected === rulesMesh) {
      alert('Rules of the game: ...');
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  animateId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

export function cleanupPlayScreen() {
  cancelAnimationFrame(animateId);
  window.removeEventListener('resize', onWindowResize, false);
  window.removeEventListener('click', onClick, false);

  // Ensure any existing exit button is removed
  const existingExitButton = document.querySelector('button');
  if (existingExitButton) {
    existingExitButton.parentNode.removeChild(existingExitButton);
  }
  
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
  }
  
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
  
  camera = null;
  raycaster = null;
  mouse = null;
  playMesh = null;
  rulesMesh = null;
}

function centerText(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  mesh.position.x = -size.x / 2;
}