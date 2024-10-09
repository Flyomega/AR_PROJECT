"use strict";

// Import only what you need, to help your bundler optimize final code size using tree shaking
// see https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  BoxGeometry,
  Mesh,
  MeshNormalMaterial,
  AmbientLight,
  Clock,
  Box3,
  Vector3
} from 'three';

// If you prefer to import the whole library, with the THREE prefix, use the following line instead:
// import * as THREE from 'three'

// NOTE: three/addons alias is supported by Rollup: you can use it interchangeably with three/examples/jsm/  

// Importing Ammo can be tricky.
// Vite supports webassembly: https://vitejs.dev/guide/features.html#webassembly
// so in theory this should work:
//
// import ammoinit from 'three/addons/libs/ammo.wasm.js?init';
// ammoinit().then((AmmoLib) => {
//  Ammo = AmmoLib.exports.Ammo()
// })
//
// But the Ammo lib bundled with the THREE js examples does not seem to export modules properly.
// A solution is to treat this library as a standalone file and copy it using 'vite-plugin-static-copy'.
// See vite.config.js
// 
// Consider using alternatives like Oimo or cannon-es
import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import { MeshStandardMaterial } from 'three';

import {
  FBXLoader
} from 'three/examples/jsm/loaders/FBXLoader';

import Stats from 'three/examples/jsm/libs/stats.module'

// Example of hard link to official repo for data, if needed
// const MODEL_PATH = 'https://raw.githubusercontent.com/mrdoob/js/r148/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';


// INSERT CODE HERE

const scene = new Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);

const light = new AmbientLight(0xffffff, 5.0); // soft white light
scene.add(light);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.listenToKeyEvents(window); // optional

// Restrict the camera movement to only the z-axis
controls.maxPolarAngle = Math.PI; // 180 degrees to allow full rotation around the model
controls.minPolarAngle = 0; // 0 degrees to allow full rotation around the model

// Other control settings
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation is enabled
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxDistance = 1.5;
controls.minDistance = 0.5;

const fbxLoader = new FBXLoader();

fbxLoader.load('assets/models/SkeletalSystem100.fbx', (object) => {
  object.scale.set(0.01, 0.01, 0.01)



  object.traverse((child) => {
    if (child.isMesh) {
      child.material = new MeshStandardMaterial({
        color: 0xffffff, // white color for bone-like appearance
        metalness: 0.1,  // low metalness for a non-metallic look
        roughness: 0.6   // some roughness to simulate bone texture
      });
    }
  });

  //retrieve the bounding box of the object
  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);
  console.log(size);

  //set the camera position to frame the object
  const center = new Vector3();
  box.getCenter(center);
  camera.position.set(center.x, center.y, center.z + size.z + 1);
  camera.lookAt(center);

  controls.target.copy(center);
  controls.update(); // Update the controls

  scene.add(object)
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.log('An error happened');
  }
);

camera.position.z = 3;

const clock = new Clock();

// Main loop
const animation = () => {
  stats.begin();

  renderer.setAnimationLoop(animation); // requestAnimationFrame() replacement, compatible with XR 

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  //display a timer in seconds
  console.log(elapsed);

  stats.end();

  // can be used in shaders: uniforms.u_time.value = elapsed;

  renderer.render(scene, camera);
};

const stats = new Stats()
document.body.appendChild(stats.dom)

animation();

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

// Animation loop to restrict camera movement on the x-axis
function animate() {
  requestAnimationFrame(animate);

  // Lock the camera's x position to the target's x position
  camera.position.x = controls.target.x;

  controls.update();
  renderer.render(scene, camera);
}

animate();