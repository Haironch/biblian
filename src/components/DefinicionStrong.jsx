import { Fragment } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

/*
 * Definición Strong como elementos de React, sin `dangerouslySetInnerHTML`.
 *
 * El texto viene del diccionario original con su HTML de época:
 *
 *   <font color='%COLOR_BLUE%'>amor, amado</font>   → cómo se traduce
 *   <span ... onClick=strongFun('G25')>G25</span>     → otra entrada
 *   <b>, <i>, <p>
 *
 * Se recorre el árbol y solo se conserva lo que significa algo: los enlaces a
 * otras entradas pasan a ser enlaces de la app (`/dictionary/G25`), el azul de
 * las traducciones pasa a ser el color de acento y el resto queda como texto.
 * Un atributo raro o un `onClick` en el HTML no llega nunca al DOM.
 */

const CODIGO = /strongFun\(\s*'([GH]\d+)'/i;

const recorrer = (nodo, clave) => {
  if (nodo.nodeType === Node.TEXT_NODE) return nodo.textContent;
  if (nodo.nodeType !== Node.ELEMENT_NODE) return null;

  const hijos = Array.from(nodo.childNodes).map((hijo, i) => recorrer(hijo, `${clave}.${i}`));
  const etiqueta = nodo.tagName.toLowerCase();

  if (etiqueta === "span") {
    const codigo = (nodo.getAttribute("onclick") ?? "").match(CODIGO)?.[1]?.toUpperCase();
    if (codigo) {
      return (
        <Link key={clave} to={`/dictionary/${codigo}`} className="font-medium text-acento underline decoration-acento/30 underline-offset-2 hover:decoration-acento">
          {hijos}
        </Link>
      );
    }
  }

  if (etiqueta === "font") {
    // Vacío en cientos de entradas (`<font color='%COLOR_GREEN%'></font>`).
    if (!nodo.textContent.trim()) return null;
    if (/BLUE/i.test(nodo.getAttribute("color") ?? "")) {
      return (
        <span key={clave} className="font-medium text-acento">
          {hijos}
        </span>
      );
    }
  }

  if (etiqueta === "b" || etiqueta === "strong") return <strong key={clave}>{hijos}</strong>;
  if (etiqueta === "i" || etiqueta === "em") return <em key={clave}>{hijos}</em>;
  if (etiqueta === "br") return <br key={clave} />;
  if (etiqueta === "p") {
    return (
      <span key={clave} className="mt-2 block first:mt-0">
        {hijos}
      </span>
    );
  }

  return <Fragment key={clave}>{hijos}</Fragment>;
};

const DefinicionStrong = ({ html, className = "" }) => {
  if (!html) return null;
  const cuerpo = new DOMParser().parseFromString(html, "text/html").body;
  return <p className={className}>{Array.from(cuerpo.childNodes).map((nodo, i) => recorrer(nodo, String(i)))}</p>;
};

DefinicionStrong.propTypes = {
  html: PropTypes.string,
  className: PropTypes.string,
};

export default DefinicionStrong;
