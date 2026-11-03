import { useState, useRef, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import HojaSelector from "./HojaSelector";
import { claseCelda } from "../utils/clasesUI";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";

const ListChapters = () => {
  const { modalChapters, setModalChapters, Chapters, setModalLibros, setModalVerses, setVersiculoSeleccionado, setCapituloSeleccionadoNumero } =
    useContext(DataContext);
  const [selectedChapter, setSelectedChapter] = useState("");
  const { t } = useContext(LanguageContext);
  const modalRef = useRef(null);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(modalChapters, () => setModalChapters(false));

  const closeModal = () => {
    setModalChapters(false);
    setModalLibros(true);
    setSelectedChapter("");
  };

  const selectChapter = (key) => {
    setSelectedChapter(key[0]);
    setVersiculoSeleccionado(key[1]);
    setCapituloSeleccionadoNumero(key[0]);
    setTimeout(() => {
      setModalVerses(true);
      setModalChapters(false);
      setModalLibros(false);
    }, 150);
  };

  return (
    <>
      {modalChapters && (
        <HojaSelector titulo={t("SeleccionarCapitulo")} onVolver={closeModal} etiquetaVolver={t("Regresar")} animacion="animate-fade-in-left animate-duration-150">
          <div ref={modalRef} className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
            {Object.entries(Chapters).map((key, index) => (
                <button key={key} type="button" onClick={() => selectChapter(key, index)} className={`${claseCelda(selectedChapter === key[0])} h-11 tabular-nums`}>
                  {key[0]}
                </button>
              ))}
          </div>
        </HojaSelector>
      )}
    </>
  );
};

export default ListChapters;
