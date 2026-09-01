/**
 * PalmTrees - Generador de palmeras tropicales erguidas estilo Vice City
 */
export class PalmTrees {
    static createPalmTree(height = 7.5, curve = 0.35) {
        const group = new THREE.Group();

        // 1. Tronco segmentado que crece erguido hacia arriba (+Y)
        const segments = 9;
        const segmentHeight = height / segments;
        let currentY = 0;
        let currentX = 0;
        let currentZ = 0;

        const trunkMaterial = new THREE.MeshLambertMaterial({
            color: 0x82522c, // Marrón corteza palmera
            flatShading: true
        });

        for (let i = 0; i < segments; i++) {
            const bottomRadius = 0.42 - (i / segments) * 0.18;
            const topRadius = 0.42 - ((i + 1) / segments) * 0.18;

            const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, segmentHeight, 7);
            const mesh = new THREE.Mesh(geo, trunkMaterial);
            
            // Posicionar en el centro del segmento actual
            mesh.position.set(currentX, currentY + segmentHeight / 2, currentZ);

            // Inclinación natural
            const progress = (i / segments);
            mesh.rotation.z = -progress * curve * 0.4;
            mesh.rotation.x = progress * curve * 0.2;

            group.add(mesh);

            currentY += segmentHeight;
            currentX += progress * curve * 0.25;
            currentZ += progress * curve * 0.12;
        }

        // 2. Corona superior con cocos
        const crownY = currentY;
        const crownX = currentX;
        const crownZ = currentZ;

        const coconutGeo = new THREE.SphereGeometry(0.24, 5, 5);
        const coconutMat = new THREE.MeshLambertMaterial({ color: 0x3d2314 });
        for (let k = 0; k < 4; k++) {
            const cMesh = new THREE.Mesh(coconutGeo, coconutMat);
            const angle = (k / 4) * Math.PI * 2;
            cMesh.position.set(
                crownX + Math.cos(angle) * 0.3,
                crownY - 0.1,
                crownZ + Math.sin(angle) * 0.3
            );
            group.add(cMesh);
        }

        // 3. Frondas / Hojas de Palmera (arqueadas de arriba hacia afuera y cayendo suavemente)
        const leafMaterial = new THREE.MeshLambertMaterial({
            color: 0x1db345, // Verde tropical exuberante
            flatShading: true,
            side: THREE.DoubleSide
        });

        const leafCount = 14;
        for (let j = 0; j < leafCount; j++) {
            const leafAngle = (j / leafCount) * Math.PI * 2;
            const leafArm = new THREE.Group();
            leafArm.position.set(crownX, crownY, crownZ);
            leafArm.rotation.y = leafAngle;

            // Geometría de hoja: sube un poco y luego cae en arco
            const leafGeo = new THREE.BufferGeometry();
            const len = 3.6 + Math.random() * 0.6;
            const w = 0.75;

            // Vértices formando una hoja en arco natural
            const vertices = new Float32Array([
                0, 0, 0,
                -w * 0.5, 0.4, len * 0.4,
                w * 0.5, 0.4, len * 0.4,

                -w * 0.5, 0.4, len * 0.4,
                0, -0.6, len,
                w * 0.5, 0.4, len * 0.4
            ]);

            const indices = [
                0, 1, 2,
                1, 4, 2
            ];

            leafGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            leafGeo.setIndex(indices);
            leafGeo.computeVertexNormals();

            const leafMesh = new THREE.Mesh(leafGeo, leafMaterial);
            // Inclinación inicial hacia afuera
            leafMesh.rotation.x = 0.25 + (j % 3) * 0.12;

            leafArm.add(leafMesh);
            group.add(leafArm);
        }

        return group;
    }
}
