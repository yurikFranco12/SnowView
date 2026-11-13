/**
 * Cuenta cuántos cuadros a pantalla completa hay abiertos y lo refleja en `<html data-overlay-open>`.
 * El fondo de nieve se pausa mientras haya alguno. Es un contador porque los cuadros se anidan (la
 * ficha de una estación abre el mapa de pistas): cerrar el de dentro no debe reanudar la nieve.
 */
let open = 0;

export function lockOverlay(): () => void {
  open++;
  document.documentElement.setAttribute('data-overlay-open', '');
  let released = false;
  return () => {
    if (released) return;
    released = true;
    open = Math.max(0, open - 1);
    if (open === 0) document.documentElement.removeAttribute('data-overlay-open');
  };
}
