import { useState, useRef, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import HojaSelector from "./HojaSelector";
import { claseCelda } from "../utils/clasesUI";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";

const ListSubBooks = () => {
  const { libros, setLibroSeleccionado, libroSeleccionado, modalLibros, setModalLibros, setModalChapters, modoCompacto, setModoCompacto } =
    useContext(DataContext);
  const [selectedBook, setSelectedBook] = useState(libroSeleccionado);
  const { t } = useContext(LanguageContext);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(modalLibros, () => setModalLibros(false));

  const modalRef = useRef(null);

  const closeModal = () => {
    setModalLibros(false);
    setSelectedBook("");
  };

  const selectBook = (key, index) => {
    setSelectedBook(key);
    setLibroSeleccionado(`book${index + 1}`);
    setTimeout(() => {
      setModalChapters(true);
      setModalLibros(false);
    }, 150);
  };

  // CHANGE SWITCH
  const handleModoCompacto = () => {
    setModoCompacto(!modoCompacto);
  };

  /*
   * Una sola rejilla para los dos modos. En compacto entran más columnas y se
   * enseña la abreviatura; en normal, el nombre entero, y los nombres largos
   * ocupan dos celdas para no partirse en tres renglones.
   */
  const testamento = (titulo, desde, hasta) => (
    <section className="mb-5">
      <h3 className="mb-2 text-xs font-medium text-tinta-3">{titulo}</h3>
      <div className={`grid gap-1.5 ${modoCompacto ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-3 sm:grid-cols-4"}`}>
        {Object.entries(libros).map(([key, value], index) =>
          index >= desde && index <= hasta ? (
            <button
              key={key}
              type="button"
              onClick={() => selectBook(key, index)}
              className={`${claseCelda(selectedBook === key)} ${modoCompacto ? "px-1 py-2 text-xs" : "px-2 py-2.5"} ${!modoCompacto && value.length > 13 ? "col-span-2" : ""}`}
            >
              {value}
            </button>
          ) : null,
        )}
      </div>
    </section>
  );

  return (
    <>
      {modalLibros && (
        <HojaSelector
          titulo={t("SeleccioneLibro")}
          onVolver={closeModal}
          etiquetaVolver={t("Cerrar")}
          cerrar
          animacion="animate-fade-in animate-duration-100"
          extra={
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-tinta-2">
              <input type="checkbox" checked={modoCompacto} onChange={handleModoCompacto} className="accent-[rgb(var(--acento-solido))]" />
              <span className="hidden sm:inline">{t("ModoCompacto")}</span>
            </label>
          }
        >
          <div ref={modalRef}>
            {testamento(t("AntiguoTestamento"), 0, 38)}
            {testamento(t("NuevoTestamento"), 39, 65)}
          </div>
        </HojaSelector>
      )}
    </>
  );
};

export default ListSubBooks;
