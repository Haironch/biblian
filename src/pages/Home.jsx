import { useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, BookOpen, Globe, Info, Search } from "lucide-react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import IndiceLibros from "../components/IndiceLibros";
import LOGO from "/bibleIcon.svg";

/**
 * Los cuatro destinos que no cuelgan del flujo de lectura.
 *
 * Están aquí y no solo en el menú porque el menú es un botón: quien llega a la
 * portada desde un buscador —y el propio rastreador— no lo abre. Un enlace en
 * el cuerpo de la página es lo que hace que `/search`, `/3d` y `/atlas` sean
 * alcanzables sin saber que existen.
 */
const DESTINOS = [
  { ruta: "/search", titulo: "EnlaceBuscar", detalle: "EnlaceBuscarDesc", Icono: Search },
  { ruta: "/3d", titulo: "Enlace3D", detalle: "Enlace3DDesc", Icono: BookOpen },
  { ruta: "/atlas", titulo: "EnlaceAtlas", detalle: "EnlaceAtlasDesc", Icono: Globe },
  { ruta: "/about", titulo: "EnlaceAcerca", detalle: "EnlaceAcercaDesc", Icono: Info },
];

/*
 * La muestra de la portada: Juan 3:16 en tres versiones, tal como lo enseña la
 * pantalla de comparar. Reemplaza a la foto de fondo, que era bonita pero no
 * decía qué hace la app; esto lo dice sin leer una palabra.
 *
 * El texto va escrito aquí y no se pide al backend: la portada se prerenderiza
 * para los buscadores y tiene que verse completa sin red. Es el texto exacto de
 * la base para cada versión. Los códigos son los de la URL (`?v=`).
 */
const MUESTRA = [
  { codigo: "75", etiqueta: "RVR 1960", texto: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna." },
  { codigo: "069", etiqueta: "NVI 2015", texto: "»Porque tanto amó Dios al mundo que dio a su Hijo unigénito, para que todo el que cree en él no se pierda, sino que tenga vida eterna." },
  { codigo: "09", etiqueta: "KJV 1611", texto: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
];

const ENLACE_MUESTRA = `/compare/jua/3/16?v=${MUESTRA.map(({ codigo }) => codigo).join(",")}`;

const Home = () => {
  const { paginaInicio } = useContext(DataContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (paginaInicio === "/compare") {
      navigate("/compare");
    }
  }, [paginaInicio, navigate]);

  return (
    <div className="animate-fade-in mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-8 sm:pt-14">
      {/*
        El <h1> lleva el nombre de la marca y, debajo, un <h2> dice de qué va
        la página con las palabras que alguien escribiría para buscarla. Antes
        el único encabezado era "Biblian": un nombre inventado no le dice a
        nadie —ni a un buscador— que esto sirve para leer y comparar biblias.
      */}
      <header className="max-w-2xl">
        {/* En móvil la cabecera ya enseña logo y nombre: aquí se queda solo
            para lectores de pantalla y buscadores, que necesitan el <h1>. */}
        <h1 className="sr-only text-[15px] font-semibold text-tinta md:not-sr-only md:flex md:items-center md:gap-2.5">
          <img src={LOGO} alt="" className="h-8 w-8" />
          Biblian
        </h1>
        <h2 className="text-3xl md:mt-5 font-semibold leading-tight tracking-tight text-tinta sm:text-[2.6rem]">{t("SEO_TituloHome")}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-tinta-2 sm:text-base">{t("SEO_SubtituloHome")}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/compare"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-acento-solido px-4 text-sm font-medium text-white transition-colors hover:bg-acento-solido/90"
          >
            {t("Empezar")}
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
          <Link
            to="/search"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-linea bg-superficie px-4 text-sm font-medium text-tinta transition-colors hover:border-linea-fuerte hover:bg-superficie-2"
          >
            <Search className="h-4 w-4 text-tinta-3" strokeWidth={1.8} aria-hidden="true" />
            {t("EnlaceBuscar")}
          </Link>
        </div>
      </header>

      {/* Muestra: toda la tarjeta lleva a ese pasaje con esas versiones. */}
      <section className="mt-10" aria-labelledby="muestra-titulo">
        <Link to={ENLACE_MUESTRA} className="group block rounded-2xl border border-linea bg-superficie-2/50 p-3 transition-colors hover:border-acento/40 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h3 id="muestra-titulo" className="text-sm font-semibold text-tinta">
              {t("MuestraTitulo")}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-acento">
              <span className="hidden sm:inline">{t("MuestraAbrir")}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {MUESTRA.map(({ codigo, etiqueta, texto }) => (
              <article key={codigo} className="rounded-xl border border-linea bg-superficie p-3.5">
                <p className="text-[11px] font-medium text-tinta-3">{etiqueta}</p>
                <p className="mt-1.5 font-serif text-[15px] leading-relaxed text-tinta">
                  <span className="mr-1.5 font-sans text-[11px] font-semibold text-acento">16</span>
                  {texto}
                </p>
              </article>
            ))}
          </div>
        </Link>
      </section>

      <section className="mt-12" aria-labelledby="destinos-titulo">
        <h2 id="destinos-titulo" className="mb-3 text-base font-semibold text-tinta">
          {t("ExploraTambien")}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DESTINOS.map(({ ruta, titulo, detalle, Icono }) => (
            <li key={ruta}>
              <Link to={ruta} className="flex h-full items-start gap-3 rounded-xl border border-linea bg-superficie px-4 py-3 transition-colors hover:border-linea-fuerte hover:bg-superficie-2">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-acento-suave text-acento">
                  <Icono className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-tinta">{t(titulo)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-tinta-2">{t(detalle)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <IndiceLibros />
    </div>
  );
};

export default Home;
