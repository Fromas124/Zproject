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
    side: THREE.DoubleSide // Для корректного отображения внутренних граней
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

// Функция создания шестиугольной пирамиды (метод через вершины)
function createHexagonalPyramid() {
    const height = 4; // Высота пирамиды
    const radius = 2.5; // Радиус описанной окружности основания
    
    // Создаем массив вершин
    const vertices = [];
    const indices = [];
    
    // ВЕРШИНА 0: вершина пирамиды (апекс)
    vertices.push(0, height, 0);
    
    // ВЕРШИНЫ 1-6: вершины основания (шестиугольник)
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, 0, z);
    }
    
    // ВЕРШИНА 7: центр основания (для треугольников основания)
    vertices.push(0, 0, 0);
    
    // Создаем грани для боковых сторон пирамиды (треугольники)
    for (let i = 1; i <= 6; i++) {
        const nextI = (i % 6) + 1; // Следующая вершина основания
        
        // Боковая грань пирамиды (треугольник от апекса к двум вершинам основания)
        indices.push(0, i, nextI);
    }
    
    // Создаем грани для основания пирамиды (шесть треугольников от центра основания)
    for (let i = 1; i <= 6; i++) {
        const nextI = (i % 6) + 1;
        
        // Треугольник основания (центр - вершина i - вершина nextI)
        indices.push(7, i, nextI);
    }
    
    // Создаем геометрию
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    // Улучшаем нормали для более плавного освещения
    geometry.normalizeNormals();
    
    pyramid = new THREE.Mesh(geometry, pyramidMaterial);
    pyramid.position.y = 0; // Основание пирамиды на уровне y=0
    pyramid.castShadow = true;
    pyramid.receiveShadow = true;
    pyramid.userData.type = 'pyramid';
    pyramid.userData.clickable = true;

    // Добавляем подсветку ребер как отдельный объект (не участвует в кликах)
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2
    });
    const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
    edgesMesh.userData.type = 'edge'; // Помечаем как ребро, не кликабельно
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
    
    // Добавляем подсветку
    const pointLight = new THREE.PointLight(0xff5555, 1, 5);
    pointLight.position.copy(position);
    sphere.userData.light = pointLight;
    scene.add(pointLight);
    
    spheres.push(sphere);
    scene.add(sphere);
    updateCounter();
    
    // Проверяем, нужно ли создать плоскость
    if (spheres.length === 3) {
        createPlaneThroughSpheres();
    }
    
    return sphere;
}

// Создание плоскости через три сферы
function createPlaneThroughSpheres() {
    if (spheres.length < 3) return;
    
    // Удаляем старую плоскость
    if (plane) {
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();
        if (plane.children.length > 0) {
            plane.children[0].geometry.dispose();
            plane.children[0].material.dispose();
        }
    }
    
    // Получаем позиции сфер
    const p1 = spheres[0].position;
    const p2 = spheres[1].position;
    const p3 = spheres[2].position;
    
    // Вычисляем нормаль плоскости через векторное произведение
    const v1 = new THREE.Vector3().subVectors(p2, p1);
    const v2 = new THREE.Vector3().subVectors(p3, p1);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    
    // Вычисляем расстояние от начала координат до плоскости
    const constant = -normal.dot(p1);
    
    // Создаем геометрию плоскости достаточно большую
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    
    // Вычисляем позицию центра плоскости
    const center = new THREE.Vector3()
        .add(p1)
        .add(p2)
        .add(p3)
        .multiplyScalar(1/3);
    
    // Создаем и настраиваем плоскость
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.copy(center);
    
    // Ориентируем плоскость по нормали
    plane.lookAt(center.clone().add(normal));
    
    // Добавляем контур плоскости
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
    // Удаляем свет
    if (sphere.userData.light) {
        scene.remove(sphere.userData.light);
    }
    
    // Удаляем сферу
    const index = spheres.indexOf(sphere);
    if (index > -1) {
        spheres.splice(index, 1);
    }
    
    scene.remove(sphere);
    
    // Обновляем ID оставшихся сфер
    spheres.forEach((s, i) => {
        s.userData.id = i;
    });
    
    // Удаляем плоскость, если сфер меньше 3
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
        // Пересоздаем плоскость с новыми позициями
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

    // Обновляем луч рейкастера
    raycaster.setFromCamera(mouse, camera);

    // Получаем все объекты в сцене
    const allObjects = [];
    scene.traverse((object) => {
        // Исключаем линии (ребра) и плоскости
        if (!object.isLine && object.userData.clickable !== false) {
            allObjects.push(object);
        }
    });

    const intersects = raycaster.intersectObjects(allObjects, true);

    if (intersects.length > 0) {
        // Находим первый объект, который не является ребром
        let intersect = null;
        for (const inter of intersects) {
            const obj = inter.object;
            if (obj.userData.type === 'edge') continue; // Пропускаем ребра
            
            // Если это дочерний объект, проверяем родителя
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
        
        // Проверяем пользовательские данные
        let userData = object.userData;
        if (!userData.type && object.parent) {
            userData = object.parent.userData;
        }
        
        if (userData.type === 'pyramid' && spheres.length < 3) {
            // Вычисляем точку на поверхности пирамиды
            const point = intersect.point;
            
            // Создаем сферу в точке пересечения
            createSphere(point);
        }
        else if (userData.type === 'sphere') {
            // Одиночный клик на сферу - удаляем
            const sphere = object.userData.type === 'sphere' ? object : object.parent;
            removeSphere(sphere);
        }
    }
}

// Сброс сцены
function resetScene() {
    // Удаляем сферы
    while (spheres.length > 0) {
        const sphere = spheres[0];
        removeSphere(sphere);
    }
    
    updateCounter();
}

// Инициализация
function init() {
    createHexagonalPyramid();
    
    // Обработчики событий
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // Добавляем кнопку сброса
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