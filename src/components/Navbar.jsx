import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { BookA, BookOpen, ChevronLeft, ChevronRight, Columns2, Globe, History, House, Info, Languages, Moon, NotebookPen, Search, Settings, Sun, UserRound, Ellipsis } from "lucide-react";
import LOGO from "/bibleIcon.svg";
import LanguageContext from "../context/LanguageContext";
import ThemeContext from "../context/ThemeContext";
import DataContext from "../context/DataContext";

/*
 * Navegación en dos formas:
 *
 * - Escritorio (md+): lateral fija a la izquierda, como las apps de la Mac.
 *   Todas las pantallas a la vista y, abajo, idioma y tema.
 * - Móvil: cabecera mínima arriba y pestañas abajo, al alcance del pulgar.
 *   Solo caben cinco, así que lo menos frecuente vive en "Más".
 *
 * Lo que ocupan una y otra está en `--ancho-lateral` y `--alto-pestanas`
 * (index.css): el contenido y los elementos `fixed` se apartan con eso.
 */

const RUTAS_LECTURA = [
  { to: "/", clave: "Inicio", Icono: House },
  { to: "/compare", clave: "Comparar", Icono: Columns2 },
  { to: "/search", clave: "Buscar", Icono: Search },
  { to: "/history", clave: "Historial", Icono: History, requiereVersiculo: true },
];

const RUTAS_ESTUDIO = [
  { to: "/notes", clave: "NotasTitulo", Icono: NotebookPen },
  { to: "/dictionary", clave: "Diccionario", Icono: BookA },
  { to: "/atlas", clave: "AtlasTitulo", Icono: Globe },
  { to: "/3d", clave: "Biblia3D", Icono: BookOpen },
];

const RUTAS_CUENTA = [
  { to: "/account", clave: "Cuenta", Icono: UserRound },
  { to: "/settings", clave: "Ajustes", Icono: Settings },
  { to: "/about", clave: "Informacion", Icono: Info },
];

// Las cuatro de la barra inferior en móvil. Notas entra y Historial no: Notas es
// algo que escribiste tú, Historial se alcanza igual desde Comparar.
const PESTANAS_MOVIL = ["/", "/compare", "/search", "/notes"];

const esActiva = (pathname, to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

/** Un renglón de la lateral. El activo lleva el fondo del acento, como Finder. */
const EnlaceLateral = ({ to, etiqueta, Icono, activo }) => (
  <Link
    to={to}
    aria-current={activo ? "page" : undefined}
    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
      activo ? "bg-acento-suave font-medium text-acento" : "text-tinta-2 hover:bg-tinta/5 hover:text-tinta"
    }`}
  >
    <Icono className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
    <span className="truncate">{etiqueta}</span>
  </Link>
);

EnlaceLateral.propTypes = {
  to: PropTypes.string.isRequired,
  etiqueta: PropTypes.string.isRequired,
  Icono: PropTypes.elementType.isRequired,
  activo: PropTypes.bool,
};

/** Idioma y tema. Los mismos dos botones en la lateral y en la cabecera móvil. */
const ControlesTema = ({ compacto = false }) => {
  const { t, cambiarIdioma, idiomaNavegador } = useContext(LanguageContext);
  const { theme, changeTheme } = useContext(ThemeContext);
  const etiquetaTema = theme === "light" ? t("CambiarTemaOscuro") : t("CambiarTemaClaro");
  const IconoTema = theme === "light" ? Moon : Sun;
  const boton = "grid h-8 place-items-center rounded-lg text-tinta-2 transition-colors hover:bg-tinta/5 hover:text-tinta";

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={cambiarIdioma} title={t("CambiarIdioma")} aria-label={t("CambiarIdioma")} className={`${boton} ${compacto ? "w-8" : "gap-1.5 px-2 grid-flow-col"}`}>
        <Languages className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        {!compacto && <span className="text-xs font-medium">{idiomaNavegador === "es" ? "English" : "Español"}</span>}
      </button>
      <button type="button" onClick={changeTheme} title={etiquetaTema} aria-label={etiquetaTema} className={`${boton} w-8`}>
        <IconoTema className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
};

ControlesTema.propTypes = { compacto: PropTypes.bool };

/**
 * Flecha de salto de capítulo en los extremos de la barra del pasaje.
 *
 * Deshabilitada en vez de oculta cuando no hay capítulo al que ir: si
 * desapareciera, la referencia del centro se correría de sitio al llegar al
 * primer o último capítulo del libro.
 */
const BotonCapitulo = ({ onClick, disponible, etiqueta, hacia }) => {
  const Flecha = hacia === "atras" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!disponible}
      title={etiqueta}
      aria-label={etiqueta}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tinta-2 transition-colors hover:bg-tinta/5 hover:text-tinta disabled:pointer-events-none disabled:opacity-30"
    >
      <Flecha className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
};

BotonCapitulo.propTypes = {
  onClick: PropTypes.func.isRequired,
  disponible: PropTypes.bool,
  etiqueta: PropTypes.string,
  hacia: PropTypes.oneOf(["atras", "adelante"]).isRequired,
};

const Navbar = () => {
  const { t } = useContext(LanguageContext);
  const { versiculoSeleccionadoNumero, libroSeleccionado, capituloSeleccionadoNumero, Chapters, setCapituloSeleccionadoNumero, setVersiculoSeleccionado, setVersiculoSeleccionadoNumero } =
    useContext(DataContext);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();

  const hayVersiculo = versiculoSeleccionadoNumero > 0;
  const lectura = RUTAS_LECTURA.filter((r) => !r.requiereVersiculo || hayVersiculo);
  const todas = [...lectura, ...RUTAS_ESTUDIO, ...RUTAS_CUENTA];
  const pestanas = todas.filter(({ to }) => PESTANAS_MOVIL.includes(to));
  const enMas = todas.filter(({ to }) => !PESTANAS_MOVIL.includes(to));

  // El menú se cierra al cambiar de ruta: si no, al tocar "Ajustes" el panel
  // seguiría abierto encima de la página nueva.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return;

    const alTocarFuera = (evento) => {
      if (menuRef.current && !menuRef.current.contains(evento.target)) setMenuAbierto(false);
    };
    const alPulsarEscape = (evento) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };

    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alPulsarEscape);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alPulsarEscape);
    };
  }, [menuAbierto]);

  /*
   * Salto de capítulo desde la barra del pasaje.
   *
   * `Chapters` es el mapa del libro actual: { "1": [1..51], "2": [...] }. Que
   * exista la clave ES la comprobación de que el capítulo existe, así que no
   * hace falta saber cuántos tiene cada libro.
   *
   * Solo se mueve dentro del libro: al llegar al final NO salta al siguiente
   * libro, porque eso cambiaría el testamento y el contexto de lectura sin que
   * el usuario lo pida. En los extremos el botón queda deshabilitado, no
   * escondido, para que la referencia no baile de sitio.
   */
  const capitulos = Chapters && Chapters !== "NotFound" ? Chapters : null;

  const claveCapitulo = (desplazamiento) => {
    const destino = Number(capituloSeleccionadoNumero) + desplazamiento;
    const clave = String(destino);
    return capitulos?.[clave] ? clave : null;
  };

  const irACapitulo = (clave) => {
    const versiculos = capitulos?.[clave];
    if (!versiculos) return;
    // El capítulo se guarda como cadena, igual que lo hace el modal de
    // capítulos: es la clave del mapa, y hay comparaciones por identidad
    // (historial) que se romperían con un número.
    setCapituloSeleccionadoNumero(clave);
    setVersiculoSeleccionado(versiculos);
    setVersiculoSeleccionadoNumero(1);
  };

  const capituloAnterior = claveCapitulo(-1);
  const capituloSiguiente = claveCapitulo(1);

  const testamento = (libro) => (Number(libro.split("book")[1]) < 40 ? t("AntiguoTestamento") : t("NuevoTestamento"));

  /**
   * `true` cuando la pantalla actual vive dentro de "Más". Sin esto, al entrar
   * en Ajustes ninguna pestaña quedaba marcada y la barra decía que no estás
   * en ninguna parte.
   */
  const enSecundaria = enMas.some(({ to }) => esActiva(pathname, to));

  /*
   * Al confirmar biblias nuevas, capítulo y versículo se ponen a `null`, que no
   * es `!== 0`: la barra quedaba visible sin libro. Se exigen los tres datos.
   */
  const mostrarPasaje = pathname.startsWith("/compare") && Boolean(versiculoSeleccionadoNumero && libroSeleccionado && capituloSeleccionadoNumero);

  const grupo = (rutas) =>
    rutas.map(({ to, clave, Icono }) => <EnlaceLateral key={to} to={to} etiqueta={t(clave)} Icono={Icono} activo={esActiva(pathname, to)} />);

  return (
    <>
      {/* ---------------------------- Escritorio ---------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-lateral flex-col border-r border-linea bg-lateral md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-4 pb-4 pt-5">
          <img src={LOGO} alt="" className="h-8 w-8 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-semibold text-tinta">{t("Biblian")}</p>
            <p className="truncate text-[11px] text-tinta-3">{t("tituloComparar")}</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3" aria-label={t("Menu")}>
          <div className="flex flex-col gap-0.5">{grupo(lectura)}</div>
          <div className="flex flex-col gap-0.5">{grupo(RUTAS_ESTUDIO)}</div>
          <div className="mt-auto flex flex-col gap-0.5">{grupo(RUTAS_CUENTA)}</div>
        </nav>

        <div className="border-t border-linea px-3 py-3">
          <ControlesTema />
        </div>
      </aside>

      {/* ------------------------------ Móvil ------------------------------ */}
      <header className="flex items-center justify-between gap-2 border-b border-linea bg-lateral px-4 py-2.5 md:hidden">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img src={LOGO} alt="" className="h-7 w-7 shrink-0" />
          <span className="text-base font-semibold text-tinta">{t("Biblian")}</span>
        </Link>
        <ControlesTema compacto />
      </header>

      <nav ref={menuRef} className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-lateral/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label={t("Menu")}>
        {/*
          El menú "Más" sube desde las pestañas: la barra vive pegada al borde
          inferior, así que un panel hacia abajo se saldría de la pantalla.
        */}
        {menuAbierto && (
          <ul role="menu" className="absolute inset-x-2 bottom-full mb-2 overflow-hidden rounded-xl border border-linea bg-superficie py-1 shadow-xl">
            {enMas.map(({ to, clave, Icono }) => (
              <li key={to} role="none">
                <Link
                  role="menuitem"
                  to={to}
                  aria-current={esActiva(pathname, to) ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${esActiva(pathname, to) ? "font-medium text-acento" : "text-tinta"} active:bg-tinta/5`}
                >
                  <Icono className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  {t(clave)}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ul className="flex h-14 items-stretch">
          {pestanas.map(({ to, clave, Icono }) => {
            const activo = esActiva(pathname, to);
            return (
              <li key={to} className="min-w-0 flex-1">
                <Link to={to} aria-current={activo ? "page" : undefined} className={`flex h-full flex-col items-center justify-center gap-0.5 ${activo ? "text-acento" : "text-tinta-3"}`}>
                  <Icono className="h-[22px] w-[22px]" strokeWidth={activo ? 2.1 : 1.8} aria-hidden="true" />
                  <span className="w-full truncate text-center text-[10px] font-medium">{t(clave)}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              aria-label={t("Menu")}
              className={`flex h-full w-full flex-col items-center justify-center gap-0.5 ${enSecundaria || menuAbierto ? "text-acento" : "text-tinta-3"}`}
            >
              <Ellipsis className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
              {/* "Más opciones" no cabe en un teléfono de 320 px: la pestaña dice
                  "Más", como en iOS, y el nombre largo queda para lectores de
                  pantalla en el `aria-label`. */}
              <span className="w-full truncate text-center text-[10px] font-medium">{t("MenuCorto")}</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ------------------------- Barra del pasaje ------------------------- */}
      {/* Solo en Comparar: describe el texto que se está leyendo y sus flechas
          cambian de capítulo, así que fuera de esa pantalla no tiene a qué
          referirse. */}
      {mostrarPasaje && (
        <nav className="sticky top-0 z-30 border-b border-linea bg-fondo/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1800px] items-center gap-2 px-3 py-2 sm:px-6">
            <BotonCapitulo hacia="atras" disponible={Boolean(capituloAnterior)} etiqueta={t("CapituloAnterior")} onClick={() => irACapitulo(capituloAnterior)} />
            {/* El nombre del libro es lo único que puede ser largo, así que es lo
                único que se recorta: la referencia numérica siempre se ve. */}
            <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
              <span className="hidden shrink-0 text-xs text-tinta-3 sm:inline">{testamento(libroSeleccionado)}</span>
              <h1 className="flex min-w-0 items-baseline gap-1.5 text-base font-semibold text-tinta sm:text-lg">
                <span className="truncate">{t(libroSeleccionado)}</span>
                <span className="shrink-0 tabular-nums">
                  {capituloSeleccionadoNumero}:{versiculoSeleccionadoNumero}
                </span>
              </h1>
            </div>
            <BotonCapitulo hacia="adelante" disponible={Boolean(capituloSiguiente)} etiqueta={t("CapituloSiguiente")} onClick={() => irACapitulo(capituloSiguiente)} />
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;
