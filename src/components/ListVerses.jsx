import { useState, useRef, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import HojaSelector from "./HojaSelector";
import { claseCelda } from "../utils/clasesUI";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";

const ListVerses = () => {
  const { modalVerses, setModalVerses, setModalLibros, setModalChapters, versiculoSeleccionado, setVersiculoSeleccionadoNumero } = useContext(DataContext);
  const [selectedVerse, setSelectedVerse] = useState("");
  const { t } = useContext(LanguageContext);
  const modalRef = useRef(null);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(modalVerses, () => setModalVerses(false));

  const closeModal = () => {
    setModalVerses(false);
    setModalLibros(false);
    setModalChapters(true);
    setSelectedVerse("");
  };

  const selectChapter = (key) => {
    setSelectedVerse(key);
    setVersiculoSeleccionadoNumero(key);
    setTimeout(() => {
      setModalVerses(false);
      setModalChapters(false);
      setModalLibros(false);
    }, 150);
  };

  return (
    <>
      {modalVerses && (
        <HojaSelector titulo={t("SeleccioneElVersiculo")} onVolver={closeModal} etiquetaVolver={t("Regresar")} animacion="animate-fade-in-right animate-duration-150">
          <div ref={modalRef} className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
            {versiculoSeleccionado.length > 0 &&
                versiculoSeleccionado.map((key) => (
                  <button key={key} type="button" onClick={() => selectChapter(key)} className={`${claseCelda(selectedVerse === key)} h-11 tabular-nums`}>
                    {key}
                  </button>
                ))}
          </div>
        </HojaSelector>
      )}
    </>
  );
};

export default ListVerses;
