import { useContext, useState, useMemo } from "react";
import LanguageContext from "../context/LanguageContext";
import { BEBLIA_INFO, BIBLIAS_ATRIBUCION } from "../data/colaboradores";
import { CARACTERISTICAS_POR_BIBLIA, MAPA_CARACTERISTICAS } from "../data/biblias";
import IconoDato from "../components/IconoDato";
import PreguntasFrecuentes from "../components/PreguntasFrecuentes";
import { ArrowUpRight, Github, Sprout, TriangleAlert } from "lucide-react";
import { AUTOR, REPO_URL } from "../config/sitio";
import LOGO from "/bibleIcon.svg";

// El perfil del autor original: el repositorio cuelga de él.
const URL_AUTOR = REPO_URL.split("/").slice(0, 4).join("/");

const About = () => {
  const { t } = useContext(LanguageContext);
  const [busqueda, setBusqueda] = useState("");
  const [idiomaSeleccionado, setIdiomaSeleccionado] = useState("Todos");

  const idiomasDisponibles = useMemo(() => {
    return ["Todos", ...Object.keys(BIBLIAS_ATRIBUCION)];
  }, []);

  const totalVersiones = useMemo(() => {
    return Object.values(BIBLIAS_ATRIBUCION).reduce((acc, curr) => acc + curr.length, 0);
  }, []);

  const versionesFiltradas = useMemo(() => {
    const query = busqueda.toLowerCase().trim();
    const resultado = {};

    for (const [idioma, lista] of Object.entries(BIBLIAS_ATRIBUCION)) {
      if (idiomaSeleccionado !== "Todos" && idioma !== idiomaSeleccionado) continue;

      const filtradas = lista.filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.language.toLowerCase().includes(query) ||
          item.info.toLowerCase().includes(query)
        );
      });

      if (filtradas.length > 0) {
        resultado[idioma] = filtradas;
      }
    }

    return resultado;
  }, [busqueda, idiomaSeleccionado]);

  const enlaceExterno = "inline-flex items-center gap-1 font-medium text-acento hover:underline";

  return (
    <div className="w-full overflow-hidden pb-16">
      <article className="animate-fade-in m-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header>
          <img src={LOGO} alt="" className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-semibold text-tinta sm:text-3xl">{t("SobreProyecto")}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-tinta-2">{t("InfoSobreProyecto")}</p>
        </header>

        {/*
          El crédito va arriba y con nombre propio: la idea y la primera versión
          son de otra persona, y esta página es donde se dice. Esta versión es
          una continuación, no una obra aparte.
        */}
        <section className="mt-8 rounded-xl border border-linea bg-superficie p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-tinta">
            <Sprout className="h-4 w-4 text-acento" strokeWidth={1.8} aria-hidden="true" />
            {t("OrigenTitulo")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">
            {t("OrigenParte1")}{" "}
            <a href={URL_AUTOR} target="_blank" rel="noreferrer" className={enlaceExterno}>
              {AUTOR}
            </a>
            {t("OrigenParte2")}{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={enlaceExterno}>
              Multi Bible Compare
            </a>
            .
          </p>
          <p className="mt-3 text-sm leading-relaxed text-tinta-2">{t("OrigenParte3")}</p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-linea px-3.5 text-sm font-medium text-tinta transition-colors hover:border-linea-fuerte hover:bg-superficie-2"
          >
            <Github className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {t("VerRepositorioOriginal")}
            <ArrowUpRight className="h-3.5 w-3.5 text-tinta-3" strokeWidth={2} aria-hidden="true" />
          </a>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-tinta">{t("TextosTitulo")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">{t("InfoSobreProyectoTres")}</p>
          <p className="mt-2 text-sm leading-relaxed text-tinta-2">{t("MasInfoSobreProyeto")}</p>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-linea bg-superficie-2/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-tinta">{BEBLIA_INFO.nombre}</h3>
              <p className="mt-1 text-xs leading-relaxed text-tinta-2">{BEBLIA_INFO.descripcion}</p>
            </div>
            <a href={BEBLIA_INFO.url} target="_blank" rel="noreferrer" className={`${enlaceExterno} shrink-0 text-sm`}>
              {t("RepositorioBeblia")}
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </a>
          </div>

          {/*
            Fuentes de los datos de estudio. Las dos licencias (CC-BY y
            CC-BY-SA) piden crédito visible a cambio de poder usarlos gratis.
          */}
          <div className="mt-4 rounded-xl border border-linea p-4">
            <h3 className="text-sm font-semibold text-tinta">{t("FuentesEstudioTitulo")}</h3>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-tinta-2">
              <li>
                {t("FuenteReferencias")}{" "}
                <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noreferrer" className={enlaceExterno}>
                  openbible.info
                </a>{" "}
                (
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className={enlaceExterno}>
                  CC BY
                </a>
                ).
              </li>
              <li>
                {t("FuenteStrongIngles")}{" "}
                <a href="https://github.com/openscriptures/strongs" target="_blank" rel="noreferrer" className={enlaceExterno}>
                  Open Scriptures
                </a>{" "}
                (
                <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer" className={enlaceExterno}>
                  CC BY-SA
                </a>
                ).
              </li>
              <li>{t("FuenteConcordancia")}</li>
            </ul>
          </div>

          {/* Aviso de derechos */}
          <div className="mt-4 rounded-xl border border-acento/30 bg-acento-solido/10 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <TriangleAlert className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Disclaimer
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-tinta-2">{t("DisclaimerBiblia")}</p>
          </div>
        </section>

        {/* Sección de Versiones Bíblicas */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-linea pb-3">
            <div>
              <h2 className="text-2xl font-bold">{t("Colaboradores")}</h2>
              <p className="text-xs text-tinta-3">
                {t("VersionesRegistradasDesc", { count: totalVersiones })}
              </p>
            </div>

            {/* Buscador de versiones */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder={t("BuscarVersionPlaceholder")}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full text-xs px-3 py-2 pl-8 rounded-lg bg-superficie-2 border border-linea-fuerte focus:outline-none focus:ring-2 focus:ring-acento/30"
              />
              <svg
                className="w-4 h-4 absolute left-2.5 top-2.5 text-tinta-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Filtro por idioma */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {idiomasDisponibles.map((idioma) => (
              <button
                key={idioma}
                onClick={() => setIdiomaSeleccionado(idioma)}
                className={`text-xs px-3 py-1 rounded-full transition font-medium ${
                  idiomaSeleccionado === idioma
                    ? "bg-acento-solido text-white shadow-sm"
                    : "bg-superficie-2 text-tinta-2 hover:bg-tinta/10"
                }`}
              >
                {idioma === "Todos" ? t("TodosLosIdiomas") : idioma}
              </button>
            ))}
          </div>

          {/* Lista de Versiones Agrupadas */}
          <div className="mt-6 space-y-6">
            {Object.keys(versionesFiltradas).length === 0 ? (
              <p className="text-center py-8 text-sm text-tinta-3">
                {t("NoVersionesEncontradas")}
              </p>
            ) : (
              Object.entries(versionesFiltradas).map(([idioma, lista]) => (
                <div key={idioma} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-tinta">
                      {idioma}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-superficie-2 text-tinta-2">
                      {lista.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lista.map((item) => {
                      const feats = CARACTERISTICAS_POR_BIBLIA[item.rawDir] || [];

                      return (
                        <div
                          key={item.rawDir}
                          className="p-3.5 rounded-xl bg-superficie border border-linea shadow-xs hover:border-linea-fuerte transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-sm text-tinta leading-snug">
                                {item.title}
                              </h4>
                              {item.tipo && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                    item.tipo.includes("Dominio Público") || item.tipo.includes("Public Domain")
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : "bg-acento-suave text-acento"
                                  }`}
                                >
                                  {item.tipo}
                                </span>
                              )}
                            </div>
                            {item.editorial && (
                              <p className="text-[11px] font-medium text-tinta-3">
                                {item.editorial}
                              </p>
                            )}
                            <p className="text-xs text-tinta-2 mt-1.5 leading-relaxed">
                              {item.info}
                            </p>

                            {feats.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-2">
                                {feats.map((featKey) => {
                                  const info = MAPA_CARACTERISTICAS[featKey];
                                  if (!info) return null;
                                  return (
                                    <span
                                      key={featKey}
                                      title={t(`Feat_${featKey}_desc`)}
                                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-medium ${info.clase}`}
                                    >
                                      <IconoDato nombre={info.icono} className="h-2.5 w-2.5" />
                                      <span>{t(`Feat_${featKey}`)}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {item.link && (
                            <div className="mt-2 pt-2 border-t border-linea">
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[11px] text-acento hover:underline"
                              >
                                {t("VerFuenteLicencia")}
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* El <head> de esta ruta declara un FAQPage con estas mismas
            preguntas; Google exige que lo marcado esté visible. */}
        <PreguntasFrecuentes />
      </article>
    </div>
  );
};

export default About;
