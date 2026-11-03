import { useState, useEffect, useContext } from "react";
import GRIEGO from "../assets/strongs/IndexGreek.json";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";

var INITIAL_RESULTS = 10;
var INCREMENT = 30;

const TabGreek = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleResults, setVisibleResults] = useState(INITIAL_RESULTS);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(true);

  const { t } = useContext(LanguageContext);
  const { strongFun } = useContext(DataContext);

  const handleSearchTermChange = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    performSearch(term);
  };

  const performSearch = (term) => {
    setIsLoading(true);
    if (term === "") {
      setFilteredResults(GRIEGO.slice(0, visibleResults));
      setIsLoading(false);
    } else {
      setTimeout(() => {
        setFilteredResults([]);
        setIsLoading(true);

        const normalizedSearchTerm = term
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

        const results = GRIEGO.filter((item) => {
          const leNormalized = item.le
            ?.normalize("NFD")
            ?.replace(/[\u0300-\u036f]/g, "")
            ?.toLowerCase();
          const plNormalized = item.pl
            ?.normalize("NFD")
            ?.replace(/[\u0300-\u036f]/g, "")
            ?.toLowerCase();
          const idNormalized = item.id.toLowerCase();
          return (
            leNormalized?.includes(normalizedSearchTerm) ||
            plNormalized?.includes(normalizedSearchTerm) ||
            idNormalized?.includes(normalizedSearchTerm)
          );
        });

        setFilteredResults(results.slice(0, visibleResults));
        setIsLoading(false);
      }, 350);
    }
  };

  const handleLoadMore = () => {
    if (searchTerm === "") {
      setVisibleResults((prev) => prev + INCREMENT);
    } else {
      const results = GRIEGO.filter((item) => {
        const leNormalized = item.le
          ?.normalize("NFD")
          ?.replace(/[\u0300-\u036f]/g, "")
          ?.toLowerCase();
        const plNormalized = item.pl
          ?.normalize("NFD")
          ?.replace(/[\u0300-\u036f]/g, "")
          ?.toLowerCase();
        const idNormalized = item.id.toLowerCase();
        return (
          leNormalized?.includes(searchTerm) || plNormalized?.includes(searchTerm) || idNormalized?.includes(searchTerm)
        );
      });

      const startIndex = visibleResults;
      const endIndex = visibleResults + INCREMENT;
      setFilteredResults((prevResults) => [...prevResults, ...results.slice(startIndex, endIndex)]);
      setVisibleResults(endIndex);

      if (results.length <= endIndex) {
        setShowLoadMoreButton(false);
      }
    }
  };

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredResults(GRIEGO.slice(0, visibleResults));
    }
  }, [visibleResults, searchTerm]);

  useEffect(() => {
    if (searchTerm === "") {
      return;
    } else {
      setShowLoadMoreButton(true);
      setVisibleResults(INITIAL_RESULTS);
    }
  }, [searchTerm]);

  return (
    <>
      <div className="sticky top-[41px] z-20 -mx-4 mb-3 flex items-center justify-center border-b border-linea bg-superficie px-4 pb-3 pt-1 sm:-mx-5 sm:px-5">
        <div className="relative w-full max-w-sm">
          <input
            className="block w-full rounded-lg border border-linea-fuerte bg-superficie-2 p-3 text-sm text-tinta outline-none placeholder:text-tinta-3 focus:border-acento focus:ring-2 focus:ring-acento/20"
            type="text"
            value={searchTerm}
            onChange={handleSearchTermChange}
            placeholder={t("PlaceholderInputStrongGriego")}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="h-full min-h-full w-full flex flex-col justify-center items-center m-auto">
          <span className="h-full min-h-full   w-full">{t("Cargando")}</span>
        </div>
      ) : filteredResults.length > 0 ? (
        <>
          {filteredResults.map((result) => (
            <button
              type="button"
              className="my-1.5 flex w-full items-center gap-3 rounded-lg border border-linea bg-superficie px-3 py-2.5 text-left transition-colors hover:border-acento/40 hover:bg-acento-suave"
              key={result.id}
              onClick={() => strongFun(result.id)}
            >
              <span className="w-14 shrink-0 font-mono text-xs font-semibold text-acento">{result.id}</span>
              <span className="min-w-0 flex-1 truncate text-tinta">{result.pl}</span>
              <span className="w-20 shrink-0 truncate text-right text-sm text-tinta-3" title={result.le}>
                {result.le}
              </span>
            </button>
          ))}
          {filteredResults.length < INITIAL_RESULTS ? null : (
            <div className="flex justify-center m-auto mt-4">
              {showLoadMoreButton && (
                <button
                  className="rounded-lg bg-acento-solido px-6 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-acento-solido/90 disabled:opacity-60"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {t("CargarMas")}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div>{t("NoResultados")}</div>
      )}
    </>
  );
};

export default TabGreek;
