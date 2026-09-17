import { markDetailedMesh } from '../engine/AsciiShaderRenderer.js';

/**
 * ParkTrees - Generador de árboles frondosos (robles y pinos) para Central Park
 */
export class ParkTrees {
    static createOakTree(height = 6.5) {
        const group = new THREE.Group();

        // Tronco de roble
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3d28, flatShading: true });
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, height * 0.45, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = height * 0.225;
        group.add(trunk);

        // Copa frondosa esférica escalonada
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57, flatShading: true });
        const canopyLayers = [
            { r: 2.2, y: height * 0.55 },
            { r: 1.8, y: height * 0.75 },
            { r: 1.2, y: height * 0.95 }
        ];

        canopyLayers.forEach(layer => {
            const leafGeo = new THREE.DodecahedronGeometry(layer.r, 1);
            const leafMesh = new THREE.Mesh(leafGeo, leafMat);
            leafMesh.position.y = layer.y;
            leafMesh.rotation.y = Math.random() * Math.PI;
            group.add(leafMesh);
        });

        markDetailedMesh(group);
        return group;
    }

    static createPineTree(height = 8.0) {
        const group = new THREE.Group();

        // Tronco de pino
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18 });
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, height * 0.35, 5);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = height * 0.175;
        group.add(trunk);

        // Conos escalonados de follaje verde oscuro
        const pineMat = new THREE.MeshLambertMaterial({ color: 0x1c5936, flatShading: true });
        const tiers = [
            { r: 2.4, h: 2.8, y: height * 0.4 },
            { r: 1.9, h: 2.4, y: height * 0.6 },
            { r: 1.3, h: 2.0, y: height * 0.8 },
            { r: 0.8, h: 1.6, y: height * 0.95 }
        ];

        tiers.forEach(tier => {
            const coneGeo = new THREE.ConeGeometry(tier.r, tier.h, 6);
            const cone = new THREE.Mesh(coneGeo, pineMat);
            cone.position.y = tier.y;
            group.add(cone);
        });

        markDetailedMesh(group);
        return group;
    }
}
