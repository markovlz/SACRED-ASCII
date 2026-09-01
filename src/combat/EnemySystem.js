/**
 * EnemySystem - Sistema de Niveles de Amenaza progresivos, Jefes cada 5.000 pts y spawn veloz
 */
export class EnemySystem {
    constructor(scene, camera, audioManager, weaponSystem) {
        this.scene = scene;
        this.camera = camera;
        this.audioManager = audioManager;
        this.weaponSystem = weaponSystem;

        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 4.2;
        this.maxEnemies = 20;

        this.playerHealth = 100;
        this.maxHealth = 100;
        this.isPlayerDead = false;
        this.score = 0;
        this.demonsPurged = 0;

        // Sistema de Niveles de Amenaza (Threat Level)
        this.currentLevel = 1;
        this.levelThresholds = [0, 1500, 3500, 6500, 10500, 15500, 22000, 30000];
        this.nextLevelScore = 1500;

        // Jefes Titánicos cada 5.000 puntos
        this.nextBossScore = 5000;
        this.bossTier = 1;
        this.activeBoss = null;

        this.psychicIntensity = 0.0;
        this.particles = [];

        this.spawnInitialWave();
    }

    spawnInitialWave() {
        for (let i = 0; i < 7; i++) {
            const x = (Math.random() - 0.5) * 110 - 30;
            const z = (Math.random() - 0.5) * 170;
            this.spawnGroundDemon(x, z);
        }

        this.spawnEliteDemon(-70, 20);
        this.spawnFlyingDemon(-135, 24, -45);
    }

    updateLevelScaling() {
        let calculatedLevel = 1;
        for (let i = 0; i < this.levelThresholds.length; i++) {
            if (this.score >= this.levelThresholds[i]) {
                calculatedLevel = i + 1;
            }
        }

        if (calculatedLevel > this.currentLevel) {
            this.currentLevel = calculatedLevel;
            this.nextLevelScore = this.levelThresholds[this.currentLevel] || (this.score + 10000);

            // Escalar dificultad
            this.spawnInterval = Math.max(2.0, 4.5 - (this.currentLevel * 0.45));
            this.maxEnemies = Math.min(30, 18 + this.currentLevel * 2);
            this.audioManager.playPickup();
        }
    }

    spawnGroundDemon(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const skinMat = new THREE.MeshLambertMaterial({ color: 0xaa0033, flatShading: true });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const hornMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.5), skinMat);
        torso.position.y = 1.3;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skinMat);
        head.position.y = 2.1;
        group.add(head);

        const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), hornMat);
        h1.position.set(-0.25, 2.55, 0.1);
        h1.rotation.z = 0.3;
        group.add(h1);

        const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), hornMat);
        h2.position.set(0.25, 2.55, 0.1);
        h2.rotation.z = -0.3;
        group.add(h2);

        const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), eyeMat);
        e1.position.set(-0.16, 2.15, 0.31);
        group.add(e1);

        const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), eyeMat);
        e2.position.set(0.16, 2.15, 0.31);
        group.add(e2);

        this.scene.add(group);

        // Velocidad escala con el nivel
        const speedBonus = (this.currentLevel - 1) * 0.4;

        const enemyObj = {
            mesh: group,
            type: 'ground',
            hp: 80,
            maxHp: 80,
            speed: 6.8 + speedBonus,
            hitRadius: 1.5,
            centerY: 1.4,
            halfHeight: 1.5,
            isAlive: true,
            materials: [skinMat],
            takeDamage: (dmg) => this.damageEnemy(enemyObj, dmg)
        };

        this.enemies.push(enemyObj);
    }

    spawnEliteDemon(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const skinMat = new THREE.MeshLambertMaterial({ color: 0xdd0033, flatShading: true });
        const crownMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.8), skinMat);
        torso.position.y = 1.9;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), skinMat);
        head.position.y = 3.1;
        group.add(head);

        for (let k = -2; k <= 2; k++) {
            const h = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 5), crownMat);
            h.position.set(k * 0.22, 3.8, 0);
            h.rotation.z = -k * 0.2;
            group.add(h);
        }

        const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), eyeMat);
        e1.position.set(-0.25, 3.2, 0.46);
        group.add(e1);
        const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), eyeMat);
        e2.position.set(0.25, 3.2, 0.46);
        group.add(e2);

        this.scene.add(group);

        const speedBonus = (this.currentLevel - 1) * 0.35;

        const enemyObj = {
            mesh: group,
            type: 'elite',
            hp: 220,
            maxHp: 220,
            speed: 6.2 + speedBonus,
            hitRadius: 2.2,
            centerY: 2.2,
            halfHeight: 2.4,
            isAlive: true,
            materials: [skinMat],
            takeDamage: (dmg) => this.damageEnemy(enemyObj, dmg)
        };

        this.enemies.push(enemyObj);
    }

    spawnFlyingDemon(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const skinMat = new THREE.MeshLambertMaterial({ color: 0x241138 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        const wingMat = new THREE.MeshLambertMaterial({ color: 0x140a1f, side: THREE.DoubleSide });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.6), skinMat);
        group.add(body);

        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), eyeMat);
        eye.position.set(0, 0.15, 0.31);
        group.add(eye);

        const wingGeo = new THREE.PlaneGeometry(2.4, 1.2);
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(-1.4, 0.2, 0);
        leftWing.rotation.y = 0.3;
        group.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.position.set(1.4, 0.2, 0);
        rightWing.rotation.y = -0.3;
        group.add(rightWing);

        group.userData.leftWing = leftWing;
        group.userData.rightWing = rightWing;

        this.scene.add(group);

        const speedBonus = (this.currentLevel - 1) * 0.45;

        const enemyObj = {
            mesh: group,
            type: 'flying',
            hp: 55,
            maxHp: 55,
            speed: 9.0 + speedBonus,
            hitRadius: 1.8,
            centerY: 0.0,
            halfHeight: 1.6,
            isAlive: true,
            materials: [skinMat, wingMat],
            flyTimer: Math.random() * Math.PI,
            takeDamage: (dmg) => this.damageEnemy(enemyObj, dmg)
        };

        this.enemies.push(enemyObj);
    }

    spawnBossTitan(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const bossMat = new THREE.MeshLambertMaterial({ color: 0x550088, flatShading: true });
        const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.2, 1.4), bossMat);
        torso.position.y = 3.0;
        group.add(torso);

        const core = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.45), lavaMat);
        core.position.set(0, 3.2, 0);
        group.add(core);

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), bossMat);
        head.position.y = 5.2;
        group.add(head);

        const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.1), eyeMat);
        e1.position.set(-0.38, 5.3, 0.72);
        group.add(e1);
        const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.1), eyeMat);
        e2.position.set(0.38, 5.3, 0.72);
        group.add(e2);

        for (let i = -3; i <= 3; i++) {
            const h = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 6), lavaMat);
            h.position.set(i * 0.35, 6.2, 0);
            h.rotation.z = -i * 0.22;
            group.add(h);
        }

        this.scene.add(group);

        const bossHp = 650 + (this.bossTier - 1) * 300;

        const bossObj = {
            mesh: group,
            type: 'boss',
            name: `ARCHDEMON TITAN (NIVEL ${this.bossTier})`,
            hp: bossHp,
            maxHp: bossHp,
            speed: 5.5 + (this.bossTier - 1) * 0.3,
            hitRadius: 3.2,
            centerY: 3.2,
            halfHeight: 3.5,
            isAlive: true,
            materials: [bossMat, lavaMat],
            takeDamage: (dmg) => this.damageEnemy(bossObj, dmg)
        };

        this.enemies.push(bossObj);
        this.activeBoss = bossObj;
        this.audioManager.playBossRoar();
    }

    damageEnemy(enemy, dmg) {
        if (!enemy.isAlive) return;
        enemy.hp -= dmg;

        if (enemy.materials && enemy.materials[0]) {
            const originalColor = enemy.materials[0].color.getHex();
            enemy.materials[0].color.setHex(0xffffff);
            setTimeout(() => {
                if (enemy.materials && enemy.materials[0]) {
                    enemy.materials[0].color.setHex(originalColor);
                }
            }, 55);
        }

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
    }

    killEnemy(enemy) {
        enemy.isAlive = false;
        this.scene.remove(enemy.mesh);
        this.audioManager.playDemonDeath(enemy.type === 'elite' || enemy.type === 'boss');

        this.demonsPurged++;

        if (enemy.type === 'boss') {
            this.score += 2500;
            this.activeBoss = null;
            this.createDisintegrationParticles(enemy.mesh.position, 0xff00ff, 28);
        } else if (enemy.type === 'elite') {
            this.score += 500;
            this.createDisintegrationParticles(enemy.mesh.position, 0xff0077, 16);
        } else if (enemy.type === 'flying') {
            this.score += 250;
            this.createDisintegrationParticles(enemy.mesh.position, 0x00f0ff, 12);
        } else {
            this.score += 100;
            this.createDisintegrationParticles(enemy.mesh.position, 0xff2200, 10);
        }

        this.updateLevelScaling();

        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) {
            this.enemies.splice(idx, 1);
        }
    }

    createDisintegrationParticles(pos, colorHex, count = 12) {
        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, 0.22, 0.22),
                new THREE.MeshBasicMaterial({ color: colorHex })
            );
            p.position.copy(pos);
            p.position.y += 1.2;
            this.scene.add(p);
            this.particles.push({
                mesh: p,
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    Math.random() * 8 + 2,
                    (Math.random() - 0.5) * 10
                ),
                life: 0.85
            });
        }
    }

    update(delta) {
        if (this.isPlayerDead) return;

        const playerPos = this.camera.position;
        let maxCorruptionProximity = 0;

        // Comprobar Boss cada 5.000 puntos
        if (this.score >= this.nextBossScore && !this.activeBoss) {
            this.nextBossScore += 5000;
            this.bossTier++;
            const angle = Math.random() * Math.PI * 2;
            const bx = playerPos.x + Math.cos(angle) * 45;
            const bz = playerPos.z + Math.sin(angle) * 45;
            this.spawnBossTitan(bx, bz);
        }

        this.enemies.forEach(enemy => {
            if (!enemy.isAlive) return;

            const dist = enemy.mesh.position.distanceTo(playerPos);
            enemy.mesh.lookAt(playerPos.x, enemy.mesh.position.y, playerPos.z);

            if (enemy.type === 'ground' || enemy.type === 'elite' || enemy.type === 'boss') {
                const dir = playerPos.clone().sub(enemy.mesh.position).normalize();
                dir.y = 0;
                enemy.mesh.position.add(dir.multiplyScalar(enemy.speed * delta));

                const auraRange = enemy.type === 'boss' ? 14.0 : 9.0;
                if (dist < auraRange) {
                    const corr = (1.0 - (dist / auraRange));
                    maxCorruptionProximity = Math.max(maxCorruptionProximity, corr);
                    const drainRate = enemy.type === 'boss' ? 24 : 14;
                    this.playerHealth = Math.max(0, this.playerHealth - delta * drainRate * corr);
                }
            } else if (enemy.type === 'flying') {
                enemy.flyTimer += delta * 2.5;
                const wingSway = Math.sin(enemy.flyTimer * 5.0) * 0.45;
                if (enemy.mesh.userData.leftWing) enemy.mesh.userData.leftWing.rotation.z = wingSway;
                if (enemy.mesh.userData.rightWing) enemy.mesh.userData.rightWing.rotation.z = -wingSway;

                const dir = playerPos.clone().sub(enemy.mesh.position).normalize();
                enemy.mesh.position.add(dir.multiplyScalar(enemy.speed * delta));

                if (dist < 8.0) {
                    const corr = (1.0 - (dist / 8.0));
                    maxCorruptionProximity = Math.max(maxCorruptionProximity, corr);
                    this.playerHealth = Math.max(0, this.playerHealth - delta * 14 * corr);
                }
            }
        });

        this.psychicIntensity = maxCorruptionProximity;
        this.audioManager.setPsychicIntensity(this.psychicIntensity);

        if (this.playerHealth <= 0 && !this.isPlayerDead) {
            this.isPlayerDead = true;
            this.playerHealth = 0;
        }

        for (let pIdx = this.particles.length - 1; pIdx >= 0; pIdx--) {
            const pt = this.particles[pIdx];
            pt.life -= delta;
            pt.vel.y -= delta * 14;
            pt.mesh.position.add(pt.vel.clone().multiplyScalar(delta));

            if (pt.life <= 0) {
                this.scene.remove(pt.mesh);
                this.particles.splice(pIdx, 1);
            }
        }

        // Spawn según nivel
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval && this.enemies.length < this.maxEnemies) {
            this.spawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const spawnX = playerPos.x + Math.cos(angle) * 50;
            const spawnZ = playerPos.z + Math.sin(angle) * 50;

            const eliteProb = Math.min(0.45, 0.2 + this.currentLevel * 0.04);
            const rand = Math.random();

            if (rand < eliteProb) {
                this.spawnEliteDemon(spawnX, spawnZ);
            } else if (rand < 0.6) {
                this.spawnFlyingDemon(spawnX, 22, spawnZ);
            } else {
                this.spawnGroundDemon(spawnX, spawnZ);
            }
        }
    }
}
