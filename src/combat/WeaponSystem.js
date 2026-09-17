import { markDetailedMesh } from '../engine/AsciiShaderRenderer.js';

/**
 * WeaponSystem - 3 slots, Uzi Frenesí 5s cada 1.000 pts, Minigun a 10.000 pts en la fuente,
 * y Spawns extendidos de munición y botiquines en todo el mapa.
 */
export class WeaponSystem {
    constructor(scene, camera, audioManager) {
        this.scene = scene;
        this.camera = camera;
        this.audioManager = audioManager;

        // Slots y Armas Equipadas
        this.activeSlot = 2; // Slot Activo (1: Primaria, 2: Secundaria, 3: Minigun)
        this.slot1Weapon = 'shotgun'; // 'shotgun' o 'm16'
        this.slot2Weapon = 'revolver'; // 'revolver' o 'deagle'
        this.hasMinigun = false;

        this.weapons = {
            shotgun: {
                name: 'ESCOPETA SAGRADA',
                mag: 2,
                maxMag: 2,
                reserve: 14,
                cooldown: 0.62,
                damagePerPellet: 14,
                pellets: 7,
                isAuto: false
            },
            m16: {
                name: 'COLT M16 MILITAR',
                mag: 30,
                maxMag: 30,
                reserve: 120,
                cooldown: 0.10,
                damage: 23,
                isAuto: true
            },
            revolver: {
                name: 'REVÓLVER .357 CROMADO',
                mag: 6,
                maxMag: 6,
                reserve: 36,
                cooldown: 0.32,
                damage: 38,
                isAuto: false
            },
            deagle: {
                name: 'DESERT EAGLE .50AE',
                mag: 7,
                maxMag: 7,
                reserve: 35,
                cooldown: 0.30,
                damage: 75,
                isAuto: false
            },
            minigun: {
                name: 'MINIGUN VULCAN SAGRADA',
                mag: 150,
                maxMag: 150,
                reserve: 150,
                cooldown: 0.065,
                damage: 26,
                isAuto: true
            },
            uzi: {
                name: 'UZI NEÓN (FRENESÍ 5s)',
                mag: Infinity,
                maxMag: Infinity,
                reserve: Infinity,
                cooldown: 0.07,
                damage: 16,
                isAuto: true
            }
        };

        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 1.1;

        this.lastShotTime = 0;
        this.isFiring = false;

        // Frenesí Uzi: 5 segundos cada 1.000 puntos
        this.uziFrenzyActive = false;
        this.uziFrenzyTimer = 0;
        this.uziFrenzyMaxDuration = 3.0;
        this.nextFrenzyScore = 1500;

        this.projectiles = [];
        this.ammoPickups = [];
        this.medkitPickups = [];
        this.allAuras = [];
        this.pickupSpawnTimer = 0;

        // Pedestales de armas
        this.minigunPedestal = null;
        this.minigunSpawned = false;

        this.centerArsenalSpawned = false;
        this.centerDeaglePedestal = null;
        this.centerM16Pedestal = null;

        this.beachShotgunPedestal = null;
        this.beachRevolverPedestal = null;

        this.gunContainer = new THREE.Group();
        this.camera.add(this.gunContainer);
        this.scene.add(this.camera);

        this.shotgunModel = this.buildShotgunModel();
        this.m16Model = this.buildM16Model();
        this.revolverModel = this.buildRevolverModel();
        this.deagleModel = this.buildDeagleModel();
        this.minigunModel = this.buildMinigunModel();
        this.uziModel = this.buildUziModel();

        this.gunContainer.add(this.shotgunModel);
        this.gunContainer.add(this.m16Model);
        this.gunContainer.add(this.revolverModel);
        this.gunContainer.add(this.deagleModel);
        this.gunContainer.add(this.minigunModel);
        this.gunContainer.add(this.uziModel);

        this.updateVisibleModel();

        this.recoilOffset = 0;
        this.recoilRot = 0;
        this.lastPickupText = '';

        this.initControls();
        this.spawnInitialPickups();
        this.spawnBeachWeaponStations();
    }

    initControls() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && document.pointerLockElement) {
                this.isFiring = true;
                const current = this.getCurrentWeapon();
                if (!current.isAuto) {
                    this.tryShoot();
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isFiring = false;
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Digit1') {
                this.switchSlot(1);
            } else if (e.code === 'Digit2') {
                this.switchSlot(2);
            } else if (e.code === 'Digit3') {
                if (this.hasMinigun) {
                    this.switchSlot(3);
                }
            } else if (e.code === 'KeyR') {
                this.reload();
            }
        });

        window.addEventListener('wheel', (e) => {
            if (this.uziFrenzyActive) return;
            if (e.deltaY > 0) {
                let next = this.activeSlot + 1;
                if (next === 3 && !this.hasMinigun) next = 1;
                if (next > 3) next = 1;
                this.switchSlot(next);
            } else if (e.deltaY < 0) {
                let prev = this.activeSlot - 1;
                if (prev < 1) prev = this.hasMinigun ? 3 : 2;
                this.switchSlot(prev);
            }
        });
    }

    switchSlot(slot) {
        if (this.uziFrenzyActive) return;
        if (slot === 3 && !this.hasMinigun) return;

        this.activeSlot = slot;
        this.isReloading = false;
        this.updateVisibleModel();
        this.audioManager.playShotgunPump();
    }

    getCurrentWeapon() {
        if (this.uziFrenzyActive) return this.weapons.uzi;
        if (this.activeSlot === 1) return this.weapons[this.slot1Weapon] || this.weapons.shotgun;
        if (this.activeSlot === 2) return this.weapons[this.slot2Weapon] || this.weapons.revolver;
        if (this.activeSlot === 3) return this.weapons.minigun;
        return this.weapons[this.slot2Weapon] || this.weapons.revolver;
    }

    updateVisibleModel() {
        this.shotgunModel.visible = false;
        this.m16Model.visible = false;
        this.revolverModel.visible = false;
        this.deagleModel.visible = false;
        this.minigunModel.visible = false;
        this.uziModel.visible = false;

        if (this.uziFrenzyActive) {
            this.uziModel.visible = true;
        } else if (this.activeSlot === 1) {
            if (this.slot1Weapon === 'm16') {
                this.m16Model.visible = true;
            } else {
                this.shotgunModel.visible = true;
            }
        } else if (this.activeSlot === 2) {
            if (this.slot2Weapon === 'deagle') {
                this.deagleModel.visible = true;
            } else {
                this.revolverModel.visible = true;
            }
        } else if (this.activeSlot === 3) {
            this.minigunModel.visible = true;
        }
    }

    buildShotgunModel() {
        const group = new THREE.Group();
        group.position.set(0.3, -0.28, -0.65);

        const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a2612 });
        const metalMat = new THREE.MeshLambertMaterial({ color: 0x24242a, flatShading: true });

        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.55, 6), metalMat);
        b1.rotation.x = Math.PI / 2;
        b1.position.set(-0.02, 0.05, -0.22);
        group.add(b1);

        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.55, 6), metalMat);
        b2.rotation.x = Math.PI / 2;
        b2.position.set(0.02, 0.05, -0.22);
        group.add(b2);

        const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6), woodMat);
        pump.rotation.x = Math.PI / 2;
        pump.position.set(0, 0.02, -0.2);
        group.add(pump);

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.14, 0.28), woodMat);
        stock.position.set(0, -0.06, 0.12);
        stock.rotation.x = 0.35;
        group.add(stock);

        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), flashMat);
        flash.position.set(0, 0.05, -0.52);
        group.add(flash);
        group.userData.flash = flash;

        return group;
    }

    buildRevolverModel() {
        const group = new THREE.Group();
        group.position.set(0.32, -0.28, -0.65);

        const chromeMat = new THREE.MeshLambertMaterial({ color: 0xefeff5, flatShading: true });
        const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x222228 });
        const woodGripMat = new THREE.MeshLambertMaterial({ color: 0x4a1a1a });

        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.38), chromeMat);
        barrel.position.set(0, 0.04, -0.19);
        group.add(barrel);

        const sight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.03), darkMetalMat);
        sight.position.set(0, 0.09, -0.36);
        group.add(sight);

        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8), chromeMat);
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.set(0, 0.02, 0.03);
        group.add(cylinder);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.16), chromeMat);
        frame.position.set(0, 0.02, 0.03);
        group.add(frame);

        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.18, 0.08), woodGripMat);
        grip.position.set(0, -0.1, 0.12);
        grip.rotation.x = 0.4;
        group.add(grip);

        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), flashMat);
        flash.position.set(0, 0.04, -0.42);
        group.add(flash);
        group.userData.flash = flash;

        return group;
    }

    buildMinigunModel() {
        const group = new THREE.Group();
        group.position.set(0.3, -0.32, -0.7);

        const darkMetal = new THREE.MeshLambertMaterial({ color: 0x181820, flatShading: true });
        const goldMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.35), darkMetal);
        group.add(body);

        const barrelGroup = new THREE.Group();
        barrelGroup.position.set(0, 0, -0.2);

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.45, 5), darkMetal);
            b.rotation.x = Math.PI / 2;
            b.position.set(Math.cos(angle) * 0.055, Math.sin(angle) * 0.055, -0.22);
            barrelGroup.add(b);
        }
        group.add(barrelGroup);
        group.userData.barrels = barrelGroup;

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 12), goldMat);
        ring.position.set(0, 0, -0.38);
        group.add(ring);

        const flashMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), flashMat);
        flash.position.set(0, 0, -0.55);
        group.add(flash);
        group.userData.flash = flash;

        return group;
    }

    buildUziModel() {
        const group = new THREE.Group();
        group.position.set(0.3, -0.26, -0.6);

        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1f1a28, flatShading: true });
        const magMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.32), bodyMat);
        body.position.set(0, 0.04, -0.12);
        group.add(body);

        const neonStripe = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.28), neonMat);
        neonStripe.position.set(0, 0.08, -0.12);
        group.add(neonStripe);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), bodyMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.04, -0.32);
        group.add(barrel);

        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.06), magMat);
        mag.position.set(0, -0.12, -0.04);
        mag.rotation.x = 0.2;
        group.add(mag);

        const flashMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), flashMat);
        flash.position.set(0, 0.04, -0.39);
        group.add(flash);
        group.userData.flash = flash;

        return group;
    }

    buildDeagleModel() {
        const group = new THREE.Group();
        group.position.set(0.32, -0.28, -0.65);

        const chromeSlideMat = new THREE.MeshLambertMaterial({ color: 0xd8d8e2, flatShading: true });
        const blackFrameMat = new THREE.MeshLambertMaterial({ color: 0x1e1e24, flatShading: true });
        const gripMat = new THREE.MeshLambertMaterial({ color: 0x141418 });

        // Corredera superior masiva y poligonal característica de la Desert Eagle
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.44), chromeSlideMat);
        slide.position.set(0, 0.05, -0.19);
        group.add(slide);

        // Cañón interno y boca estriada de alto calibre .50AE
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.12, 8), blackFrameMat);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.05, -0.42);
        group.add(muzzle);

        // Alza y mira delantera de combate
        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.025, 0.03), blackFrameMat);
        frontSight.position.set(0, 0.10, -0.38);
        group.add(frontSight);

        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), blackFrameMat);
        rearSight.position.set(0, 0.10, 0.01);
        group.add(rearSight);

        // Armazón inferior
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.07, 0.28), blackFrameMat);
        frame.position.set(0, -0.01, -0.10);
        group.add(frame);

        // Empuñadura táctica ergonómica con relieve
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.20, 0.10), gripMat);
        grip.position.set(0, -0.11, 0.06);
        grip.rotation.x = 0.38;
        group.add(grip);

        // Martillo percutor posterior
        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.04), blackFrameMat);
        hammer.position.set(0, 0.07, 0.04);
        hammer.rotation.x = -0.3;
        group.add(hammer);

        // Destello de disparo .50AE (dorado cegador)
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), flashMat);
        flash.position.set(0, 0.05, -0.48);
        group.add(flash);
        group.userData.flash = flash;

        return group;
    }

    buildM16Model() {
        const group = new THREE.Group();
        group.position.set(0.30, -0.28, -0.70);

        const gunmetalMat = new THREE.MeshLambertMaterial({ color: 0x24262b, flatShading: true });
        const darkPolymerMat = new THREE.MeshLambertMaterial({ color: 0x18191c });

        // Cajón de mecanismos (Upper & Lower Receiver)
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.38), gunmetalMat);
        receiver.position.set(0, 0.02, -0.05);
        group.add(receiver);

        // Asa de transporte superior clásica M16 (Carry Handle & Iron Sight)
        const carryHandleBase = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.18), gunmetalMat);
        carryHandleBase.position.set(0, 0.11, -0.05);
        group.add(carryHandleBase);

        // Guardamanos estriado característico
        const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.38, 8), darkPolymerMat);
        handguard.rotation.x = Math.PI / 2;
        handguard.position.set(0, 0.03, -0.40);
        group.add(handguard);

        // Cañón largo de fusil de asalto
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), gunmetalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.03, -0.58);
        group.add(barrel);

        // Mira frontal triangular en A (Front Sight Base)
        const frontSight = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.10, 4), gunmetalMat);
        frontSight.position.set(0, 0.09, -0.62);
        group.add(frontSight);

        // Bocacha apagallamas A2
        const compensator = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 6), gunmetalMat);
        compensator.rotation.x = Math.PI / 2;
        compensator.position.set(0, 0.03, -0.87);
        group.add(compensator);

        // Cargador STANAG curvo de 30 balas
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.08), gunmetalMat);
        mag.position.set(0, -0.12, -0.12);
        mag.rotation.x = 0.22;
        group.add(mag);

        // Culata fija trasera sólida
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.30), darkPolymerMat);
        stock.position.set(0, -0.01, 0.26);
        group.add(stock);

        // Empuñadura de pistola (Pistol Grip)
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), darkPolymerMat);
        grip.position.set(0, -0.11, 0.08);
        grip.rotation.x = 0.42;
        group.add(grip);

        // Destello de boca M16 (naranja de alta velocidad)
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffbb22, transparent: true, opacity: 0 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), flashMat);
        flash.position.set(0, 0.03, -0.92);
        group.add(flash);
        group.userData.flash = flash;

        return group;
    }

    /* --- SISTEMA DE AURAS LUMINOSAS PARA OBJETOS DEL SUELO --- */
    createAura(colorHex, height = 3.6, radius = 0.55) {
        const auraGroup = new THREE.Group();

        // Columna cilíndrica de luz vertical suave, sin aros negros y con opacidad atenuada
        const beamGeo = new THREE.CylinderGeometry(radius * 0.45, radius * 1.05, height, 10, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.20,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = height / 2;
        auraGroup.add(beam);

        const auraData = {
            group: auraGroup,
            beam: beam,
            baseOpacity: 0.20,
            time: Math.random() * Math.PI * 2
        };
        this.allAuras.push(auraData);

        return auraGroup;
    }

    activateUziFrenzy() {
        this.uziFrenzyActive = true;
        this.uziFrenzyTimer = this.uziFrenzyMaxDuration;
        this.updateVisibleModel();
        this.isReloading = false;
        this.audioManager.playPickup();
        this.lastPickupText = '⚡ ¡FRENESÍ UZI ACTIVADO (5s)!';
    }

    tryShoot() {
        if (this.isReloading) return;
        const now = performance.now() / 1000;
        const weapon = this.getCurrentWeapon();

        if (now - this.lastShotTime < weapon.cooldown) return;

        if (this.uziFrenzyActive) {
            this.lastShotTime = now;
            this.audioManager.playUziShot();
            this.recoilOffset = 0.035;
            this.recoilRot = 0.07;
            this.triggerFlash(this.uziModel);
            this.createSingleProjectile('neon', weapon.damage);
            return;
        }

        if (this.activeSlot === 1) {
            const w = this.weapons[this.slot1Weapon] || this.weapons.shotgun;
            if (w.mag <= 0) {
                this.reload();
                return;
            }
            w.mag--;
            this.lastShotTime = now;

            if (this.slot1Weapon === 'm16') {
                this.audioManager.playM16Shot();
                this.recoilOffset = 0.045;
                this.recoilRot = 0.08;
                this.triggerFlash(this.m16Model);
                this.createSingleProjectile('m16', w.damage);
            } else {
                this.audioManager.playShotgunShot();
                this.recoilOffset = 0.12;
                this.recoilRot = 0.35;
                this.triggerFlash(this.shotgunModel);
                for (let i = 0; i < w.pellets; i++) {
                    this.createSpreadPellet(w.damagePerPellet);
                }
            }
        } else if (this.activeSlot === 2) {
            const w = this.weapons[this.slot2Weapon] || this.weapons.revolver;
            if (w.mag <= 0) {
                this.reload();
                return;
            }
            w.mag--;
            this.lastShotTime = now;

            if (this.slot2Weapon === 'deagle') {
                this.audioManager.playDeagleShot();
                this.recoilOffset = 0.11;
                this.recoilRot = 0.32;
                this.triggerFlash(this.deagleModel);
                this.createSingleProjectile('deagle', w.damage);
            } else {
                this.audioManager.playRevolverShot();
                this.recoilOffset = 0.08;
                this.recoilRot = 0.25;
                this.triggerFlash(this.revolverModel);
                this.createSingleProjectile('holy', w.damage);
            }
        } else if (this.activeSlot === 3 && this.hasMinigun) {
            if (this.weapons.minigun.reserve <= 0) {
                return;
            }
            this.weapons.minigun.reserve--;
            this.lastShotTime = now;
            this.audioManager.playMinigunShot();

            this.recoilOffset = 0.04;
            this.recoilRot = 0.06;
            this.triggerFlash(this.minigunModel);

            if (this.minigunModel.userData.barrels) {
                this.minigunModel.userData.barrels.rotation.z += 1.2;
            }

            this.createSingleProjectile('vulcan', this.weapons.minigun.damage);
        }
    }

    triggerFlash(model) {
        if (model.userData.flash) {
            model.userData.flash.material.opacity = 1.0;
            setTimeout(() => {
                model.userData.flash.material.opacity = 0.0;
            }, 45);
        }
    }

    createSingleProjectile(type, damage) {
        let color = 0xffea55;
        let radius = 0.18;
        let speed = 150;

        if (type === 'vulcan') {
            color = 0xff8800;
            radius = 0.16;
            speed = 150;
        } else if (type === 'neon') {
            color = 0x00f0ff;
            radius = 0.17;
            speed = 160;
        } else if (type === 'deagle') {
            color = 0xffea22;
            radius = 0.22;
            speed = 160;
        } else if (type === 'm16') {
            color = 0xff9900;
            radius = 0.14;
            speed = 175;
        }

        const geo = new THREE.SphereGeometry(radius, 5, 5);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.copy(this.camera.position);

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        if (type === 'vulcan' || type === 'neon' || type === 'm16') {
            const spread = type === 'm16' ? 0.015 : 0.025;
            dir.x += (Math.random() - 0.5) * spread;
            dir.y += (Math.random() - 0.5) * spread;
            dir.normalize();
        }

        this.scene.add(mesh);

        this.projectiles.push({
            mesh: mesh,
            dir: dir,
            speed: speed,
            damage: damage,
            life: 1.4
        });
    }

    createSpreadPellet(damage) {
        const geo = new THREE.SphereGeometry(0.12, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.copy(this.camera.position);

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        dir.x += (Math.random() - 0.5) * 0.08;
        dir.y += (Math.random() - 0.5) * 0.08;
        dir.z += (Math.random() - 0.5) * 0.08;
        dir.normalize();

        this.scene.add(mesh);

        this.projectiles.push({
            mesh: mesh,
            dir: dir,
            speed: 135,
            damage: damage,
            life: 0.9
        });
    }

    reload() {
        if (this.isReloading || this.uziFrenzyActive) return;

        if (this.activeSlot === 1) {
            const w = this.weapons[this.slot1Weapon] || this.weapons.shotgun;
            if (w.mag === w.maxMag || w.reserve <= 0) return;
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
            if (this.slot1Weapon === 'm16') {
                this.audioManager.playReload();
            } else {
                this.audioManager.playShotgunPump();
            }
        } else if (this.activeSlot === 2) {
            const w = this.weapons[this.slot2Weapon] || this.weapons.revolver;
            if (w.mag === w.maxMag || w.reserve <= 0) return;
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
            this.audioManager.playReload();
        }
    }

    /* --- PEDESTAL DE MINIGUN: TRASLADADO AL CENTRO DESPEJADO DEL MAPA --- */
    spawnMinigunPedestal() {
        if (this.minigunSpawned || this.hasMinigun) return;
        this.minigunSpawned = true;

        const group = new THREE.Group();
        // Ubicado en (-70, 0, 20): pleno centro abierto del parque/avenida, sin colisión de la fuente
        group.position.set(-70, 0, 20);

        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.4, 0.8, 8),
            new THREE.MeshLambertMaterial({ color: 0x332211 })
        );
        pedestal.position.y = 0.4;
        group.add(pedestal);

        // Aura de luz roja brillante para el arma desbloqueable
        const aura = this.createAura(0xff1133, 6.0, 0.85);
        group.add(aura);

        const miniVisual = this.buildMinigunModel();
        miniVisual.position.set(0, 1.2, 0);
        group.add(miniVisual);
        group.userData.miniVisual = miniVisual;

        markDetailedMesh(group);
        this.scene.add(group);
        this.minigunPedestal = group;
        this.audioManager.playPickup();
    }

    /* --- PUNTOS EXTENSIVOS DE SPAWN DE MUNICIÓN Y BOTIQUINES --- */
    spawnInitialPickups() {
        const ammoSpawnPoints = [
            [-8, 0.4, 25],      // Ocean Drive cerca de hotel
            [25, 0.4, -40],     // Arena playa norte
            [35, 0.4, 60],      // Arena playa sur cerca de caseta
            [-45, 0.4, -80],    // Callejón hotel norte
            [-70, 0.4, 15],     // Sendero Central Park
            [-88, 0.4, -20],    // Borde lago oeste
            [-70, 0.4, -15],    // Puente Bow Bridge
            [-115, 0.4, 85],    // Avenida Manhattan sur
            [-130, 0.4, -40],   // Plaza Chrysler
            [-155, 0.4, 30]     // Base Empire State
        ];

        const medkitSpawnPoints = [
            [-14, 0.4, -60],    // Callejón hotel Colonis
            [30, 0.4, 35],      // Orilla del mar
            [12, 0.4, 90],      // Bulevar marítimo sur
            [-60, 0.4, -90],    // Entrada norte Central Park
            [-70, 0.4, 65],     // Cerca de la fuente ornamental
            [-90, 0.4, 30],     // Pinar Central Park
            [-115, 0.4, -70],   // Cruce avenida Manhattan
            [-145, 0.4, 25],    // Callejón Times Square
            [-170, 0.4, -100]   // Rascacielos noroeste
        ];

        ammoSpawnPoints.forEach(pos => this.createAmmoPickup(pos[0], pos[1], pos[2]));
        medkitSpawnPoints.forEach(pos => this.createMedkitPickup(pos[0], pos[1], pos[2]));
    }

    createAmmoPickup(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.6, 0.8),
            new THREE.MeshLambertMaterial({ color: 0x332211, flatShading: true })
        );
        box.position.y = 0.3;
        group.add(box);

        const crossMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.1), crossMat);
        c1.position.set(0, 0.65, 0);
        group.add(c1);
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.1), crossMat);
        c2.position.set(0, 0.65, 0);
        group.add(c2);

        // Aura de luz amarilla brillante para municiones
        const aura = this.createAura(0xffea00, 2.6, 0.42);
        group.add(aura);
        group.userData.aura = this.allAuras[this.allAuras.length - 1];

        markDetailedMesh(group);
        this.scene.add(group);
        this.ammoPickups.push(group);
    }

    createMedkitPickup(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const medCase = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.6, 0.5),
            new THREE.MeshLambertMaterial({ color: 0xf0f0f5, flatShading: true })
        );
        medCase.position.y = 0.3;
        group.add(medCase);

        const crossMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.1), crossMat);
        c1.position.set(0, 0.65, 0);
        group.add(c1);
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.1), crossMat);
        c2.position.set(0, 0.65, 0);
        group.add(c2);

        // Aura de luz verde brillante para botiquines
        const aura = this.createAura(0x00ff66, 2.6, 0.42);
        group.add(aura);
        group.userData.aura = this.allAuras[this.allAuras.length - 1];

        markDetailedMesh(group);
        this.scene.add(group);
        this.medkitPickups.push(group);
    }

    /* --- ESTACIONES DE ARMAS EN LA PLAYA (ESCOPETA Y REVÓLVER) --- */
    spawnBeachWeaponStations() {
        const createPedestalBase = (colorHex) => {
            const group = new THREE.Group();
            const ped = new THREE.Mesh(
                new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8),
                new THREE.MeshLambertMaterial({ color: 0x222228 })
            );
            ped.position.y = 0.3;
            group.add(ped);

            // Aura de luz roja brillante para armas
            const aura = this.createAura(0xff1133, 3.8, 0.55);
            group.add(aura);
            return group;
        };

        // 1. Pedestal de Escopeta en la playa norte
        const sGroup = createPedestalBase();
        sGroup.position.set(30, 0, -15);
        const sModel = this.buildShotgunModel();
        sModel.position.set(0, 0.9, 0);
        sGroup.add(sModel);
        markDetailedMesh(sGroup);
        this.scene.add(sGroup);
        this.beachShotgunPedestal = sGroup;

        // 2. Pedestal de Revólver en la playa sur
        const rGroup = createPedestalBase();
        rGroup.position.set(30, 0, 15);
        const rModel = this.buildRevolverModel();
        rModel.position.set(0, 0.9, 0);
        rGroup.add(rModel);
        markDetailedMesh(rGroup);
        this.scene.add(rGroup);
        this.beachRevolverPedestal = rGroup;
    }

    /* --- ARSENAL DEL CENTRO DEL MAPA DESBLOQUEABLE A LOS 10.000 PTS (M16 Y DEAGLE) --- */
    spawnCenterArsenal() {
        if (this.centerArsenalSpawned) return;
        this.centerArsenalSpawned = true;

        const createPedestalBase = () => {
            const group = new THREE.Group();
            const ped = new THREE.Mesh(
                new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8),
                new THREE.MeshLambertMaterial({ color: 0x1f1a28 })
            );
            ped.position.y = 0.3;
            group.add(ped);

            // Aura de luz roja brillante para armas
            const aura = this.createAura(0xff1133, 4.2, 0.6);
            group.add(aura);
            return group;
        };

        // Pedestal de Desert Eagle .50AE (Centro oeste: x = -76, z = 20)
        const dGroup = createPedestalBase();
        dGroup.position.set(-76, 0, 20);
        const dModel = this.buildDeagleModel();
        dModel.position.set(0, 0.9, 0);
        dGroup.add(dModel);
        markDetailedMesh(dGroup);
        this.scene.add(dGroup);
        this.centerDeaglePedestal = dGroup;

        // Pedestal de Colt M16 (Centro este: x = -64, z = 20)
        const mGroup = createPedestalBase();
        mGroup.position.set(-64, 0, 20);
        const mModel = this.buildM16Model();
        mModel.position.set(0, 0.9, 0);
        mGroup.add(mModel);
        markDetailedMesh(mGroup);
        this.scene.add(mGroup);
        this.centerM16Pedestal = mGroup;

        this.audioManager.playPickup();
        this.lastPickupText = '¡ARSENAL MILITAR DESBLOQUEADO EN EL CENTRO!';
    }

    update(delta, enemySystem) {
        const current = this.getCurrentWeapon();
        if (this.isFiring && current.isAuto) {
            this.tryShoot();
        }

        // Activación de Frenesí Uzi cada 1.000 puntos de score
        if (enemySystem && enemySystem.score >= this.nextFrenzyScore) {
            this.activateUziFrenzy();
            this.nextFrenzyScore += 1000;
        }

        // Temporizador de Frenesí Uzi (5 segundos)
        if (this.uziFrenzyActive) {
            this.uziFrenzyTimer -= delta;
            if (this.uziFrenzyTimer <= 0) {
                this.uziFrenzyActive = false;
                this.updateVisibleModel();
            }
        }

        // Desbloqueo de Minigun y Arsenal del Centro (M16 y Desert Eagle) a los 10.000 puntos
        if (enemySystem && enemySystem.score >= 10000) {
            if (!this.minigunSpawned && !this.hasMinigun) {
                this.spawnMinigunPedestal();
            }
            if (!this.centerArsenalSpawned) {
                this.spawnCenterArsenal();
            }
        }

        const playerPos = this.camera.position;

        // Recogida de Minigun en el pedestal central
        if (this.minigunPedestal) {
            this.minigunPedestal.rotation.y += delta * 1.5;
            if (playerPos.distanceTo(this.minigunPedestal.position) < 3.0) {
                this.hasMinigun = true;
                this.activeSlot = 3;
                this.updateVisibleModel();
                this.scene.remove(this.minigunPedestal);
                this.minigunPedestal = null;
                this.audioManager.playPickup();
                this.lastPickupText = '¡MINIGUN VULCAN DESBLOQUEADA [3]!';
            }
        }

        // Intercambio de armas en el Centro (M16 y Desert Eagle)
        if (this.centerM16Pedestal) {
            this.centerM16Pedestal.rotation.y += delta * 1.4;
            if (playerPos.distanceTo(this.centerM16Pedestal.position) < 2.5) {
                if (this.slot1Weapon !== 'm16') {
                    this.slot1Weapon = 'm16';
                    this.activeSlot = 1;
                    this.weapons.m16.reserve = Math.min(240, this.weapons.m16.reserve + 60);
                    this.updateVisibleModel();
                    this.audioManager.playPickup();
                    this.lastPickupText = '¡COLT M16 EQUIPADA [SLOT 1]!';
                }
            }
        }

        if (this.centerDeaglePedestal) {
            this.centerDeaglePedestal.rotation.y += delta * 1.4;
            if (playerPos.distanceTo(this.centerDeaglePedestal.position) < 2.5) {
                if (this.slot2Weapon !== 'deagle') {
                    this.slot2Weapon = 'deagle';
                    this.activeSlot = 2;
                    this.weapons.deagle.reserve = Math.min(70, this.weapons.deagle.reserve + 14);
                    this.updateVisibleModel();
                    this.audioManager.playPickup();
                    this.lastPickupText = '¡DESERT EAGLE .50AE EQUIPADA [SLOT 2]!';
                }
            }
        }

        // Intercambio de armas en la Playa (Escopeta y Revólver)
        if (this.beachShotgunPedestal) {
            this.beachShotgunPedestal.rotation.y += delta * 1.4;
            if (playerPos.distanceTo(this.beachShotgunPedestal.position) < 2.5) {
                if (this.slot1Weapon !== 'shotgun') {
                    this.slot1Weapon = 'shotgun';
                    this.activeSlot = 1;
                    this.weapons.shotgun.reserve = Math.min(28, this.weapons.shotgun.reserve + 6);
                    this.updateVisibleModel();
                    this.audioManager.playShotgunPump();
                    this.lastPickupText = '¡ESCOPETA SAGRADA RE-EQUIPADA [SLOT 1]!';
                }
            }
        }

        if (this.beachRevolverPedestal) {
            this.beachRevolverPedestal.rotation.y += delta * 1.4;
            if (playerPos.distanceTo(this.beachRevolverPedestal.position) < 2.5) {
                if (this.slot2Weapon !== 'revolver') {
                    this.slot2Weapon = 'revolver';
                    this.activeSlot = 2;
                    this.weapons.revolver.reserve = Math.min(72, this.weapons.revolver.reserve + 12);
                    this.updateVisibleModel();
                    this.audioManager.playReload();
                    this.lastPickupText = '¡REVÓLVER .357 RE-EQUIPADO [SLOT 2]!';
                }
            }
        }

        // Animación de todas las Auras Luminosas (columnas suaves)
        for (let i = 0; i < this.allAuras.length; i++) {
            const a = this.allAuras[i];
            a.time += delta;
            a.beam.rotation.y += delta * 0.5;
            a.beam.material.opacity = 0.17 + Math.sin(a.time * 3.0) * 0.06;
        }

        // Recarga
        if (this.isReloading) {
            this.reloadTimer -= delta;
            this.recoilRot = Math.sin((1.0 - (this.reloadTimer / this.reloadDuration)) * Math.PI) * 0.4;
            if (this.reloadTimer <= 0) {
                if (this.activeSlot === 1) {
                    const w = this.weapons[this.slot1Weapon] || this.weapons.shotgun;
                    const needed = w.maxMag - w.mag;
                    const toAdd = Math.min(needed, w.reserve);
                    w.mag += toAdd;
                    w.reserve -= toAdd;
                } else if (this.activeSlot === 2) {
                    const w = this.weapons[this.slot2Weapon] || this.weapons.revolver;
                    const needed = w.maxMag - w.mag;
                    const toAdd = Math.min(needed, w.reserve);
                    w.mag += toAdd;
                    w.reserve -= toAdd;
                }
                this.isReloading = false;
                this.recoilRot = 0;
            }
        }

        this.recoilOffset *= Math.max(0, 1.0 - delta * 12);
        this.recoilRot *= Math.max(0, 1.0 - delta * 12);
        this.gunContainer.position.z = this.recoilOffset;
        this.gunContainer.rotation.x = this.recoilRot;

        // Proyectiles
        const enemies = enemySystem ? enemySystem.enemies : [];
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= delta;

            const moveStep = p.dir.clone().multiplyScalar(p.speed * delta);
            p.mesh.position.add(moveStep);

            let hit = false;
            for (let e of enemies) {
                if (!e.isAlive) continue;

                const dx = p.mesh.position.x - e.mesh.position.x;
                const dz = p.mesh.position.z - e.mesh.position.z;
                const distXZ = Math.sqrt(dx * dx + dz * dz);

                const enemyCenterY = e.mesh.position.y + (e.centerY || 1.4);
                const dy = Math.abs(p.mesh.position.y - enemyCenterY);

                if (distXZ < e.hitRadius && dy < (e.halfHeight || 1.6)) {
                    e.takeDamage(p.damage);
                    hit = true;
                    break;
                }
            }

            if (p.life <= 0 || hit) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }

        // Recogida de Cajas de Munición Ponderadas según armas equipadas
        for (let j = this.ammoPickups.length - 1; j >= 0; j--) {
            const pk = this.ammoPickups[j];
            pk.rotation.y += delta * 1.5;

            if (pk.position.distanceTo(playerPos) < 2.5) {
                const rand = Math.random();
                if (rand < 0.38) {
                    // Munición Arma Primaria (Slot 1)
                    if (this.slot1Weapon === 'm16') {
                        this.weapons.m16.reserve = Math.min(240, this.weapons.m16.reserve + 30);
                        this.lastPickupText = '+30 BALAS 5.56mm (COLT M16)';
                    } else {
                        this.weapons.shotgun.reserve = Math.min(28, this.weapons.shotgun.reserve + 6);
                        this.lastPickupText = '+6 CARTUCHOS (ESCOPETA)';
                    }
                } else if (rand < 0.76) {
                    // Munición Arma Secundaria (Slot 2)
                    if (this.slot2Weapon === 'deagle') {
                        this.weapons.deagle.reserve = Math.min(70, this.weapons.deagle.reserve + 7);
                        this.lastPickupText = '+7 BALAS .50AE (DESERT EAGLE)';
                    } else {
                        this.weapons.revolver.reserve = Math.min(72, this.weapons.revolver.reserve + 12);
                        this.lastPickupText = '+12 BALAS .357 (REVÓLVER)';
                    }
                } else {
                    // Munición Minigun
                    this.weapons.minigun.reserve = Math.min(300, this.weapons.minigun.reserve + 60);
                    this.lastPickupText = '+60 BALAS DE MINIGUN';
                }

                this.audioManager.playPickup();
                if (pk.userData && pk.userData.aura) {
                    const aIdx = this.allAuras.indexOf(pk.userData.aura);
                    if (aIdx !== -1) this.allAuras.splice(aIdx, 1);
                }
                this.scene.remove(pk);
                this.ammoPickups.splice(j, 1);
            }
        }

        // Recogida de Botiquines (+30 HP)
        for (let k = this.medkitPickups.length - 1; k >= 0; k--) {
            const med = this.medkitPickups[k];
            med.rotation.y += delta * 1.8;

            if (med.position.distanceTo(playerPos) < 2.5) {
                if (enemySystem) {
                    enemySystem.playerHealth = Math.min(100, enemySystem.playerHealth + 30);
                    this.lastPickupText = '+30 SALUD (HP)';
                }
                this.audioManager.playHeal();
                if (med.userData && med.userData.aura) {
                    const aIdx = this.allAuras.indexOf(med.userData.aura);
                    if (aIdx !== -1) this.allAuras.splice(aIdx, 1);
                }
                this.scene.remove(med);
                this.medkitPickups.splice(k, 1);
            }
        }

        // Spawn periódico de botiquines y municiones
        this.pickupSpawnTimer += delta;
        if (this.pickupSpawnTimer >= 11.0) {
            this.pickupSpawnTimer = 0;
            const rx = (Math.random() - 0.5) * 150 - 45;
            const rz = (Math.random() - 0.5) * 200;

            if (this.medkitPickups.length < 8 && Math.random() > 0.45) {
                this.createMedkitPickup(rx, 0.4, rz);
            } else if (this.ammoPickups.length < 10) {
                this.createAmmoPickup(rx, 0.4, rz);
            }
        }
    }
}
