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
        this.victoryOverlay = document.getElementById('victory-overlay');
        this.resumeBtn = document.getElementById('resume-btn');
        this.restartBtnPause = document.getElementById('restart-btn-pause');
        this.restartBtn = document.getElementById('restart-btn');
        this.victoryRestartBtn = document.getElementById('victory-restart-btn');
        this.pauseScore = document.getElementById('pause-score');
        this.pauseLevel = document.getElementById('pause-level');
        this.pauseKills = document.getElementById('pause-kills');
        this.finalScore = document.getElementById('final-score');
        this.finalLevel = document.getElementById('final-level');
        this.finalKills = document.getElementById('final-kills');
        this.victoryScore = document.getElementById('victory-score');
        this.victoryKills = document.getElementById('victory-kills');
        this.victoryTime = document.getElementById('victory-time');

        this.isPaused = false;
        this.totalPlaySeconds = 0;
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
        if (this.victoryRestartBtn) {
            this.victoryRestartBtn.addEventListener('click', () => location.reload());
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

        // 4. Slots y Armas (Actualización Dinámica de Badges)
        if (this.slot1Badge && this.slot2Badge && this.slot3Badge) {
            this.slot1Badge.classList.toggle('active', this.weaponSystem.activeSlot === 1 && !this.weaponSystem.uziFrenzyActive);
            this.slot2Badge.classList.toggle('active', this.weaponSystem.activeSlot === 2 && !this.weaponSystem.uziFrenzyActive);
            this.slot3Badge.classList.toggle('active', this.weaponSystem.activeSlot === 3 && !this.weaponSystem.uziFrenzyActive);
            this.slot3Badge.classList.toggle('locked', !this.weaponSystem.hasMinigun);

            this.slot1Badge.innerHTML = this.weaponSystem.slot1Weapon === 'm16' ? '<kbd>1</kbd> COLT M16' : '<kbd>1</kbd> ESCOPETA';
            this.slot2Badge.innerHTML = this.weaponSystem.slot2Weapon === 'deagle' ? '<kbd>2</kbd> D.EAGLE .50' : '<kbd>2</kbd> REVÓLVER';
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
            const isM16 = this.weaponSystem.slot1Weapon === 'm16';
            const w = this.weaponSystem.weapons[this.weaponSystem.slot1Weapon] || this.weaponSystem.weapons.shotgun;

            this.weaponName.textContent = w.name;
            this.weaponName.style.color = isM16 ? '#00f0ff' : '#ffdd44';
            this.ammoMag.textContent = w.mag;
            this.ammoReserve.textContent = w.reserve;
            this.frenzyContainer.classList.add('hidden');

            if (this.weaponSystem.isReloading) {
                this.reloadPrompt.textContent = isM16 ? 'RECARGANDO...' : 'BOMBEANDO...';
                this.reloadPrompt.classList.remove('hidden');
            } else if (w.mag === 0) {
                this.reloadPrompt.textContent = '[R] RECARGAR';
                this.reloadPrompt.classList.remove('hidden');
            } else {
                this.reloadPrompt.classList.add('hidden');
            }
        } else if (this.weaponSystem.activeSlot === 2) {
            const isDeagle = this.weaponSystem.slot2Weapon === 'deagle';
            const w = this.weaponSystem.weapons[this.weaponSystem.slot2Weapon] || this.weaponSystem.weapons.revolver;

            this.weaponName.textContent = w.name;
            this.weaponName.style.color = isDeagle ? '#ffe600' : '#ffffff';
            this.ammoMag.textContent = w.mag;
            this.ammoReserve.textContent = w.reserve;
            this.frenzyContainer.classList.add('hidden');

            if (this.weaponSystem.isReloading) {
                this.reloadPrompt.textContent = 'RECARGANDO...';
                this.reloadPrompt.classList.remove('hidden');
            } else if (w.mag === 0) {
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
            if (boss.isFinalBoss) {
                this.bossBarContainer.style.borderColor = '#ff1100';
                this.bossBarContainer.style.boxShadow = '0 0 38px rgba(255, 17, 0, 0.95)';
                this.bossName.style.color = '#ffdd00';
                this.bossName.style.textShadow = '0 0 10px #ff1100, 0 0 20px #ffaa00';
                this.bossFill.style.background = 'linear-gradient(90deg, #ff0033, #ff4400, #ffea00)';
                this.bossHpVal.style.color = '#ffea00';
            } else {
                this.bossBarContainer.style.borderColor = '#ff0077';
                this.bossBarContainer.style.boxShadow = '0 0 30px rgba(255, 0, 119, 0.8)';
                this.bossName.style.color = '#ff0077';
                this.bossName.style.textShadow = '0 0 8px #ff0077';
                this.bossFill.style.background = 'linear-gradient(90deg, #ff0077, #ffcc00)';
                this.bossHpVal.style.color = '#ffffff';
            }
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

        // 8. Pantalla de Victoria (Jefe Final derrotado)
        if (this.enemySystem.isVictory && this.victoryOverlay && !this.victoryOverlay.classList.contains('active')) {
            this.audioManager.pauseMusic();
            document.exitPointerLock();
            this.victoryOverlay.classList.remove('hidden');
            this.victoryOverlay.classList.add('active');
            if (this.victoryScore) this.victoryScore.textContent = this.enemySystem.score;
            if (this.victoryKills) this.victoryKills.textContent = this.enemySystem.demonsPurged;
            if (this.victoryTime) {
                const mins = Math.floor(this.totalPlaySeconds / 60);
                const secs = Math.floor(this.totalPlaySeconds % 60);
                this.victoryTime.textContent = `${mins}m ${secs}s`;
            }
        }

        // 9. Game Over
        if (this.enemySystem.isPlayerDead && !this.gameoverOverlay.classList.contains('active')) {
            this.audioManager.pauseMusic();
            document.exitPointerLock();
            this.gameoverOverlay.classList.remove('hidden');
            this.gameoverOverlay.classList.add('active');
            this.finalScore.textContent = this.enemySystem.score;
            if (this.finalLevel) this.finalLevel.textContent = this.enemySystem.currentLevel;
            this.finalKills.textContent = this.enemySystem.demonsPurged;
        }

        this.totalPlaySeconds += delta;

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
