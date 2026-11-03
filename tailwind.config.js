/** @type {import('tailwindcss').Config} */
import animations from "@midudev/tailwind-animations";

/*
 * `src/assets` se excluye del escaneo de contenido.
 *
 * Ahí viven ~156,000 archivos: los JSON de las 150 biblias y los mp3 del
 * diccionario Strong. Aunque el patrón `*.{js,jsx}` no los matchee, el glob
 * tiene que RECORRER el árbol para descartarlos, y Tailwind lo reevalúa en cada
 * rebuild. Medido: 4,204 ms sin la exclusión contra 3 ms con ella.
 *
 * Se usa exclusión y no una lista blanca de carpetas a propósito: así una
 * carpeta nueva bajo `src/` queda cubierta sola, sin que haya que acordarse de
 * agregarla aquí (y sin que sus clases desaparezcan en silencio si se olvida).
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "!./src/assets/**"],
  theme: {
    extend: {
      /*
       * Colores con nombre de PAPEL, no de tono: `bg-superficie` dice qué es la
       * cosa, y el valor real vive en `index.css`, una vez para claro y otra
       * para oscuro. Así un componente no necesita su par `dark:` y el tema
       * entero se ajusta tocando un solo archivo.
       *
       * El `<alpha-value>` es lo que deja seguir usando `bg-acento/10`.
       */
      colors: {
        fondo: "rgb(var(--fondo) / <alpha-value>)",
        lateral: "rgb(var(--lateral) / <alpha-value>)",
        superficie: {
          DEFAULT: "rgb(var(--superficie) / <alpha-value>)",
          2: "rgb(var(--superficie-2) / <alpha-value>)",
        },
        linea: {
          DEFAULT: "rgb(var(--linea) / <alpha-value>)",
          fuerte: "rgb(var(--linea-fuerte) / <alpha-value>)",
        },
        tinta: {
          DEFAULT: "rgb(var(--tinta) / <alpha-value>)",
          2: "rgb(var(--tinta-2) / <alpha-value>)",
          3: "rgb(var(--tinta-3) / <alpha-value>)",
        },
        acento: {
          DEFAULT: "rgb(var(--acento) / <alpha-value>)",
          solido: "rgb(var(--acento-solido) / <alpha-value>)",
          suave: "rgb(var(--acento-suave) / <alpha-value>)",
        },
      },
      fontFamily: {
        // La interfaz usa la letra del sistema: en la Mac es San Francisco, que
        // es lo que hace que la app instalada se sienta de la casa.
        sans: ["-apple-system", "BlinkMacSystemFont", "'SF Pro Text'", "'Segoe UI'", "Roboto", "'Helvetica Neue'", "Arial", "sans-serif"],
        // El texto bíblico va en serif: se lee mejor en párrafos largos y
        // separa a simple vista lo que es Escritura de lo que es interfaz.
        serif: ["'Source Serif 4'", "'Iowan Old Style'", "Georgia", "serif"],
      },
      spacing: {
        lateral: "var(--ancho-lateral)",
        pestanas: "var(--alto-pestanas)",
      },
    },
  },
  darkMode: "class",
  plugins: [animations],
};
