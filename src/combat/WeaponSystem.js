/**
 * WeaponSystem - 3 slots, Uzi Frenesí 5s cada 1.000 pts, Minigun a 10.000 pts en la fuente,
 * y Spawns extendidos de munición y botiquines en todo el mapa.
 */
export class WeaponSystem {
    constructor(scene, camera, audioManager) {
        this.scene = scene;
        this.camera = camera;
        this.audioManager = audioManager;

        // Slots
        this.activeSlot = 2; // Revólver
        this.hasMinigun = false;

        this.weapons = {
            shotgun: {
                name: 'ESCOPETA SAGRADA',
                mag: 2,
                maxMag: 2,
                reserve: 14,
                cooldown: 0.62,
                damagePerPellet: 15,
                pellets: 7,
                isAuto: false
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
            minigun: {
                name: 'MINIGUN VULCAN SAGRADA',
                mag: 150,
                maxMag: 150,
                reserve: 150,
                cooldown: 0.065,
                damage: 28,
                isAuto: true
            },
            uzi: {
                name: 'UZI NEÓN (FRENESÍ 5s)',
                mag: Infinity,
                maxMag: Infinity,
                reserve: Infinity,
                cooldown: 0.07,
                damage: 18,
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
        this.uziFrenzyMaxDuration = 5.0;
        this.nextFrenzyScore = 1000;

        this.projectiles = [];
        this.ammoPickups = [];
        this.medkitPickups = [];
        this.pickupSpawnTimer = 0;

        this.minigunPedestal = null;
        this.minigunSpawned = false;

        this.gunContainer = new THREE.Group();
        this.camera.add(this.gunContainer);
        this.scene.add(this.camera);

        this.shotgunModel = this.buildShotgunModel();
        this.revolverModel = this.buildRevolverModel();
        this.minigunModel = this.buildMinigunModel();
        this.uziModel = this.buildUziModel();

        this.gunContainer.add(this.shotgunModel);
        this.gunContainer.add(this.revolverModel);
        this.gunContainer.add(this.minigunModel);
        this.gunContainer.add(this.uziModel);

        this.updateVisibleModel();

        this.recoilOffset = 0;
        this.recoilRot = 0;
        this.lastPickupText = '';

        this.initControls();
        this.spawnInitialPickups();
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
        if (this.activeSlot === 1) return this.weapons.shotgun;
        if (this.activeSlot === 2) return this.weapons.revolver;
        if (this.activeSlot === 3) return this.weapons.minigun;
        return this.weapons.revolver;
    }

    updateVisibleModel() {
        this.shotgunModel.visible = false;
        this.revolverModel.visible = false;
        this.minigunModel.visible = false;
        this.uziModel.visible = false;

        if (this.uziFrenzyActive) {
            this.uziModel.visible = true;
        } else if (this.activeSlot === 1) {
            this.shotgunModel.visible = true;
        } else if (this.activeSlot === 2) {
            this.revolverModel.visible = true;
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
            if (this.weapons.shotgun.mag <= 0) {
                this.reload();
                return;
            }
            this.weapons.shotgun.mag--;
            this.lastShotTime = now;
            this.audioManager.playShotgunShot();

            this.recoilOffset = 0.12;
            this.recoilRot = 0.35;
            this.triggerFlash(this.shotgunModel);

            for (let i = 0; i < this.weapons.shotgun.pellets; i++) {
                this.createSpreadPellet(this.weapons.shotgun.damagePerPellet);
            }
        } else if (this.activeSlot === 2) {
            if (this.weapons.revolver.mag <= 0) {
                this.reload();
                return;
            }
            this.weapons.revolver.mag--;
            this.lastShotTime = now;
            this.audioManager.playRevolverShot();

            this.recoilOffset = 0.08;
            this.recoilRot = 0.25;
            this.triggerFlash(this.revolverModel);
            this.createSingleProjectile('holy', this.weapons.revolver.damage);
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
        const color = type === 'holy' ? 0xffea55 : (type === 'vulcan' ? 0xff8800 : 0x00f0ff);
        const geo = new THREE.SphereGeometry(type === 'vulcan' ? 0.16 : 0.18, 5, 5);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.copy(this.camera.position);

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        if (type === 'vulcan' || type === 'neon') {
            dir.x += (Math.random() - 0.5) * 0.025;
            dir.y += (Math.random() - 0.5) * 0.025;
            dir.normalize();
        }

        this.scene.add(mesh);

        this.projectiles.push({
            mesh: mesh,
            dir: dir,
            speed: 150,
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
            if (this.weapons.shotgun.mag === this.weapons.shotgun.maxMag || this.weapons.shotgun.reserve <= 0) return;
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
            this.audioManager.playShotgunPump();
        } else if (this.activeSlot === 2) {
            if (this.weapons.revolver.mag === this.weapons.revolver.maxMag || this.weapons.revolver.reserve <= 0) return;
            this.isReloading = true;
            this.reloadTimer = this.reloadDuration;
            this.audioManager.playReload();
        }
    }

    spawnMinigunPedestal() {
        if (this.minigunSpawned || this.hasMinigun) return;
        this.minigunSpawned = true;

        const group = new THREE.Group();
        group.position.set(-70, 0, 50);

        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.4, 0.8, 8),
            new THREE.MeshLambertMaterial({ color: 0x332211 })
        );
        pedestal.position.y = 0.4;
        group.add(pedestal);

        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, 12, 8),
            new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.6 })
        );
        beam.position.y = 6.0;
        group.add(beam);

        const miniVisual = this.buildMinigunModel();
        miniVisual.position.set(0, 1.2, 0);
        group.add(miniVisual);
        group.userData.miniVisual = miniVisual;

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

        this.scene.add(group);
        this.medkitPickups.push(group);
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

        // Desbloqueo de Minigun a 10.000 puntos
        if (enemySystem && enemySystem.score >= 10000 && !this.minigunSpawned && !this.hasMinigun) {
            this.spawnMinigunPedestal();
        }

        // Recogida de Minigun en el pedestal
        if (this.minigunPedestal) {
            this.minigunPedestal.rotation.y += delta * 2.0;
            if (this.camera.position.distanceTo(this.minigunPedestal.position) < 3.0) {
                this.hasMinigun = true;
                this.activeSlot = 3;
                this.updateVisibleModel();
                this.scene.remove(this.minigunPedestal);
                this.minigunPedestal = null;
                this.audioManager.playPickup();
                this.lastPickupText = '¡MINIGUN VULCAN DESBLOQUEADA [3]!';
            }
        }

        // Recarga
        if (this.isReloading) {
            this.reloadTimer -= delta;
            this.recoilRot = Math.sin((1.0 - (this.reloadTimer / this.reloadDuration)) * Math.PI) * 0.4;
            if (this.reloadTimer <= 0) {
                if (this.activeSlot === 1) {
                    const needed = this.weapons.shotgun.maxMag - this.weapons.shotgun.mag;
                    const toAdd = Math.min(needed, this.weapons.shotgun.reserve);
                    this.weapons.shotgun.mag += toAdd;
                    this.weapons.shotgun.reserve -= toAdd;
                } else if (this.activeSlot === 2) {
                    const needed = this.weapons.revolver.maxMag - this.weapons.revolver.mag;
                    const toAdd = Math.min(needed, this.weapons.revolver.reserve);
                    this.weapons.revolver.mag += toAdd;
                    this.weapons.revolver.reserve -= toAdd;
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

        // Recogida de Cajas de Munición Ponderadas
        const playerPos = this.camera.position;
        for (let j = this.ammoPickups.length - 1; j >= 0; j--) {
            const pk = this.ammoPickups[j];
            pk.rotation.y += delta * 1.5;

            if (pk.position.distanceTo(playerPos) < 2.5) {
                const rand = Math.random();
                if (rand < 0.60) {
                    this.weapons.revolver.reserve = Math.min(72, this.weapons.revolver.reserve + 12);
                    this.lastPickupText = '+12 BALAS DE REVÓLVER';
                } else if (rand < 0.90) {
                    this.weapons.shotgun.reserve = Math.min(28, this.weapons.shotgun.reserve + 6);
                    this.lastPickupText = '+6 CARTUCHOS DE ESCOPETA';
                } else {
                    this.weapons.minigun.reserve = Math.min(300, this.weapons.minigun.reserve + 60);
                    this.lastPickupText = '+60 BALAS DE MINIGUN';
                }

                this.audioManager.playPickup();
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
                this.scene.remove(med);
                this.medkitPickups.splice(k, 1);
            }
        }

        // Spawn periódico
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
