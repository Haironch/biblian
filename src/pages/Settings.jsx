import { useContext } from "react";
import PropTypes from "prop-types";
import ThemeContext from "../context/ThemeContext";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";

/*
 * ---------------------------------------------------------------------------
 * OCULTO: interruptor de fuente de datos (CDN de GitHub vs API)
 * ---------------------------------------------------------------------------
 * El interruptor existía para poder volver al CDN sin redesplegar si el
 * backend fallaba. Se esconde de la interfaz, NO se elimina: el mecanismo
 * completo sigue vivo en `src/config/dataSource.js` y las dos fuentes siguen
 * funcionando. Lo único que desaparece es la posibilidad de que el usuario lo
 * cambie desde Ajustes.
 *
 * El motivo de esconderlo es que ya no es una preferencia del usuario. La
 * búsqueda, las referencias cruzadas, la concordancia Strong y la
 * sincronización de la cuenta SOLO existen con la API; puesto en CDN, media
 * app se apaga sin que quede claro por qué. Ofrecer un interruptor que rompe
 * cosas es peor que no ofrecerlo.
 *
 * Sigue habiendo dos formas de cambiarlo cuando haga falta de verdad:
 *   - `VITE_DATA_SOURCE=github` en el build;
 *   - `localStorage.setItem("dataSource", "github")` desde la consola.
 * Y el respaldo automático (`AUTO_FALLBACK`) sigue reintentando contra el CDN
 * solo cuando la API falla, que era el caso que de verdad importaba.
 *
 * Para devolverlo a la vista: restaurar los imports de `dataSource`, el estado
 * `fuente` / `estadoApi` con sus dos efectos, `colorEstado`, y el bloque
 * "FUENTE DE DATOS" (está en el historial de git de este archivo). Las claves de idioma (`FuenteDatos`,
 * `EstadoApi_*`) se conservan sin tocar.
 */

/**
 * Selector segmentado, como el de Ajustes del Sistema en la Mac. Reemplaza a
 * los interruptores y botones sueltos: aquí todas las opciones son "una de
 * varias", y verlas todas a la vez dice qué hay sin tener que probar.
 */
const Segmentos = ({ etiqueta, opciones, valor, alElegir }) => (
  <div role="radiogroup" aria-label={etiqueta} className="inline-flex shrink-0 rounded-lg bg-tinta/5 p-0.5">
    {opciones.map(({ valor: opcion, texto }) => {
      const activa = opcion === valor;
      return (
        <button
          key={opcion}
          type="button"
          role="radio"
          aria-checked={activa}
          onClick={() => !activa && alElegir(opcion)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${activa ? "bg-superficie text-tinta shadow-sm" : "text-tinta-2 hover:text-tinta"}`}
        >
          {texto}
        </button>
      );
    })}
  </div>
);

Segmentos.propTypes = {
  etiqueta: PropTypes.string.isRequired,
  opciones: PropTypes.arrayOf(PropTypes.shape({ valor: PropTypes.string.isRequired, texto: PropTypes.string.isRequired })).isRequired,
  valor: PropTypes.string,
  alElegir: PropTypes.func.isRequired,
};

/** Un renglón: el nombre del ajuste a la izquierda y su control a la derecha. */
const Renglon = ({ titulo, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
    <span className="text-sm text-tinta">{titulo}</span>
    {children}
  </div>
);

Renglon.propTypes = { titulo: PropTypes.string.isRequired, children: PropTypes.node };

const Seccion = ({ titulo, children }) => (
  <section className="mt-6">
    <h2 className="mb-2 px-1 text-xs font-medium text-tinta-3">{titulo}</h2>
    <div className="divide-y divide-linea rounded-xl border border-linea bg-superficie">{children}</div>
  </section>
);

Seccion.propTypes = { titulo: PropTypes.string.isRequired, children: PropTypes.node };

const Settings = () => {
  const { t, idiomaNavegador, cambiarIdioma } = useContext(LanguageContext);
  const { theme, changeTheme } = useContext(ThemeContext);
  const { paginaInicio, handlePaginaInicio, cambiarAnchoVentana, cambiarAltoVentana, anchoVentana, altoVentana } =
    useContext(DataContext);

  const tamanos = [
    { valor: "1", texto: t("AjustesPequeno") },
    { valor: "2", texto: t("AjustesMediano") },
    { valor: "3", texto: t("AjustesGrande") },
  ];

  // Los tres contextos exponen "alternar", no "fijar": con dos opciones,
  // elegir la que no está activa es lo mismo que alternar.
  return (
    <div className="animate-fade-in mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-tinta">{t("Ajustes")}</h1>

      <Seccion titulo={t("AjustesGeneral")}>
        <Renglon titulo={t("AjustesApariencia")}>
          <Segmentos
            etiqueta={t("AjustesApariencia")}
            valor={theme}
            alElegir={changeTheme}
            opciones={[
              { valor: "light", texto: t("AjustesTemaClaro") },
              { valor: "dark", texto: t("AjustesTemaOscuro") },
            ]}
          />
        </Renglon>
        <Renglon titulo={t("AjustesIdioma")}>
          <Segmentos
            etiqueta={t("AjustesIdioma")}
            valor={idiomaNavegador}
            alElegir={cambiarIdioma}
            opciones={[
              { valor: "es", texto: "Español" },
              { valor: "en", texto: "English" },
            ]}
          />
        </Renglon>
        <Renglon titulo={t("AjustesAbrirEn")}>
          <Segmentos
            etiqueta={t("AjustesAbrirEn")}
            valor={paginaInicio === "/compare" ? "/compare" : "/"}
            alElegir={handlePaginaInicio}
            opciones={[
              { valor: "/", texto: t("Inicio") },
              { valor: "/compare", texto: t("Comparar") },
            ]}
          />
        </Renglon>
      </Seccion>

      {/*
        FUENTE DE DATOS — oculto. Ver la nota al principio del archivo para el
        motivo y para cómo devolverlo a la vista. El bloque original está en el
        historial de git de este archivo.
      */}

      <Seccion titulo={t("AjustesLectura")}>
        <Renglon titulo={t("AjustesAncho")}>
          <Segmentos etiqueta={t("AjustesAncho")} valor={anchoVentana} alElegir={cambiarAnchoVentana} opciones={tamanos} />
        </Renglon>
        <Renglon titulo={t("AjustesAlto")}>
          <Segmentos etiqueta={t("AjustesAlto")} valor={altoVentana} alElegir={cambiarAltoVentana} opciones={tamanos} />
        </Renglon>
      </Seccion>
    </div>
  );
};

export default Settings;
