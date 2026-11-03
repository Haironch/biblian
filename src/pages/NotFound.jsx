import { useContext } from "react";
import { Link } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import IndiceLibros from "../components/IndiceLibros";

/**
 * El 404.
 *
 * Era `<div>NotFound</div>`. Un callejón sin salida: quien llega aquí desde un
 * enlace roto o desde un resultado de búsqueda antiguo no tiene a dónde ir, y
 * el rastreador tampoco. Con el índice de libros la página deja de ser un
 * agujero y pasa a repartir el rastreo hacia el contenido que sí existe.
 *
 * El `<head>` lo pone `components/Seo`, que la marca `noindex, follow`: no
 * queremos la página en el índice, pero sí que se sigan sus enlaces.
 */
const NotFound = () => {
  const { t } = useContext(LanguageContext);

  return (
    <div className="min-h-[70vh] px-6 py-16 flex flex-col items-center">
      <p className="text-6xl font-bold opacity-30 mb-4">404</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-center">{t("NoEncontradaTitulo")}</h1>
      <p className="mt-3 max-w-[520px] text-center text-sm opacity-80 text-balance">{t("NoEncontradaTexto")}</p>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Link to="/" className="px-4 py-2 rounded-md bg-acento-solido hover:bg-acento-solido/90 text-white text-sm font-bold">
          {t("NoEncontradaVolver")}
        </Link>
        <Link to="/compare" className="px-4 py-2 rounded-md border border-linea-fuerte text-sm font-bold hover:bg-tinta/5">
          {t("NoEncontradaComparar")}
        </Link>
      </div>

      <div className="w-full max-w-[850px] opacity-90">
        <IndiceLibros variante="pagina" />
      </div>
    </div>
  );
};

export default NotFound;
