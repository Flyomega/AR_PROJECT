import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

export function createPlayScreen(onPlay) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(light);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.enableZoom = false;

  const fontLoader = new FontLoader();
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    const titleGeometry = new TextGeometry('Skeleton Game', {
      font,
      size: 0.8,
      depth: 0.2,
      curvedSegments: 4,
    });
    const titleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    centerText(titleMesh);
    titleMesh.position.y = 2;
    scene.add(titleMesh);

    const playGeometry = new TextGeometry('Play', { font, size: 0.5, depth: 0.2 });
    const playMaterial = new THREE.MeshBasicMaterial({ color: 0x61dafb });
    const playMesh = new THREE.Mesh(playGeometry, playMaterial);
    centerText(playMesh);
    playMesh.position.y = 0;
    scene.add(playMesh);

    const rulesGeometry = new TextGeometry('Rules', { font, size: 0.5, depth: 0.2 });
    const rulesMaterial = new THREE.MeshBasicMaterial({ color: 0x61dafb });
    const rulesMesh = new THREE.Mesh(rulesGeometry, rulesMaterial);
    centerText(rulesMesh);
    rulesMesh.position.y = -1;
    scene.add(rulesMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([playMesh, rulesMesh]);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected === playMesh) {
          onPlay(); // Switch to the main scene
        } else if (intersected === rulesMesh) {
          alert('Rules of the game: ...');
        }
      }
    });
  });

  camera.position.z = 5;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

function centerText(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  mesh.position.x = -size.x / 2;
}