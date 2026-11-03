import { useContext } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import { LIBROS, nombreDeLibro } from "../data/libros";
import { ULTIMO_LIBRO_AT, totalCapitulos } from "../data/canon";

/*
 * Dos variantes por compatibilidad con quien las pide (portada y 404). Antes
 * la portada pintaba el índice sobre una foto oscura y necesitaba su propia
 * paleta; con el fondo del tema ya sirve la misma para las dos.
 */
const PALETA = "border-linea bg-superficie text-tinta-2 hover:border-acento/40 hover:bg-acento-suave hover:text-acento";
const PALETAS = { hero: PALETA, pagina: PALETA };

/**
 * El índice de los 66 libros, con enlace real a cada uno.
 *
 * Antes de esto, la portada tenía exactamente un enlace interno —el botón
 * "Empezar"— y las 1189 páginas de capítulo solo eran alcanzables tocando
 * botones que cambian estado de React. Un rastreador no toca botones: sigue
 * `<a href>`. El resultado era un sitio de mil páginas del que se descubría
 * una.
 *
 * No es un añadido "para el buscador": es la tabla de contenidos que a un
 * lector le ahorra tres toques para llegar a Génesis.
 */
const IndiceLibros = ({ variante = "hero" }) => {
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const paleta = PALETAS[variante] ?? PALETAS.hero;

  const grupos = [
    { titulo: t("AntiguoTestamento"), libros: LIBROS.filter((libro) => libro.id <= ULTIMO_LIBRO_AT) },
    { titulo: t("NuevoTestamento"), libros: LIBROS.filter((libro) => libro.id > ULTIMO_LIBRO_AT) },
  ];

  return (
    <nav className="mb-4 mt-12 w-full" aria-labelledby="indice-titulo">
      <h2 id="indice-titulo" className="mb-4 text-base font-semibold text-tinta">
        {t("IndiceLibros")}
      </h2>

      {grupos.map(({ titulo, libros }) => (
        <div key={titulo} className="mb-6">
          <h3 className="mb-2 text-xs font-medium text-tinta-3">{titulo}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {libros.map((libro) => (
              <li key={libro.slug}>
                <Link
                  to={`/compare/${libro.slug}/1`}
                  title={`${nombreDeLibro(libro.id, idiomaNavegador)} — ${totalCapitulos(libro.id)} ${t("Capitulos")}`}
                  className={`inline-block rounded-md border px-2.5 py-1 text-xs transition-colors ${paleta}`}
                >
                  {nombreDeLibro(libro.id, idiomaNavegador)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

IndiceLibros.propTypes = {
  variante: PropTypes.oneOf(["hero", "pagina"]),
};

export default IndiceLibros;
