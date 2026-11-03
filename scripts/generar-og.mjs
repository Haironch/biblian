/**
 * Genera `public/og-image.png`, la miniatura de 1200x630 que se ve cuando
 * alguien pega un enlace de Biblian en WhatsApp, X, Facebook, Slack o Discord.
 *
 * Se ejecuta A MANO (`npm run og`) y el PNG se versiona, en vez de correr en
 * cada build: la imagen cambia una vez al año y el build corre cada commit.
 *
 *   npm run og
 *
 * La imagen se arma como SVG y la rasteriza `sharp` (la misma librería que usa
 * la API). Antes se le pedía una captura a un Chrome instalado, y en una
 * máquina sin Chrome —o en un CI— el script no tenía con qué dibujar. Con SVG
 * no hace falta navegador, y la composición es de formas y texto, que es justo
 * lo que SVG hace bien.
 *
 * Mismo lenguaje visual que la app: fondo claro, índigo de acento y el logo de
 * las tres columnas. A la derecha, tres tarjetas de versión que se salen del
 * borde: lo que hace la app, sin tener que leerlo.
 */
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SITE_NAME, TOTAL_VERSIONES } from "../src/config/sitio.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = path.join(RAIZ, "public", "og-image.png");

// Los mismos valores que `index.css` (modo claro).
const COLOR = {
  fondo: "#F5F5F7",
  superficie: "#FFFFFF",
  linea: "#E5E5EA",
  tinta: "#1C1C1E",
  tinta2: "#54545A",
  tinta3: "#8E8E93",
  acento: "#3A4FD8",
  acentoSuave: "#E8ECFF",
};

const LETRA = "-apple-system, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Escapa lo poco que puede romper un SVG si alguien cambia los textos. */
const xml = (texto) => String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TITULAR = ["Biblia en línea:", "compara versiones lado a lado"];
const APOYO = [`${TOTAL_VERSIONES}+ versiones · Reina Valera, NVI, LBLA, Textual`, "interlineal griego y hebreo · diccionario Strong"];
const ETIQUETAS = ["Gratis", "Sin registro", "Sin anuncios", "Funciona sin conexión"];

/*
 * Ancho de cada etiqueta: no hay forma de medir texto dentro de un SVG antes de
 * rasterizarlo, así que se estima por número de caracteres. A 19px de una sans
 * de sistema, ~10.4px por letra deja un margen cómodo para las palabras de aquí.
 */
const etiquetas = (() => {
  let x = 84;
  return ETIQUETAS.map((texto) => {
    const ancho = Math.round(texto.length * 10.4 + 40);
    const parte = `
      <rect x="${x}" y="514" width="${ancho}" height="44" rx="22" fill="${COLOR.acentoSuave}"/>
      <text x="${x + ancho / 2}" y="542" font-size="19" font-weight="500" fill="${COLOR.acento}" text-anchor="middle">${xml(texto)}</text>`;
    x += ancho + 12;
    return parte;
  }).join("");
})();

/** Una tarjeta de versión: cabecera con su sigla y renglones de "texto". */
const tarjeta = (x, y, sigla, renglones) => `
  <g>
    <rect x="${x}" y="${y}" width="230" height="300" rx="18" fill="${COLOR.superficie}" stroke="${COLOR.linea}" stroke-width="2"/>
    <text x="${x + 22}" y="${y + 40}" font-size="17" font-weight="500" fill="${COLOR.tinta3}">${sigla}</text>
    <rect x="${x + 16}" y="${y + 62}" width="198" height="${renglones * 26 + 20}" rx="10" fill="${COLOR.acentoSuave}"/>
    <rect x="${x + 16}" y="${y + 62}" width="4" height="${renglones * 26 + 20}" fill="${COLOR.acento}"/>
    ${Array.from({ length: renglones }, (_, i) => `<rect x="${x + 32}" y="${y + 78 + i * 26}" width="${i === renglones - 1 ? 96 : 166}" height="9" rx="4.5" fill="${COLOR.acento}" fill-opacity=".35"/>`).join("")}
    ${[0, 1, 2].map((i) => `<rect x="${x + 22}" y="${y + 112 + renglones * 26 + i * 26}" width="${i === 2 ? 110 : 180}" height="9" rx="4.5" fill="${COLOR.linea}"/>`).join("")}
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${LETRA}">
  <rect width="1200" height="630" fill="${COLOR.fondo}"/>

  <!-- Tarjetas que se salen por la derecha: la comparación lado a lado. -->
  ${tarjeta(890, 110, "RVR 1960", 4)}
  ${tarjeta(1140, 150, "NVI 2015", 3)}

  <!-- Logo: el mismo de public/bibleIcon.svg, a 72px. -->
  <g transform="translate(84 78) scale(1.125)">
    <rect width="64" height="64" rx="15" fill="${COLOR.acento}"/>
    <rect x="14" y="16" width="10" height="32" rx="3" fill="#fff"/>
    <rect x="27" y="16" width="10" height="32" rx="3" fill="#fff" fill-opacity=".7"/>
    <rect x="40" y="16" width="10" height="32" rx="3" fill="#fff" fill-opacity=".45"/>
  </g>
  <text x="174" y="128" font-size="38" font-weight="600" fill="${COLOR.tinta}">${xml(SITE_NAME)}</text>

  <text font-size="50" font-weight="600" fill="${COLOR.tinta}" letter-spacing="-1">
    ${TITULAR.map((linea, i) => `<tspan x="84" y="${252 + i * 60}">${xml(linea)}</tspan>`).join("")}
  </text>

  <text font-size="24" fill="${COLOR.tinta2}">
    ${APOYO.map((linea, i) => `<tspan x="84" y="${394 + i * 34}">${xml(linea)}</tspan>`).join("")}
  </text>

  ${etiquetas}
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(SALIDA);

const bytes = fs.statSync(SALIDA).size;
console.log(`[og] ${SALIDA} — ${(bytes / 1024).toFixed(0)} KB`);
