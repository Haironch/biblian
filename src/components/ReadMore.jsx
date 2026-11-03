import { useContext } from "react";
import { Library } from "lucide-react";
import LanguageContext from "../context/LanguageContext";
import PropTypes from "prop-types";

/**
 * Abre el selector de versiones.
 *
 * Botón de barra de herramientas y no un llamado gigante: se usa a cada rato
 * mientras se compara, así que tiene que estar a mano sin robarle sitio al
 * texto.
 */
const ReadMore = ({ openModal }) => {
  const { t } = useContext(LanguageContext);

  return (
    <button
      type="button"
      onClick={openModal}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-linea bg-superficie px-3.5 text-sm font-medium text-tinta transition-colors hover:border-linea-fuerte hover:bg-superficie-2"
    >
      <Library className="h-4 w-4 text-acento" strokeWidth={1.8} aria-hidden="true" />
      {t("SeleccionarBiblias")}
    </button>
  );
};

export default ReadMore;

ReadMore.propTypes = {
  openModal: PropTypes.func,
};
