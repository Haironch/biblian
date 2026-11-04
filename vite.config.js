import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "node:path";

/*
 * Los JSON de las 150 biblias y los mp3 del diccionario viven en `src/assets`:
 * ~156,000 archivos. Se quedan en el repo a propósito, para que cualquiera
 * pueda reconstruir la base con `node api/migrate.mjs build`.
 *
 * El problema es que el servidor de desarrollo los trataba como código fuente:
 * chokidar abría un watcher por archivo y el arranque se iba a minutos. Se
 * excluyen del watcher y del pre-bundling. NO se borran ni se mueven: el script
 * de migración los lee del disco directamente, sin pasar por Vite.
 */
const ASSETS_PESADOS = ["**/src/assets/bibles/**", "**/src/assets/strongs/**"];

/*
 * Audio del diccionario Strong como archivos del propio sitio.
 *
 * Los ~14,000 MP3 ya están en el repo (`src/assets/strongs/Audio_*`). Antes se
 * subían a un bucket aparte y la API redirigía a él; ahora se publican junto a
 * la app en `/strongs/audio/{greek|hebrew}/<n>.mp3`, la misma estructura que
 * tenía el bucket, y no hace falta ni bucket ni llaves.
 *
 * - En desarrollo, un middleware los sirve directo desde `src/assets`.
 * - Al compilar se copian a `dist`. No pasan por el bundler (son 107 MB y no
 *   hay nada que transformar) ni por el precache del service worker, que solo
 *   mira js/css/html/imágenes.
 */
const AUDIO_STRONG = { greek: "src/assets/strongs/Audio_Griego", hebrew: "src/assets/strongs/Audio_Hebreo" };

const audioStrong = () => {
  let salida = "dist";
  return {
    name: "audio-strong",
    configResolved(config) {
      salida = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const coincide = req.url?.match(/^\/strongs\/audio\/(greek|hebrew)\/(\d+)\.mp3(?:\?.*)?$/);
        if (!coincide) return next();
        const archivo = path.resolve(AUDIO_STRONG[coincide[1]], `${coincide[2]}.mp3`);
        if (!fs.existsSync(archivo)) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader("Content-Type", "audio/mpeg");
        fs.createReadStream(archivo).pipe(res);
      });
    },
    closeBundle() {
      for (const [idioma, origen] of Object.entries(AUDIO_STRONG)) {
        if (!fs.existsSync(origen)) continue;
        const destino = path.join(salida, "strongs", "audio", idioma);
        fs.mkdirSync(destino, { recursive: true });
        for (const nombre of fs.readdirSync(origen)) {
          if (nombre.endsWith(".mp3")) fs.copyFileSync(path.join(origen, nombre), path.join(destino, nombre));
        }
      }
    },
  };
};

export default defineConfig({
  plugins: [
    /*
     * El service worker se registra a mano desde `src/main.jsx` (por eso
     * `injectRegister: null`): así el cliente de `virtual:pwa-register` puede
     * recargar la pestaña sola cuando entra una versión nueva.
     *
     * Antes se usaba `VitePWA()` sin opciones, que es `registerType: "prompt"`:
     * el SW nuevo se quedaba esperando en `waiting` para siempre porque nadie
     * mostraba el prompt, y la única forma de ver un deploy era borrar la caché
     * a mano. Con `autoUpdate` + `skipWaiting` + `clientsClaim` el SW nuevo toma
     * el control apenas se instala.
     */
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      // El manifest real es `public/manifest.json`, enlazado desde index.html.
      // Sin esto el plugin emite un segundo manifest vacio y compiten.
      manifest: false,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // Borra los precaches de builds viejos en vez de acumularlos.
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        /*
         * Que NO debe resolverse con el shell de la SPA.
         *
         * El service worker atiende toda peticion de navegacion devolviendo
         * `index.html`. Eso esta bien para las rutas de la app, pero escribir
         * `/robots.txt` o `/sitemap.xml` en la barra de direcciones TAMBIEN es
         * una navegacion: al usuario con el SW instalado le llegaba la app en
         * vez del archivo, la app no reconocia la ruta y le enseñaba su pagina
         * de "no encontrada". Parecia un 404 del servidor y no lo era.
         *
         * `\.[^/]+$` = cualquier ruta cuyo ultimo tramo tenga punto, o sea un
         * archivo con extension. Ninguna ruta de la app tiene punto.
         */
        navigateFallbackDenylist: [/^\/api\//, /\.[^/]+$/],
      },
    }),
    react(),
    audioStrong(),
  ],
  server: {
    watch: {
      ignored: ASSETS_PESADOS,
    },
  },
  optimizeDeps: {
    // El escaneo de dependencias tampoco tiene nada que buscar ahí.
    entries: ["index.html", "src/**/*.{js,jsx}", "!src/assets/**"],
  },
});
