/**
 * Hud - Interfaz de combate con Pausa Total (congelación de BSO y reloj), Nivel de Amenaza y Slots
 */
export class Hud {
    constructor(cameraController, asciiShaderRenderer, audioManager, weaponSystem, enemySystem) {
        this.cameraController = cameraController;
        this.asciiRenderer = asciiShaderRenderer;
        this.audioManager = audioManager;
        this.weaponSystem = weaponSystem;
        this.enemySystem = enemySystem;

        // Elementos del DOM
        this.compassText = document.getElementById('compass-text');
        this.gameTimeEl = document.getElementById('game-time');
        this.fpsCounter = document.getElementById('fps-counter');
        this.crtOverlay = document.getElementById('crt-overlay');
        this.paletteIndicator = document.getElementById('palette-indicator');

        // Combate y Slots
        this.healthVal = document.getElementById('health-val');
        this.healthBar = document.getElementById('health-bar');
        this.scoreVal = document.getElementById('score-val');
        this.killVal = document.getElementById('kill-val');
        this.threatLevel = document.getElementById('threat-level');
        this.weaponName = document.getElementById('weapon-name');
        this.ammoMag = document.getElementById('ammo-mag');
        this.ammoReserve = document.getElementById('ammo-reserve');
        this.reloadPrompt = document.getElementById('reload-prompt');

        this.slot1Badge = document.getElementById('slot-1-badge');
        this.slot2Badge = document.getElementById('slot-2-badge');
        this.slot3Badge = document.getElementById('slot-3-badge');

        this.frenzyContainer = document.getElementById('frenzy-container');
        this.frenzyTimer = document.getElementById('frenzy-timer');
        this.frenzyBar = document.getElementById('frenzy-bar');
        this.psychicWarning = document.getElementById('psychic-warning');

        // Boss Bar
        this.bossBarContainer = document.getElementById('boss-bar-container');
        this.bossName = document.getElementById('boss-name');
        this.bossFill = document.getElementById('boss-fill');
        this.bossHpVal = document.getElementById('boss-hp-val');

        // Modales
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.gameoverOverlay = document.getElementById('gameover-overlay');
        this.resumeBtn = document.getElementById('resume-btn');
        this.restartBtnPause = document.getElementById('restart-btn-pause');
        this.restartBtn = document.getElementById('restart-btn');
        this.pauseScore = document.getElementById('pause-score');
        this.pauseLevel = document.getElementById('pause-level');
        this.pauseKills = document.getElementById('pause-kills');
        this.finalScore = document.getElementById('final-score');
        this.finalLevel = document.getElementById('final-level');
        this.finalKills = document.getElementById('final-kills');

        this.isPaused = false;
        this.gameHour = 18;
        this.gameMinute = 45;
        this.timeTickTimer = 0;

        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.lastCheckedPickup = '';

        this.initControls();
    }

    initControls() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Tab' || (e.code === 'KeyP' && e.ctrlKey)) {
                e.preventDefault();
                this.togglePause();
            } else if (e.code === 'KeyC') {
                this.toggleCrt();
            } else if (e.code === 'KeyP') {
                this.cyclePalette();
            } else if (e.code === 'KeyM') {
                this.toggleAudio();
            } else if (e.code === 'KeyN') {
                this.toggleMusic();
            }
        });

        if (this.resumeBtn) {
            this.resumeBtn.addEventListener('click', () => this.togglePause());
        }
        if (this.restartBtnPause) {
            this.restartBtnPause.addEventListener('click', () => location.reload());
        }
        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => location.reload());
        }
    }

    togglePause() {
        if (this.enemySystem.isPlayerDead) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            // PAUSA TOTAL: Congelar música y liberar cursor
            this.audioManager.pauseMusic();
            document.exitPointerLock();
            this.pauseOverlay.classList.remove('hidden');
            this.pauseScore.textContent = this.enemySystem.score;
            if (this.pauseLevel) this.pauseLevel.textContent = this.enemySystem.currentLevel;
            this.pauseKills.textContent = this.enemySystem.demonsPurged;
        } else {
            // REANUDAR: Reanudar música y capturar cursor
            this.audioManager.resumeMusic();
            this.pauseOverlay.classList.add('hidden');
            this.asciiRenderer.outputCanvas.requestPointerLock();
        }
    }

    toggleCrt() {
        this.crtOverlay.classList.toggle('crt-disabled');
        const isActive = !this.crtOverlay.classList.contains('crt-disabled');
        this.showNotification(`Monitor CRT: ${isActive ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    cyclePalette() {
        const name = this.asciiRenderer.cyclePalette();
        this.showNotification(`Paleta: ${name}`);
    }

    toggleAudio() {
        const isMuted = this.audioManager.toggleMute();
        this.showNotification(`Audio Total: ${isMuted ? 'MUTEADO' : 'ACTIVADO'}`);
    }

    toggleMusic() {
        const isMusicActive = this.audioManager.toggleMusic();
        this.showNotification(`Banda Sonora Metal 80s: ${isMusicActive ? 'ACTIVADA' : 'SILENCIADA'}`);
    }

    showNotification(text) {
        if (!this.paletteIndicator) return;
        this.paletteIndicator.textContent = text;
        this.paletteIndicator.classList.remove('hidden');

        this.paletteIndicator.style.animation = 'none';
        this.paletteIndicator.offsetHeight;
        this.paletteIndicator.style.animation = null;

        clearTimeout(this.notifTimeout);
        this.notifTimeout = setTimeout(() => {
            this.paletteIndicator.classList.add('hidden');
        }, 2200);
    }

    update(delta) {
        if (this.isPaused) return; // Congelar lógica del HUD en pausa

        // 1. Brújula y Reloj
        if (this.compassText) {
            this.compassText.textContent = this.cameraController.getCompassHeading();
        }

        this.timeTickTimer += delta;
        if (this.timeTickTimer >= 3.0) {
            this.timeTickTimer = 0;
            this.gameMinute++;
            if (this.gameMinute >= 60) {
                this.gameMinute = 0;
                this.gameHour = (this.gameHour + 1) % 24;
            }
            const hStr = String(this.gameHour).padStart(2, '0');
            const mStr = String(this.gameMinute).padStart(2, '0');
            this.gameTimeEl.textContent = `${hStr}:${mStr} ${this.gameHour >= 12 ? 'PM' : 'AM'}`;
        }

        // 2. Salud
        const hp = Math.max(0, Math.round(this.enemySystem.playerHealth));
        this.healthVal.textContent = `${hp}%`;
        this.healthBar.style.width = `${hp}%`;

        // 3. Puntaje, Kills y Nivel de Amenaza
        this.scoreVal.textContent = String(this.enemySystem.score).padStart(6, '0');
        this.killVal.textContent = this.enemySystem.demonsPurged;
        if (this.threatLevel) {
            this.threatLevel.textContent = `NIVEL ${this.enemySystem.currentLevel}`;
        }

        // 4. Slots y Armas
        if (this.slot1Badge && this.slot2Badge && this.slot3Badge) {
            this.slot1Badge.classList.toggle('active', this.weaponSystem.activeSlot === 1 && !this.weaponSystem.uziFrenzyActive);
            this.slot2Badge.classList.toggle('active', this.weaponSystem.activeSlot === 2 && !this.weaponSystem.uziFrenzyActive);
            this.slot3Badge.classList.toggle('active', this.weaponSystem.activeSlot === 3 && !this.weaponSystem.uziFrenzyActive);
            this.slot3Badge.classList.toggle('locked', !this.weaponSystem.hasMinigun);
            if (this.weaponSystem.hasMinigun) {
                this.slot3Badge.innerHTML = '<kbd>3</kbd> MINIGUN';
            }
        }

        if (this.weaponSystem.uziFrenzyActive) {
            this.weaponName.textContent = '⚡ UZI NEÓN BENDITA (FRENESÍ 5s)';
            this.weaponName.style.color = '#00f0ff';
            this.ammoMag.textContent = '∞';
            this.ammoReserve.textContent = 'FRENESÍ';
            this.reloadPrompt.classList.add('hidden');

            this.frenzyContainer.classList.remove('hidden');
            const remTime = Math.max(0, this.weaponSystem.uziFrenzyTimer).toFixed(1);
            this.frenzyTimer.textContent = `${remTime}s`;
            const pct = (this.weaponSystem.uziFrenzyTimer / this.weaponSystem.uziFrenzyMaxDuration) * 100;
            this.frenzyBar.style.width = `${pct}%`;
        } else if (this.weaponSystem.activeSlot === 1) {
            this.weaponName.textContent = 'ESCOPETA SAGRADA';
            this.weaponName.style.color = '#ffdd44';
            this.ammoMag.textContent = this.weaponSystem.weapons.shotgun.mag;
            this.ammoReserve.textContent = this.weaponSystem.weapons.shotgun.reserve;
            this.frenzyContainer.classList.add('hidden');

            if (this.weaponSystem.isReloading) {
                this.reloadPrompt.textContent = 'BOMBEANDO...';
                this.reloadPrompt.classList.remove('hidden');
            } else if (this.weaponSystem.weapons.shotgun.mag === 0) {
                this.reloadPrompt.textContent = '[R] RECARGAR';
                this.reloadPrompt.classList.remove('hidden');
            } else {
                this.reloadPrompt.classList.add('hidden');
            }
        } else if (this.weaponSystem.activeSlot === 2) {
            this.weaponName.textContent = 'REVÓLVER .357 CROMADO';
            this.weaponName.style.color = '#ffffff';
            this.ammoMag.textContent = this.weaponSystem.weapons.revolver.mag;
            this.ammoReserve.textContent = this.weaponSystem.weapons.revolver.reserve;
            this.frenzyContainer.classList.add('hidden');

            if (this.weaponSystem.isReloading) {
                this.reloadPrompt.textContent = 'RECARGANDO...';
                this.reloadPrompt.classList.remove('hidden');
            } else if (this.weaponSystem.weapons.revolver.mag === 0) {
                this.reloadPrompt.textContent = '[R] RECARGAR';
                this.reloadPrompt.classList.remove('hidden');
            } else {
                this.reloadPrompt.classList.add('hidden');
            }
        } else if (this.weaponSystem.activeSlot === 3) {
            this.weaponName.textContent = 'MINIGUN VULCAN SAGRADA';
            this.weaponName.style.color = '#ffaa00';
            this.ammoMag.textContent = this.weaponSystem.weapons.minigun.reserve;
            this.ammoReserve.textContent = 'MAX';
            this.frenzyContainer.classList.add('hidden');
            this.reloadPrompt.classList.add('hidden');
        }

        // 5. Toast de Notificaciones
        if (this.weaponSystem.lastPickupText && this.weaponSystem.lastPickupText !== this.lastCheckedPickup) {
            this.showNotification(this.weaponSystem.lastPickupText);
            this.lastCheckedPickup = this.weaponSystem.lastPickupText;
        }

        // 6. Barra de Boss
        if (this.enemySystem.activeBoss && this.enemySystem.activeBoss.isAlive) {
            this.bossBarContainer.classList.remove('hidden');
            const boss = this.enemySystem.activeBoss;
            this.bossName.textContent = boss.name;
            const bossHpPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
            this.bossFill.style.width = `${bossHpPct}%`;
            this.bossHpVal.textContent = `${Math.max(0, Math.round(boss.hp))} / ${boss.maxHp} HP`;
        } else {
            this.bossBarContainer.classList.add('hidden');
        }

        // 7. Alerta de Corrupción Psíquica
        if (this.enemySystem.psychicIntensity > 0.15) {
            this.psychicWarning.classList.remove('hidden');
        } else {
            this.psychicWarning.classList.add('hidden');
        }

        // 8. Game Over
        if (this.enemySystem.isPlayerDead && !this.gameoverOverlay.classList.contains('active')) {
            this.audioManager.pauseMusic();
            document.exitPointerLock();
            this.gameoverOverlay.classList.remove('hidden');
            this.gameoverOverlay.classList.add('active');
            this.finalScore.textContent = this.enemySystem.score;
            if (this.finalLevel) this.finalLevel.textContent = this.enemySystem.currentLevel;
            this.finalKills.textContent = this.enemySystem.demonsPurged;
        }

        // 9. FPS
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 500) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.fpsCounter.textContent = `${fps} FPS [GPU]`;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }
}
