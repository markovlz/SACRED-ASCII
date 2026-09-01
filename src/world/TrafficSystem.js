/**
 * TrafficSystem - Simulación de tráfico en Ocean Drive y Manhattan Avenue
 */
export class TrafficSystem {
    constructor(scene) {
        this.scene = scene;
        this.cars = [];
        this.carColors = [
            0xff0055, // Rosa Deportivo
            0xffffff, // Blanco Testarossa
            0x00f0ff, // Cian Eléctrico
            0xffcc00, // Amarillo Sunset
            0xff2200, // Rojo Fuego
            0x9900ff  // Púrpura Synthwave
        ];

        this.initTraffic();
    }

    initTraffic() {
        const lanes = [
            { x: -2.5, isNorth: true, limitZ: 140 },   // Ocean Drive Norte
            { x: 2.5, isNorth: false, limitZ: 140 },   // Ocean Drive Sur
            { x: -118, isNorth: true, limitZ: 140 },   // Manhattan 5th Ave Norte
            { x: -112, isNorth: false, limitZ: 140 }   // Manhattan 5th Ave Sur
        ];

        const totalCars = 12;

        for (let i = 0; i < totalCars; i++) {
            const lane = lanes[i % lanes.length];
            const z = -120 + (i / totalCars) * 240 + (Math.random() * 20 - 10);
            const speed = 14 + Math.random() * 8;
            const color = this.carColors[i % this.carColors.length];
            const isConvertible = i % 3 === 0;

            const carMesh = this.buildCarModel(color, isConvertible);
            carMesh.position.set(lane.x, 0.45, z);

            if (lane.isNorth) {
                carMesh.rotation.y = Math.PI;
            } else {
                carMesh.rotation.y = 0;
            }

            this.scene.add(carMesh);

            this.cars.push({
                mesh: carMesh,
                speed: speed,
                isNorth: lane.isNorth,
                laneX: lane.x,
                limitZ: lane.limitZ,
                wheels: carMesh.userData.wheels || []
            });
        }
    }

    buildCarModel(colorHex, isConvertible) {
        const carGroup = new THREE.Group();
        const wheels = [];

        // 1. Carrocería deportiva
        const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
        const bodyGeo = new THREE.BoxGeometry(2.1, 0.55, 4.4);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.3;
        carGroup.add(bodyMesh);

        // 2. Techo o Interior
        if (isConvertible) {
            const interiorMat = new THREE.MeshLambertMaterial({ color: 0x1f1414 });
            const interiorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.8), interiorMat);
            interiorMesh.position.set(0, 0.6, -0.2);
            carGroup.add(interiorMesh);

            const windshield = new THREE.Mesh(
                new THREE.BoxGeometry(1.7, 0.4, 0.1),
                new THREE.MeshLambertMaterial({ color: 0x88e0ff, transparent: true, opacity: 0.8 })
            );
            windshield.position.set(0, 0.7, 0.8);
            windshield.rotation.x = -0.4;
            carGroup.add(windshield);
        } else {
            const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.45, 2.2), bodyMat);
            roofMesh.position.set(0, 0.75, -0.2);
            carGroup.add(roofMesh);

            const glassMesh = new THREE.Mesh(
                new THREE.BoxGeometry(1.68, 0.35, 2.0),
                new THREE.MeshLambertMaterial({ color: 0x14202c })
            );
            glassMesh.position.set(0, 0.75, -0.2);
            carGroup.add(glassMesh);
        }

        // 3. Faros y luces traseras
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.1), lightMat);
        leftHeadlight.position.set(-0.7, 0.4, 2.21);
        carGroup.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.1), lightMat);
        rightHeadlight.position.set(0.7, 0.4, 2.21);
        carGroup.add(rightHeadlight);

        const tailLight = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.15, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff1122 })
        );
        tailLight.position.set(0, 0.4, -2.21);
        carGroup.add(tailLight);

        // 4. Ruedas
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const rimMat = new THREE.MeshLambertMaterial({ color: 0xddbb44 });
        [[-1.0, 0.0, 1.3], [1.0, 0.0, 1.3], [-1.0, 0.0, -1.3], [1.0, 0.0, -1.3]].forEach(pos => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(pos[0], pos[1], pos[2]);

            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), wheelMat);
            tire.rotation.z = Math.PI / 2;
            wheelGroup.add(tire);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 6), rimMat);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            carGroup.add(wheelGroup);
            wheels.push(wheelGroup);
        });

        carGroup.userData.wheels = wheels;
        return carGroup;
    }

    update(delta) {
        this.cars.forEach(car => {
            if (car.isNorth) {
                car.mesh.position.z -= car.speed * delta;
                if (car.mesh.position.z < -car.limitZ) {
                    car.mesh.position.z = car.limitZ;
                }
            } else {
                car.mesh.position.z += car.speed * delta;
                if (car.mesh.position.z > car.limitZ) {
                    car.mesh.position.z = -car.limitZ;
                }
            }

            car.wheels.forEach(w => {
                w.rotation.x += (car.speed * delta) / 0.35;
            });
        });
    }
}
