import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Pause, Search as IconoBuscar, Shuffle, Volume2, X } from "lucide-react";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import indexHebrew from "../assets/strongs/IndexHebrew.json";
import indexGreek from "../assets/strongs/IndexGreek.json";
import { getStrongAudioUrl, getStrongBatch } from "../services/bibleSource";
import { buscarStrongs, LARGO_MINIMO } from "../services/searchSource";
import { aparicionesStrong, estaDisponible } from "../services/estudioSource";
import { getCatalogMaps } from "../services/tursoSource";
import { formatearReferencia, rutaDeReferencia } from "../utils/referencia";
import { aTextoPlano } from "../utils/textoPlano";
import { codificarVersiones } from "../utils/versiones";
import BotonCopiar from "../components/BotonCopiar";
import DefinicionStrong from "../components/DefinicionStrong";

/*
 * Diccionario Strong como página propia.
 *
 * Hasta ahora el diccionario solo se veía de paso: el globito al tocar una
 * palabra, o una pestaña dentro de Buscar. Aquí se puede HOJEAR —las 8674
 * palabras hebreas y las 5524 griegas en orden— y cada una tiene su dirección
 * (`/dictionary/G26`), que se puede guardar o compartir.
 *
 * La lista sale de los índices locales (código, palabra, transliteración), que
 * ya venían en la app: filtra al instante y funciona sin conexión. Lo que
 * necesita la base —la definición completa, buscar por significado y los
 * versículos donde aparece— se pide a la API.
 *
 * Escritorio: lista a la izquierda y ficha a la derecha. Teléfono: una cosa a
 * la vez; la ficha ocupa la pantalla y tiene su flecha de vuelta.
 */

const INDICES = { hebrew: indexHebrew, greek: indexGreek };
const TANDA = 150;
const POR_PAGINA = 20;

/** "Ἀγάπη" → "αγαπη": sin acentos ni mayúsculas, para comparar lo escrito. */
const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-֑ͯ-ׇ]/g, "")
    .toLowerCase()
    .trim();

const idiomaDeCodigo = (codigo) => (codigo?.startsWith("H") ? "hebrew" : "greek");

/** Lo que se busca por palabra, preparado una sola vez por idioma. */
const prepararIndice = (lista) => lista.map((item) => ({ ...item, busca: `${normalizar(item.le)} ${normalizar(item.pl)}` }));

const Dictionary = () => {
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const { codigo: codigoUrl } = useParams();
  const codigo = codigoUrl?.toUpperCase().replace(/^([GH])0+(?=\d)/, "$1") ?? null;

  const [idioma, setIdioma] = useState(() => (codigo ? idiomaDeCodigo(codigo) : "hebrew"));
  const [texto, setTexto] = useState("");

  // Al llegar a una entrada del otro idioma (por un enlace "véase G25"), la
  // lista cambia de pestaña para que la entrada abierta esté en ella.
  useEffect(() => {
    if (codigo) setIdioma(idiomaDeCodigo(codigo));
  }, [codigo]);

  const indices = useMemo(() => ({ hebrew: prepararIndice(INDICES.hebrew), greek: prepararIndice(INDICES.greek) }), []);

  return (
    <div className="mx-auto flex w-full max-w-6xl md:h-[calc(100dvh-1px)] md:gap-0">
      <Lista
        indices={indices}
        idioma={idioma}
        setIdioma={setIdioma}
        texto={texto}
        setTexto={setTexto}
        activo={codigo}
        oculta={Boolean(codigo)}
        t={t}
        idiomaNavegador={idiomaNavegador}
      />
      <section className={`min-w-0 flex-1 md:overflow-y-auto md:border-l md:border-linea ${codigo ? "" : "hidden md:block"}`}>
        {codigo ? <Ficha key={codigo} codigo={codigo} indices={indices} t={t} idiomaNavegador={idiomaNavegador} /> : <Bienvenida indices={indices} t={t} />}
      </section>
    </div>
  );
};

/* ------------------------------------------------------------------------ */
/*  Lista                                                                    */
/* ------------------------------------------------------------------------ */

const Lista = ({ indices, idioma, setIdioma, texto, setTexto, activo, oculta, t, idiomaNavegador }) => {
  const navigate = useNavigate();
  const [visibles, setVisibles] = useState(TANDA);
  const [porSignificado, setPorSignificado] = useState(null);
  const centinela = useRef(null);
  const filaActiva = useRef(null);

  const termino = normalizar(texto);

  /*
   * "G26", "h430" o "26": un número va directo a la entrada. Con letra se sabe
   * el idioma; sin letra se usa la pestaña abierta.
   */
  const codigoEscrito = useMemo(() => {
    const coincide = texto.trim().match(/^([GgHh])?\s*0*(\d{1,4})$/);
    if (!coincide) return null;
    const letra = coincide[1]?.toUpperCase() ?? (idioma === "hebrew" ? "H" : "G");
    const candidato = `${letra}${coincide[2]}`;
    return indices[idiomaDeCodigo(candidato)].some((item) => item.id === candidato) ? candidato : null;
  }, [texto, idioma, indices]);

  const resultados = useMemo(() => {
    const lista = indices[idioma];
    if (!termino || codigoEscrito) return lista;
    // Primero lo que EMPIEZA por lo escrito: quien busca "agap" quiere ἀγάπη
    // antes que las palabras que solo la contienen.
    const empiezan = [];
    const contienen = [];
    for (const item of lista) {
      const palabras = item.busca.split(" ");
      if (palabras.some((p) => p.startsWith(termino))) empiezan.push(item);
      else if (item.busca.includes(termino)) contienen.push(item);
    }
    return [...empiezan, ...contienen];
  }, [indices, idioma, termino, codigoEscrito]);

  useEffect(() => setVisibles(TANDA), [idioma, termino]);

  // Cargar más filas al acercarse al final, en vez de pintar 8000 de golpe.
  useEffect(() => {
    const nodo = centinela.current;
    if (!nodo) return;
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) setVisibles((v) => v + TANDA);
    }, { rootMargin: "400px" });
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [resultados]);

  // La entrada abierta tiene que verse en la lista, aunque esté en la 3000.
  useEffect(() => {
    if (!activo || termino) return;
    const posicion = indices[idioma].findIndex((item) => item.id === activo);
    if (posicion >= visibles) setVisibles(posicion + TANDA);
  }, [activo, idioma, indices, termino, visibles]);

  useEffect(() => {
    filaActiva.current?.scrollIntoView({ block: "nearest" });
  }, [activo, idioma]);

  /*
   * Buscar por SIGNIFICADO ("amor" → G26) solo puede hacerlo la API: los
   * índices locales no traen las definiciones. Va aparte de la lista y con
   * retardo, para no consultar en cada tecla.
   */
  useEffect(() => {
    const q = texto.trim();
    if (q.length < LARGO_MINIMO || codigoEscrito) {
      setPorSignificado(null);
      return;
    }
    const controller = new AbortController();
    const espera = setTimeout(() => {
      buscarStrongs({ q, idioma, lang: idiomaNavegador, limite: 15, signal: controller.signal })
        .then((datos) => setPorSignificado(datos))
        .catch(() => setPorSignificado(null));
    }, 350);
    return () => {
      clearTimeout(espera);
      controller.abort();
    };
  }, [texto, idioma, idiomaNavegador, codigoEscrito]);

  const alEnviar = (evento) => {
    evento.preventDefault();
    const destino = codigoEscrito ?? resultados[0]?.id;
    if (destino) navigate(`/dictionary/${destino}`);
  };

  const significados = porSignificado?.data ?? [];

  return (
    <aside className={`flex w-full flex-col md:w-[340px] md:shrink-0 lg:w-[380px] ${oculta ? "hidden md:flex" : ""}`}>
      <div className="border-b border-linea px-4 pb-3 pt-4">
        <h1 className="text-xl font-semibold text-tinta">{t("Diccionario")}</h1>
        <p className="mt-0.5 text-xs text-tinta-3">{t("DiccionarioSubtitulo")}</p>

        <div role="tablist" className="mt-3 flex gap-1 rounded-xl bg-tinta/5 p-1">
          {[
            ["hebrew", "DiccionarioHebreo", indices.hebrew.length],
            ["greek", "DiccionarioGriego", indices.greek.length],
          ].map(([valor, clave, total]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={idioma === valor}
              onClick={() => setIdioma(valor)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${idioma === valor ? "bg-superficie text-tinta" : "text-tinta-3 hover:text-tinta"}`}
            >
              {t(clave)} <span className="text-xs font-normal tabular-nums text-tinta-3">{total.toLocaleString(idiomaNavegador)}</span>
            </button>
          ))}
        </div>

        <form onSubmit={alEnviar} className="relative mt-2">
          <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-3" strokeWidth={2} aria-hidden="true" />
          <input
            // "text" y no "search": el de búsqueda trae su propia ✕ en Chrome y
            // Safari, y saldría junto a la nuestra.
            type="text"
            inputMode="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t("DiccionarioBuscar")}
            aria-label={t("DiccionarioBuscar")}
            enterKeyHint="search"
            className="w-full rounded-lg border border-linea bg-superficie py-2 pl-9 pr-9 text-sm text-tinta placeholder:text-tinta-3 focus:border-acento focus:outline-none"
          />
          {texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              aria-label={t("Cerrar")}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-tinta-3 hover:text-tinta"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </form>
      </div>

      <div className="flex-1 md:overflow-y-auto">
        {codigoEscrito && (
          <Link to={`/dictionary/${codigoEscrito}`} className="mx-4 mt-3 flex items-center justify-between rounded-lg bg-acento-suave px-3 py-2 text-sm font-medium text-acento">
            {t("DiccionarioIrA", { code: codigoEscrito })}
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        )}

        {significados.length > 0 && (
          <div className="px-2 pt-3">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-tinta-3">{t("DiccionarioPorSignificado")}</p>
            <ul>
              {significados.map((entrada) => (
                <Fila key={`s-${entrada.code}`} id={entrada.code} lema={entrada.lemma} translit={entrada.transliteration} extracto={aTextoPlano(entrada.definition ?? "")} activo={activo === entrada.code} />
              ))}
            </ul>
            <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-tinta-3">{t("DiccionarioPorPalabra")}</p>
          </div>
        )}

        {resultados.length === 0 ? (
          significados.length === 0 && <p className="px-4 py-8 text-center text-sm text-tinta-3">{t("DiccionarioSinCoincidencias", { termino: texto.trim() })}</p>
        ) : (
          <ul className="px-2 py-2">
            {resultados.slice(0, visibles).map((item) => (
              <Fila key={item.id} id={item.id} lema={item.le} translit={item.pl} activo={activo === item.id} refActiva={activo === item.id ? filaActiva : undefined} />
            ))}
          </ul>
        )}
        {visibles < resultados.length && <div ref={centinela} className="h-8" aria-hidden="true" />}
      </div>
    </aside>
  );
};

const Fila = ({ id, lema, translit, extracto, activo, refActiva }) => (
  <li ref={refActiva}>
    <Link
      to={`/dictionary/${id}`}
      aria-current={activo ? "page" : undefined}
      className={`flex items-baseline gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${activo ? "bg-acento-suave" : "hover:bg-tinta/5"}`}
    >
      <span className={`w-12 shrink-0 font-mono text-[11px] font-semibold ${activo ? "text-acento" : "text-tinta-3"}`}>{id}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span dir="auto" className="truncate text-base font-medium text-tinta">{lema}</span>
          <span className="truncate text-xs italic text-tinta-3">{translit}</span>
        </span>
        {extracto && <span className="mt-0.5 block truncate text-xs text-tinta-2">{extracto}</span>}
      </span>
    </Link>
  </li>
);

/* ------------------------------------------------------------------------ */
/*  Sin entrada abierta (solo escritorio)                                    */
/* ------------------------------------------------------------------------ */

const Bienvenida = ({ indices, t }) => {
  const navigate = useNavigate();
  const alAzar = () => {
    const todas = [...indices.hebrew, ...indices.greek];
    navigate(`/dictionary/${todas[Math.floor(Math.random() * todas.length)].id}`);
  };
  const ejemplos = ["G26", "H430", "G5485", "H2617", "G4102", "H7965"];
  const datos = (id) => indices[idiomaDeCodigo(id)].find((item) => item.id === id);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm text-tinta-2">{t("DiccionarioElige")}</p>
      <div className="mt-5 grid w-full grid-cols-2 gap-2">
        {ejemplos.map((id) => (
          <Link key={id} to={`/dictionary/${id}`} className="rounded-xl border border-linea bg-superficie px-3 py-2.5 text-left transition-colors hover:border-acento hover:bg-acento-suave">
            <span className="block font-mono text-[11px] font-semibold text-acento">{id}</span>
            <span className="block truncate text-lg font-medium text-tinta">
              <bdi>{datos(id)?.le}</bdi>
            </span>
            <span className="block truncate text-xs italic text-tinta-3">{datos(id)?.pl}</span>
          </Link>
        ))}
      </div>
      <button type="button" onClick={alAzar} className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-acento hover:bg-acento-suave">
        <Shuffle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        {t("DiccionarioAlAzar")}
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------------ */
/*  Ficha                                                                    */
/* ------------------------------------------------------------------------ */

const Ficha = ({ codigo, indices, t, idiomaNavegador }) => {
  const idioma = idiomaDeCodigo(codigo);
  const lista = indices[idioma];
  const posicion = lista.findIndex((item) => item.id === codigo);
  const local = lista[posicion] ?? null;
  const anterior = posicion > 0 ? lista[posicion - 1] : null;
  const siguiente = posicion >= 0 && posicion < lista.length - 1 ? lista[posicion + 1] : null;

  const [entrada, setEntrada] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    const controller = new AbortController();
    setEstado("cargando");
    getStrongBatch({ code: codigo, lang: idiomaNavegador, signal: controller.signal })
      .then((lote) => {
        const encontrada = (lote ?? []).find((item) => item.id === codigo) ?? null;
        setEntrada(encontrada);
        setEstado(encontrada ? "listo" : "error");
      })
      .catch((fallo) => {
        if (fallo?.name !== "AbortError") setEstado("error");
      });
    return () => controller.abort();
  }, [codigo, idiomaNavegador]);

  if (!local && estado !== "cargando" && !entrada) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-tinta-2">{t("DiccionarioNoExiste", { code: codigo })}</p>
        <Link to="/dictionary" className="mt-3 inline-block text-sm font-medium text-acento">{t("Diccionario")}</Link>
      </div>
    );
  }

  const lema = entrada?.le ?? local?.le;
  const translit = entrada?.pl ?? local?.pl;

  const textoFicha = () =>
    [`${codigo} ${lema ?? ""} (${translit ?? ""})`, entrada?.ps ? `${t("StrongPronunciacion")}: ${entrada.ps}` : "", entrada?.df ? `${t("StrongDefinicion")}: ${aTextoPlano(entrada.df)}` : ""]
      .filter(Boolean)
      .join("\n");

  return (
    <article className="px-4 pb-16 pt-3 md:px-8 md:pt-6">
      <nav className="mb-4 flex items-center justify-between gap-2">
        <Link to="/dictionary" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-tinta-2 hover:bg-tinta/5 hover:text-tinta md:invisible">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t("Diccionario")}
        </Link>
        <div className="flex items-center gap-1">
          <Vecina entrada={anterior} Icono={ChevronLeft} etiqueta={t("DiccionarioAnterior")} />
          <Vecina entrada={siguiente} Icono={ChevronRight} etiqueta={t("DiccionarioSiguiente")} />
        </div>
      </nav>

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-semibold text-acento">
            {codigo} · {t(idioma === "hebrew" ? "DiccionarioHebreo" : "DiccionarioGriego")}
          </p>
          {/* <bdi> y no `dir` en el bloque: el hebreo se escribe de derecha a
              izquierda, pero la línea tiene que seguir alineada con el resto. */}
          <h2 className="mt-1 break-words text-4xl font-semibold leading-tight text-tinta">
            <bdi>{lema}</bdi>
          </h2>
          <p className="mt-1 text-base text-tinta-2">
            <span className="italic">{translit}</span>
            {entrada?.ti && entrada.ti !== translit && <span className="text-tinta-3"> · {entrada.ti}</span>}
          </p>
        </div>
        {entrada && <BotonCopiar obtenerTexto={textoFicha} etiqueta={t("CopiarDefinicion")} className="h-9 w-9" />}
      </header>

      {entrada?.ps && (
        <div className="mt-5 flex items-center gap-3">
          <div>
            <p className="text-xs font-medium text-tinta-3">{t("StrongPronunciacion")}</p>
            <p className="text-lg font-semibold text-tinta">{entrada.ps}</p>
          </div>
          <BotonAudio codigo={codigo} audioUrl={entrada.audioUrl} t={t} />
        </div>
      )}

      <section className="mt-6">
        <h3 className="text-xs font-medium text-tinta-3">{t("StrongDefinicion")}</h3>
        {estado === "cargando" ? (
          <div className="mt-2 flex flex-col gap-2" aria-hidden="true">
            {[96, 88, 70].map((ancho) => (
              <div key={ancho} className="h-3.5 animate-pulse rounded bg-superficie-2" style={{ width: `${ancho}%` }} />
            ))}
          </div>
        ) : estado === "error" ? (
          <p className="mt-2 text-sm text-tinta-3">{t("DiccionarioError")}</p>
        ) : (
          <>
            {entrada.dfLang && entrada.dfLang !== idiomaNavegador && <p className="mt-1 text-xs italic text-tinta-3">{t("StrongSinTraducir")}</p>}
            {entrada.df ? (
              <DefinicionStrong html={entrada.df} className="mt-2 text-[15px] leading-relaxed text-tinta" />
            ) : (
              <p className="mt-2 text-sm text-tinta-3">{t("DefinicionNoDisponible")}</p>
            )}
          </>
        )}
      </section>

      <Apariciones codigo={codigo} t={t} />
    </article>
  );
};

const Vecina = ({ entrada, Icono, etiqueta }) =>
  entrada ? (
    <Link to={`/dictionary/${entrada.id}`} title={`${etiqueta}: ${entrada.id}`} aria-label={`${etiqueta}: ${entrada.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-tinta-2 hover:bg-tinta/5 hover:text-tinta">
      {Icono === ChevronLeft && <Icono className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
      <span className="font-mono">{entrada.id}</span>
      {Icono === ChevronRight && <Icono className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
    </Link>
  ) : (
    <span className="w-16" />
  );

const BotonAudio = ({ codigo, audioUrl, t }) => {
  const [audio, setAudio] = useState(null);
  const [estado, setEstado] = useState("quieto");

  useEffect(() => () => audio?.pause(), [audio]);

  const alTocar = useCallback(() => {
    if (estado === "sonando") {
      audio.pause();
      audio.currentTime = 0;
      setEstado("quieto");
      return;
    }
    const elemento = audio ?? new Audio(audioUrl ?? getStrongAudioUrl(codigo));
    if (!audio) {
      elemento.addEventListener("ended", () => setEstado("quieto"));
      setAudio(elemento);
    }
    setEstado("cargando");
    elemento
      .play()
      .then(() => setEstado("sonando"))
      .catch(() => setEstado("quieto"));
  }, [audio, audioUrl, codigo, estado]);

  const etiqueta = estado === "sonando" ? t("DetenerPronunciacion") : t("ReproducirPronunciacion");
  const Icono = estado === "cargando" ? Loader2 : estado === "sonando" ? Pause : Volume2;

  return (
    <button
      type="button"
      onClick={alTocar}
      title={etiqueta}
      aria-label={etiqueta}
      className="grid h-10 w-10 place-items-center rounded-full bg-acento-solido text-white transition hover:bg-acento-solido/90 active:scale-95"
    >
      <Icono className={`h-4 w-4 ${estado === "cargando" ? "animate-spin" : ""}`} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
};

/** Versículos donde aparece la palabra, con el texto en la versión de trabajo. */
const Apariciones = ({ codigo, t }) => {
  const { versionTrabajo, bibliasSeleccionadas } = useContext(DataContext);
  const navigate = useNavigate();
  const [bibleId, setBibleId] = useState(undefined);
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    if (!versionTrabajo) {
      setBibleId(null);
      return;
    }
    getCatalogMaps()
      .then(({ byLegacyPath }) => !cancelado && setBibleId(byLegacyPath.get(versionTrabajo) ?? null))
      .catch(() => !cancelado && setBibleId(null));
    return () => {
      cancelado = true;
    };
  }, [versionTrabajo]);

  useEffect(() => {
    // Se espera a saber la versión: pedir sin ella y luego con ella serían dos
    // listas distintas parpadeando.
    if (bibleId === undefined || !estaDisponible()) return;
    const controller = new AbortController();
    setResultado(null);
    setError(false);
    aparicionesStrong({ code: codigo, bibleId, pagina, limite: POR_PAGINA, signal: controller.signal })
      .then(setResultado)
      .catch((fallo) => fallo?.name !== "AbortError" && setError(true));
    return () => controller.abort();
  }, [codigo, bibleId, pagina]);

  const codigosVersiones = useMemo(() => codificarVersiones(bibliasSeleccionadas), [bibliasSeleccionadas]);
  const total = resultado?.pagination?.total ?? 0;
  const totalPaginas = resultado?.pagination?.totalPages ?? 1;

  const abrir = (item) => {
    const ruta = rutaDeReferencia({ bookId: item.bookId, capitulo: item.chapter, versiculo: item.verse });
    navigate(`${ruta}${codigosVersiones ? `?v=${codigosVersiones}` : ""}`);
  };

  return (
    <section className="mt-8 border-t border-linea pt-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-tinta">{t("ConcordanciaTitulo")}</h3>
        {resultado && total > 0 && <p className="text-xs text-tinta-3">{t("ConcordanciaTotal", { total })}</p>}
      </div>

      {!estaDisponible() ? (
        <p className="mt-2 text-sm text-tinta-3">{t("ConcordanciaNecesitaApi")}</p>
      ) : error ? (
        <p className="mt-2 text-sm text-tinta-3">{t("ConcordanciaError")}</p>
      ) : resultado === null ? (
        <div className="mt-3 flex flex-col gap-2" aria-hidden="true">
          {[92, 80, 88].map((ancho) => (
            <div key={ancho} className="h-3 animate-pulse rounded bg-superficie-2" style={{ width: `${ancho}%` }} />
          ))}
        </div>
      ) : resultado.data.length === 0 ? (
        <p className="mt-2 text-sm text-tinta-3">{t("ConcordanciaVacio")}</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-1.5">
            {resultado.data.map((item) => (
              <li key={`${item.bookId}-${item.chapter}-${item.verse}`}>
                <button type="button" onClick={() => abrir(item)} className="w-full rounded-lg border border-linea px-3 py-2 text-left transition-colors hover:border-acento hover:bg-acento-suave">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-acento">{formatearReferencia({ bookId: item.bookId, capitulo: item.chapter, versiculo: item.verse }, t)}</span>
                    {item.hits > 1 && <span className="rounded bg-tinta/5 px-1 text-[10px] font-bold text-tinta-3">×{item.hits}</span>}
                  </span>
                  {item.text && <span className="mt-0.5 block line-clamp-2 text-sm text-tinta-2">{aTextoPlano(item.text)}</span>}
                </button>
              </li>
            ))}
          </ul>
          {totalPaginas > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} className="rounded-lg px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-tinta/5 disabled:opacity-40">
                {t("BuscarAnterior")}
              </button>
              <span className="text-xs tabular-nums text-tinta-3">
                {pagina} / {totalPaginas}
              </span>
              <button type="button" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas} className="rounded-lg px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-tinta/5 disabled:opacity-40">
                {t("BuscarSiguiente")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

const indicesShape = PropTypes.shape({
  hebrew: PropTypes.arrayOf(PropTypes.object).isRequired,
  greek: PropTypes.arrayOf(PropTypes.object).isRequired,
}).isRequired;

Lista.propTypes = {
  indices: indicesShape,
  idioma: PropTypes.oneOf(["hebrew", "greek"]).isRequired,
  setIdioma: PropTypes.func.isRequired,
  texto: PropTypes.string.isRequired,
  setTexto: PropTypes.func.isRequired,
  activo: PropTypes.string,
  oculta: PropTypes.bool,
  t: PropTypes.func.isRequired,
  idiomaNavegador: PropTypes.string,
};

Fila.propTypes = {
  id: PropTypes.string.isRequired,
  lema: PropTypes.string,
  translit: PropTypes.string,
  extracto: PropTypes.string,
  activo: PropTypes.bool,
  refActiva: PropTypes.object,
};

Bienvenida.propTypes = { indices: indicesShape, t: PropTypes.func.isRequired };

Ficha.propTypes = {
  codigo: PropTypes.string.isRequired,
  indices: indicesShape,
  t: PropTypes.func.isRequired,
  idiomaNavegador: PropTypes.string,
};

Vecina.propTypes = {
  entrada: PropTypes.shape({ id: PropTypes.string.isRequired }),
  Icono: PropTypes.elementType.isRequired,
  etiqueta: PropTypes.string.isRequired,
};

BotonAudio.propTypes = {
  codigo: PropTypes.string.isRequired,
  audioUrl: PropTypes.string,
  t: PropTypes.func.isRequired,
};

Apariciones.propTypes = { codigo: PropTypes.string.isRequired, t: PropTypes.func.isRequired };

export default Dictionary;
