import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Raycaster } from 'three';

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
let pyramid = null;
const spheres = [];
let plane = null;
        
// Материалы
const pyramidMaterial = new THREE.MeshStandardMaterial({
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

// Функция создания четырёхугольной пирамиды
function createQuadrangularPyramid() {
    const height = 4;
    const radius = 2.5;
    
    const vertices = [];
    const indices = [];
    
    // ВЕРШИНА 0: вершина пирамиды
    vertices.push(0, height, 0);
    
    // ВЕРШИНЫ 1-4: вершины основания (квадрат)
    vertices.push(radius, 0, radius);   // 1: передняя правая
    vertices.push(-radius, 0, radius);  // 2: передняя левая
    vertices.push(-radius, 0, -radius); // 3: задняя левая
    vertices.push(radius, 0, -radius);  // 4: задняя правая
    
    // ВЕРШИНА 5: центр основания
    vertices.push(0, 0, 0);
    
    // Боковые грани
    indices.push(0, 1, 2);
    indices.push(0, 2, 3);
    indices.push(0, 3, 4);
    indices.push(0, 4, 1);
    
    // Грани основания
    indices.push(5, 1, 2);
    indices.push(5, 2, 3);
    indices.push(5, 3, 4);
    indices.push(5, 4, 1);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.normalizeNormals();
    
    pyramid = new THREE.Mesh(geometry, pyramidMaterial);
    pyramid.position.y = 0;
    pyramid.castShadow = true;
    pyramid.receiveShadow = true;
    pyramid.userData.type = 'pyramid';
    pyramid.userData.clickable = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2
    });
    const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
    edgesMesh.userData.type = 'edge';
    pyramid.add(edgesMesh);

    scene.add(pyramid);
    return pyramid;
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
            
            if (obj.parent && obj.parent.userData.type === 'pyramid') {
                intersect = inter;
                break;
            } else if (obj.userData.type === 'pyramid' || obj.userData.type === 'sphere') {
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
        
        if (userData.type === 'pyramid' && spheres.length < 3) {
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
    createQuadrangularPyramid();
    
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