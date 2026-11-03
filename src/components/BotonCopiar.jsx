import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Check, Copy } from "lucide-react";
import LanguageContext from "../context/LanguageContext";
import { copiarTexto } from "../utils/exportar";

/**
 * Botón de icono que copia un texto al portapapeles.
 *
 * Recibe una función y no el texto: armar el texto de una definición (quitar
 * el marcado, juntar pronunciación y definición) solo vale la pena si de
 * verdad se pulsa.
 *
 * Confirma con una palomita durante dos segundos, y solo si `copiarTexto`
 * dice que copió: decir "copiado" sin haberlo hecho es peor que no decir nada.
 */
const BotonCopiar = ({ obtenerTexto, etiqueta, className = "" }) => {
  const { t } = useContext(LanguageContext);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return undefined;
    const id = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(id);
  }, [copiado]);

  const copiar = async (evento) => {
    evento.stopPropagation();
    if (await copiarTexto(obtenerTexto())) setCopiado(true);
  };

  const titulo = copiado ? t("Copiado") : etiqueta;
  const Icono = copiado ? Check : Copy;

  return (
    <button
      type="button"
      onClick={copiar}
      title={titulo}
      aria-label={titulo}
      className={`grid shrink-0 place-items-center rounded-lg transition-colors ${
        copiado ? "text-acento" : "text-tinta-3 hover:bg-tinta/5 hover:text-tinta"
      } ${className}`}
    >
      <Icono className="h-4 w-4" strokeWidth={copiado ? 2.4 : 1.8} aria-hidden="true" />
      <span className="sr-only" aria-live="polite">
        {copiado ? t("Copiado") : ""}
      </span>
    </button>
  );
};

BotonCopiar.propTypes = {
  obtenerTexto: PropTypes.func.isRequired,
  etiqueta: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default BotonCopiar;
