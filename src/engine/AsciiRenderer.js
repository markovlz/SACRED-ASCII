/**
 * AsciiRenderer - Motor de renderizado ASCII de alto rendimiento (60 FPS)
 * Utiliza un amplio set de caracteres, mapeo de rango dinámico y renderizado
 * por lotes (Color-Bucket Batching) para eliminar la sobrecarga de canvas.
 */
export class AsciiRenderer {
    constructor(threeRenderer, scene, camera, outputCanvas) {
        this.threeRenderer = threeRenderer;
        this.scene = scene;
        this.camera = camera;
        this.outputCanvas = outputCanvas;
        this.ctx = outputCanvas.getContext('2d', { alpha: false });

        // Set enriquecido de más de 35 caracteres ASCII graduados por densidad óptica
        this.asciiRamp = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
        this.rampLength = this.asciiRamp.length;

        // Modos de paleta disponibles
        this.palettes = {
            vice: {
                name: 'Vice City (Full ANSI 80s)',
                type: 'full-ansi'
            },
            cyberpunk: {
                name: 'Cyberpunk Neon (Cyan & Pink)',
                type: 'cyberpunk'
            },
            amber: {
                name: 'Amber CRT Monitor',
                type: 'amber'
            },
            matrix: {
                name: 'Matrix Green Terminal',
                type: 'matrix'
            }
        };

        this.currentPaletteKey = 'vice';

        // Canvas de muestreo
        this.sampleCanvas = document.createElement('canvas');
        this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

        // Resolución del grid ASCII
        this.cols = 120;
        this.rows = 60;

        this.fontSize = 12;
        this.charWidth = 8;
        this.charHeight = 12;

        // Bins de agrupación de color para batch rendering ultra rápido
        this.colorBins = new Map();

        this.onResize();
        window.addEventListener('resize', () => this.onResize());
    }

    setResolutionMode(mode) {
        if (mode === 'low') {
            this.cols = 90;
            this.rows = 45;
        } else if (mode === 'medium') {
            this.cols = 120;
            this.rows = 60;
        } else if (mode === 'high') {
            this.cols = 160;
            this.rows = 80;
        }
        this.onResize();
    }

    cyclePalette() {
        const keys = Object.keys(this.palettes);
        let currentIndex = keys.indexOf(this.currentPaletteKey);
        currentIndex = (currentIndex + 1) % keys.length;
        this.currentPaletteKey = keys[currentIndex];
        return this.palettes[this.currentPaletteKey].name;
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.outputCanvas.width = width;
        this.outputCanvas.height = height;

        const aspect = width / height;
        this.rows = Math.max(40, Math.min(75, Math.floor(height / 14)));
        this.cols = Math.floor(this.rows * aspect * 1.75);

        this.sampleCanvas.width = this.cols;
        this.sampleCanvas.height = this.rows;

        this.charWidth = width / this.cols;
        this.charHeight = height / this.rows;
        this.fontSize = Math.max(10, Math.floor(this.charHeight * 1.08));

        this.threeRenderer.setSize(this.cols, this.rows, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.ctx.font = `bold ${this.fontSize}px 'VT323', monospace, 'Courier New'`;
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';
    }

    render() {
        // 1. Renderizado 3D fuera de pantalla a resolución de grid
        this.threeRenderer.render(this.scene, this.camera);

        // 2. Extracción de mapa de píxeles
        this.sampleCtx.drawImage(this.threeRenderer.domElement, 0, 0, this.cols, this.rows);
        const imgData = this.sampleCtx.getImageData(0, 0, this.cols, this.rows);
        const data = imgData.data;

        // 3. Limpiar canvas de visualización con negro puro
        this.ctx.fillStyle = '#05020a';
        this.ctx.fillRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);

        // 4. Agrupar caracteres por cubetas de color cuantizadas (Batching)
        // Esto reduce miles de llamadas a fillStyle a solo unas pocas decenas (60+ FPS!)
        this.colorBins.clear();

        const paletteType = this.palettes[this.currentPaletteKey].type;
        const rampMax = this.rampLength - 1;

        let idx = 0;
        for (let y = 0; y < this.rows; y++) {
            const posY = y * this.charHeight;
            for (let x = 0; x < this.cols; x++) {
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                // Luminancia perceptual precisa
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;

                if (lum > 6) { // Si no es negro profundo
                    // Curva de mapeo no-lineal para distribuir los 35+ caracteres de forma equilibrada
                    const normalizedLum = Math.pow(lum / 255, 0.85);
                    const charIdx = Math.min(rampMax, Math.max(0, Math.floor(normalizedLum * this.rampLength)));
                    const char = this.asciiRamp[charIdx];

                    // Cuantización de color (16 niveles por canal) para agrupar por lotes
                    let colorKey;
                    if (paletteType === 'full-ansi') {
                        // Realce de saturación retro 80s
                        const qr = Math.min(255, Math.floor((r * 1.15) / 16) * 16);
                        const qg = Math.min(255, Math.floor((g * 1.15) / 16) * 16);
                        const qb = Math.min(255, Math.floor((b * 1.2) / 16) * 16);
                        colorKey = `rgb(${qr},${qg},${qb})`;
                    } else if (paletteType === 'cyberpunk') {
                        if (lum > 130) {
                            colorKey = '#00f0ff';
                        } else if (lum > 65) {
                            colorKey = '#ff2a8d';
                        } else {
                            colorKey = '#8a00b8';
                        }
                    } else if (paletteType === 'amber') {
                        const q = Math.floor(lum / 12) * 12;
                        colorKey = `rgb(${q},${Math.floor(q * 0.7)},${Math.floor(q * 0.1)})`;
                    } else if (paletteType === 'matrix') {
                        const q = Math.floor(lum / 10) * 10;
                        colorKey = `rgb(${Math.floor(q * 0.2)},${q},${Math.floor(q * 0.3)})`;
                    }

                    let bin = this.colorBins.get(colorKey);
                    if (!bin) {
                        bin = [];
                        this.colorBins.set(colorKey, bin);
                    }
                    bin.push(char, x * this.charWidth, posY);
                }

                idx += 4;
            }
        }

        // 5. Dibujar cada cubeta de color en una sola pasada continua
        for (const [color, items] of this.colorBins.entries()) {
            this.ctx.fillStyle = color;
            const len = items.length;
            for (let i = 0; i < len; i += 3) {
                this.ctx.fillText(items[i], items[i + 1], items[i + 2]);
            }
        }
    }
}
