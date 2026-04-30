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
let cone = null;
let coneBase = null; // Добавляем переменную для основания
const spheres = [];
let plane = null;
        
// Материалы
const coneMaterial = new THREE.MeshStandardMaterial({
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

// Функция создания гладкого конуса с основанием
function createCone() {
    const height = 4; // Высота конуса
    const radius = 2.5; // Радиус основания
    const radialSegments = 64; // Много сегментов для гладкости
    
    // Создаем геометрию конуса
    const geometry = new THREE.ConeGeometry(radius, height, radialSegments, 1, false);
    
    // Перемещаем конус так, чтобы основание было на y=0
    geometry.translate(0, height / 2, 0);
    
    cone = new THREE.Mesh(geometry, coneMaterial);
    cone.position.y = 0; // Основание конуса на уровне y=0
    cone.castShadow = true;
    cone.receiveShadow = true;
    cone.userData.type = 'cone';
    cone.userData.clickable = true;
    cone.userData.height = height;
    cone.userData.radius = radius;

    scene.add(cone);
    
    // Создаем основание конуса (закрываем дно)
    const baseGeometry = new THREE.CylinderGeometry(radius, radius, 0.05, radialSegments, 1);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x2980b9,
        metalness: 0.3,
        roughness: 0.4,
        side: THREE.DoubleSide
    });
    
    coneBase = new THREE.Mesh(baseGeometry, baseMaterial);
    coneBase.position.y = 0; // Помещаем основание на уровень y=0
    coneBase.castShadow = true;
    coneBase.receiveShadow = true;
    coneBase.userData.type = 'coneBase';
    coneBase.userData.clickable = true;
    coneBase.userData.radius = radius;
    
    scene.add(coneBase);
    
    return cone;
}

// Функция для вычисления точки на поверхности конуса или его основания
function getIntersectionPointWithCone(ray) {
    const height = 4;
    const radius = 2.5;
    
    const rayOrigin = ray.origin;
    const rayDirection = ray.direction;
    
    let closestPoint = null;
    let closestDistance = Infinity;
    
    // 1. Проверяем пересечение с основанием (плоскость y=0, круг радиусом radius)
    if (Math.abs(rayDirection.y) > 0.001) { // Избегаем деления на ноль
        const tBase = (0 - rayOrigin.y) / rayDirection.y;
        
        if (tBase > 0) {
            const pointBase = new THREE.Vector3(
                rayOrigin.x + tBase * rayDirection.x,
                0,
                rayOrigin.z + tBase * rayDirection.z
            );
            
            // Проверяем, попадает ли точка в круг основания
            const distanceFromCenter = Math.sqrt(pointBase.x * pointBase.x + pointBase.z * pointBase.z);
            if (distanceFromCenter <= radius) {
                const distanceToCamera = rayOrigin.distanceTo(pointBase);
                if (distanceToCamera < closestDistance) {
                    closestDistance = distanceToCamera;
                    closestPoint = pointBase;
                }
            }
        }
    }
    
    // 2. Проверяем пересечение с боковой поверхностью конуса
    // Уравнение конуса: x² + z² = (radius/height)² * (height - y)²
    const slope = radius / height;
    
    const ox = rayOrigin.x;
    const oy = rayOrigin.y;
    const oz = rayOrigin.z;
    const dx = rayDirection.x;
    const dy = rayDirection.y;
    const dz = rayDirection.z;
    
    // Раскрываем уравнение
    const A = dx*dx + dz*dz - slope*slope*dy*dy;
    const B = 2*(ox*dx + oz*dz + slope*slope*dy*(height - oy));
    const C = ox*ox + oz*oz - slope*slope*(height - oy)*(height - oy);
    
    // Решаем квадратное уравнение
    const discriminant = B*B - 4*A*C;
    
    if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-B + sqrtDisc) / (2*A);
        const t2 = (-B - sqrtDisc) / (2*A);
        
        // Проверяем оба возможных t
        const tValues = [t1, t2];
        for (const t of tValues) {
            if (t > 0) {
                // Вычисляем точку пересечения
                const point = new THREE.Vector3(
                    ox + t * dx,
                    oy + t * dy,
                    oz + t * dz
                );
                
                // Проверяем, что точка находится в пределах конуса (0 <= y <= height)
                if (point.y >= 0 && point.y <= height) {
                    const distanceToCamera = rayOrigin.distanceTo(point);
                    if (distanceToCamera < closestDistance) {
                        closestDistance = distanceToCamera;
                        closestPoint = point;
                    }
                }
            }
        }
    }
    
    return closestPoint;
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
    
    // Сначала проверяем клики по сферам
    if (spheres.length > 0) {
        const sphereIntersects = raycaster.intersectObjects(spheres, false);
        if (sphereIntersects.length > 0) {
            const sphere = sphereIntersects[0].object;
            removeSphere(sphere);
            return; // Прерываем выполнение, если кликнули по сфере
        }
    }
    
    // Если не кликнули по сфере и сфер меньше 3, проверяем конус
    if (spheres.length < 3) {
        // Получаем луч из камеры
        const ray = raycaster.ray;
        
        // Вычисляем точку пересечения с конусом или основанием
        const point = getIntersectionPointWithCone(ray);
        
        if (point) {
            // Создаем сферу в вычисленной точке
            createSphere(point);
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
    createCone(); // Создаем конус с основанием
    
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