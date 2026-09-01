import { AudioManager } from './engine/AudioManager.js';
import { CameraController } from './engine/CameraController.js';
import { AsciiShaderRenderer } from './engine/AsciiShaderRenderer.js';
import { CityBuilder } from './world/CityBuilder.js';
import { TrafficSystem } from './world/TrafficSystem.js';
import { WeaponSystem } from './combat/WeaponSystem.js';
import { EnemySystem } from './combat/EnemySystem.js';
import { Hud } from './ui/Hud.js';

class Game {
    constructor() {
        this.asciiCanvas = document.getElementById('ascii-canvas');
        this.startOverlay = document.getElementById('start-overlay');
        this.startBtn = document.getElementById('start-btn');

        this.scene = null;
        this.camera = null;
        this.threeRenderer = null;
        this.asciiRenderer = null;
        this.cameraController = null;
        this.audioManager = null;
        this.cityBuilder = null;
        this.trafficSystem = null;
        this.weaponSystem = null;
        this.enemySystem = null;
        this.hud = null;

        this.clock = new THREE.Clock();
        this.isRunning = false;

        this.init();
    }

    init() {
        // 1. Escena con fondo negro puro (cielo vacío sin caracteres ASCII) y Cámara FOV 84°
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0035);

        this.camera = new THREE.PerspectiveCamera(
            84,
            window.innerWidth / window.innerHeight,
            0.1,
            450
        );

        // 2. WebGL Renderer
        this.threeRenderer = new THREE.WebGLRenderer({
            canvas: this.asciiCanvas,
            antialias: false,
            powerPreference: 'high-performance'
        });

        // 3. Audio & Renderizado ASCII en GPU
        this.audioManager = new AudioManager();
        this.asciiRenderer = new AsciiShaderRenderer(
            this.threeRenderer,
            this.scene,
            this.camera,
            this.asciiCanvas
        );

        // 4. Entorno y Colisiones Físicas
        this.cityBuilder = new CityBuilder(this.scene);
        this.trafficSystem = new TrafficSystem(this.scene);

        // 5. Controlador de Primera Persona con Colisiones
        this.cameraController = new CameraController(
            this.camera,
            this.asciiCanvas,
            this.audioManager,
            this.cityBuilder
        );

        // 6. Armamento (3 Slots) y Demonios (Niveles y Bosses)
        this.weaponSystem = new WeaponSystem(this.scene, this.camera, this.audioManager);
        this.enemySystem = new EnemySystem(this.scene, this.camera, this.audioManager, this.weaponSystem);

        // 7. HUD de Combate
        this.hud = new Hud(
            this.cameraController,
            this.asciiRenderer,
            this.audioManager,
            this.weaponSystem,
            this.enemySystem
        );

        // 8. Evento Iniciar Partida
        this.startBtn.addEventListener('click', () => this.startGame());

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    startGame() {
        this.audioManager.init();
        this.audioManager.resume();
        this.asciiCanvas.requestPointerLock();
        this.startOverlay.style.display = 'none';
        this.isRunning = true;
    }

    loop() {
        requestAnimationFrame(this.loop);

        if (!this.isRunning) {
            this.asciiRenderer.render(0.016);
            return;
        }

        // Si está en pausa, consumir delta para no acumularlo
        if (this.hud.isPaused || this.enemySystem.isPlayerDead) {
            this.clock.getDelta();
            if (this.hud) this.hud.update(0);
            this.asciiRenderer.render(0);
            return;
        }

        const delta = Math.min(this.clock.getDelta(), 0.05);

        if (this.cityBuilder) this.cityBuilder.update(delta);
        if (this.trafficSystem) this.trafficSystem.update(delta);
        if (this.cameraController) this.cameraController.update(delta);
        if (this.weaponSystem) this.weaponSystem.update(delta, this.enemySystem);
        if (this.enemySystem) this.enemySystem.update(delta);

        this.asciiRenderer.setCorruption(this.enemySystem.psychicIntensity);
        if (this.hud) this.hud.update(delta);

        this.asciiRenderer.render(delta);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
