"use strict";

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  AmbientLight,
  Clock,
  Box3,
  Vector3,
} from 'three';

import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

import Stats from 'three/examples/jsm/libs/stats.module';
import TWEEN from '@tweenjs/tween.js';

let cachedModel = null;

export function createMainScene(switchToMainMenu) {

  const scene = new Scene();
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);

  const light = new AmbientLight(0xffffff, 5.0);
  scene.add(light);

  const renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create and style the exit button
  const exitButton = document.createElement('button');
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
    document.body.removeChild(renderer.domElement);
    document.body.removeChild(exitButton);
    switchToMainMenu();
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window);
  controls.enablePan = false;
  controls.enableRotate = true;
  controls.dampingFactor = 0.25;
  controls.enableDamping = true;
  controls.maxDistance = 1.5;
  controls.minDistance = 0.5;

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

  const mainOrgans = []; // Array to store main organs

  function onModelLoaded(object) {
    // Traverse the object and simplify all meshes
    object.traverse((child) => {
      if (child.isMesh) {
        const organNames = [
          'heart', 'liver', 'lungs', 'kidney', 'stomach',
          'brain', 'intestine', 'pancreas', 'spleen', 'bladder',
          'esophagus', 'trachea', 'gallbladder', 'appendix', 'thyroid'
        ];
        const isMainOrgan = organNames.some(name => child.name.toLowerCase().includes(name));

        if (isMainOrgan) {
          console.log('Main organ:', child.name);
          mainOrgans.push(child);
        }
      }
    });

    // Remove the main organs from the object
    mainOrgans.forEach((mesh) => {
      mesh.parent.remove(mesh);
    });

    // Retrieve the bounding box of the remaining object
    const box = new Box3().setFromObject(object);
    const size = new Vector3();
    box.getSize(size);
    console.log('Object size:', size);

    // Set the camera position to frame the object
    const center = new Vector3();
    box.getCenter(center);
    camera.position.set(center.x, center.y, center.z + size.z + 1);
    camera.lookAt(center);

    controls.target.copy(center);
    controls.update(); // Update the controls

    scene.add(object); // Add the object to the scene

    // Camera travel animation
    const startPosition = { x: center.x, y: center.y + 4, z: center.z + size.z + 5 };
    const endPosition = { x: center.x, y: center.y, z: center.z + size.z + 1 };

    new TWEEN.Tween(startPosition)
      .to(endPosition, 3000) // 3 seconds duration
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        camera.position.set(startPosition.x, startPosition.y, startPosition.z);
        camera.lookAt(center);
      })
      .start();
  }

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

  console.log('Removed main organs:', mainOrgans);

  const clock = new Clock();
  const stats = new Stats();
  document.body.appendChild(stats.dom);

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // console.log(elapsed);

    controls.update();

    TWEEN.update();

    renderer.render(scene, camera);
    stats.update();
  }

  animate();

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

}
