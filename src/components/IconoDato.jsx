import PropTypes from "prop-types";
import { BookOpen, Hash, Italic, Landmark, Languages, Scale, ScrollText, StickyNote, Type } from "lucide-react";

/*
 * Los iconos de los datos (`src/data/biblias.js`) van por NOMBRE y se
 * resuelven aquí: ese archivo lo lee y reescribe también `scripts/
 * import-bible.mjs` desde Node, así que no puede importar componentes.
 *
 * Antes eran emojis (📜 🎯 🔢 ...). Cada sistema los dibuja distinto, no
 * siguen el color del tema y junto a los iconos de línea del resto de la app
 * se veían de otra mano.
 */
const ICONOS = { BookOpen, Hash, Italic, Landmark, Languages, Scale, ScrollText, StickyNote, Type };

const IconoDato = ({ nombre, className = "h-3 w-3" }) => {
  const Icono = ICONOS[nombre];
  return Icono ? <Icono className={`shrink-0 ${className}`} strokeWidth={2} aria-hidden="true" /> : null;
};

IconoDato.propTypes = { nombre: PropTypes.string, className: PropTypes.string };

export default IconoDato;
