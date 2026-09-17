/**
 * AsciiShaderRenderer - Motor de post-procesado 100% por GPU (GLSL Shader)
 * Cielo vacío sin caracteres ASCII (espacio negro limpio) y 100% ASCII en geometrías 3D.
 */

/**
 * Helper para etiquetar mallas detalladas (árboles, autos, enemigos, armas)
 * de modo que usen caracteres de silueta/contorno fino y NO bloques pesados.
 */
export function markDetailedMesh(obj) {
    if (!obj) return obj;
    obj.traverse((child) => {
        if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                mat.userData = mat.userData || {};
                mat.userData.detailed = true;
                mat.onBeforeCompile = (shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <dithering_fragment>',
                        '#include <dithering_fragment>\n    gl_FragColor.a = 0.35;'
                    );
                };
                mat.needsUpdate = true;
            });
        }
    });
    return obj;
}

export class AsciiShaderRenderer {
    constructor(threeRenderer, scene, camera, outputCanvas) {
        this.renderer = threeRenderer;
        this.scene = scene;
        this.camera = camera;
        this.outputCanvas = outputCanvas;

        // Rampa CP437 de 10 niveles 100% bloques para Pasto, Edificios y Suelo:
        // Elimina los puntos y guiones molestos para los ojos, dando textura sólida y suave
        this.charList = " ░░▒▒▒▓▓██";
        this.charCount = this.charList.length;

        this.paletteNames = [
            'Vice City (Full ANSI 80s)',
            'Cyberpunk Neon (Cyan & Pink)',
            'Amber CRT Terminal',
            'Matrix Green Terminal'
        ];
        this.currentPaletteIndex = 0;

        // Proporción clásica 8x14 (tipo VGA/EGA) para estabilidad retiniana y cero fatiga visual
        this.charWidth = 8;
        this.charHeight = 14;

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
        const charH = 56;
        const canvas = document.createElement('canvas');
        canvas.width = charW * this.charCount;
        canvas.height = charH * 2; // Fila 0: Bloques CP437 (Edificios/Pasto), Fila 1: Contorno (Árboles/Autos/Enemigos)
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // FILA 0: Rampa con bloques CP437 para Pasto y Edificios (sin espacios en blanco en bordes)
        for (let i = 0; i < this.charCount; i++) {
            const char = this.charList[i];
            const x0 = i * charW;
            const y0 = 0;

            if (char === ' ') {
                continue;
            } else if (char === '█') {
                // Bloque 100% sólido de borde a borde
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x0, y0, charW, charH);
            } else if (char === '▓') {
                // Trama densa 75%
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x0, y0, charW, charH);
                ctx.fillStyle = '#000000';
                for (let py = 0; py < charH; py += 4) {
                    const shift = (py % 8 === 0) ? 0 : 2;
                    for (let px = 0; px < charW; px += 4) {
                        ctx.fillRect(x0 + px + shift, y0 + py, 2, 2);
                    }
                }
            } else if (char === '▒') {
                // Trama media 50% checkerboard continuo
                ctx.fillStyle = '#ffffff';
                const bSize = 4;
                for (let py = 0; py < charH; py += bSize) {
                    const row = Math.floor(py / bSize);
                    for (let px = 0; px < charW; px += bSize) {
                        const col = Math.floor(px / bSize);
                        if ((row + col) % 2 === 0) {
                            ctx.fillRect(x0 + px, y0 + py, bSize, bSize);
                        }
                    }
                }
            } else if (char === '░') {
                // Trama ligera 25%
                ctx.fillStyle = '#ffffff';
                const bSize = 4;
                for (let py = 0; py < charH; py += bSize * 2) {
                    const row = Math.floor(py / (bSize * 2));
                    const shift = (row % 2 === 0) ? 0 : bSize;
                    for (let px = 0; px < charW; px += bSize * 2) {
                        ctx.fillRect(x0 + px + shift, y0 + py, bSize, bSize);
                    }
                }
            }
        }

        // FILA 1: Rampa de contorno fino sin bloques para Árboles, Autos y Enemigos (10 caracteres)
        const detailedList = " ·:!/+-*#@";
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(charH * 0.72)}px 'Consolas', 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let j = 0; j < detailedList.length; j++) {
            const char = detailedList[j];
            const x0 = j * charW;
            const y1 = charH;

            if (char === ' ') {
                continue;
            } else if (char === '·') {
                ctx.fillRect(x0 + Math.floor(charW / 2) - 2, y1 + Math.floor(charH / 2) - 2, 4, 4);
            } else {
                ctx.fillText(char, x0 + charW / 2, y1 + charH / 2 + 1);
            }
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

                // Si sceneColor.a < 0.65 es Árbol, Auto o Enemigo (Row 1: contornos nítidos sin bloques)
                // Si sceneColor.a >= 0.65 es Pasto o Edificio (Row 0: bloques CP437 de descanso visual)
                float isDetailed = (sceneColor.a < 0.65) ? 1.0 : 0.0;
                float rowOffset = (isDetailed > 0.5) ? 0.0 : 0.5;

                // Curva de luminancia adaptativa:
                float normalizedLum;
                if (isDetailed > 0.5) {
                    // Árboles, autos y demonios: mapeo para aristas y siluetas
                    normalizedLum = pow(clamp(lum, 0.0, 1.0), 0.88);
                } else {
                    // Pasto y Edificios: expansión para que TODO el césped y fachadas entren de lleno en '░', '▒', '▓', '█'
                    normalizedLum = pow(clamp((lum - 0.02) / 0.88, 0.0, 1.0), 0.65);
                }

                float charIndex = floor(normalizedLum * (uCharCount - 0.001));

                vec2 localUv = fract(vUv * grid);
                vec2 atlasUv = vec2((charIndex + localUv.x) / uCharCount, rowOffset + localUv.y * 0.5);
                float charAlpha = texture2D(tAscii, atlasUv).r;

                vec3 glyphCol = vec3(1.0);
                vec3 floorCol = vec3(0.0);

                if (uPalette == 0) {
                    // 1. Vice City (Full ANSI 80s): Color vivo de la escena con suelo de confort visual
                    glyphCol = pow(sceneColor.rgb, vec3(0.85)) * 1.30;
                    floorCol = sceneColor.rgb * 0.16;
                } else if (uPalette == 1) {
                    // 2. Cyberpunk Neon: Gradiente suave continuo sin saltos de escalón
                    // Púrpura -> Magenta Neón -> Cian Eléctrico
                    vec3 cMid = mix(vec3(0.40, 0.05, 0.65), vec3(1.0, 0.12, 0.60), clamp(lum * 1.6, 0.0, 1.0));
                    glyphCol = mix(cMid, vec3(0.0, 0.95, 1.0), clamp((lum - 0.40) * 2.0, 0.0, 1.0));
                    floorCol = glyphCol * 0.16;
                } else if (uPalette == 2) {
                    // 3. Amber CRT Terminal: Tono ámbar fósforo uniforme y cálido
                    glyphCol = vec3(1.0, 0.72, 0.12) * (0.45 + lum * 0.75);
                    floorCol = vec3(1.0, 0.72, 0.12) * 0.12;
                } else if (uPalette == 3) {
                    // 4. Matrix Green Terminal: Verde fósforo hacker uniforme
                    glyphCol = vec3(0.12, 1.0, 0.30) * (0.45 + lum * 0.75);
                    floorCol = vec3(0.12, 1.0, 0.30) * 0.12;
                }

                if (isDetailed > 0.5) {
                    floorCol *= 0.5;
                }

                vec3 outColor = floorCol + glyphCol * (charAlpha * 0.88);

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
