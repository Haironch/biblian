/*
 * Clases compartidas entre componentes. Viven fuera de los .jsx para que el
 * refresco en caliente de Vite siga funcionando (solo recarga archivos que
 * exportan nada más que componentes).
 */

/** Celda numérica o de libro. La elegida toma el acento mientras se anima la salida. */
export const claseCelda = (elegida) =>
  `rounded-lg border text-center text-sm transition-colors ${
    elegida ? "border-acento-solido bg-acento-solido text-white" : "border-linea bg-superficie-2/60 text-tinta hover:border-acento/40 hover:bg-acento-suave"
  }`;

