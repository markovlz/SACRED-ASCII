# SACRED-ASCII: Vice Hunter 3D 🌆🔫👹

> **Simulador / Shooter 3D en Primera Persona renderizado al 100% en GPU mediante caracteres ANSI ASCII estilo retro Synthwave / Doom 80s.**

---

## 🎮 Características Principales

- **Renderizador 3D ASCII en GPU (WebGL GLSL Fragment Shader)**:
  - Atlas de caracteres ASCII de más de 64 glifos ejecutándose en tiempo real en la GPU a **60 - 144+ FPS**.
  - 4 Paletas de color retro (Vice City Sunset, Cyberpunk Neon, CRT Ámbar y Matrix Terminal).
  - Filtro de Monitor CRT suavizado con scanlines y curvatura.
  - Efecto de **Distorsión y Glitch por Corrupción Psíquica** en tiempo real.

- **Megaciudad Híbrida 3D con Colisiones Físicas**:
  - **Vice Beach & Ocean Drive**: Hoteles Art Deco con balcones y callejones, casetas de salvavidas, palmeras y olas oceánicas.
  - **Central Park**: Césped, lago reflectante, puente de piedra Bow Bridge, arboledas de robles y pinos, y una gran **fuente ornamental**.
  - **Manhattan Skyline**: Rascacielos icónicos como el **Empire State Building** (con aguja y luces), la **Torre Chrysler** (con arcos iluminados) y la **Torre Times Square** (con pantalla publicitaria animada).
  - Tráfico vehicular dinámico con autos deportivos retro de los 80.
  - **Sistema de Colisiones Estáticas con deslizamiento de muros (Doom-style)** en edificios, rascacielos, palmeras y fuentes.

- **Arsenal de Combate (3 Slots)**:
  - **Slot 1 - Escopeta Sagrada**: Ráfaga de 7 perdigones bendecidos con dispersión cónica y sonido de bombeo metálico.
  - **Slot 2 - Revólver .357 Cromado**: Disparos precisos de alto impacto con tambor de 6 balas.
  - **Slot 3 - Minigun Vulcan Sagrada**: Se desbloquea sobre un pedestal con haz de luz en la fuente de Central Park **al alcanzar los 10.000 puntos de Score**.
  - **⚡ UZI Neón (Frenesí 5s)**: Se activa automáticamente **cada 1.000 puntos de Score** otorgando 5 segundos de fuego continuo ilimitado.

- **Hordas Demoníacas, Niveles de Amenaza y Jefes**:
  - **Niveles de Amenaza Progresivos (Threat Level)**: La dificultad, velocidad y densidad de oleadas escala con tu puntuación.
  - **Jefes Titánicos (Archdemon Titans)**: Aparecen **cada 5.000 puntos** con rugido apocalíptico y una barra de vida superior en el HUD.
  - **Corrupción Psíquica Progresiva**: Los demonios distorsionan tu visión y drenan tu salud si se acercan demasiado.
  - **Botiquines de Curación (+30 HP)** y cajas de munición con probabilidades ponderadas (60% Revólver, 30% Escopeta, 10% Minigun).

- **Banda Sonora Original Procedural (Web Audio API)**:
  - Línea de bajo pesada y distorsionada estilo *Doom E1M1 Metal Chug* a **104 BPM**.
  - Percusión industrial y *clangs* metálicos estilo *Terminator: Future War*.
  - Melodías sombrías y analógicas estilo John Carpenter / Synthwave 80s.
  - Efectos de sonido procedurales para todas las armas, recargas, curación, rugidos de monstruos y bocinas de autos.

---

## 🕹️ Controles

| Tecla / Control | Acción |
| :--- | :--- |
| **`W` `A` `S` `D`** | Carrera rápida y movimiento en primera persona |
| **`Mouse`** | Apuntar / Mirar alrededor |
| **`Click Izquierdo`** | Disparar arma |
| **`1`** | Seleccionar **Escopeta Sagrada** |
| **`2`** | Seleccionar **Revólver .357 Cromado** |
| **`3`** | Seleccionar **Minigun Vulcan** (Tras desbloquearla en la fuente) |
| **`Rueda del Ratón`** | Alternar entre armas disponibles |
| **`R`** | Recargar munición |
| **`TAB`** | **Pausar / Reanudar Juego Totalmente** |
| **`N`** | Activar / Silenciar Banda Sonora Metal |
| **`P`** | Alternar Paleta de Colores ANSI |
| **`C`** | Activar / Desactivar Efecto Monitor CRT |

---

## 🚀 Cómo Ejecutar Localmente

No requiere librerías complejas ni pasos de compilación:

```powershell
# Opción 1: Con npx
npx -y serve -l 3000

# Opción 2: Con Python
python -m http.server 3000
```

Abre tu navegador e ingresa a:
👉 **`http://localhost:3000`**

---

## 🛠️ Tecnologías

- **Three.js** (WebGL 3D Scene Graph)
- **GLSL Fragment Shader** (Renderizado ASCII por píxel y post-procesamiento)
- **Web Audio API** (Sintetizador procedural de BSO y SFX)
- **Vanilla JavaScript (ES Modules)** & CSS3
