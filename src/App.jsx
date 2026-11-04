import { lazy, Suspense, useContext, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import About from "./pages/About";
import Compare from "./pages/Compare";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Home from "./pages/Home";
import HistoryPage from "./pages/HistoryPage";
import Search from "./pages/Search";
import Account from "./pages/Account";
import Notes from "./pages/Notes";
import Dictionary from "./pages/Dictionary";
import { useSync } from "./hooks/useSync";
import FloatingBubble from "./components/FloatingBubble";
import StrongPopup from "./components/StrongPopup";
import StrongSingle from "./components/StrongSingle";
import DataContext from "./context/DataContext";
import ShareModal from "./components/ShareModal";
import PaletaComandos from "./components/PaletaComandos";
import ConcordanciaStrong from "./components/ConcordanciaStrong";
import { preheat } from "./services/bibleSource";
import { useMemoriaScroll } from "./hooks/useMemoriaScroll";
import Seo from "./components/Seo";

/*
 * El lector 3D se carga aparte. Arrastra `react-pageflip` y su propia hoja de
 * estilos, y es una pantalla a la que no entra quien solo viene a comparar
 * versiones: metida en el bundle principal, todos pagarían su descarga.
 */
const Bible3D = lazy(() => import("./pages/Bible3D"));

/*
 * El atlas también se carga aparte. Arrastra el catálogo de lugares y la
 * cronología —datos que solo esa pantalla usa— y quien entra a comparar dos
 * versiones no tiene por qué descargarlos.
 */
const Atlas = lazy(() => import("./pages/Atlas"));

/**
 * El hook necesita `useLocation`, que solo existe dentro del router, y `App` es
 * quien lo monta. Este componente vacío es la forma de meterlo dentro sin
 * partir `App` en dos.
 */
const MemoriaScroll = () => {
  useMemoriaScroll();
  return null;
};

const App = () => {
  const { setCompartir, compartir, modalStrong, fichaSuelta } = useContext(DataContext);

  const modalRef = useRef(null);

  // Se despierta el backend en cuanto abre la app, no cuando el usuario ya
  // quiere leer.
  useEffect(() => {
    preheat();
  }, []);

  // Si hay sesión, fusiona favoritos e historial con los del servidor.
  useSync();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setCompartir(false);
      }
    };

    if (compartir) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [compartir, setCompartir]);

  return (
    <>
      <ShareModal />
      <StrongPopup />
      {/* La definición pedida desde el globito, sin el diccionario detrás. */}
      {modalStrong && fichaSuelta && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <StrongSingle />
        </div>
      )}
      <BrowserRouter>
        {/*
          Todo se aparta de la lateral (escritorio) y de las pestañas (móvil)
          con las mismas variables que usan los elementos `fixed`.
        */}
        <div className="min-h-screen pb-pestanas pl-lateral">
        {/* Reescribe el <head> en cada navegacion: la SPA no vuelve a pedir el
            documento y sin esto todas las rutas comparten los metadatos de la
            pagina por la que se entro. */}
        <Seo />
        <Navbar />
        {/* Recuerda la altura de cada pasaje para el botón "atrás". */}
        <MemoriaScroll />
        {/* Dentro del router: sus opciones navegan. */}
        <PaletaComandos />
        {/* Igual: cada aparición es un enlace al pasaje. */}
        <ConcordanciaStrong />
        <FloatingBubble />
        <Routes>
          <Route path="/" element={<Home />} />
          {/*
            Las cuatro formas de la misma pantalla. Se declaran una por una en
            vez de usar segmentos opcionales para que la ruta siga siendo
            legible y para que `/compare` a secas no dependa de cómo resuelva
            el router los parámetros ausentes.
          */}
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare/:libro" element={<Compare />} />
          <Route path="/compare/:libro/:capitulo" element={<Compare />} />
          <Route path="/compare/:libro/:capitulo/:versiculo" element={<Compare />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/search" element={<Search />} />
          <Route
            path="/3d"
            element={
              <Suspense fallback={null}>
                <Bible3D />
              </Suspense>
            }
          />
          <Route path="/notes" element={<Notes />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/dictionary/:codigo" element={<Dictionary />} />
          <Route
            path="/atlas"
            element={
              <Suspense fallback={null}>
                <Atlas />
              </Suspense>
            }
          />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </BrowserRouter>
    </>
  );
};

export default App;
