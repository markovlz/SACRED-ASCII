/**
 * CameraController - Control con suavizado anti-mareo y colisión estática con deslizamiento de muros (Wall Sliding)
 */
export class CameraController {
    constructor(camera, domElement, audioManager, cityBuilder = null) {
        this.camera = camera;
        this.domElement = domElement;
        this.audioManager = audioManager;
        this.cityBuilder = cityBuilder;

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        this.speed = 17.5;
        this.currentSpeed = 0;
        this.isMoving = false;

        this.yaw = 0;
        this.pitch = 0;
        this.mouseSensitivity = 0.0020;

        this.bobbingEnabled = true;
        this.bobTimer = 0;
        this.defaultEyeHeight = 1.75;
        this.camera.position.set(0, this.defaultEyeHeight, 15);

        this.currentSurface = 'asphalt';

        this.bounds = {
            minX: -190,
            maxX: 50,
            minZ: -145,
            maxZ: 145
        };

        this.playerRadius = 0.55;

        this.initListeners();
    }

    setCityBuilder(cityBuilder) {
        this.cityBuilder = cityBuilder;
    }

    initListeners() {
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;

            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;

            this.yaw -= movementX * this.mouseSensitivity;
            this.pitch -= movementY * this.mouseSensitivity;

            const maxPitch = Math.PI / 2 - 0.05;
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
        });

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
        }
    }

    onKeyUp(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
        }
    }

    update(delta) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.x = this.pitch;
        euler.y = this.yaw;
        this.camera.quaternion.setFromEuler(euler);

        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        this.isMoving = moveDir.lengthSq() > 0;

        const targetSpeed = this.isMoving ? this.speed : 0;
        this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(1.0, delta * 14);

        if (this.isMoving) {
            moveDir.normalize();

            const sin = Math.sin(this.yaw);
            const cos = Math.cos(this.yaw);

            const dx = (moveDir.x * cos + moveDir.z * sin) * this.currentSpeed * delta;
            const dz = (-moveDir.x * sin + moveDir.z * cos) * this.currentSpeed * delta;

            const nextX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.camera.position.x + dx));
            const nextZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.camera.position.z + dz));

            // Deslizamiento de pared independiente en X y Z (Doom/Quake style)
            if (this.cityBuilder) {
                if (!this.cityBuilder.checkCollision(nextX, this.camera.position.z, this.playerRadius)) {
                    this.camera.position.x = nextX;
                }
                if (!this.cityBuilder.checkCollision(this.camera.position.x, nextZ, this.playerRadius)) {
                    this.camera.position.z = nextZ;
                }
            } else {
                this.camera.position.x = nextX;
                this.camera.position.z = nextZ;
            }

            const px = this.camera.position.x;
            if (px > 16.0) {
                this.currentSurface = 'sand';
            } else if (px < -35.0 && px > -105.0) {
                this.currentSurface = 'grass';
            } else {
                this.currentSurface = 'asphalt';
            }

            const bobFrequency = 10.0;
            const bobAmplitude = 0.018;
            const prevTimer = this.bobTimer;
            this.bobTimer += delta * bobFrequency;

            if (this.bobbingEnabled) {
                const bobOffset = Math.sin(this.bobTimer) * bobAmplitude;
                this.camera.position.y = this.defaultEyeHeight + bobOffset;
            }

            if (Math.sin(prevTimer) > 0 && Math.sin(this.bobTimer) <= 0) {
                if (this.audioManager) {
                    this.audioManager.playFootstep(this.currentSurface);
                }
            }
        } else {
            this.camera.position.y += (this.defaultEyeHeight - this.camera.position.y) * Math.min(1.0, delta * 8);
        }
    }

    getCompassHeading() {
        let deg = ((-this.yaw * (180 / Math.PI)) % 360 + 360) % 360;
        const px = this.camera.position.x;

        let zoneName = 'OCEAN DRIVE';
        if (px > 16) zoneName = 'VICE BEACH';
        else if (px < -35 && px > -105) zoneName = 'CENTRAL PARK';
        else if (px <= -105) zoneName = 'MANHATTAN SKYLINE';

        if (deg >= 337.5 || deg < 22.5) return `[ N ] ${zoneName}`;
        if (deg >= 22.5 && deg < 67.5) return `[ NE ] ${zoneName}`;
        if (deg >= 67.5 && deg < 112.5) return `[ E ] ${zoneName}`;
        if (deg >= 112.5 && deg < 157.5) return `[ SE ] ${zoneName}`;
        if (deg >= 157.5 && deg < 202.5) return `[ S ] ${zoneName}`;
        if (deg >= 202.5 && deg < 247.5) return `[ SW ] ${zoneName}`;
        if (deg >= 247.5 && deg < 292.5) return `[ W ] ${zoneName}`;
        return `[ NW ] ${zoneName}`;
    }
}
