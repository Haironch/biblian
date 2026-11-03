import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";

/**
 * Ajustes de marcado, colgados del propio cuadro de cada versión.
 *
 * Va por panel y no una sola global porque cada versión se lee distinto: se
 * puede querer la morfología en la interlineal griega y no en la española de al
 * lado. Cada cuadro decide lo suyo y la preferencia se recuerda por biblia.
 *
 * Solo se monta si ESE texto trae el marcado; un panel sin glosa no enseña el
 * botón.
 *
 * Antes era una pestaña absoluta pegada al borde superior del cuadro
 * (`-top-3`), que se salía de la tarjeta y obligaba a dejarla sin recorte.
 * Ahora es un botón más del encabezado, con el mismo tamaño que compartir y
 * traducir.
 */
const MarkupTab = ({ biblia, tieneMorfologia, tieneGlosa }) => {
  const { t } = useContext(LanguageContext);
  const { leerMarcado, alternarMarcado } = useContext(DataContext);
  const [abierta, setAbierta] = useState(false);
  const contenedor = useRef(null);

  // Cerrar al tocar fuera: son varios paneles en pantalla y dejarlas todas
  // abiertas tapa el texto.
  useEffect(() => {
    if (!abierta) return;
    const alTocarFuera = (evento) => {
      if (contenedor.current && !contenedor.current.contains(evento.target)) setAbierta(false);
    };
    document.addEventListener("mousedown", alTocarFuera);
    return () => document.removeEventListener("mousedown", alTocarFuera);
  }, [abierta]);

  if (!tieneMorfologia && !tieneGlosa) return null;

  const estado = leerMarcado(biblia);

  const chip = (activo) =>
    `w-full rounded px-2 py-1 text-left text-[11px] font-medium transition-colors ${
      activo ? "bg-acento-solido text-tinta" : "bg-superficie-2 text-tinta-2"
    }`;

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-label={t("MostrarEnElTexto")}
        title={t("MostrarEnElTexto")}
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
          abierta ? "bg-tinta/10" : "hover:bg-tinta/5"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] text-tinta-2" aria-hidden="true">
          <path d="M11.25 3a.75.75 0 0 1 1.5 0v1.06a7.5 7.5 0 0 1 2.02.84l.75-.75a.75.75 0 1 1 1.06 1.06l-.75.75c.37.62.66 1.3.84 2.02H18a.75.75 0 0 1 0 1.5h-1.06a7.5 7.5 0 0 1-.84 2.02l.75.75a.75.75 0 1 1-1.06 1.06l-.75-.75a7.5 7.5 0 0 1-2.02.84V15a.75.75 0 0 1-1.5 0v-1.06a7.5 7.5 0 0 1-2.02-.84l-.75.75a.75.75 0 0 1-1.06-1.06l.75-.75a7.5 7.5 0 0 1-.84-2.02H6a.75.75 0 0 1 0-1.5h1.06c.18-.72.47-1.4.84-2.02l-.75-.75a.75.75 0 0 1 1.06-1.06l.75.75a7.5 7.5 0 0 1 2.02-.84V3Z" />
        </svg>
      </button>

      {abierta && (
        <div className="absolute right-0 top-full z-30 mt-1 flex w-32 flex-col gap-1 rounded-lg border border-linea bg-superficie p-2 shadow-lg">
          {tieneGlosa && (
            <button type="button" onClick={() => alternarMarcado(biblia, "glosa")} aria-pressed={estado.glosa} className={chip(estado.glosa)}>
              {t("Glosa")}
            </button>
          )}
          {tieneMorfologia && (
            <button type="button" onClick={() => alternarMarcado(biblia, "morfologia")} aria-pressed={estado.morfologia} className={chip(estado.morfologia)}>
              {t("Morfologia")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

MarkupTab.propTypes = {
  biblia: PropTypes.string.isRequired,
  tieneMorfologia: PropTypes.bool,
  tieneGlosa: PropTypes.bool,
};

export default MarkupTab;
