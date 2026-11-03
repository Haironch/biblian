import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { aparicionesStrong, estaDisponible } from "../services/estudioSource";
import { getCatalogMaps } from "../services/tursoSource";
import { formatearReferencia, rutaDeReferencia } from "../utils/referencia";
import { aTextoPlano } from "../utils/textoPlano";
import { codificarVersiones } from "../utils/versiones";

const POR_PAGINA = 25;

/**
 * Concordancia inversa de un código Strong: dónde más aparece.
 *
 * El diccionario ya decía qué significa G26 (*agápē*). Lo que faltaba era lo
 * contrario, que es como se estudia de verdad una palabra: ver los ciento y
 * pico sitios donde el mismo término original aparece y comprobar si el sentido
 * aguanta en todos.
 *
 * El dato no hubo que traerlo de ningún sitio. El markup `<sup>NNNN </sup>` ya
 * viajaba dentro del texto de las ediciones interlineales —se conservó inline
 * al construir la base para no romper la alineación palabra-Strong—, así que
 * esto es recorrer una vez lo que ya estaba escrito.
 */
const ConcordanciaStrong = () => {
  const { concordanciaStrong: code, cerrarConcordancia, bibliasSeleccionadas, versionTrabajo } = useContext(DataContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [resultado, setResultado] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState(false);
  const [bibleId, setBibleId] = useState(null);

  /*
   * El texto de cada aparición lo adjunta el backend, pero solo si se le dice
   * de qué versión. Se usa la versión de trabajo (la misma que el resto de
   * paneles de estudio) y hay que traducir su nombre de carpeta al id del
   * catálogo, que es lo que entiende la API.
   */
  const versionPrincipal = versionTrabajo;

  useEffect(() => {
    if (!code || !versionPrincipal) return;

    let cancelado = false;
    getCatalogMaps()
      .then(({ byLegacyPath }) => {
        if (!cancelado) setBibleId(byLegacyPath.get(versionPrincipal) ?? null);
      })
      .catch(() => {
        // Sin catálogo se listan las referencias sin texto: menos útil, pero
        // sigue sirviendo para navegar.
        if (!cancelado) setBibleId(null);
      });

    return () => {
      cancelado = true;
    };
  }, [code, versionPrincipal]);

  useEffect(() => {
    setPagina(1);
  }, [code]);

  useEffect(() => {
    if (!code) {
      setResultado(null);
      return;
    }

    const controller = new AbortController();
    let cancelado = false;

    setResultado(null);
    setError(false);

    aparicionesStrong({ code, bibleId, pagina, limite: POR_PAGINA, signal: controller.signal })
      .then((datos) => {
        if (!cancelado) setResultado(datos);
      })
      .catch((fallo) => {
        if (!cancelado && fallo?.name !== "AbortError") setError(true);
      });

    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [code, bibleId, pagina]);

  // Cerrar con Escape, como el resto de superposiciones de la app.
  useEffect(() => {
    if (!code) return;
    const alPulsar = (evento) => {
      if (evento.key === "Escape") cerrarConcordancia();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [code, cerrarConcordancia]);

  const codigosVersiones = useMemo(() => codificarVersiones(bibliasSeleccionadas), [bibliasSeleccionadas]);

  if (!code) return null;

  const abrir = (item) => {
    const ruta = rutaDeReferencia({ bookId: item.bookId, capitulo: item.chapter, versiculo: item.verse });
    cerrarConcordancia();
    // Como en las referencias cruzadas: quien salta desde aqui ya estaba
    // leyendo, y el modal se cierra sobre la misma pagina. Moverla ademas seria
    // un salto que nadie pidio.
    navigate(`${ruta}${codigosVersiones ? `?v=${codigosVersiones}` : ""}`, { state: { mantenerScroll: true } });
  };

  const total = resultado?.pagination?.total ?? 0;
  const totalPaginas = resultado?.pagination?.totalPages ?? 1;

  return (
    <div
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) cerrarConcordancia();
      }}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-8 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-label={`${t("ConcordanciaTitulo")} ${code}`} className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-linea bg-superficie shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-linea px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-tinta">
              {t("ConcordanciaTitulo")} · {code}
            </h2>
            {resultado && <p className="text-xs text-tinta-3">{t("ConcordanciaTotal", { total })}</p>}
          </div>
          <button
            type="button"
            onClick={cerrarConcordancia}
            aria-label={t("Cerrar")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tinta-3 hover:bg-tinta/5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!estaDisponible() ? (
            <p className="py-6 text-center text-sm text-tinta-3">{t("ConcordanciaNecesitaApi")}</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-tinta-3">{t("ConcordanciaError")}</p>
          ) : resultado === null ? (
            <div className="flex flex-col gap-2 py-2" aria-hidden="true">
              {[95, 88, 92, 80, 90].map((ancho, i) => (
                <div key={i} className="h-3 animate-pulse rounded bg-superficie-2" style={{ width: `${ancho}%` }}></div>
              ))}
            </div>
          ) : resultado.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-tinta-3">{t("ConcordanciaVacio")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {resultado.data.map((item) => (
                <li key={`${item.bookId}-${item.chapter}-${item.verse}`}>
                  <button
                    type="button"
                    onClick={() => abrir(item)}
                    className="w-full rounded-lg border border-linea px-3 py-2 text-left transition-colors hover:border-acento hover:bg-acento-suave"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-acento">
                        {formatearReferencia({ bookId: item.bookId, capitulo: item.chapter, versiculo: item.verse }, t)}
                      </span>
                      {/* Solo se anuncia cuando el código sale más de una vez en
                          el mismo versículo; poner "×1" en todas sería ruido. */}
                      {item.hits > 1 && <span className="rounded bg-tinta/5 px-1 text-[10px] font-bold text-tinta-3">×{item.hits}</span>}
                    </span>
                    {item.text && <span className="mt-0.5 block line-clamp-2 text-sm text-tinta-2">{aTextoPlano(item.text)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalPaginas > 1 && (
          <footer className="flex items-center justify-between gap-2 border-t border-linea px-4 py-2">
            <button
              type="button"
              onClick={() => setPagina((previo) => Math.max(1, previo - 1))}
              disabled={pagina <= 1}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-tinta/5 disabled:opacity-40"
            >
              {t("BuscarAnterior")}
            </button>
            <span className="text-xs tabular-nums text-tinta-3">
              {pagina} / {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPagina((previo) => Math.min(totalPaginas, previo + 1))}
              disabled={pagina >= totalPaginas}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-tinta/5 disabled:opacity-40"
            >
              {t("BuscarSiguiente")}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default ConcordanciaStrong;
