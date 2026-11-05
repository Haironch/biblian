import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Check, Copy, X } from "lucide-react";
import DataContext from "../../context/DataContext";
import LanguageContext from "../../context/LanguageContext";
import { formatearReferencia } from "../../utils/referencia";
import { citaDeVersiculos, copiarTexto, nombreCortoVersion, rangosDeVersiculos } from "../../utils/exportar";

/**
 * Píldora flotante para copiar los versículos marcados.
 *
 * Aparece al tocar un versículo y va sumando los que se tocan después
 * ("Juan 3:1, 4"). Copia el texto de la columna donde se tocó por última vez,
 * y lo dice, porque con varias versiones abiertas no es obvio cuál sale.
 *
 * Se pinta encima de la barra de estudio, pegada a ella: es la acción más
 * frecuente con un versículo y tiene que estar a un toque, sin abrir panel.
 */
const BarraCopiar = ({ bookId }) => {
  const { t } = useContext(LanguageContext);
  const { versiculosMarcados, versionMarcada, versionTrabajo, textosPorBiblia, capituloSeleccionadoNumero, limpiarMarcados } = useContext(DataContext);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return undefined;
    const id = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(id);
  }, [copiado]);

  // Cambiar lo marcado después de copiar es otra copia: la palomita de la
  // anterior no debe seguir diciendo "copiado".
  useEffect(() => setCopiado(false), [versiculosMarcados]);

  if (versiculosMarcados.length === 0) return null;

  // La columna tocada, si sigue abierta y cargada; si no, la de trabajo.
  const version = versionMarcada && textosPorBiblia[versionMarcada] ? versionMarcada : versionTrabajo;
  const capitulo = Number(capituloSeleccionadoNumero);
  const referencia = `${formatearReferencia({ bookId, capitulo }, t)}:${rangosDeVersiculos(versiculosMarcados)}`;

  const copiar = async () => {
    const texto = citaDeVersiculos({ capituloTexto: textosPorBiblia[version], numeros: versiculosMarcados, bookId, capitulo, version, t });
    if (texto && (await copiarTexto(texto))) setCopiado(true);
  };

  return (
    <div className="pointer-events-none mb-2 flex justify-center px-3">
      <div
        role="toolbar"
        aria-label={t("CopiarVersiculos")}
        className="animate-slide-in-bottom pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-linea bg-superficie py-1 pl-4 pr-1 shadow-lg"
      >
        <div className="min-w-0 pr-1">
          <p className="truncate text-sm font-semibold text-tinta">{referencia}</p>
          {version && <p className="truncate text-[11px] leading-tight text-tinta-3">{nombreCortoVersion(version)}</p>}
        </div>
        <button
          type="button"
          onClick={copiar}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
            copiado ? "bg-acento-suave text-acento" : "bg-acento-solido text-white hover:bg-acento-solido/90"
          }`}
        >
          {copiado ? <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : <Copy className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
          {copiado ? t("Copiado") : t("Copiar")}
        </button>
        <button
          type="button"
          onClick={limpiarMarcados}
          title={t("QuitarSeleccion")}
          aria-label={t("QuitarSeleccion")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-tinta-3 transition-colors hover:bg-tinta/5 hover:text-tinta"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

BarraCopiar.propTypes = { bookId: PropTypes.number.isRequired };

export default BarraCopiar;
