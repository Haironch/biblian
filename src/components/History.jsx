import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import DataContext from "../context/DataContext";
import { Eye, History as IconoHistorial, Trash2 } from "lucide-react";
import LanguageContext from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";

/*
 * Geometría de los chips de versículos. Los tres valores tienen que cuadrar
 * entre sí: el alto máximo se calcula a partir de ellos para que el recorte
 * caiga JUSTO en el borde de una fila y no parta un chip por la mitad.
 */
const ALTO_CHIP = 20;
const SEPARACION = 4;
const FILAS_VISIBLES = 1;
const ALTO_CONTRAIDO = ALTO_CHIP * FILAS_VISIBLES + SEPARACION * (FILAS_VISIBLES - 1);
/** Ya expandido tampoco crece sin freno: a partir de aquí el bloque hace scroll. */
const ALTO_EXPANDIDO = ALTO_CHIP * 5 + SEPARACION * 4;

/**
 * Chips de los versículos visitados de un capítulo.
 *
 * Un capítulo muy leído acumula decenas: sin tope, la fila del historial crecía
 * hasta desbordar la tarjeta entera. Se recorta a una sola fila y el resto queda
 * detrás de un botón.
 *
 * El "+N" se mide, no se estima: los chips ocultos siguen maquetados (recortar
 * con `max-height` no los saca del flujo), así que basta con mirar cuáles
 * quedaron por debajo de la segunda fila.
 */
const ChipsVersiculos = ({ versiculos, activo, onIr, tituloIr }) => {
  const { t } = useContext(LanguageContext);
  const [expandido, setExpandido] = useState(false);
  const [ocultos, setOcultos] = useState(0);
  const contenedor = useRef(null);

  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;

    const medir = () => {
      const hijos = Array.from(elemento.children);
      if (hijos.length === 0) return setOcultos(0);
      const base = hijos[0].offsetTop;
      setOcultos(hijos.filter((hijo) => hijo.offsetTop - base > ALTO_CONTRAIDO).length);
    };

    medir();
    // El ancho de la tarjeta cambia con la ventana y con ello cuántos chips
    // caben por fila, así que la cuenta se rehace sola.
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [versiculos]);

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium opacity-70">{t("VersiculosConsultados")}</span>
        {ocultos > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandido((v) => !v);
            }}
            aria-expanded={expandido}
            title={expandido ? t("ContraerTodo") : t("ExpandirTodo")}
            className="rounded px-1 text-[10px] font-bold opacity-60 transition hover:opacity-100"
          >
            {expandido ? "−" : `+${ocultos}`}
          </button>
        )}
      </div>
      <div
        ref={contenedor}
        style={{ maxHeight: expandido ? ALTO_EXPANDIDO : ALTO_CONTRAIDO, gap: SEPARACION }}
        className={`flex flex-wrap items-start ${expandido ? "no-scrollbar overflow-y-auto" : "overflow-hidden"}`}
      >
        {versiculos.map((v) => (
          <button
            key={v}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIr(v);
            }}
            title={`${tituloIr} ${v}`}
            style={{ height: ALTO_CHIP }}
            className={`inline-flex shrink-0 items-center rounded px-1.5 text-[10px] font-semibold tabular-nums transition active:scale-95 ${
              v === activo ? "bg-acento-solido text-white" : "bg-tinta/5 text-tinta-2 hover:bg-tinta/10"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
};

ChipsVersiculos.propTypes = {
  versiculos: PropTypes.array.isRequired,
  activo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onIr: PropTypes.func.isRequired,
  tituloIr: PropTypes.string,
};

const History = () => {
  const navigate = useNavigate();

  const {
    history,
    libros,
    eliminarElementoHistorial,
    setearHistorial,
    bibliasSeleccionadas,
    capituloSeleccionadoNumero,
    libroSeleccionado,
    versiculoSeleccionadoNumero,
  } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  const TipoTestamento = (libro) => {
    const tipo = libro.split("book")[1];
    if (tipo < 40) {
      return t("shortAntiguoTestamento");
    } else {
      return t("shortNuevoTestamento");
    }
  };

  const comprobarRuta = (ruta) => {
    // Las biblias son cadenas (nombre de carpeta), no objetos: el `biblia.id`
    // anterior siempre daba `undefined === undefined`, o sea "iguales" aunque
    // la selección hubiera cambiado.
    const mismasBiblias =
      bibliasSeleccionadas.length === (ruta.bibliasSeleccionadas?.length ?? 0) &&
      bibliasSeleccionadas.every((biblia, index) => biblia === ruta.bibliasSeleccionadas[index]);

    if (
      mismasBiblias &&
      capituloSeleccionadoNumero === ruta.capituloSeleccionadoNumero &&
      libroSeleccionado === ruta.libroSeleccionado &&
      versiculoSeleccionadoNumero === ruta.versiculoSeleccionadoNumero
    ) {
      navigate("/compare");
    } else {
      setearHistorial(ruta);
      navigate("/compare");
    }
  };

  /** "hace 5 min", "ayer"... a partir del sello de tiempo. */
  const cuandoFue = (marca) => {
    if (!marca) return "";
    const segundos = Math.max(0, Math.round((Date.now() - marca) / 1000));
    if (segundos < 60) return t("HaceUnMomento");
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return t("HaceMinutos", { n: minutos });
    const horas = Math.round(minutos / 60);
    if (horas < 24) return t("HaceHoras", { n: horas });
    const dias = Math.round(horas / 24);
    return t("HaceDias", { n: dias });
  };

  return (
    <article className="animate-fade-in mx-auto mt-6 flex h-[55vh] w-11/12 max-w-md flex-col overflow-hidden rounded-xl border border-linea bg-superficie">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-linea px-4">
        <IconoHistorial className="h-4 w-4 text-tinta-3" strokeWidth={1.8} aria-hidden="true" />
        <h1 className="text-sm font-semibold text-tinta">{t("UltimoVersiculoTitulo")}</h1>
      </header>
      {history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-balance">
          <p className="font-serif text-base italic text-tinta">{t("UltimoVersiculoTexto1")}</p>
          <p className="text-sm text-tinta-2">{t("UltimoVersiculoTexto2")}</p>
        </div>
      ) : (
        <ul id="contenidoTotal" className="no-scrollbar flex-1 divide-y divide-linea overflow-y-auto">
          {history.map((item) => {
            const tieneVariosVersiculos = Array.isArray(item.versiculos) && item.versiculos.length > 1;

            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3 text-tinta">
                {/* Testamento: AT / NT en una pastilla, en vez del círculo
                    gigante recortado por el borde que había antes. */}
                <span id="inicial" className="grid h-9 w-9 shrink-0 select-none place-items-center rounded-lg bg-acento-suave text-xs font-semibold uppercase text-acento">
                  {TipoTestamento(item.libroSeleccionado)}
                </span>
                <div id="texto" className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5">
                    <span className="text-sm font-medium">
                      {libros[item.libroSeleccionado]} {item.capituloSeleccionadoNumero}
                      {!tieneVariosVersiculos && `:${item.versiculoSeleccionadoNumero}`}
                    </span>
                    {item.visitadoEn > 0 && <span className="text-[11px] text-tinta-3">· {cuandoFue(item.visitadoEn)}</span>}
                  </div>

                  {/* Chips interactivos de versículos visitados en este capítulo */}
                  {tieneVariosVersiculos && (
                    <ChipsVersiculos
                      versiculos={item.versiculos}
                      activo={item.versiculoSeleccionadoNumero}
                      tituloIr={t("IrAlVersiculo")}
                      onIr={(v) => comprobarRuta({ ...item, versiculoSeleccionadoNumero: v })}
                    />
                  )}

                  <div id="biblias" className="mt-0.5 truncate text-[11px] text-tinta-3">
                    {item?.bibliasSeleccionadas.map((biblia, index) => (
                      <span key={index}>
                        {biblia.split(".")[1]}
                        {index !== item.bibliasSeleccionadas.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                </div>
                <div id="iconos" className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg text-tinta-2 transition-colors hover:bg-tinta/5 hover:text-acento"
                    onClick={() => comprobarRuta(item)}
                    title={t("IrAlVersiculo")}
                    aria-label={t("IrAlVersiculo")}
                  >
                    <Eye className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => eliminarElementoHistorial(item.id)}
                    title={t("NotasEliminar")}
                    aria-label={t("NotasEliminar")}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
};

export default History;
