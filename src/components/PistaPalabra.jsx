import { useContext, useState } from "react";
import { Sparkles, X } from "lucide-react";
import LanguageContext from "../context/LanguageContext";

const CLAVE = "pistaPalabraOriginal";

/*
 * localStorage puede no existir o lanzar (ventana privada, datos bloqueados):
 * en ese caso la pista se enseña igual y simplemente no se recuerda el cierre.
 */
const yaSeCerro = () => {
  try {
    return localStorage.getItem(CLAVE) === "cerrada";
  } catch {
    return false;
  }
};

/**
 * Aviso de que las palabras del versículo seleccionado se pueden tocar.
 *
 * Sin él la función no existe para nadie: nada en el texto dice que una
 * palabra se puede tocar. Sale una vez, encima de los paneles, y al cerrarla
 * no vuelve.
 */
const PistaPalabra = () => {
  const { t } = useContext(LanguageContext);
  const [visible, setVisible] = useState(() => !yaSeCerro());

  if (!visible) return null;

  const cerrar = () => {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE, "cerrada");
    } catch {
      // Sin almacenamiento solo se pierde recordarlo.
    }
  };

  return (
    <div className="animate-fade-in mb-4 flex items-start gap-2.5 rounded-xl border border-acento/20 bg-acento-suave px-3.5 py-2.5 text-sm text-tinta">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-acento" strokeWidth={1.8} aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-snug">{t("PistaPalabraOriginal")}</p>
      <button
        type="button"
        onClick={cerrar}
        aria-label={t("Cerrar")}
        title={t("Cerrar")}
        className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-tinta-3 transition-colors hover:bg-tinta/5 hover:text-tinta"
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};

export default PistaPalabra;
