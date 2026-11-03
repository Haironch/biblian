/**
 * Puente palabra → original (hebreo o griego).
 *
 * Las Reina Valera "con Strong" traen cada palabra o frase seguida del número
 * de la palabra original que traduce:
 *
 *   "Porque<sup>1063 </sup> de tal manera<sup>3779 </sup> amó<sup>25 </sup> ..."
 *
 * El número va DESPUÉS del texto al que pertenece, y a veces son varios
 * seguidos ("Dios<sup>3588 </sup> <sup>2316 </sup>" = artículo + Dios). Con eso
 * se arma la lista "frase → código" de un versículo.
 *
 * Para las versiones que no traen números (NVI, RV60 normal, NTV...) se lee el
 * mismo versículo en una de estas Reina Valera y se busca ahí la palabra
 * tocada. En traducciones cercanas a la RV la palabra suele estar tal cual; en
 * las más libres puede no estar, y entonces se ofrecen las palabras del
 * original para que la persona elija en vez de adivinar.
 */
import { getChapter } from "../services/bibleSource";

/** Versiones con Strong por palabra, en orden de preferencia. */
export const VERSIONES_PUENTE = ["034. Español - Biblia Reina Valera (1960)", "033. Español - Biblia Reina Valera (1909)"];

const ULTIMO_LIBRO_AT = 39;

/*
 * El artículo griego ("el", "la") va marcado casi siempre junto al sustantivo:
 * "Dios" = G3588 + G2316. Quien toca "Dios" busca θεός, no ὁ; el artículo solo
 * se devuelve cuando es lo único que hay.
 */
const SOLO_SI_NO_HAY_OTRO = new Set(["G3588"]);

/** "Amó," -> "amo". Sin acentos ni signos, para comparar palabras. */
export const normalizarPalabra = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Quita el marcado que no es texto: notas al pie, saltos, cursivas, etc. */
const textoPlano = (html) =>
  String(html ?? "")
    .replace(/<f>[\s\S]*?<\/f>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[«»*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Los códigos de una frase, sin repetir y con el artículo al final. */
const ordenarCodigos = (codigos) => {
  const unicos = [...new Set(codigos)];
  const principales = unicos.filter((c) => !SOLO_SI_NO_HAY_OTRO.has(c));
  return principales.length > 0 ? principales : unicos;
};

/**
 * Versículo marcado -> [{ texto: "de tal manera", codigos: ["G3779"] }, ...].
 * Las frases sin número (el texto que va después del último) se descartan.
 */
export const etiquetasDelVersiculo = (html, bookId) => {
  const prefijo = Number(bookId) <= ULTIMO_LIBRO_AT ? "H" : "G";
  const partes = String(html ?? "").split(/<sup>\s*(\d+)\s*<\/sup>/i);
  const etiquetas = [];

  // `split` con un grupo deja [texto, número, texto, número, ...].
  for (let i = 0; i + 1 < partes.length; i += 2) {
    const texto = textoPlano(partes[i]);
    const codigo = `${prefijo}${Number(partes[i + 1])}`;
    if (texto) {
      etiquetas.push({ texto, codigos: [codigo] });
    } else if (etiquetas.length > 0) {
      // Número pegado al anterior: misma frase, otra palabra original.
      etiquetas[etiquetas.length - 1].codigos.push(codigo);
    }
  }

  return etiquetas.map(({ texto, codigos }) => ({ texto, codigos: ordenarCodigos(codigos) }));
};

/** Longitud del prefijo común de dos palabras ya normalizadas. */
const prefijoComun = (a, b) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/**
 * La frase que contiene la palabra tocada.
 *
 * `ocurrencia` es cuántas veces apareció la misma palabra ANTES en el
 * versículo que se lee: en "el Verbo era con Dios, y el Verbo era Dios" tocar
 * el segundo "Verbo" debe dar la segunda frase, no la primera.
 *
 * Sin coincidencia exacta se acepta una de raíz parecida ("creyere" / "cree",
 * "crea" / "cree") si comparten casi toda la palabra más corta: cuatro letras
 * iniciales, o tres cuando la corta tiene cuatro. Con menos de cuatro letras no
 * se adivina: "dio" se parecería a "Dios".
 */
export const buscarEnEtiquetas = (etiquetas, palabra, ocurrencia = 0) => {
  const buscada = normalizarPalabra(palabra);
  if (!buscada) return null;

  const exactas = etiquetas.filter(({ texto }) => texto.split(" ").some((p) => normalizarPalabra(p) === buscada));
  if (exactas.length > 0) return exactas[Math.min(ocurrencia, exactas.length - 1)];

  let mejor = null;
  let mejorPuntaje = 0;
  for (const etiqueta of etiquetas) {
    for (const parte of etiqueta.texto.split(" ")) {
      const candidata = normalizarPalabra(parte);
      const comun = prefijoComun(candidata, buscada);
      const corta = Math.min(candidata.length, buscada.length);
      const minimo = corta === 4 ? 3 : 4;
      if (corta >= 4 && comun >= minimo && comun >= corta * 0.75 && comun > mejorPuntaje) {
        mejor = etiqueta;
        mejorPuntaje = comun;
      }
    }
  }
  return mejor;
};

// Capítulos de las versiones puente ya pedidos: tocar varias palabras del
// mismo capítulo no vuelve a la red.
const cache = new Map();

const capituloPuente = (legacyPath, bookId, capitulo) => {
  const clave = `${legacyPath}|${bookId}|${capitulo}`;
  if (!cache.has(clave)) {
    const promesa = getChapter({ legacyPath, bookId, chapter: Number(capitulo) }).catch((error) => {
      cache.delete(clave);
      throw error;
    });
    cache.set(clave, promesa);
  }
  return cache.get(clave);
};

/**
 * Las frases marcadas del versículo: las suyas si la versión trae números
 * Strong; si no, las de la primera versión puente que tenga el versículo.
 */
export const etiquetasParaVersiculo = async ({ html, bookId, capitulo, versiculo }) => {
  if (/<sup>\s*\d+\s*<\/sup>/i.test(html ?? "")) return etiquetasDelVersiculo(html, bookId);

  for (const version of VERSIONES_PUENTE) {
    try {
      const capituloTexto = await capituloPuente(version, bookId, capitulo);
      const etiquetas = etiquetasDelVersiculo(capituloTexto?.[versiculo], bookId);
      if (etiquetas.length > 0) return etiquetas;
    } catch {
      // Sin esa versión (red, fuente caída): se prueba la siguiente.
    }
  }
  return [];
};

/**
 * La palabra tocada -> { code, opciones }.
 *
 * - `code`: el código Strong de la palabra, o `null` si no se encontró.
 * - `opciones`: todas las palabras originales del versículo, para elegir.
 */
export const buscarOriginal = async ({ html, bookId, capitulo, versiculo, palabra, ocurrencia = 0 }) => {
  const etiquetas = await etiquetasParaVersiculo({ html, bookId, capitulo, versiculo });

  const encontrada = buscarEnEtiquetas(etiquetas, palabra, ocurrencia);
  const vistas = new Set();
  const opciones = etiquetas
    .map(({ texto, codigos }) => ({ texto, code: codigos[0] }))
    .filter(({ texto, code }) => {
      const clave = `${normalizarPalabra(texto)}|${code}`;
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });

  return { code: encontrada?.codigos[0] ?? null, opciones };
};

/*
 * Palabras de relleno que no se subrayan. En el original van casi siempre
 * pegadas a otra ("En el principio" = una sola palabra hebrea), así que
 * subrayar "el" prometería un original que en realidad es el de "principio".
 * Se pueden tocar igual; solo no se anuncian.
 */
const RELLENO = new Set(
  "el la los las lo un una unos unas al del de en con por para sin sobre entre hasta desde hacia que y e o u ni mas pero sino como cual cuales quien quienes cuyo esto este esta estos estas ese esa eso esos esas aquel aquella su sus mi mis tu tus nos les le se me te ya muy tan".split(" "),
);

/**
 * Las palabras del versículo que tienen equivalente en el original, ya
 * normalizadas, para subrayarlas.
 *
 * Se decide con la misma búsqueda que usa el toque (`buscarEnEtiquetas`): lo
 * que se subraya es exactamente lo que va a abrir el original directo.
 */
export const palabrasConOriginal = (html, etiquetas) => {
  const marcables = new Set();
  if (!etiquetas?.length) return marcables;

  for (const palabra of textoPlano(html).match(/[\p{L}\p{M}]+/gu) ?? []) {
    const normal = normalizarPalabra(palabra);
    if (normal.length < 3 || RELLENO.has(normal) || marcables.has(normal)) continue;
    if (buscarEnEtiquetas(etiquetas, palabra)) marcables.add(normal);
  }
  return marcables;
};

/**
 * Envuelve en `<span class="palabra-original">` las palabras del conjunto.
 *
 * Solo toca el texto que está FUERA de las etiquetas: dentro de una etiqueta
 * (atributos, `<sup>`) no hay palabras que subrayar, y reescribirlas rompería
 * el HTML.
 */
export const marcarPalabrasConOriginal = (html, marcables) => {
  if (!marcables?.size) return html;
  return String(html)
    .split(/(<[^>]+>)/)
    .map((trozo) =>
      trozo.startsWith("<")
        ? trozo
        : trozo.replace(/[\p{L}\p{M}]+/gu, (palabra) =>
            marcables.has(normalizarPalabra(palabra)) ? `<span class="palabra-original">${palabra}</span>` : palabra,
          ),
    )
    .join("");
};
