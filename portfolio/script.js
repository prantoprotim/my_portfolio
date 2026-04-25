import * as THREE from 'https://esm.sh/three@0.136.0';
import { OrbitControls } from 'https://esm.sh/three@0.136.0/examples/jsm/controls/OrbitControls.js';

// --- Scroll Animations ---
function reveal() {
    var reveals = document.querySelectorAll(".reveal");
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        }
    }
}

window.addEventListener("scroll", reveal);
// Trigger once on load
reveal();

// --- Navbar Scroll Effect ---
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- Three.js Galaxy Background ---
const canvas = document.getElementById('bg-canvas');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(4, 3, 6);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Passive controls for gentle motion
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = false;
controls.autoRotate = false;
controls.dampingFactor = 0.05;

// Galaxy Configuration
const parameters = {
  count: 80000,
  size: 0.015,
  radius: 8,
  branches: 4,
  spin: 1,
  randomness: 0.3,
  randomnessPower: 3,
  insideColor: '#ff6030',
  outsideColor: '#1b3984',
  jetCount: 6000,
  jetHeight: 6,
  jetSpeed: 0.04
};

let geometry = null;
let material = null;
let points = null;

let jetGeometry = null;
let jetMaterial = null;
let jetPoints = null;
let jetVelocities = [];

let blackHoleMesh = null;
let accretionMesh = null;
let accretionMeshHalo = null;
let accretionPoints = null;

// --- Black Hole ---
const generateBlackHole = () => {
  if (blackHoleMesh) {
    scene.remove(blackHoleMesh);
    scene.remove(accretionMesh);
    scene.remove(accretionMeshHalo);
    if (accretionPoints) scene.remove(accretionPoints);
  }

  // Event Horizon
  const bhGeometry = new THREE.SphereGeometry(0.3, 64, 64);
  const bhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  blackHoleMesh = new THREE.Mesh(bhGeometry, bhMaterial);
  scene.add(blackHoleMesh);

  // Accretion Disk
  const diskGeometry = new THREE.RingGeometry(0.35, 0.85, 64, 8);
  const diskMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  accretionMesh = new THREE.Mesh(diskGeometry, diskMaterial);
  accretionMesh.rotation.x = Math.PI / 2;
  scene.add(accretionMesh);

  // Accretion Halo
  const haloGeometry = new THREE.RingGeometry(0.32, 0.55, 64, 8);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  accretionMeshHalo = new THREE.Mesh(haloGeometry, haloMaterial);
  accretionMeshHalo.rotation.y = Math.PI / 3;
  scene.add(accretionMeshHalo);

  // Accretion Particles
  const accParticlesCount = 6000;
  const accGeo = new THREE.BufferGeometry();
  const accPos = new Float32Array(accParticlesCount * 3);
  const accCol = new Float32Array(accParticlesCount * 3);
  const baseColor = new THREE.Color(0xffaa55);

  for (let i = 0; i < accParticlesCount; i++) {
    const i3 = i * 3;
    const r = 0.32 + Math.random() * 0.45;
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 0.02;

    accPos[i3] = Math.cos(angle) * r;
    accPos[i3 + 1] = y;
    accPos[i3 + 2] = Math.sin(angle) * r;

    const heat = 1 - ((r - 0.32) / 0.45);
    const pColor = baseColor.clone();
    pColor.offsetHSL(0, 0, heat * 0.5);

    accCol[i3] = pColor.r;
    accCol[i3 + 1] = pColor.g;
    accCol[i3 + 2] = pColor.b;
  }

  accGeo.setAttribute('position', new THREE.BufferAttribute(accPos, 3));
  accGeo.setAttribute('color', new THREE.BufferAttribute(accCol, 3));

  const accMat = new THREE.PointsMaterial({
    size: 0.012,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  accretionPoints = new THREE.Points(accGeo, accMat);
  scene.add(accretionPoints);
};

// --- Galaxy ---
const generateGalaxy = () => {
  if (points !== null) {
    geometry.dispose();
    material.dispose();
    scene.remove(points);
  }

  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;

    let radius = Math.random() * parameters.radius;
    if (radius < 1.2) radius += 1.2;

    const spinAngle = radius * parameters.spin;
    const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;

    const randomX =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    const randomY =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    const randomZ =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    const x = Math.cos(branchAngle + spinAngle) * radius + randomX;
    const y = randomY / 2;
    const z = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);
};

// --- Jet ---
const generateJet = () => {
  if (jetPoints !== null) {
    jetGeometry.dispose();
    jetMaterial.dispose();
    scene.remove(jetPoints);
  }

  jetGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.jetCount * 3);
  const colors = new Float32Array(parameters.jetCount * 3);

  jetVelocities = [];
  const colorCore = new THREE.Color('#aaccff');

  for (let i = 0; i < parameters.jetCount; i++) {
    const i3 = i * 3;

    const rStart = Math.random() * 0.1;
    const angle = Math.random() * Math.PI * 2;

    positions[i3] = Math.cos(angle) * rStart;
    const direction = Math.random() > 0.5 ? 1 : -1;
    positions[i3 + 1] = direction * 0.3;
    positions[i3 + 2] = Math.sin(angle) * rStart;

    const spread = 0.005;
    const vx = (Math.random() - 0.5) * spread;
    const vy = (Math.random() * 0.2 + 1.2) * parameters.jetSpeed * direction;
    const vz = (Math.random() - 0.5) * spread;

    jetVelocities.push({ vx, vy, vz, direction });

    colors[i3] = colorCore.r;
    colors[i3 + 1] = colorCore.g;
    colors[i3 + 2] = colorCore.b;
  }

  jetGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  jetGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  jetMaterial = new THREE.PointsMaterial({
    size: 0.03,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.9
  });

  jetPoints = new THREE.Points(jetGeometry, jetMaterial);
  scene.add(jetPoints);
};

// --- Background Stars ---
const generateBgStars = () => {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 3000;
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;

    const r = 15 + Math.random() * 90;
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);

    starPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i3 + 2] = r * Math.cos(phi);
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

  const starMaterial = new THREE.PointsMaterial({
    color: 0x888888,
    size: 0.03,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
};

// Initialize
generateBlackHole();
generateGalaxy();
generateJet();
generateBgStars();

// Animation Loop
const clock = new THREE.Clock();
const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  if (points) points.rotation.y = elapsedTime * 0.05;

  if (accretionPoints) accretionPoints.rotation.y = elapsedTime * 2.0;
  if (accretionMesh) accretionMesh.rotation.z = elapsedTime * 1.5;
  if (accretionMeshHalo) accretionMeshHalo.rotation.z = -elapsedTime * 0.5;

  if (jetPoints) {
    jetPoints.rotation.y = elapsedTime * 0.05;

    const positions = jetPoints.geometry.attributes.position.array;
    const colors = jetPoints.geometry.attributes.color.array;

    for (let i = 0; i < parameters.jetCount; i++) {
      const i3 = i * 3;
      const velocity = jetVelocities[i];

      positions[i3] += velocity.vx;
      positions[i3 + 1] += velocity.vy;
      positions[i3 + 2] += velocity.vz;

      positions[i3] += positions[i3] * 0.01;
      positions[i3 + 2] += positions[i3 + 2] * 0.01;

      const dist = Math.abs(positions[i3 + 1]);
      const lifeRatio = Math.max(0, 1 - (dist / parameters.jetHeight));

      colors[i3] = 1.0 - (0.4 * lifeRatio);
      colors[i3 + 1] = 0.8 * lifeRatio;
      colors[i3 + 2] = 1.0 * lifeRatio + 0.3;

      if (Math.abs(positions[i3 + 1]) > parameters.jetHeight || Math.random() < 0.002) {
        const rStart = Math.random() * 0.05;
        const angle = Math.random() * Math.PI * 2;
        const direction = velocity.direction;

        positions[i3] = Math.cos(angle) * rStart;
        positions[i3 + 1] = direction * 0.16;
        positions[i3 + 2] = Math.sin(angle) * rStart;
      }
    }

    jetPoints.geometry.attributes.position.needsUpdate = true;
    jetPoints.geometry.attributes.color.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Smooth Scrolling for Anchor Links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 70, // Adjust for navbar
                behavior: 'smooth'
            });
        }
    });
});
