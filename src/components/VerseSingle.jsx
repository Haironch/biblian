import { useRef, useEffect, useCallback, useContext, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { traducir } from "../services/translateSource";
import "../styles/BibleMarkup.css";
import MarkupTab from "./MarkupTab";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import AnotacionesContext from "../context/AnotacionesContext";
import { CLASES_COLOR } from "../utils/paletaAnotaciones";
import { codigoDeVersion } from "../utils/versiones";
import { marcarDiferencias } from "../utils/diffVersiones";
import { buscarOriginal, etiquetasParaVersiculo, marcarPalabrasConOriginal, normalizarPalabra, palabrasConOriginal } from "../utils/puenteStrong";
import { Languages, Share } from "lucide-react";

/**
 * Estilos de los números Strong incrustados en el versículo.
 *
 * Dos detalles que importan:
 *
 * 1. `[&_sup:hover]:` y NO `[&_sup]:hover:`. El segundo compila a
 *    `.contenedor:hover sup`, o sea que al pasar el cursor por CUALQUIER parte
 *    del versículo se resaltaban TODOS los números a la vez.
 *
 * 2. `inline-block` + padding. Un <sup> es texto en superíndice: diminuto, y su
 *    área de clic también. Con padding el objetivo crece sin mover el texto
 *    (el margen negativo compensa), así deja de fallar el clic.
 */
/**
 * `<pb/>` marca inicio de párrafo, pero en HTML una etiqueta desconocida NO
 * puede auto-cerrarse: el navegador parsea `<pb/>A<pb/>B` como
 * `<pb>A<pb>B</pb></pb>`, anidando y envolviendo todo el resto del versículo.
 *
 * Se cambia por un <span> vacío (elemento conocido y con cierre explícito),
 * que la hoja de estilos convierte en un salto de bloque.
 */
/** Tope total de una traducción antes de rendirse y dejar el texto original. */
const TIEMPO_MAXIMO_MS = 30000;

const normalizarMarcado = (html) =>
  String(html ?? "")
    // Un salto de párrafo AL INICIO del versículo no separa nada: lo único que
    // hacía era empujar el texto al renglón de abajo, dejando el número del
    // versículo solo en su propia línea.
    .replace(/^(?:\s|\\par\b|<pb\s*\/?>)+/i, "")
    .replace(/\\par\b/gi, '<span class="salto-parrafo"></span>')
    .replace(/<pb\s*\/?>/gi, '<span class="salto-parrafo"></span>');

const CLASES_STRONG = [
  "[&_sup]:cursor-pointer",
  "[&_sup]:inline-block",
  // El preflight de Tailwind pone `sub, sup { line-height: 0 }`. Con eso la
  // caja del <sup> mide 0px de alto y el clic solo pegaba en los píxeles de
  // los dígitos. Se le devuelve una altura real.
  "[&_sup]:leading-[1.3]",
  "[&_sup]:px-[3px]",
  "[&_sup]:mx-[-1px]",
  "[&_sup]:rounded",
  "[&_sup]:font-sans",
  "[&_sup]:font-medium",
  "[&_sup]:text-acento",
  "[&_sup]:transition-colors",
  "[&_sup:hover]:bg-acento-suave",
].join(" ");

/**
 * Caja común de los botones del encabezado. Son iconos de distinto tamaño y
 * antes cada uno traía su propio margen suelto (`mt-3 mr-3`, `mt-1 mr-1`), así
 * que ninguno quedaba alineado con el de al lado.
 */
const BOTON_ICONO = "relative grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-tinta/5 hover:text-tinta disabled:opacity-40";

const LETRA = /[\p{L}\p{M}]/u;

/*
 * Consulta de palabra en curso. Es de todo el módulo y no de cada panel: si se
 * toca una palabra en un panel y enseguida otra en otro, la respuesta que
 * llegue tarde no debe pisar a la nueva.
 */
let consultaVigente = 0;

/**
 * La palabra que se tocó (o se seleccionó) dentro del versículo.
 *
 * Devuelve la palabra, el rectángulo donde está (para anclar el globito) y el
 * texto del versículo que va antes, que sirve para saber si es el primer
 * "Verbo" o el segundo.
 */
const palabraTocada = (evento, contenedor) => {
  let rango = null;
  const seleccion = window.getSelection?.();

  if (seleccion && !seleccion.isCollapsed && seleccion.rangeCount > 0 && contenedor.contains(seleccion.anchorNode)) {
    rango = seleccion.getRangeAt(0).cloneRange();
  } else {
    let nodo = null;
    let offset = 0;
    if (document.caretPositionFromPoint) {
      const posicion = document.caretPositionFromPoint(evento.clientX, evento.clientY);
      nodo = posicion?.offsetNode;
      offset = posicion?.offset ?? 0;
    } else if (document.caretRangeFromPoint) {
      const posicion = document.caretRangeFromPoint(evento.clientX, evento.clientY);
      nodo = posicion?.startContainer;
      offset = posicion?.startOffset ?? 0;
    }
    if (!nodo || nodo.nodeType !== Node.TEXT_NODE || !contenedor.contains(nodo)) return null;

    const texto = nodo.textContent;
    let inicio = offset;
    let fin = offset;
    while (inicio > 0 && LETRA.test(texto[inicio - 1])) inicio--;
    while (fin < texto.length && LETRA.test(texto[fin])) fin++;
    if (inicio === fin) return null;

    rango = document.createRange();
    rango.setStart(nodo, inicio);
    rango.setEnd(nodo, fin);
  }

  const palabra = rango.toString().match(/[\p{L}\p{M}]+/u)?.[0];
  if (!palabra) return null;

  const previo = document.createRange();
  previo.setStart(contenedor, 0);
  previo.setEnd(rango.startContainer, rango.startOffset);

  return { palabra, rect: rango.getBoundingClientRect(), antes: previo.toString() };
};

/** "034. Español - Biblia ccc" -> { idioma: "Español", version: "Biblia cc" } */
const partirNombre = (nombre) => {
  const idioma = nombre.split(".")[1]?.split("-")[0]?.trim() ?? "";
  const version = nombre.split("-")[1]?.replace("ccc", "cc").trim() || nombre;
  return { idioma, version };
};

const VerseSingle = ({ texto, nombre, iso, cargando = false, bookId }) => {
  const {
    versiculoSeleccionadoNumero,
    setVersiculoSeleccionadoNumero,
    setCompartirVerse,
    tamanioVerseAlto,
    mostrarStrongPopup,
    strongPopup,
    leerMarcado,
    libroSeleccionado,
    capituloSeleccionadoNumero,
    diferenciasPorBiblia,
    claseTamanoTexto,
    versionDestacada,
    destacarVersion,
  } = useContext(DataContext);
  const { idiomaNavegador, t } = useContext(LanguageContext);
  const { colorDe, notasDe } = useContext(AnotacionesContext);

  /**
   * Palabras que ESTA versión usa y las demás no. `null` cuando el modo está
   * apagado o no hay con qué comparar; el cálculo vive en el contexto porque
   * necesita ver los textos de todos los paneles a la vez.
   */
  const diferencias = diferenciasPorBiblia?.get(nombre) ?? null;

  /**
   * Traducciones hechas en este panel, indexadas por número de versículo.
   *
   * Antes se guardaba una copia completa del capítulo y se reemplazaba entera,
   * así que al cambiar de versículo se perdía lo traducido. Con un mapa aparte
   * las traducciones se acumulan y conviven con el texto original.
   */
  const [traducciones, setTraducciones] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorTraduccion, setErrorTraduccion] = useState(false);
  // Número del versículo que se está traduciendo ahora mismo. Solo ESE lleva el
  // esqueleto; antes se cubría el panel entero con una capa.
  const [versiculoTraduciendo, setVersiculoTraduciendo] = useState(null);

  // El aviso de fallo se retira solo: es informativo, no requiere acción.
  useEffect(() => {
    if (!errorTraduccion) return;
    const id = setTimeout(() => setErrorTraduccion(false), 4000);
    return () => clearTimeout(id);
  }, [errorTraduccion]);

  const containerRef = useRef(null);

  // Qué marcado trae ESTE texto. Se calcula aquí y no en el contexto porque la
  // pestaña es de este panel: un cuadro sin glosa no debe mostrarla.
  const marcado = useMemo(() => {
    if (typeof texto !== "object" || texto === null) return { morfologia: false, glosa: false };
    const crudo = Object.values(texto).join("");
    return { morfologia: /<m>/i.test(crudo), glosa: /<n>/i.test(crudo) };
  }, [texto]);

  const preferencia = leerMarcado(nombre);

  const esCapitulo = typeof texto === "object" && texto !== null;

  const { idioma: idiomaEtiqueta, version } = partirNombre(nombre);

  /** Lo que se pinta: el original con las traducciones encima. */
  const textoVisible = useMemo(() => (esCapitulo ? { ...texto, ...traducciones } : texto), [texto, traducciones, esCapitulo]);

  const estaTraducido = Boolean(traducciones[versiculoSeleccionadoNumero]);
  const puedeTraducir = iso !== "no" && esCapitulo && idiomaNavegador !== iso;

  // `true` mientras no haya ni un versículo que pintar.
  const sinContenido = !textoVisible || (esCapitulo && Object.keys(texto).length === 0);

  const handleVerseClick = useCallback(
    (versiculo) => {
      setVersiculoSeleccionadoNumero(versiculo);
    },
    [setVersiculoSeleccionadoNumero],
  );

  // Las traducciones son de ESTE capítulo: al cambiar de libro o capítulo se
  // descartan, pero NO al cambiar de versículo dentro del mismo.
  useEffect(() => {
    setTraducciones({});
  }, [libroSeleccionado, capituloSeleccionadoNumero]);

  const centerText = useCallback(() => {
    if (containerRef.current && versiculoSeleccionadoNumero) {
      const highlightedVerse = containerRef.current.querySelector(`[data-verse="${versiculoSeleccionadoNumero}"]`);
      if (highlightedVerse) {
        const containerHeight = containerRef.current.clientHeight;
        const verseHeight = highlightedVerse.clientHeight;

        const verseOffsetTop = highlightedVerse.offsetTop;
        const scrollTop = verseOffsetTop - containerHeight / 2 + verseHeight / 2;

        containerRef.current.scrollTop = scrollTop;
      }
    }
  }, [versiculoSeleccionadoNumero]);

  useEffect(() => {
    centerText();
  }, [textoVisible, centerText]);

  /**
   * Los números Strong van dentro del HTML del versículo como `<sup>2424 </sup>`,
   * así que no se les puede poner un onClick por elemento sin dejar de usar
   * `dangerouslySetInnerHTML`. Se delega: se escucha el clic en el contenedor y
   * se mira si el objetivo era un <sup>.
   *
   * Se determina si es Hebreo (H) o Griego (G) considerando la versión (ej. Septuaginta /
   * Filos Pergamos en el AT es griega), el alfabeto del texto y el testamento.
   */
  /*
   * Palabras del versículo seleccionado que tienen equivalente en el original.
   * Se subrayan (`.palabra-original`) para que se note que se pueden tocar sin
   * tener que leer ningún aviso. Se calcula al seleccionar el versículo, con
   * la misma búsqueda que usa el toque: lo subrayado es lo que va a funcionar.
   */
  const [marcables, setMarcables] = useState(null);

  useEffect(() => {
    const versiculo = versiculoSeleccionadoNumero;
    const html = esCapitulo ? texto?.[versiculo] : null;
    const tieneNumeros = /<sup>\s*\d+\s*<\/sup>/i.test(html ?? "");
    if (!html || (!tieneNumeros && iso !== "es")) {
      setMarcables(null);
      return undefined;
    }

    let cancelado = false;
    etiquetasParaVersiculo({ html, bookId, capitulo: capituloSeleccionadoNumero, versiculo }).then((etiquetas) => {
      if (!cancelado) setMarcables({ versiculo: String(versiculo), palabras: palabrasConOriginal(html, etiquetas) });
    });
    return () => {
      cancelado = true;
    };
  }, [esCapitulo, texto, versiculoSeleccionadoNumero, iso, bookId, capituloSeleccionadoNumero]);

  // Si el globito se cierra mientras se consulta la versión puente, la
  // respuesta ya no debe volver a abrirlo.
  const globitoAbierto = useRef(false);
  useEffect(() => {
    globitoAbierto.current = Boolean(strongPopup);
  }, [strongPopup]);

  /**
   * Tocar una PALABRA (no su número) del versículo seleccionado la busca en el
   * hebreo o griego original.
   *
   * Solo en el versículo ya seleccionado: el primer toque sigue siendo el de
   * siempre (elegir versículo) y el segundo, ya leyendo, pregunta por la
   * palabra. Así no cambia nada para quien solo quiere moverse por el texto.
   *
   * Si la versión trae números Strong se usan los suyos; si no, el puente lee
   * el mismo versículo en una Reina Valera con Strong (solo para español: es
   * con lo que se puede comparar palabra por palabra).
   */
  const consultarPalabra = useCallback(
    async (evento, contenedor, versiculo) => {
      const html = texto?.[versiculo];
      const tieneNumeros = /<sup>\s*\d+\s*<\/sup>/i.test(html ?? "");
      if (!tieneNumeros && iso !== "es") return false;
      // Un versículo traducido ya no es el texto que el puente sabe leer.
      if (traducciones[versiculo]) return false;

      const tocada = palabraTocada(evento, contenedor);
      if (!tocada) return false;

      const buscada = normalizarPalabra(tocada.palabra);
      const ocurrencia = tocada.antes.split(/\s+/).filter((parte) => normalizarPalabra(parte) === buscada).length;

      const mia = ++consultaVigente;
      mostrarStrongPopup(null, tocada.rect, { palabra: tocada.palabra, cargando: true });

      const { code, opciones } = await buscarOriginal({
        html,
        bookId,
        capitulo: capituloSeleccionadoNumero,
        versiculo,
        palabra: tocada.palabra,
        ocurrencia,
      });

      if (mia !== consultaVigente || !globitoAbierto.current) return true;
      mostrarStrongPopup(code, tocada.rect, { palabra: tocada.palabra, opciones });
      return true;
    },
    [texto, iso, traducciones, mostrarStrongPopup, bookId, capituloSeleccionadoNumero],
  );

  const handleStrongClick = useCallback(
    (evento) => {
      const sup = evento.target.closest?.("sup");
      if (!sup) {
        const parrafo = evento.target.closest?.("[data-verse]");
        const versiculo = parrafo?.dataset.verse;
        if (versiculo && String(versiculo) === String(versiculoSeleccionadoNumero)) {
          consultarPalabra(evento, evento.currentTarget, versiculo);
        }
        return;
      }

      const numero = sup.textContent.replace(/\D/g, "");
      if (!numero) return;

      evento.stopPropagation();

      const nombreLower = (nombre || "").toLowerCase();
      const esGriegoPorVersion = iso === "el" || iso === "grc" || nombreLower.includes("greek") || nombreLower.includes("griego") || nombreLower.includes("septuagint") || nombreLower.includes("lxx");

      const esHebreoPorVersion =
        iso === "iw" ||
        iso === "he" ||
        nombreLower.includes("hebrew") ||
        nombreLower.includes("hebreo") ||
        nombreLower.includes("stuttgartensia") ||
        nombreLower.includes("wlc") ||
        nombreLower.includes("tanakh");

      const contenedorTexto = sup.parentElement?.textContent || "";
      const tieneGriego = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(contenedorTexto);
      const tieneHebreo = /[\u0590-\u05FF]/.test(contenedorTexto);

      let prefijo = Number(bookId) <= 39 ? "H" : "G";
      if (esGriegoPorVersion || (tieneGriego && !tieneHebreo)) {
        prefijo = "G";
      } else if (esHebreoPorVersion || (tieneHebreo && !tieneGriego)) {
        prefijo = "H";
      }

      const code = `${prefijo}${Number(numero)}`;
      const rect = sup.getBoundingClientRect();
      mostrarStrongPopup(code, rect);
    },
    [bookId, iso, nombre, mostrarStrongPopup, versiculoSeleccionadoNumero, consultarPalabra],
  );

  const handleTranslate = async (iso) => {
    if (iso === "no" || !versiculoSeleccionadoNumero) {
      return;
    }

    const idiomaVersoTranslate = iso.toString();
    const idiomaNavegadorTranslate = idiomaNavegador;
    const verso = texto?.[versiculoSeleccionadoNumero];

    setIsTranslating(true);
    setErrorTraduccion(false);
    setVersiculoTraduciendo(versiculoSeleccionadoNumero);

    // Tope duro de 30 s para TODA la traducción. Si se pasa, se deja el texto
    // como estaba y se avisa: mejor eso que un esqueleto girando para siempre.
    const abortador = new AbortController();
    const corte = setTimeout(() => abortador.abort(), TIEMPO_MAXIMO_MS);

    try {
      // El servicio limpia el markup `<sup>` por su cuenta: traducir los
      // números Strong incrustados devolvía basura.
      const resultado = await traducir({
        texto: verso,
        desde: idiomaVersoTranslate,
        hacia: idiomaNavegadorTranslate,
        signal: abortador.signal,
      });
      setTraducciones((previo) => ({ ...previo, [versiculoSeleccionadoNumero]: resultado }));
      centerText();
    } catch (error) {
      // Al abortar no se toca `traducciones`, así que el versículo se queda
      // exactamente con lo que tenía antes.
      console.error("No se pudo traducir el versículo:", error);
      setErrorTraduccion(true);
    } finally {
      clearTimeout(corte);
      setIsTranslating(false);
      setVersiculoTraduciendo(null);
    }
  };

  /*
   * ------------------------------------------------------------------------
   * "Esta es la versión que buscabas"
   * ------------------------------------------------------------------------
   * Al llegar desde Buscar, este panel puede ser el que dio el resultado. Se
   * desplaza a la vista y destella una vez.
   *
   * Se espera a que el texto esté cargado: con el esqueleto puesto el panel
   * mide otra cosa, y centrarlo entonces deja el sitio equivocado en cuanto
   * llega el capítulo y la tarjeta crece.
   */
  const articuloRef = useRef(null);
  const destacado = versionDestacada === nombre;

  useEffect(() => {
    if (!destacado || cargando) return undefined;

    // Un fotograma de margen: el navegador tiene que haber pintado el texto
    // para que `scrollIntoView` mida la altura definitiva.
    const fotograma = requestAnimationFrame(() => {
      articuloRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    /*
     * La señal la apaga el panel, no quien la encendió: hasta aquí no se sabía
     * cuándo iba a existir esta tarjeta —el capítulo viaja por red— y apagarla
     * a ciegas desde la búsqueda dejaba el destello sin ver cuando el backend
     * tardaba en despertar.
     *
     * 3.8s = las dos pasadas de la animación (1.8s cada una) con margen.
     */
    const apagar = setTimeout(() => destacarVersion(null), 3800);

    return () => {
      cancelAnimationFrame(fotograma);
      clearTimeout(apagar);
    };
  }, [destacado, cargando, destacarVersion]);

  /**
   * El subrayado de palabras con original va solo en el versículo
   * seleccionado y sin traducir. Con "Diferencias" encendido no se pone: ese
   * modo ya subraya en rojo y ámbar, y dos subrayados con sentidos distintos
   * en la misma palabra no se leen.
   */
  const marcarSiToca = (versiculo, html) =>
    !diferencias &&
    marcables &&
    marcables.versiculo === String(versiculo) &&
    String(versiculo) === String(versiculoSeleccionadoNumero) &&
    !traducciones[versiculo]
      ? marcarPalabrasConOriginal(html, marcables.palabras)
      : html;

  /** Descarta la traducción de este versículo y deja el original. */
  const revertirTraduccion = () => {
    setTraducciones((previo) => {
      const copia = { ...previo };
      delete copia[versiculoSeleccionadoNumero];
      return copia;
    });
    setErrorTraduccion(false);
  };

  return (
    /*
      `data-panel` con el código corto de la versión: es el ancla que usa el
      índice lateral para saltar a este panel. Va el código y no el nombre de
      carpeta porque ese nombre lleva puntos, paréntesis y acentos, y como
      selector CSS habría que escaparlo entero.

      La tarjeta es plana: borde de medio tono y sin sombra, como una ventana de
      la Mac. El recorte lo da el borde, no la sombra, así una rejilla de seis
      paneles no se ve como seis cosas flotando.
    */
    <article
      ref={articuloRef}
      data-panel={codigoDeVersion(nombre) ?? ""}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-linea bg-superficie transition-colors hover:border-linea-fuerte ${
        destacado ? "panel-destacado" : ""
      }`}
    >
      {/*
        El nombre de la versión se trunca a una línea a propósito: si envolviera,
        cada encabezado mediría distinto y las cabeceras de la rejilla dejarían
        de alinearse entre sí. El nombre completo queda en el `title`.
      */}
      <header className="flex items-center justify-between gap-2 border-b border-linea px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-tinta-3">{idiomaEtiqueta}</p>
          <h2 title={version} className="truncate text-sm font-semibold text-tinta">
            {version}
          </h2>
        </div>

        {esCapitulo && (
          <div className="flex shrink-0 items-center gap-0.5">
            <MarkupTab biblia={nombre} tieneMorfologia={marcado.morfologia} tieneGlosa={marcado.glosa} />
            <button type="button" className={BOTON_ICONO} title={t("CompartirTitulo")} aria-label={t("CompartirTitulo")} onClick={() => setCompartirVerse(texto, versiculoSeleccionadoNumero, nombre, traducciones[versiculoSeleccionadoNumero] ?? null)}>
              <Share className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
            {/* El mismo botón traduce o revierte según el estado del versículo
                actual, para no añadir un icono más al encabezado. */}
            {puedeTraducir && (
              <button
                type="button"
                disabled={isTranslating}
                onClick={() => (estaTraducido ? revertirTraduccion() : handleTranslate(iso))}
                title={estaTraducido ? t("VerOriginal") : t("Traducir")}
                aria-label={estaTraducido ? t("VerOriginal") : t("Traducir")}
                className={BOTON_ICONO}
              >
                <Languages className={`h-4 w-4 ${isTranslating ? "animate-pulse" : ""}`} strokeWidth={1.8} aria-hidden="true" />
                {estaTraducido && <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-acento-solido ring-2 ring-superficie"></span>}
              </button>
            )}
          </div>
        )}
      </header>

      {/*
        `relative` no es decorativo: `centerText` centra el versículo con
        `offsetTop`, que se mide contra el ancestro posicionado más cercano. Sin
        esto se mediría contra la página y el scroll saltaría a otro lado.
      */}
      {/*
        Sin `flex-1` a propósito: en un contenedor flex vertical, `flex: 1 1 0%`
        ignora la altura declarada y el panel crecía hasta abarcar el capítulo
        entero (miles de píxeles) en vez de quedarse en su alto fijo y hacer
        scroll dentro.
      */}
      <div ref={containerRef} className={`no-scrollbarVerse relative overflow-y-auto px-2 py-2 font-serif ${claseTamanoTexto} ${esCapitulo ? tamanioVerseAlto : "h-fit"}`}>
        {cargando && sinContenido ? (
          // Esqueleto mientras no hay nada que mostrar: primera carga y
          // cambio de capítulo (`VerseWindow` vacía el texto al empezar a
          // pedir el nuevo). Cambiar de versículo NO recarga nada, así que
          // el texto nunca se tapa con una capa gris al leer.
          <div className="flex flex-col gap-3 py-1" aria-hidden="true">
            {[90, 100, 96, 82, 94, 70].map((ancho, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-superficie-2" style={{ width: `${ancho}%`, animationDelay: `${i * 80}ms` }}></div>
            ))}
          </div>
        ) : esCapitulo ? (
          Object.entries(textoVisible)
            .sort(([keyA], [keyB]) => keyA - keyB)
            .map(([versiculo, contenido]) => {
              const seleccionado = parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero);

              // El resaltado y las notas son del VERSÍCULO, no de la versión:
              // subrayar Juan 3:16 lo subraya en los seis paneles, porque lo
              // que el usuario marcó fue el pasaje y no una traducción suya.
              const color = colorDe(bookId, capituloSeleccionadoNumero, versiculo);
              const tieneNota = notasDe(bookId, capituloSeleccionadoNumero, versiculo).length > 0;

              /*
               * El resaltado cede ante la selección. Los dos son un fondo, y si
               * el amarillo del resaltado pisara al de "estoy leyendo este", se
               * perdería de vista cuál es el versículo activo — que es la
               * referencia que enseña la barra de arriba.
               */
              const fondo = seleccionado
                ? "border-acento bg-acento-suave text-tinta"
                : color
                  ? `border-transparent ${CLASES_COLOR[color] ?? ""}`
                  : "border-transparent text-tinta hover:bg-superficie-2";

              return (
                <p
                  key={versiculo}
                  data-verse={versiculo}
                  onClick={() => handleVerseClick(versiculo)}
                  // El borde izquierdo va siempre, transparente cuando no toca:
                  // si apareciera solo al seleccionar, el texto se correría 3px
                  // en cada clic.
                  className={`animate-slide-in-bottom mb-0.5 cursor-pointer rounded-lg border-l-[3px] px-2.5 py-1.5 leading-relaxed transition-colors ${fondo}`}
                >
                  {/*
                    El número va EN LÍNEA con el texto, sin columna propia: una
                    columna fija sangraba todos los renglones y el texto se veía
                    corrido hacia la derecha. Que la primera línea arranque al
                    lado del número lo resuelve el CSS del marcado, no el layout.
                  */}
                  <span className={`mr-1.5 select-none font-sans text-[11px] font-semibold tabular-nums ${seleccionado ? "text-acento" : "text-tinta-3"}`}>{versiculo}</span>
                  {tieneNota && (
                    // Un punto y no un icono: va dentro del renglón del texto y
                    // cualquier cosa más alta descuadraría la primera línea.
                    <span title={t("NotasTiene")} aria-label={t("NotasTiene")} className="mr-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-acento align-middle"></span>
                  )}
                  <span
                    className={`texto-biblico ${CLASES_STRONG} ${preferencia.morfologia ? "" : "sin-morfologia"} ${preferencia.glosa ? "" : "sin-glosa"} ${
                      String(versiculoTraduciendo) === String(versiculo) ? "traduciendo-skeleton" : ""
                    }`}
                    onClick={handleStrongClick}
                    // El marcado de diferencias solo se aplica al versículo
                    // SELECCIONADO. Pintar el capítulo entero llenaría el panel
                    // de subrayados y la comparación se hace de un versículo a
                    // la vez, que es como se lee.
                    dangerouslySetInnerHTML={{
                      __html: marcarSiToca(
                        versiculo,
                        seleccionado && diferencias ? marcarDiferencias(normalizarMarcado(contenido), diferencias) : normalizarMarcado(contenido),
                      ),
                    }}
                  ></span>
                </p>
              );
            })
        ) : typeof textoVisible === "string" ? (
          <div className="animate-slide-in-bottom rounded-lg bg-superficie-2 px-3 py-4 text-center font-sans text-sm text-tinta-2">{textoVisible}</div>
        ) : (
          <p>{t("NoObjetoNoString")}</p>
        )}
      </div>

      {errorTraduccion && !isTranslating && (
        <div role="status" className="animate-fade-in border-t border-linea py-1 text-center text-xs text-red-600 dark:text-red-400">
          {t("TraduccionFallo")}
        </div>
      )}
    </article>
  );
};

VerseSingle.propTypes = {
  cargando: PropTypes.bool,
  bookId: PropTypes.number,
  texto: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  nombre: PropTypes.string.isRequired,
  iso: PropTypes.string.isRequired,
};

export default VerseSingle;
