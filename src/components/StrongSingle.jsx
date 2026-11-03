import React, { useContext, useEffect, useState, useMemo } from "react";
import DataContext from "../context/DataContext";
import { getStrongAudioUrl } from "../services/bibleSource";
import ThemeContext from "../context/ThemeContext";
import LanguageContext from "../context/LanguageContext";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";
import { Loader2, Pause, Volume2, X } from "lucide-react";
import BotonCopiar from "./BotonCopiar";
import { aTextoPlano } from "../utils/textoPlano";

const processText = (html, strongFun) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allNodes = Array.from(doc.body.childNodes);

  const generateKey = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const processNode = (node) => {
    const key = node.nodeType === Node.TEXT_NODE ? node.textContent : generateKey();

    if (node.nodeType === Node.TEXT_NODE) {
      return <span key={key}>{escapeHTML(node.textContent)}</span>;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const attributes = Array.from(node.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {});

      if (node.tagName === "SPAN") {
        const onclickAttr = node.getAttribute("onclick");
        if (onclickAttr?.startsWith("strongFun(")) {
          const arg = onclickAttr.match(/strongFun\('(.*)'\)/)?.[1];
          return (
            <span key={key} onClick={() => strongFun(arg)} style={{ color: node.style.color, cursor: "pointer" }} className="Slink">
              {Array.from(node.childNodes).map(processNode)}
            </span>
          );
        }
      }

      return React.createElement(node.tagName.toLowerCase(), { key, ...attributes }, Array.from(node.childNodes).map(processNode));
    }
    return null;
  };

  return allNodes.map(processNode);
};

const escapeHTML = (str) => str.replace(/[&<>"'/]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));

const StrongSingle = () => {
  const { strongData, cargandoStrong, strong, strongFun, setModalStrong } = useContext(DataContext);
  // Este componente no usaba el traductor: todos sus textos estaban escritos en
  // español dentro del JSX, así que la ficha seguía en español con la interfaz
  // puesta en inglés.
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const [strongIndividual, setStrongIndividual] = useState(null);
  const [audio, setAudio] = useState(null);
  const [cargandoAudio, setCargandoAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(strongIndividual, () => setModalStrong(false));

  // Cerrar modal si se presiona por fuera
  const handleOutsideClick = (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      setModalStrong(false);
      strongFun("");
    }
  };

  useEffect(() => {
    const loadResources = async () => {
      if (!cargandoStrong && strongData) {
        const obtenerStrong = () => strongData.find((obj) => obj.id === strong) || null;
        setStrongIndividual(obtenerStrong());
      }
    };

    loadResources();
  }, [strongData, strong, cargandoStrong]);

  useEffect(() => {
    if (!strongIndividual) {
      setAudio(null);
      setCargandoAudio(false);
      return;
    }

    const audioUrl = strongIndividual.audioUrl ?? getStrongAudioUrl(strongIndividual.id);
    setCargandoAudio(true);
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
      elemento.src = "";
    };
  }, [strongIndividual]);

  const processedHtml = useMemo(() => (strongIndividual?.df ? processText(strongIndividual.df, strongFun) : null), [strongIndividual, strongFun]);

  useEffect(() => {
    if (audio) {
      audio.addEventListener("ended", () => setIsPlaying(false));
      return () => {
        audio.removeEventListener("ended", () => setIsPlaying(false));
      };
    }
  }, [audio]);

  const toggleAudio = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      } else {
        audio.play();
        //change pitch
        audio.playbackRate = 1.1;
        setIsPlaying(true);
      }
    }
  };

  const styles = {
    light: {
      // Enlace a otro número Strong: la pastilla del acento, igual en los dos
      // temas porque las variables ya cambian solas.
      slink: {
        background: "rgb(var(--acento-suave))",
        color: "rgb(var(--acento)) !important",
        padding: "2px 7px !important",
        borderRadius: "7px",
        fontWeight: 600,
        margin: "5px 1px",
      },
      purple: { color: "#9a00db", fontSize: "1.2em" },
      red: { color: "#bb00ff" },
      blue: { color: "#091cb0", fontWeight: 900 },
      green: { color: "#60ab49", fontSize: "1.5em" },
      // Eran #ffbb00 y #f2ff00: sobre fondo claro no se leían.
      orange: { color: "#b45309" },
      yellow: { color: "#a16207" },
    },
    dark: {
      // Enlace a otro número Strong: la pastilla del acento, igual en los dos
      // temas porque las variables ya cambian solas.
      slink: {
        background: "rgb(var(--acento-suave))",
        color: "rgb(var(--acento)) !important",
        padding: "2px 7px !important",
        borderRadius: "7px",
        fontWeight: 600,
        margin: "5px 1px",
      },
      purple: { color: "#b3e5fc", fontSize: "1.2em" },
      red: { color: "#e58080" },
      blue: { color: "#ffb400", fontWeight: 700 },
      green: { color: "#25ff1a", fontSize: "1.5em" },
      orange: { color: "#ff5733" },
      yellow: { color: "#ffe600" },
    },
  };

  const currentStyles = styles[theme];

  const renderLoadingState = () => (
    <div className="fixed inset-0 z-[999999999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative flex flex-col items-center justify-center rounded-2xl border border-linea bg-superficie px-8 py-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-3 flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-acento/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-acento animate-spin"></div>
          <span className="font-mono text-xs font-bold text-acento">
            {strong || "..."}
          </span>
        </div>

        <p className="text-base font-semibold text-tinta">{t("StrongCargandoDefinicion")}</p>
        <p className="mt-1 text-xs text-tinta-3">{t("StrongConsultando")}</p>
      </div>
    </div>
  );

  const cerrarFicha = () => {
    setModalStrong(false);
    strongFun("");
  };

  /** La ficha como texto para pegar en notas o mensajes, sin el marcado de colores. */
  const textoFicha = () =>
    [
      `${strongIndividual.id} · ${strongIndividual.le ?? ""}${strongIndividual.pl ? ` (${strongIndividual.pl})` : ""}`,
      strongIndividual.ps ? `${t("StrongPronunciacion")}: ${strongIndividual.ps}` : null,
      // Al quitar las etiquetas quedan espacios pegados a corchetes y
      // paréntesis ("compare H5689 ]"): se cierran para que pegado se lea bien.
      strongIndividual.df
        ? `${t("StrongDefinicion")}: ${aTextoPlano(strongIndividual.df).replace(/([[(])\s+/g, "$1").replace(/\s+([\])])/g, "$1")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

  /*
   * La ficha era un pergamino ilustrado con el texto encima en posiciones
   * fijas y un sello de lacre como botón de cerrar. Ahora es una tarjeta del
   * tema: el texto ya no depende de calzar dentro de un dibujo, así que una
   * definición larga hace scroll en vez de salirse del papel.
   */
  const renderContent = () => (
    <>
      <div
        className="animate-pop animate-duration-100 z-[9999999] flex max-h-[85vh] w-[min(92vw,520px)] flex-col overflow-hidden rounded-2xl border border-linea bg-superficie text-tinta shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`${strongIndividual.id} ${strongIndividual.le ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-linea px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-semibold text-acento">{strongIndividual.id}</p>
            <h1 className="mt-1 break-words text-2xl font-semibold leading-tight">{strongIndividual.le}</h1>
            <p className="mt-0.5 break-words text-sm text-tinta-2">
              {strongIndividual.pl} {strongIndividual.ti ? `(${strongIndividual.ti})` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <BotonCopiar obtenerTexto={textoFicha} etiqueta={t("CopiarDefinicion")} className="h-8 w-8" />
            <button
              type="button"
              onClick={cerrarFicha}
              aria-label={t("Cerrar")}
              title={t("Cerrar")}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-tinta/5 hover:text-tinta"
            >
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          <p className="text-xs font-medium text-tinta-3">{t("StrongPronunciacion")}</p>
          <div className="mt-1 flex items-center gap-2">
            <strong className="text-lg font-semibold">{strongIndividual.ps}</strong>
            {cargandoAudio ? (
              <span
                className="grid h-7 w-7 cursor-wait place-items-center rounded-full bg-acento-suave text-acento"
                title={t("CargandoAudio")}
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden="true" />
              </span>
            ) : audio ? (
              <button
                type="button"
                onClick={toggleAudio}
                className="grid h-7 w-7 place-items-center rounded-full bg-acento-solido text-white transition hover:bg-acento-solido/90 active:scale-95"
                title={isPlaying ? t("DetenerPronunciacion") : t("ReproducirPronunciacion")}
                aria-label={isPlaying ? t("DetenerPronunciacion") : t("ReproducirPronunciacion")}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />}
              </button>
            ) : null}
          </div>

          <p className="mt-5 text-xs font-medium text-tinta-3">{t("StrongDefinicion")}</p>
          {/*
            21 entradas del diccionario original no traen texto en inglés.
            El backend las sirve en español y lo dice en `dfLang`; sin este
            aviso el lector en inglés vería un párrafo en otro idioma sin
            explicación y lo tomaría por un fallo.
          */}
          {strongIndividual.dfLang && strongIndividual.dfLang !== idiomaNavegador && (
            <p className="mt-1 text-xs italic text-tinta-3">{t("StrongSinTraducir")}</p>
          )}
          <div className="mt-1.5 text-[15px] leading-relaxed text-tinta">
            {React.Children.map(processedHtml, (child) => {
              if (child.props.className === "Slink") {
                return React.cloneElement(child, { style: { ...child.props.style, ...currentStyles.slink } });
              }
              if (child.props.color) {
                const colorStyle = currentStyles[child.props.color.toLowerCase().replace("%color_", "").replace("%", "")];
                return React.cloneElement(child, { style: { ...child.props.style, ...colorStyle } });
              }
              return child;
            })}
          </div>
        </div>
      </div>
      <div className="fixed w-full h-full bg-black/40 z-[999999] modal-overlay" onClick={handleOutsideClick}></div>
    </>
  );

  const renderNotFound = () => (
    <div
      className="z-[9999999] h-auto max-w-[90%] w-[380px] rounded-2xl border border-linea bg-superficie p-6 text-center shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-acento-suave text-acento">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold">{t("DefinicionNoDisponible")}</h3>
      <p className="mt-1 font-mono text-sm font-semibold text-acento">{strong}</p>
      <p className="mt-2 text-xs text-tinta-2">
        {t("StrongFueraDeIndice")}
      </p>
      <button
        onClick={() => {
          setModalStrong(false);
          strongFun("");
        }}
        className="mt-5 rounded-lg bg-acento-solido px-5 py-2 text-xs font-medium text-white transition hover:bg-acento-solido/90"
      >
        {t("Cerrar")}
      </button>
    </div>
  );

  if (cargandoStrong) {
    return renderLoadingState();
  }

  if (!strongIndividual) {
    return (
      <div className="z-[9999] fixed inset-0 flex items-center justify-center">
        <div className="fixed w-full h-full bg-black/40 z-[999999] modal-overlay" onClick={handleOutsideClick}></div>
        <div className="z-[9999999] relative">{renderNotFound()}</div>
      </div>
    );
  }

  return renderContent();
};

export default StrongSingle;
