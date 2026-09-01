import { PalmTrees } from './PalmTrees.js';
import { ParkTrees } from './ParkTrees.js';

/**
 * CityBuilder - Megaciudad híbrida con fuentes ornamentales, callejones,
 * balcones y Registro de Colisiones Estáticas (Edificios, Rascacielos, Palmeras, Fuente).
 */
export class CityBuilder {
    constructor(scene) {
        this.scene = scene;
        this.oceanMesh = null;
        this.lakeMesh = null;
        this.fountainJets = [];
        this.billboardMesh = null;
        this.time = 0;

        // Registro de Colisiones Físicas Estáticas
        this.colliders = [];

        this.buildSkyAndAtmosphere();
        this.buildViceBeachDistrict();
        this.buildCentralParkDistrict();
        this.buildManhattanSkyscraperDistrict();
        this.buildConnectingAvenues();
    }

    addBoxCollider(centerX, centerZ, width, depth) {
        const halfW = width / 2;
        const halfD = depth / 2;
        this.colliders.push({
            type: 'box',
            minX: centerX - halfW,
            maxX: centerX + halfW,
            minZ: centerZ - halfD,
            maxZ: centerZ + halfD
        });
    }

    addCircleCollider(centerX, centerZ, radius) {
        this.colliders.push({
            type: 'circle',
            x: centerX,
            z: centerZ,
            radius: radius
        });
    }

    checkCollision(px, pz, playerRadius = 0.5) {
        for (let i = 0; i < this.colliders.length; i++) {
            const c = this.colliders[i];
            if (c.type === 'box') {
                // Colisión Círculo vs AABB Box
                const nearestX = Math.max(c.minX, Math.min(px, c.maxX));
                const nearestZ = Math.max(c.minZ, Math.min(pz, c.maxZ));
                const dx = px - nearestX;
                const dz = pz - nearestZ;
                if ((dx * dx + dz * dz) < (playerRadius * playerRadius)) {
                    return true;
                }
            } else if (c.type === 'circle') {
                const dx = px - c.x;
                const dz = pz - c.z;
                const minDist = playerRadius + c.radius;
                if ((dx * dx + dz * dz) < (minDist * minDist)) {
                    return true;
                }
            }
        }
        return false;
    }

    buildSkyAndAtmosphere() {
        const skyGeo = new THREE.SphereGeometry(350, 16, 16);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x1a0626,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        const sunGeo = new THREE.CircleGeometry(32, 24);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xff2875,
            side: THREE.DoubleSide
        });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(180, 28, 0);
        sun.rotation.y = -Math.PI / 2;
        this.scene.add(sun);

        const ambientLight = new THREE.AmbientLight(0xdab8ff, 0.85);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffb266, 1.4);
        sunLight.position.set(90, 60, 30);
        this.scene.add(sunLight);
    }

    buildViceBeachDistrict() {
        const roadLength = 320;

        // Avenida Ocean Drive
        const roadGeo = new THREE.PlaneGeometry(12, roadLength);
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x151518 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.02, 0);
        this.scene.add(road);

        // Línea central amarilla
        const dashCount = 50;
        const dashMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const dashGeo = new THREE.PlaneGeometry(0.25, 3.2);
        for (let i = 0; i < dashCount; i++) {
            const dash = new THREE.Mesh(dashGeo, dashMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.03, -roadLength / 2 + (i / dashCount) * roadLength + 2);
            this.scene.add(dash);
        }

        // Paseo marítimo
        const eastWalkGeo = new THREE.PlaneGeometry(9, roadLength);
        const eastWalkMat = new THREE.MeshLambertMaterial({ color: 0x544766 });
        const eastWalk = new THREE.Mesh(eastWalkGeo, eastWalkMat);
        eastWalk.rotation.x = -Math.PI / 2;
        eastWalk.position.set(10.5, 0.08, 0);
        this.scene.add(eastWalk);

        // Playa de Arena Dorada
        const sandGeo = new THREE.PlaneGeometry(40, roadLength);
        const sandMat = new THREE.MeshLambertMaterial({ color: 0xdeb362, roughness: 0.95 });
        const sand = new THREE.Mesh(sandGeo, sandMat);
        sand.rotation.x = -Math.PI / 2;
        sand.position.set(35, 0.04, 0);
        this.scene.add(sand);

        // Océano
        const oceanGeo = new THREE.PlaneGeometry(160, roadLength, 32, 32);
        const oceanMat = new THREE.MeshLambertMaterial({ color: 0x0066aa, flatShading: true });
        this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
        this.oceanMesh.rotation.x = -Math.PI / 2;
        this.oceanMesh.position.set(135, 0.0, 0);
        this.scene.add(this.oceanMesh);

        // Casetas de salvavidas con colisión
        [-40, 50].forEach((zPos, idx) => {
            const tower = this.createLifeguardTower(idx === 0 ? 0xff3388 : 0x00f0ff);
            tower.position.set(38, 0, zPos);
            this.scene.add(tower);
            this.addBoxCollider(38, zPos, 3.8, 3.8);
        });

        // Palmeras erguidas con colisión cilíndrica de tronco
        for (let z = -140; z <= 140; z += 18) {
            const zRand = z + (Math.random() * 2 - 1);
            const palm = PalmTrees.createPalmTree(8.0, 0.35);
            palm.position.set(8.0, 0, zRand);
            this.scene.add(palm);
            this.addCircleCollider(8.0, zRand, 0.65);

            if (Math.abs(z % 36) < 4) {
                const beachPalm = PalmTrees.createPalmTree(7.5, -0.3);
                beachPalm.position.set(28, 0, z + 4);
                this.scene.add(beachPalm);
                this.addCircleCollider(28, z + 4, 0.65);
            }
        }

        // Hoteles Art-Deco con colisiones físicas de edificios
        const beachHotels = [
            { name: "THE MARLIN", color: 0x50c8a8, neon: 0x00f0ff, height: 18, z: -120 },
            { name: "OCEAN VIEW", color: 0x58c5a4, neon: 0x00f0ff, height: 22, z: -80 },
            { name: "THE COLONIS", color: 0xff8fa3, neon: 0xff0077, height: 25, z: -40 },
            { name: "DECO PALACE", color: 0xffd166, neon: 0xff5500, height: 20, z: 0 },
            { name: "CARLYLE", color: 0x8ecae6, neon: 0x00e5ff, height: 21, z: 40 },
            { name: "FLAMINGO", color: 0xff70a6, neon: 0xff1493, height: 19, z: 80 },
            { name: "BEACON RESORT", color: 0x06d6a0, neon: 0x00ff99, height: 24, z: 120 }
        ];

        beachHotels.forEach(h => {
            const hotel = this.createArtDecoHotel(h);
            hotel.position.set(-18, 0, h.z);
            this.scene.add(hotel);
            this.addBoxCollider(-18, h.z, 14.5, 26.5);
        });
    }

    createArtDecoHotel(h) {
        const group = new THREE.Group();
        const mainMat = new THREE.MeshLambertMaterial({ color: h.color, flatShading: true });
        const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(14, h.height, 26), mainMat);
        mainMesh.position.y = h.height / 2;
        group.add(mainMesh);

        const balconyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
        const floors = Math.floor(h.height / 4);
        for (let f = 1; f < floors; f++) {
            const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 6), balconyMat);
            b1.position.set(7.5, f * 4, -5);
            group.add(b1);

            const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 6), balconyMat);
            b2.position.set(7.5, f * 4, 5);
            group.add(b2);
        }

        const topMesh = new THREE.Mesh(
            new THREE.BoxGeometry(10, 3.5, 18),
            new THREE.MeshLambertMaterial({ color: 0xf5f5f5 })
        );
        topMesh.position.set(0, h.height + 1.75, 0);
        group.add(topMesh);

        const spire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.7, 6, 6),
            new THREE.MeshBasicMaterial({ color: h.neon })
        );
        spire.position.set(0, h.height + 6, 0);
        group.add(spire);

        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 1.8, 14),
            new THREE.MeshBasicMaterial({ color: h.neon })
        );
        sign.position.set(7.1, h.height * 0.7, 0);
        group.add(sign);

        return group;
    }

    createLifeguardTower(colorHex) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const hutMat = new THREE.MeshLambertMaterial({ color: colorHex });
        const roofMat = new THREE.MeshLambertMaterial({ color: 0xffea00 });

        [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([px, pz]) => {
            const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6), woodMat);
            stilt.position.set(px, 1.6, pz);
            group.add(stilt);
        });

        const plat = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.25, 4.0), woodMat);
        plat.position.y = 3.2;
        group.add(plat);

        const hut = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 2.8), hutMat);
        hut.position.y = 4.5;
        group.add(hut);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), roofMat);
        roof.position.y = 6.3;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);

        return group;
    }

    buildCentralParkDistrict() {
        const parkLength = 300;
        const parkWidth = 70;
        const parkCenterX = -70;

        const grassGeo = new THREE.PlaneGeometry(parkWidth, parkLength);
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x276638, roughness: 0.9 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(parkCenterX, 0.05, 0);
        this.scene.add(grass);

        // Lago Central
        const lakeGeo = new THREE.PlaneGeometry(35, 110, 16, 16);
        const lakeMat = new THREE.MeshLambertMaterial({ color: 0x114466, flatShading: true });
        this.lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
        this.lakeMesh.rotation.x = -Math.PI / 2;
        this.lakeMesh.position.set(parkCenterX, 0.08, -15);
        this.scene.add(this.lakeMesh);

        // Puente de piedra estilo Bow Bridge
        const bridge = new THREE.Mesh(
            new THREE.BoxGeometry(40, 1.2, 8),
            new THREE.MeshLambertMaterial({ color: 0x8a847e })
        );
        bridge.position.set(parkCenterX, 0.9, -15);
        this.scene.add(bridge);

        // ⛲ FUENTE DE AGUA ORNAMENTAL (Plaza Central de Central Park)
        const fountain = this.buildWaterFountain();
        fountain.position.set(parkCenterX, 0, 50);
        this.scene.add(fountain);
        this.addCircleCollider(parkCenterX, 50, 6.6); // Colisión circular de la fuente

        // Senderos peatonales
        const pathMat = new THREE.MeshLambertMaterial({ color: 0x756b5d });
        const pathGeo = new THREE.PlaneGeometry(4.5, parkLength);
        const mainPath = new THREE.Mesh(pathGeo, pathMat);
        mainPath.rotation.x = -Math.PI / 2;
        mainPath.position.set(parkCenterX - 18, 0.09, 0);
        this.scene.add(mainPath);

        const eastPath = new THREE.Mesh(pathGeo, pathMat);
        eastPath.rotation.x = -Math.PI / 2;
        eastPath.position.set(parkCenterX + 18, 0.09, 0);
        this.scene.add(eastPath);

        // Árboles con colisión cilíndrica
        for (let z = -130; z <= 130; z += 15) {
            const zO1 = z + (Math.random() * 4 - 2);
            const oak1 = ParkTrees.createOakTree(7.0 + Math.random() * 1.5);
            oak1.position.set(parkCenterX + 26, 0, zO1);
            this.scene.add(oak1);
            this.addCircleCollider(parkCenterX + 26, zO1, 0.75);

            const zP1 = z + (Math.random() * 4 - 2);
            const pine1 = ParkTrees.createPineTree(8.5 + Math.random() * 1.5);
            pine1.position.set(parkCenterX - 26, 0, zP1);
            this.scene.add(pine1);
            this.addCircleCollider(parkCenterX - 26, zP1, 0.75);

            if (Math.abs(z) > 40 && Math.abs(z - 50) > 15) {
                const oak2 = ParkTrees.createOakTree(6.5);
                const xO2 = parkCenterX + (Math.random() * 20 - 10);
                oak2.position.set(xO2, 0, z);
                this.scene.add(oak2);
                this.addCircleCollider(xO2, z, 0.75);
            }
        }
    }

    buildWaterFountain() {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
        const waterMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.0, 0.6, 16), stoneMat);
        base.position.y = 0.3;
        group.add(base);

        const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 5.8, 0.5, 16), waterMat);
        waterDisc.position.y = 0.4;
        group.add(waterDisc);

        const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.0, 1.4, 12), stoneMat);
        tier1.position.y = 1.3;
        group.add(tier1);

        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.5, 8), stoneMat);
        pillar.position.y = 2.8;
        group.add(pillar);

        for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2;
            const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 5), waterMat);
            jet.position.set(Math.cos(angle) * 1.8, 2.6, Math.sin(angle) * 1.8);
            group.add(jet);
            this.fountainJets.push(jet);
        }

        return group;
    }

    buildManhattanSkyscraperDistrict() {
        const avenueX = -115;
        const avenueLength = 320;

        const ave = new THREE.Mesh(
            new THREE.PlaneGeometry(14, avenueLength),
            new THREE.MeshLambertMaterial({ color: 0x16161c })
        );
        ave.rotation.x = -Math.PI / 2;
        ave.position.set(avenueX, 0.02, 0);
        this.scene.add(ave);

        // 1. EMPIRE STATE BUILDING con colisión
        const empireState = this.buildEmpireStateBuilding();
        empireState.position.set(-155, 0, 0);
        this.scene.add(empireState);
        this.addBoxCollider(-155, 0, 35, 35);

        // 2. CHRYSLER TOWER con colisión
        const chrysler = this.buildChryslerTower();
        chrysler.position.set(-155, 0, -70);
        this.scene.add(chrysler);
        this.addBoxCollider(-155, -70, 29, 29);

        // 3. TIMES SQUARE BILLBOARD TOWER con colisión
        const timesSquare = this.buildTimesSquareTower();
        timesSquare.position.set(-155, 0, 70);
        this.scene.add(timesSquare);
        this.addBoxCollider(-155, 70, 29, 29);

        // 4. Rascacielos adicionales con colisión
        const additionalTowers = [
            { x: -190, z: -110, h: 85, w: 30, color: 0x1c1833, neon: 0x00f0ff },
            { x: -190, z: -40, h: 105, w: 32, color: 0x221838, neon: 0xff0077 },
            { x: -190, z: 35, h: 95, w: 28, color: 0x151229, neon: 0xffdd00 },
            { x: -190, z: 105, h: 80, w: 34, color: 0x201836, neon: 0x00ff88 }
        ];

        additionalTowers.forEach(t => {
            const tower = this.buildModernTower(t.w, t.h, t.color, t.neon);
            tower.position.set(t.x, 0, t.z);
            this.scene.add(tower);
            this.addBoxCollider(t.x, t.z, t.w + 1, t.w + 1);
        });
    }

    buildEmpireStateBuilding() {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x5e5669, flatShading: true });
        const winMat = new THREE.MeshBasicMaterial({ color: 0xffea88 });

        const b1 = new THREE.Mesh(new THREE.BoxGeometry(34, 45, 34), stoneMat);
        b1.position.y = 22.5;
        group.add(b1);

        const b2 = new THREE.Mesh(new THREE.BoxGeometry(26, 45, 26), stoneMat);
        b2.position.y = 67.5;
        group.add(b2);

        const b3 = new THREE.Mesh(new THREE.BoxGeometry(18, 35, 18), stoneMat);
        b3.position.y = 107.5;
        group.add(b3);

        const crownMat = new THREE.MeshLambertMaterial({ color: 0xd8d0e5 });
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(4, 8, 12, 8), crownMat);
        crown.position.y = 131;
        group.add(crown);

        const spireMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.5, 30, 8), spireMat);
        spire.position.y = 152;
        group.add(spire);

        for (let f = 1; f < 10; f++) {
            for (let c = -4; c <= 4; c += 2) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.2), winMat);
                win.position.set(17.1, f * 9, c * 3.2);
                group.add(win);
            }
        }

        return group;
    }

    buildChryslerTower() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x474254, flatShading: true });

        const b1 = new THREE.Mesh(new THREE.BoxGeometry(28, 75, 28), bodyMat);
        b1.position.y = 37.5;
        group.add(b1);

        const arches = [
            { w: 22, h: 8, y: 79, color: 0x00f0ff },
            { w: 16, h: 7, y: 86.5, color: 0x00f0ff },
            { w: 10, h: 6, y: 93, color: 0x00f0ff }
        ];

        arches.forEach(a => {
            const archMesh = new THREE.Mesh(
                new THREE.BoxGeometry(a.w, a.h, a.w),
                new THREE.MeshLambertMaterial({ color: 0xdedede })
            );
            archMesh.position.y = a.y;
            group.add(archMesh);

            const neonBorder = new THREE.Mesh(
                new THREE.BoxGeometry(a.w + 0.3, 0.8, a.w + 0.3),
                new THREE.MeshBasicMaterial({ color: a.color })
            );
            neonBorder.position.y = a.y + a.h * 0.4;
            group.add(neonBorder);
        });

        const needle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 2.0, 24, 8),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        needle.position.y = 108;
        group.add(needle);

        return group;
    }

    buildTimesSquareTower() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x221833 });

        const b1 = new THREE.Mesh(new THREE.BoxGeometry(28, 80, 28), bodyMat);
        b1.position.y = 40;
        group.add(b1);

        const billboardMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const billboard = new THREE.Mesh(new THREE.PlaneGeometry(16, 24), billboardMat);
        billboard.position.set(14.1, 45, 0);
        billboard.rotation.y = Math.PI / 2;
        group.add(billboard);
        this.billboardMesh = billboard;

        const topLight = new THREE.Mesh(
            new THREE.BoxGeometry(28.4, 1.5, 28.4),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        topLight.position.y = 80.5;
        group.add(topLight);

        return group;
    }

    buildModernTower(width, height, colorHex, neonHex) {
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), mat);
        body.position.y = height / 2;
        group.add(body);

        const beacon = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.4, 1.5, width + 0.4),
            new THREE.MeshBasicMaterial({ color: neonHex })
        );
        beacon.position.y = height + 0.75;
        group.add(beacon);

        return group;
    }

    buildConnectingAvenues() {
        const crossZ = [-90, 0, 90];
        const crossGeo = new THREE.PlaneGeometry(150, 10);
        const crossMat = new THREE.MeshLambertMaterial({ color: 0x16161c });

        crossZ.forEach(zPos => {
            const street = new THREE.Mesh(crossGeo, crossMat);
            street.rotation.x = -Math.PI / 2;
            street.position.set(-60, 0.025, zPos);
            this.scene.add(street);
        });
    }

    update(delta) {
        this.time += delta;

        if (this.oceanMesh) {
            const posAttr = this.oceanMesh.geometry.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                const u = posAttr.getX(i);
                const v = posAttr.getY(i);
                const waveHeight = Math.sin(u * 0.1 + this.time * 1.8) * 0.4 +
                                   Math.cos(v * 0.08 + this.time * 1.4) * 0.3;
                posAttr.setZ(i, waveHeight);
            }
            posAttr.needsUpdate = true;
        }

        if (this.fountainJets.length) {
            this.fountainJets.forEach((jet, idx) => {
                const scaleY = 1.0 + Math.sin(this.time * 5.0 + idx) * 0.25;
                jet.scale.set(1.0, scaleY, 1.0);
            });
        }

        if (this.billboardMesh) {
            const hue = (this.time * 0.2) % 1.0;
            this.billboardMesh.material.color.setHSL(hue, 1.0, 0.55);
        }
    }
}
