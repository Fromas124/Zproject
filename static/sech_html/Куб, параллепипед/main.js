import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Raycaster } from 'three';
// dict
// Инициализация
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0f1f);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('container').appendChild(renderer.domElement);

// Элементы управления
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;

// Освещение
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(20, 30, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Переменные
let cube = null;
const spheres = [];
let plane = null;
        
// Материалы
const cubeMaterial = new THREE.MeshStandardMaterial({
    color: 0x3498db,
    metalness: 0.3,
    roughness: 0.4,
    emissive: 0x1a5276,
    emissiveIntensity: 0.1,
    side: THREE.DoubleSide
});

const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xe74c3c,
    metalness: 0.5,
    roughness: 0.3,
    emissive: 0x641e16,
    emissiveIntensity: 0.2
});

const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x2ecc71,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
});

// Функция создания куба
function createCube() {
    const size = 4;
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    cube = new THREE.Mesh(geometry, cubeMaterial);
    cube.position.y = 0;
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData.type = 'cube';
    cube.userData.clickable = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2
    });
    const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
    edgesMesh.userData.type = 'edge';
    cube.add(edgesMesh);

    scene.add(cube);
    return cube;
}

// Создание сферы в указанной позиции
function createSphere(position) {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = sphereMaterial.clone();
    material.color.setHex(0xe74c3c);
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.userData.type = 'sphere';
    sphere.userData.clickable = true;
    sphere.userData.id = spheres.length;
    
    const pointLight = new THREE.PointLight(0xff5555, 1, 5);
    pointLight.position.copy(position);
    sphere.userData.light = pointLight;
    scene.add(pointLight);
    
    spheres.push(sphere);
    scene.add(sphere);
    updateCounter();
    
    if (spheres.length === 3) {
        createPlaneThroughSpheres();
    }
    
    return sphere;
}

// Создание плоскости через три сферы
function createPlaneThroughSpheres() {
    if (spheres.length < 3) return;
    
    if (plane) {
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();
        if (plane.children.length > 0) {
            plane.children[0].geometry.dispose();
            plane.children[0].material.dispose();
        }
    }
    
    const p1 = spheres[0].position;
    const p2 = spheres[1].position;
    const p3 = spheres[2].position;
    
    const v1 = new THREE.Vector3().subVectors(p2, p1);
    const v2 = new THREE.Vector3().subVectors(p3, p1);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    
    const constant = -normal.dot(p1);
    
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    
    const center = new THREE.Vector3()
        .add(p1)
        .add(p2)
        .add(p3)
        .multiplyScalar(1/3);
    
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.copy(center);
    plane.lookAt(center.clone().add(normal));
    
    const edges = new THREE.EdgesGeometry(planeGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x27ae60
    });
    const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
    plane.add(edgesMesh);
    
    scene.add(plane);
}

// Удаление сферы
function removeSphere(sphere) {
    if (sphere.userData.light) {
        scene.remove(sphere.userData.light);
    }
    
    const index = spheres.indexOf(sphere);
    if (index > -1) {
        spheres.splice(index, 1);
    }
    
    scene.remove(sphere);
    
    spheres.forEach((s, i) => {
        s.userData.id = i;
    });
    
    if (plane && spheres.length < 3) {
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();
        if (plane.children.length > 0) {
            plane.children[0].geometry.dispose();
            plane.children[0].material.dispose();
        }
        plane = null;
    } else if (plane && spheres.length === 3) {
        createPlaneThroughSpheres();
    }
    
    updateCounter();
}

// Обновление счетчика
function updateCounter() {
    const countElement = document.getElementById('sphere-count');
    if (countElement) {
        countElement.textContent = spheres.length;
        
        if (spheres.length === 3) {
            countElement.className = 'highlight';
        } else {
            countElement.className = '';
        }
    }
}

// Raycaster для обнаружения кликов
const raycaster = new Raycaster();
const mouse = new THREE.Vector2();

// Обработка кликов
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const allObjects = [];
    scene.traverse((object) => {
        if (!object.isLine && object.userData.clickable !== false) {
            allObjects.push(object);
        }
    });

    const intersects = raycaster.intersectObjects(allObjects, true);

    if (intersects.length > 0) {
        let intersect = null;
        for (const inter of intersects) {
            const obj = inter.object;
            if (obj.userData.type === 'edge') continue;
            
            if (obj.parent && obj.parent.userData.type === 'cube') {
                intersect = inter;
                break;
            } else if (obj.userData.type === 'cube' || obj.userData.type === 'sphere') {
                intersect = inter;
                break;
            }
        }
        
        if (!intersect) return;
        
        const object = intersect.object;
        
        let userData = object.userData;
        if (!userData.type && object.parent) {
            userData = object.parent.userData;
        }
        
        if (userData.type === 'cube' && spheres.length < 3) {
            const point = intersect.point;
            createSphere(point);
        }
        else if (userData.type === 'sphere') {
            const sphere = object.userData.type === 'sphere' ? object : object.parent;
            removeSphere(sphere);
        }
    }
}

// Сброс сцены
function resetScene() {
    while (spheres.length > 0) {
        const sphere = spheres[0];
        removeSphere(sphere);
    }
    updateCounter();
}

// Инициализация
function init() {
    createCube();
    
    renderer.domElement.addEventListener('click', onMouseClick);
    
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetScene);
    }
    
    window.addEventListener('resize', onWindowResize);
    
    updateCounter();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Анимационный цикл
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();
animate();
