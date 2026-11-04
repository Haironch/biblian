import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import DataContext from "../../context/DataContext";
import LanguageContext from "../../context/LanguageContext";
import indexHebrew from "../../assets/strongs/IndexHebrew.json";
import indexGreek from "../../assets/strongs/IndexGreek.json";
import { interlinealDelVersiculo } from "../../utils/puenteStrong";
import { nombreCortoVersion } from "../../utils/exportar";

/**
 * Interlineal del versículo abierto: cada frase de la traducción con la
 * palabra hebrea o griega que traduce debajo.
 *
 * Es interlineal "inverso": manda el orden del español, no el del original.
 * Se lee de corrido como la Biblia de siempre y debajo de cada frase está lo
 * que dice el texto original. Para eso hacen falta los números Strong por
 * palabra, que traen las Reina Valera "con Strong": si la versión que se lee
 * no los tiene se usa una de esas, y se dice cuál.
 *
 * Tocar una palabra abre su ficha completa (definición, audio, dónde aparece).
 */

const porCodigo = new Map([...indexHebrew, ...indexGreek].map((item) => [item.id, item]));

const PanelInterlineal = ({ bookId, capitulo, versiculo }) => {
  const { t } = useContext(LanguageContext);
  const { versionTrabajo, abrirDefinicionStrong } = useContext(DataContext);
  const [resultado, setResultado] = useState(undefined);

  useEffect(() => {
    let cancelado = false;
    setResultado(undefined);
    interlinealDelVersiculo({ version: versionTrabajo, bookId, capitulo, versiculo })
      .then((datos) => !cancelado && setResultado(datos))
      .catch(() => !cancelado && setResultado(null));
    return () => {
      cancelado = true;
    };
  }, [versionTrabajo, bookId, capitulo, versiculo]);

  if (resultado === undefined) {
    return (
      <div className="flex flex-wrap gap-2" aria-hidden="true">
        {[64, 88, 52, 76, 60, 92, 70].map((ancho, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-superficie-2" style={{ width: ancho }} />
        ))}
      </div>
    );
  }

  if (!resultado || resultado.segmentos.length === 0) {
    return <p className="py-4 text-center text-sm text-tinta-3">{t("InterlinealSinDatos")}</p>;
  }

  const hebreo = bookId <= 39;

  return (
    <div>
      <ol className="flex flex-wrap items-start gap-x-1 gap-y-2">
        {resultado.segmentos.map(({ texto, codigos }, i) => (
          <li key={i} className="flex flex-col">
            <span className="px-1.5 text-[15px] leading-snug text-tinta">{texto || " "}</span>
            {codigos.length > 0 && (
              <span className="mt-1 flex gap-0.5">
                {codigos.map((codigo, j) => {
                  const entrada = porCodigo.get(codigo);
                  return (
                    <button
                      key={`${codigo}-${j}`}
                      type="button"
                      onClick={() => abrirDefinicionStrong(codigo)}
                      title={`${codigo} · ${t("InterlinealVerFicha")}`}
                      className="flex min-w-[2.75rem] flex-col items-start rounded-md border border-transparent bg-acento-suave/60 px-1.5 py-1 text-left transition-colors hover:border-acento/40 hover:bg-acento-suave"
                    >
                      <span className={`text-lg leading-tight text-tinta ${hebreo ? "font-medium" : ""}`}>
                        <bdi>{entrada?.le ?? "—"}</bdi>
                      </span>
                      <span className="text-[11px] italic leading-tight text-tinta-2">{entrada?.pl}</span>
                      <span className="font-mono text-[10px] leading-tight text-acento">{codigo}</span>
                    </button>
                  );
                })}
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs leading-relaxed text-tinta-3">
        {t("InterlinealNota", { version: nombreCortoVersion(resultado.version) })}{" "}
        <Link to="/dictionary" className="font-medium text-acento hover:underline">
          {t("Diccionario")}
        </Link>
      </p>
    </div>
  );
};

PanelInterlineal.propTypes = {
  bookId: PropTypes.number.isRequired,
  capitulo: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  versiculo: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default PanelInterlineal;
