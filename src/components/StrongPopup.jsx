import { useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { getStrongAudioUrl } from "../services/bibleSource";
import indexHebrew from "../assets/strongs/IndexHebrew.json";
import indexGreek from "../assets/strongs/IndexGreek.json";
import BotonCopiar from "./BotonCopiar";

const StrongPopup = () => {
  const { strongPopup, mostrarStrongPopup, cerrarStrongPopup, abrirDefinicionStrong, abrirConcordancia } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  const [audio, setAudio] = useState(null);
  const [cargandoAudio, setCargandoAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: "bottom", arrowLeft: 150 });

  const popupRef = useRef(null);

  const code = strongPopup?.code;
  const isHebrew = code?.startsWith("H");
  const isGreek = code?.startsWith("G");

  /*
   * Abierto desde una palabra (no desde un número): `palabra` es lo que se
   * tocó, `opciones` las palabras originales del versículo y `cargando` el
   * rato en que se consulta la versión puente.
   */
  const palabra = strongPopup?.palabra ?? null;
  const opciones = strongPopup?.opciones ?? [];
  const cargando = Boolean(strongPopup?.cargando);
  const [verTodas, setVerTodas] = useState(false);
  useEffect(() => setVerTodas(false), [strongPopup]);

  // Al abrir la lista desde una palabra ya encontrada, esa palabra puede
  // quedar abajo del todo: se trae a la vista para no tener que buscarla.
  const opcionActual = useRef(null);

  // Sin código hay que elegir: la palabra no estaba tal cual en el original.
  const modoLista = !cargando && (verTodas || (!code && palabra !== null));

  useEffect(() => {
    if (modoLista) opcionActual.current?.scrollIntoView({ block: "nearest" });
  }, [modoLista]);

  /** La palabra original de un código, para la lista de opciones. */
  const originalDe = useCallback(
    (codigo) => (codigo?.startsWith("H") ? indexHebrew : indexGreek).find((item) => item.id === codigo)?.le ?? "",
    [],
  );

  // Información instantánea desde los índices locales (sin llamadas de red redundantes)
  const entryData = useMemo(() => {
    if (!code) return null;
    if (isHebrew) {
      return indexHebrew.find((item) => item.id === code) || null;
    }
    if (isGreek) {
      return indexGreek.find((item) => item.id === code) || null;
    }
    return null;
  }, [code, isHebrew, isGreek]);

  // Carga y preparación del audio únicamente desde la nueva fuente
  useEffect(() => {
    if (!code) {
      setAudio(null);
      setCargandoAudio(false);
      setIsPlaying(false);
      return;
    }

    const audioUrl = getStrongAudioUrl(code);
    setCargandoAudio(true);
    setIsPlaying(false);

    let cancelado = false;
    const elemento = new Audio();
    elemento.preload = "metadata";

    const alCargar = () => {
      if (!cancelado) {
        setAudio(elemento);
        setCargandoAudio(false);
      }
    };
    const alFallar = () => {
      if (!cancelado) {
        setAudio(null);
        setCargandoAudio(false);
      }
    };

    elemento.addEventListener("loadedmetadata", alCargar, { once: true });
    elemento.addEventListener("canplaythrough", alCargar, { once: true });
    elemento.addEventListener("error", alFallar, { once: true });
    elemento.src = audioUrl;

    return () => {
      cancelado = true;
      elemento.removeEventListener("loadedmetadata", alCargar);
      elemento.removeEventListener("canplaythrough", alCargar);
      elemento.removeEventListener("error", alFallar);
      elemento.pause();
      elemento.src = "";
    };
  }, [code]);

  useEffect(() => {
    if (audio) {
      const onEnded = () => setIsPlaying(false);
      audio.addEventListener("ended", onEnded);
      return () => audio.removeEventListener("ended", onEnded);
    }
  }, [audio]);

  const toggleAudio = useCallback(() => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    } else {
      audio.playbackRate = 1.05;
      audio.play();
      setIsPlaying(true);
    }
  }, [audio, isPlaying]);

  // Calcular posición inteligente del Popup anclado directamente sobre/bajo el número en móvil y escritorio
  useEffect(() => {
    if (!strongPopup) return;

    const anchor = strongPopup.anchorRect;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = Math.min(viewportWidth - 24, 310);
    // La lista de palabras es más alta que la ficha: si se calcula con la
    // altura de la ficha, cerca del borde inferior se sale de la pantalla.
    const popupHeight = modoLista ? 320 : 190;
    const margin = 10;

    if (!anchor) {
      setCoords({
        top: Math.max(margin, viewportHeight / 2 - popupHeight / 2),
        left: Math.max(margin, viewportWidth / 2 - popupWidth / 2),
        placement: "bottom",
        arrowLeft: popupWidth / 2,
      });
      return;
    }

    const anchorCenterX = anchor.left + anchor.width / 2;
    let left = anchorCenterX - popupWidth / 2;

    // Evitar que se desborde a la izquierda o derecha de la pantalla
    if (left < margin) {
      left = margin;
    } else if (left + popupWidth > viewportWidth - margin) {
      left = viewportWidth - popupWidth - margin;
    }

    // Posición exacta de la flecha apuntando al centro del número presionado
    const arrowLeft = Math.max(20, Math.min(popupWidth - 20, anchorCenterX - left));

    let top = anchor.bottom + 8;
    let placement = "bottom";

    // Si no cabe abajo y sí cabe arriba, posicionarlo encima
    if (top + popupHeight > viewportHeight - margin && anchor.top - popupHeight - margin > 0) {
      top = anchor.top - popupHeight - 8;
      placement = "top";
    }

    setCoords({ top, left, placement, arrowLeft });
  }, [strongPopup, modoLista]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") cerrarStrongPopup();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cerrarStrongPopup]);

  if (!strongPopup) return null;

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-auto">
      {/* Backdrop transparente para capturar clics afuera */}
      <div className="fixed inset-0 bg-black/25 dark:bg-black/40 backdrop-blur-[1px]" onClick={cerrarStrongPopup} />

      <div
        ref={popupRef}
        style={{
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          width: `${Math.min(typeof window !== "undefined" ? window.innerWidth - 24 : 310, 310)}px`,
          transformOrigin: `${coords.arrowLeft}px ${coords.placement === "bottom" ? "top" : "bottom"}`,
        }}
        className="absolute z-10 rounded-2xl border border-linea bg-superficie p-3.5 shadow-2xl backdrop-blur-md text-tinta transition-all animate-pop animate-duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puntero de burbuja (flecha anclada directamente al número Strong) */}
        <div
          style={{ left: `${coords.arrowLeft}px` }}
          className={`absolute -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-superficie z-20 ${
            coords.placement === "bottom"
              ? "-top-[8px] border-t border-l border-linea"
              : "-bottom-[8px] border-b border-r border-linea"
          }`}
        />

        {palabra !== null && (cargando || modoLista) ? (
          <div className="relative z-30">
            <div className="mb-2 flex items-start justify-between gap-2 border-b border-linea pb-2">
              <p className="min-w-0 text-sm font-semibold text-tinta">«{palabra}»</p>
              <button
                onClick={cerrarStrongPopup}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-tinta-3 transition hover:bg-tinta/5 hover:text-tinta-2"
                title={t("Cerrar")}
                aria-label={t("Cerrar")}
              >
                &times;
              </button>
            </div>

            {cargando ? (
              <p className="flex items-center gap-2 py-3 text-xs text-tinta-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-acento/30 border-t-acento" aria-hidden="true"></span>
                {t("StrongBuscandoOriginal")}
              </p>
            ) : opciones.length === 0 ? (
              <p className="py-2 text-xs leading-relaxed text-tinta-2">{t("StrongSinOriginal")}</p>
            ) : (
              <>
                <p className="mb-2 text-xs leading-relaxed text-tinta-2">
                  {code ? t("StrongPalabrasDelVersiculo") : t("StrongSinCoincidencia", { palabra })}
                </p>
                <ul className="no-scrollbar -mx-1 max-h-56 overflow-y-auto">
                  {opciones.map((opcion) => (
                    <li key={`${opcion.texto}-${opcion.code}`} ref={opcion.code === code ? opcionActual : undefined}>
                      <button
                        type="button"
                        onClick={() => mostrarStrongPopup(opcion.code, strongPopup.anchorRect, { palabra: opcion.texto, opciones })}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-acento-suave ${
                          opcion.code === code ? "bg-acento-suave" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-tinta">{opcion.texto}</span>
                        <span className="shrink-0 text-sm text-tinta-2" dir="auto">
                          {originalDe(opcion.code)}
                        </span>
                        <span className="w-12 shrink-0 text-right font-mono text-[11px] font-semibold text-acento">{opcion.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
        <>
        {palabra !== null && (
          <p className="relative z-30 mb-1 text-xs text-tinta-3">{t("StrongPalabraEnOriginal", { palabra })}</p>
        )}

        {/* Encabezado: Código + Idioma + Botón cerrar */}
        <div className="relative z-30 flex items-center justify-between border-b border-linea pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-acento bg-acento-suave px-2 py-0.5 rounded-md">
              {code}
            </span>
            <span className="text-xs font-semibold text-tinta-3">
              {isHebrew ? t("Hebreo") : isGreek ? t("Griego") : "Strong"}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Lo corto, para pegar: "amó → ἀγαπάω (agapao) · G25". */}
            {entryData && (
              <BotonCopiar
                obtenerTexto={() => `${palabra ? `${palabra} → ` : ""}${entryData.le}${entryData.pl ? ` (${entryData.pl})` : ""} · ${code}`}
                etiqueta={t("CopiarPalabra")}
                className="h-6 w-6"
              />
            )}
            <button
              onClick={cerrarStrongPopup}
              className="flex h-6 w-6 items-center justify-center rounded-full text-tinta-3 hover:bg-tinta/5 hover:text-tinta-2 transition"
              title={t("Cerrar") || "Cerrar"}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Cuerpo: Palabra original + Transliteración + Audio */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div
              className={`font-bold tracking-wide text-tinta break-words ${
                (entryData?.le || "").length > 22
                  ? "text-base leading-tight"
                  : (entryData?.le || "").length > 14
                  ? "text-lg leading-snug"
                  : "text-2xl"
              }`}
            >
              {entryData?.le || "—"}
            </div>
            <div className="text-xs sm:text-sm font-medium italic text-tinta-2 break-words mt-0.5">
              {entryData?.pl || ""}
            </div>
          </div>

          {/* Botón de reproducción de audio */}
          <div>
            {cargandoAudio ? (
              <div
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-acento-solido/70 text-white cursor-wait shadow-sm"
                title={t("CargandoAudio")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-60"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M15 8a5 5 0 0 1 0 8" />
                  <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
                </svg>
                <span className="absolute inset-[-2px] rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
              </div>
            ) : audio ? (
              <button
                onClick={toggleAudio}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-acento-solido hover:bg-acento-solido/90 active:scale-95 text-white transition shadow-md focus:outline-none focus:ring-2 focus:ring-acento/40"
                title={isPlaying ? t("DetenerPronunciacion") : t("ReproducirPronunciacion")}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
                    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M15 8a5 5 0 0 1 0 8" />
                    <path d="M17.7 5a9 9 0 0 1 0 14" />
                    <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
                  </svg>
                )}
              </button>
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-superficie-2 text-tinta-3 cursor-not-allowed"
                title={t("DefinicionNoDisponible")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9l-3 3h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v5" />
                  <path d="M12 12v7a.8 .8 0 0 1 -1.5 .5l-2.5 -3.5" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Botón de acción: Ver definición completa */}
        <button
          onClick={() => abrirDefinicionStrong(code)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-acento-solido hover:bg-acento-solido/90 py-2 px-3 text-xs font-bold text-white shadow-md active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-acento/40"
        >
          <span>{t("VerDefinicionCompleta") || "Ver definición completa"}</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/*
          El diccionario dice qué significa la palabra; esto dice dónde más se
          usa, que es la otra mitad del estudio de una palabra. Va en segundo
          plano visual porque la definición sigue siendo lo primero que se busca
          al pulsar un número.
        */}
        <button
          onClick={() => abrirConcordancia(code)}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-acento/40 py-2 px-3 text-xs font-bold text-acento transition hover:bg-acento-suave active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-acento/40"
        >
          <span>{t("ConcordanciaVerDonde")}</span>
        </button>

        {/* La palabra se eligió por coincidencia de texto: puede no ser la que
            se quería. Se deja a mano el resto del versículo. */}
        {opciones.length > 1 && (
          <button
            type="button"
            onClick={() => setVerTodas(true)}
            className="mt-2 w-full text-center text-[11px] font-medium text-tinta-3 underline-offset-2 transition hover:text-acento hover:underline"
          >
            {t("StrongVerTodas")}
          </button>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default StrongPopup;
