/*
 * Mantiene despierta la API de Render.
 *
 * El plan gratis de Render apaga el servicio tras 15 min sin peticiones, y al
 * despertar tarda más que los ~26 s que el proxy de Netlify (/api/* en
 * public/_redirects) espera: el primer visitante recibía un 504 y la app sin
 * textos. Un ping cada 10 min evita que llegue a dormirse.
 *
 * Costo: el servicio queda encendido todo el mes (~744 h de las 750 h gratis
 * que Render da por cuenta, compartidas con los demás servicios de la cuenta).
 * Para apagarlo, borrar este archivo.
 *
 * Netlify solo ejecuta funciones programadas en el despliegue de producción.
 */

const API_HEALTH = "https://biblian-api-iamc.onrender.com/health";

export default async () => {
  const inicio = Date.now();
  try {
    // Si la API estaba dormida, la petición la despierta aunque se corte aquí.
    const res = await fetch(API_HEALTH, { signal: AbortSignal.timeout(25_000) });
    console.log(`API ${res.status} en ${Date.now() - inicio} ms`);
  } catch (error) {
    console.log(`API sin respuesta tras ${Date.now() - inicio} ms: ${error.message}`);
  }
};

export const config = {
  schedule: "*/10 * * * *",
};
