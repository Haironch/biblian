import PropTypes from "prop-types";
import { ChevronLeft, X } from "lucide-react";

/**
 * Hoja de los tres pasos para elegir pasaje: libro, capítulo y versículo.
 *
 * Eran tres modales copiados con el mismo marco, cada uno con su botón rojo de
 * "Regresar" abajo y una X blanca flotando fuera de la caja. Ahora comparten
 * marco y el control de volver vive arriba a la izquierda, donde la Mac y iOS
 * ponen el "atrás" de una hoja.
 *
 * En móvil sube desde abajo y ocupa casi toda la pantalla; en escritorio es una
 * ventana centrada.
 */
const HojaSelector = ({ titulo, onVolver, etiquetaVolver, cerrar = false, extra = null, animacion = "", children }) => (
  <div className={`fixed inset-0 z-[999999] flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4 ${animacion}`}>
    <div role="dialog" aria-modal="true" aria-label={titulo} className="flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-superficie shadow-2xl sm:h-[80vh] sm:max-w-xl sm:rounded-2xl">
      <header className="flex shrink-0 items-center gap-2 border-b border-linea px-3 py-2.5">
        <button
          type="button"
          onClick={onVolver}
          aria-label={etiquetaVolver}
          title={etiquetaVolver}
          className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-acento transition-colors hover:bg-acento-suave"
        >
          {cerrar ? <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" /> : <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />}
          {!cerrar && <span className="hidden sm:inline">{etiquetaVolver}</span>}
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-tinta">{titulo}</h2>
        {/* Contrapeso del botón de la izquierda para que el título quede
            centrado de verdad; si hay un control extra, ocupa este sitio. */}
        <div className="flex min-w-[2.25rem] justify-end sm:min-w-[6rem]">{extra}</div>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  </div>
);

HojaSelector.propTypes = {
  titulo: PropTypes.string.isRequired,
  onVolver: PropTypes.func.isRequired,
  etiquetaVolver: PropTypes.string.isRequired,
  cerrar: PropTypes.bool,
  extra: PropTypes.node,
  animacion: PropTypes.string,
  children: PropTypes.node,
};

export default HojaSelector;
