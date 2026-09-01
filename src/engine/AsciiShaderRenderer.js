/**
 * AsciiShaderRenderer - Motor de post-procesado 100% por GPU (GLSL Shader)
 * Cielo vacío sin caracteres ASCII (espacio negro limpio) y 100% ASCII en geometrías 3D.
 */
export class AsciiShaderRenderer {
    constructor(threeRenderer, scene, camera, outputCanvas) {
        this.renderer = threeRenderer;
        this.scene = scene;
        this.camera = camera;
        this.outputCanvas = outputCanvas;

        this.charList = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
        this.charCount = this.charList.length;

        this.paletteNames = [
            'Vice City (Full ANSI 80s)',
            'Cyberpunk Neon (Cyan & Pink)',
            'Amber CRT Terminal',
            'Matrix Green Terminal'
        ];
        this.currentPaletteIndex = 0;

        this.charWidth = 7;
        this.charHeight = 12;

        this.asciiAtlasTexture = this.createCharAtlas();

        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat
        });

        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.postScene = new THREE.Scene();

        this.corruptionIntensity = 0.0;
        this.time = 0;

        this.initShader();
        this.onResize();
        window.addEventListener('resize', () => this.onResize());
    }

    createCharAtlas() {
        const charW = 32;
        const charH = 48;
        const canvas = document.createElement('canvas');
        canvas.width = charW * this.charCount;
        canvas.height = charH;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${charH * 0.9}px 'VT323', monospace, 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < this.charCount; i++) {
            const char = this.charList[i];
            ctx.fillText(char, i * charW + charW / 2, charH / 2 + 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        return texture;
    }

    initShader() {
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform sampler2D tDiffuse;
            uniform sampler2D tAscii;
            uniform vec2 uResolution;
            uniform vec2 uCharSize;
            uniform float uCharCount;
            uniform int uPalette;
            uniform float uCorruption;
            uniform float uTime;
            varying vec2 vUv;

            float rand(vec2 co) {
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }

            void main() {
                vec2 grid = floor(uResolution / uCharSize);
                vec2 cell = floor(vUv * grid);

                // Distorsión por Corrupción Psíquica en coordenadas
                if (uCorruption > 0.05) {
                    float glitch = (rand(vec2(cell.y, floor(uTime * 15.0))) - 0.5) * uCorruption * 4.0;
                    cell.x += floor(glitch);
                }

                vec2 cellCenterUv = (cell + 0.5) / grid;
                vec4 sceneColor = texture2D(tDiffuse, cellCenterUv);

                float lum = dot(sceneColor.rgb, vec3(0.299, 0.587, 0.114));

                // Si es el cielo (negro/vacío sin geometría), dejarlo como vacío puro sin caracteres ASCII
                if (lum < 0.038 && uCorruption <= 0.05) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }

                // Efecto de tinte rojo/púrpura por corrupción psíquica
                if (uCorruption > 0.05) {
                    sceneColor.r += uCorruption * 0.45;
                    sceneColor.b += uCorruption * 0.25;
                    lum = max(lum, uCorruption * 0.35 * rand(cell));
                }

                float normalizedLum = pow(clamp(lum, 0.0, 1.0), 0.88);
                float charIndex = floor(normalizedLum * (uCharCount - 0.001));

                vec2 localUv = fract(vUv * grid);
                localUv.y = 1.0 - localUv.y;

                vec2 atlasUv = vec2((charIndex + localUv.x) / uCharCount, localUv.y);
                float charAlpha = texture2D(tAscii, atlasUv).r;

                vec3 outColor = vec3(0.0);

                if (uPalette == 0) {
                    vec3 enhanced = pow(sceneColor.rgb, vec3(0.85)) * 1.35;
                    outColor = enhanced * charAlpha;
                } else if (uPalette == 1) {
                    if (lum > 0.55) {
                        outColor = vec3(0.0, 0.95, 1.0) * charAlpha;
                    } else if (lum > 0.25) {
                        outColor = vec3(1.0, 0.15, 0.55) * charAlpha;
                    } else {
                        outColor = vec3(0.5, 0.0, 0.7) * charAlpha;
                    }
                } else if (uPalette == 2) {
                    outColor = vec3(1.0, 0.7, 0.1) * lum * 1.5 * charAlpha;
                } else if (uPalette == 3) {
                    outColor = vec3(0.1, 1.0, 0.25) * lum * 1.5 * charAlpha;
                }

                // Fondo limpio: los caracteres resaltan claramente sobre el vacío
                gl_FragColor = vec4(outColor, 1.0);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                tDiffuse: { value: null },
                tAscii: { value: this.asciiAtlasTexture },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uCharSize: { value: new THREE.Vector2(this.charWidth, this.charHeight) },
                uCharCount: { value: this.charCount },
                uPalette: { value: this.currentPaletteIndex },
                uCorruption: { value: 0.0 },
                uTime: { value: 0.0 }
            },
            depthTest: false,
            depthWrite: false
        });

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
        this.postScene.add(quad);
    }

    cyclePalette() {
        this.currentPaletteIndex = (this.currentPaletteIndex + 1) % this.paletteNames.length;
        this.material.uniforms.uPalette.value = this.currentPaletteIndex;
        return this.paletteNames[this.currentPaletteIndex];
    }

    setCorruption(val) {
        this.corruptionIntensity = val;
        if (this.material) {
            this.material.uniforms.uCorruption.value = val;
        }
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.outputCanvas.width = width;
        this.outputCanvas.height = height;

        this.renderer.setSize(width, height);
        this.renderTarget.setSize(width, height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        if (this.material) {
            this.material.uniforms.uResolution.value.set(width, height);
        }

        this.cols = Math.floor(width / this.charWidth);
        this.rows = Math.floor(height / this.charHeight);
    }

    render(delta = 0.016) {
        this.time += delta;
        if (this.material) {
            this.material.uniforms.uTime.value = this.time;
        }

        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.scene, this.camera);

        this.renderer.setRenderTarget(null);
        this.material.uniforms.tDiffuse.value = this.renderTarget.texture;
        this.renderer.render(this.postScene, this.postCamera);
    }
}
