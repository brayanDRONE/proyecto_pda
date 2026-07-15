/**
 * audioAlerts.js — Alertas sonoras via Web Audio API
 *
 * Compatible con Chrome Android (Zebra RD40T).
 * El AudioContext requiere un gesto de usuario previo para activarse;
 * en este flujo ya hay un tap/click antes de escanear.
 *
 * Uso:
 *   import { beepSuccess, beepError, beepWarning } from '../utils/audioAlerts'
 *   beepSuccess()   → caja OK
 *   beepWarning()   → caja con anomalía de datos
 *   beepError()     → error / duplicado
 */

let ctx = null

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Reanudar si el navegador lo suspendió (política autoplay)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

/**
 * Genera un beep con oscilador
 * @param {number} frecuencia - Hz
 * @param {number} duracion   - milisegundos
 * @param {number} volumen    - 0.0 a 1.0
 * @param {number} delay      - retardo en segundos antes de sonar
 */
function beep(frecuencia, duracion, volumen = 0.4, delay = 0) {
  try {
    const audioCtx = getCtx()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(frecuencia, audioCtx.currentTime + delay)

    gainNode.gain.setValueAtTime(volumen, audioCtx.currentTime + delay)
    // Fade-out suave al final para evitar click de audio
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + delay + duracion / 1000
    )

    oscillator.start(audioCtx.currentTime + delay)
    oscillator.stop(audioCtx.currentTime + delay + duracion / 1000)
  } catch (e) {
    // Silenciar errores si el navegador bloquea audio
    console.warn('[audioAlerts] No se pudo reproducir sonido:', e.message)
  }
}

/** Caja escaneada correctamente — tono alto corto */
export function beepSuccess() {
  beep(1050, 90, 0.35)
}

/** Anomalía de datos (campos no coinciden) — tono medio doble */
export function beepWarning() {
  beep(600, 130, 0.4, 0)
  beep(600, 130, 0.4, 0.18)
}

/** Error (QR inválido, duplicado, CSG no encontrado) — tono bajo triple descendente */
export function beepError() {
  beep(440, 150, 0.45, 0)
  beep(360, 150, 0.45, 0.18)
  beep(280, 200, 0.45, 0.36)
}
