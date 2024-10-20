import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

let renderer, scene, camera, controls;
let raycaster, mouse;
let animateId;
let audio;
let play_button, rules_button, back_button;
let rulesTextmesh;
let isBackButtonVisible = false;

export function createPlayScreen(onPlay) {
  if (renderer) {
    cleanupPlayScreen();
  }

  initScene();
  setupEventListeners(onPlay);
  loadFontAndCreateObjects();

  animate();
}

function initScene() {

  //add audio
  audio = new Audio('assets/sounds/Funny Background Music - Funny Music Instrumental For Videos.mp3');
  audio.loop = true;
  audio.play();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const loader = new THREE.TextureLoader();
  loader.load('assets/images/lvc-health-communication-website-design-landscape.jpg', function(texture) {
    scene.background = texture;
  });

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.enableZoom = false;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
}

function setupEventListeners(onPlay) {
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', (event) => onClick(event, onPlay));
}

function loadFontAndCreateObjects() {
  const fontLoader = new FontLoader();
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    createTitle(font);
    createButtons(font);
    load_rules(font);
  });
}

function createTitle(font) {
  const titleGeometry = new TextGeometry('Jeu du squelette', {
    font,
    size: 0.9,
    depth: 0.1,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.01,
    bevelOffset: 0,
    bevelSegments: 5
  });
  const titleMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, shininess: 100 });
  const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
  centerText(titleMesh);
  titleMesh.position.set(-6, 2.2, 0);
  scene.add(titleMesh);
}

function createButtons(font) {

  play_button = createButtonText(font, 'Jouer', -5, 0.5);
  rules_button = createButtonText(font, 'Regles', -5, -0.75);
  
  // Create back button but don't add it to the scene yet
  back_button = createButtonText(font, 'Retour', -3, -2, false);
}

function createButtonText(font, text, x, y, added = true) {
  const textGeometry = new TextGeometry(text, {
    font,
    size: 0.4,
    depth: 0.05,
    curveSegments: 12,
  });
  const textMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  centerText(textMesh);
  textMesh.position.set(x, y, 0.1);
  if (added) {
    scene.add(textMesh);
  }
  return textMesh;
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([play_button, rules_button, back_button]);

  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    intersected.material.opacity = 1;
  } else {
    if (play_button) play_button.material.opacity = 0.8;
    if (rules_button) rules_button.material.opacity = 0.8;
    if (back_button) back_button.material.opacity = 0.8;
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

function onClick(event, onPlay) {
  if (!play_button || !rules_button || !back_button) return; // Ensure play_button and rules_button are defined

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([play_button, rules_button, back_button]);

  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    if (intersected === play_button && !isBackButtonVisible) {
      cleanupPlayScreen(); // Cleanup before switching to the main scene
      onPlay(); // Switch to the main scene
    } else if (intersected === rules_button && !isBackButtonVisible) {
      //hide the play and rules buttons
      visibleButtons(false);
    }
    else if (intersected === back_button){
      console.log('back button clicked');
      visibleButtons(true);
      scene.remove(back_button);
      scene.remove(rulesTextmesh);
    }
  }
}

function cleanupPlayScreen() {
  cancelAnimationFrame(animateId);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('click', onClick);

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }

  if (controls) controls.dispose();

  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  renderer = null;
  scene = null;
  camera = null;
  controls = null;
  raycaster = null;
  mouse = null;
  play_button = null;
  rules_button = null;
  back_button = null;
  rulesTextmesh = null;
  isBackButtonVisible = false;
  if (audio){
    audio.pause();
    audio.currentTime = 0;
  }
}

function visibleButtons(visible) {
  play_button.visible = visible;
  rules_button.visible = visible;
  isBackButtonVisible = !visible;
  if (visible) {
    scene.remove(rulesTextmesh);
    scene.remove(back_button);
  } else {
    scene.add(rulesTextmesh);
    scene.add(back_button);
  }
}

function centerText(textMesh) {
  textMesh.geometry.computeBoundingBox();
  const width = textMesh.geometry.boundingBox.max.x - textMesh.geometry.boundingBox.min.x;
  textMesh.position.x = -width / 2;
}

function load_rules(font){
  const rules = new TextGeometry('Les regles du jeu', {
    size: 0.2,
    depth: 0.1,
    curveSegments: 12,
    font: font
  });
  const rulesMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF , shininess: 100});
  rulesTextmesh = new THREE.Mesh(rules, rulesMaterial);
  centerText(rulesTextmesh);
  rulesTextmesh.position.set(-2, 0, 0);
}
  

// Make sure to export the necessary functions
export { cleanupPlayScreen };