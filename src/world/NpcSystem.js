/**
 * NpcSystem - Peatones estilizados y bañistas en la playa con animaciones de caminata.
 */
export class NpcSystem {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
        this.sunbathers = [];

        this.initNpcs();
        this.initSunbathers();
    }

    initNpcs() {
        const npcCount = 10;
        const clothesColors = [
            0xff0077, // Rosa Flúor
            0x00ffff, // Turquesa
            0xffff00, // Amarillo brillante
            0xff8800, // Naranja Miami
            0xaa00ff, // Violeta
            0x00ff88  // Verde menta
        ];

        // Peatones en la acera oeste (X ≈ -6 a -8) y este (X ≈ 5 a 7)
        for (let i = 0; i < npcCount; i++) {
            const isWestSidewalk = i % 2 === 0;
            const x = isWestSidewalk ? (-6.5 - Math.random() * 1.5) : (5.5 + Math.random() * 1.5);
            const z = -80 + (i / npcCount) * 160 + (Math.random() * 10 - 5);
            const speed = 1.2 + Math.random() * 0.8;
            const direction = Math.random() > 0.5 ? 1 : -1;
            const shirtColor = clothesColors[i % clothesColors.length];
            const pantsColor = clothesColors[(i + 2) % clothesColors.length];

            const npcData = this.createNpcModel(shirtColor, pantsColor);
            npcData.group.position.set(x, 0, z);
            npcData.group.rotation.y = direction > 0 ? 0 : Math.PI;

            this.scene.add(npcData.group);

            this.npcs.push({
                group: npcData.group,
                leftLeg: npcData.leftLeg,
                rightLeg: npcData.rightLeg,
                leftArm: npcData.leftArm,
                rightArm: npcData.rightArm,
                speed: speed,
                dir: direction,
                animTime: Math.random() * Math.PI * 2,
                minZ: -90,
                maxZ: 90
            });
        }
    }

    initSunbathers() {
        // Bañistas acostados en toallas en la arena (X ≈ 14 a 28)
        const towelColors = [0xff0066, 0x00f0ff, 0xffcc00, 0x9900ff, 0x00ff66];
        const count = 6;

        for (let j = 0; j < count; j++) {
            const x = 15 + Math.random() * 12;
            const z = -60 + (j / count) * 120 + (Math.random() * 12 - 6);
            const color = towelColors[j % towelColors.length];

            // Toalla de playa
            const towelMat = new THREE.MeshLambertMaterial({ color: color });
            const towelGeo = new THREE.BoxGeometry(1.6, 0.04, 2.6);
            const towel = new THREE.Mesh(towelGeo, towelMat);
            towel.position.set(x, 0.05, z);
            towel.rotation.y = (Math.random() - 0.5) * 0.5;
            this.scene.add(towel);

            // Persona tomando sol
            const bodyMat = new THREE.MeshLambertMaterial({ color: 0xdfa070 });
            const bGeo = new THREE.BoxGeometry(0.6, 0.2, 1.7);
            const body = new THREE.Mesh(bGeo, bodyMat);
            body.position.set(0, 0.12, 0);
            towel.add(body);

            // Cabeza
            const headGeo = new THREE.SphereGeometry(0.2, 5, 5);
            const head = new THREE.Mesh(headGeo, bodyMat);
            head.position.set(0, 0.22, 0.85);
            towel.add(head);

            // Sombrilla de playa al lado
            if (j % 2 === 0) {
                const umbrella = this.createBeachUmbrella(color);
                umbrella.position.set(x + 1.2, 0, z + 0.8);
                this.scene.add(umbrella);
            }
        }
    }

    createBeachUmbrella(colorHex) {
        const group = new THREE.Group();
        // Poste
        const poleMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 1.4;
        pole.rotation.z = 0.15;
        group.add(pole);

        // Sombrilla (cono)
        const umbMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
        const umbGeo = new THREE.ConeGeometry(1.5, 0.7, 8, 1, true);
        const umb = new THREE.Mesh(umbGeo, umbMat);
        umb.position.set(-0.2, 2.7, 0);
        group.add(umb);

        return group;
    }

    createNpcModel(shirtColor, pantsColor) {
        const group = new THREE.Group();

        const skinMat = new THREE.MeshLambertMaterial({ color: 0xdfa070 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor, flatShading: true });
        const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor, flatShading: true });

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.3);
        const torso = new THREE.Mesh(torsoGeo, shirtMat);
        torso.position.y = 1.15;
        group.add(torso);

        // Cabeza
        const headGeo = new THREE.SphereGeometry(0.2, 6, 6);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.68;
        group.add(head);

        // Gafas de sol retro 80s
        const glassesMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const glassesGeo = new THREE.BoxGeometry(0.3, 0.08, 0.1);
        const glasses = new THREE.Mesh(glassesGeo, glassesMat);
        glasses.position.set(0, 1.7, 0.17);
        group.add(glasses);

        // Brazos
        const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
        
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.35, 1.4, 0);
        const leftArm = new THREE.Mesh(armGeo, skinMat);
        leftArm.position.y = -0.25;
        leftArmGroup.add(leftArm);
        group.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.35, 1.4, 0);
        const rightArm = new THREE.Mesh(armGeo, skinMat);
        rightArm.position.y = -0.25;
        rightArmGroup.add(rightArm);
        group.add(rightArmGroup);

        // Piernas
        const legGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.16, 0.7, 0);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.y = -0.35;
        leftLegGroup.add(leftLeg);
        group.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.16, 0.7, 0);
        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.y = -0.35;
        rightLegGroup.add(rightLeg);
        group.add(rightLegGroup);

        return {
            group,
            leftLeg: leftLegGroup,
            rightLeg: rightLegGroup,
            leftArm: leftArmGroup,
            rightArm: rightArmGroup
        };
    }

    update(delta) {
        this.npcs.forEach(npc => {
            npc.animTime += delta * npc.speed * 4.5;

            // Movimiento a lo largo de la acera
            npc.group.position.z += npc.dir * npc.speed * delta;
            if (npc.group.position.z > npc.maxZ) {
                npc.dir = -1;
                npc.group.rotation.y = Math.PI;
            } else if (npc.group.position.z < npc.minZ) {
                npc.dir = 1;
                npc.group.rotation.y = 0;
            }

            // Animación de balanceo de piernas y brazos al caminar
            const swing = Math.sin(npc.animTime) * 0.6;
            npc.leftLeg.rotation.x = swing;
            npc.rightLeg.rotation.x = -swing;
            npc.leftArm.rotation.x = -swing;
            npc.rightArm.rotation.x = swing;
        });
    }
}
