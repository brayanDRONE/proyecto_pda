import { useRef, useEffect, useState, useCallback } from 'react'
import { beepSuccess, beepError, beepWarning } from '../utils/audioAlerts'

/**
 * WedgeScanner - Lector láser HID para Zebra RD40T + Chrome Android
 *
 * Estrategia dual para máxima compatibilidad:
 * 1. INPUT ENFOCADO (principal): Un <input> visible pero estilizado permanece
 *    enfocado con setInterval. DataWedge/HID escribe en el input enfocado.
 * 2. DOCUMENT KEYDOWN (respaldo): captura teclas si el input pierde el foco.
 *
 * Acepta tanto onScanComplete como onData (aliases).
 */
export default function WedgeScanner({
  onScanComplete,
  onData,
  isActive = true,
  placeholder = 'Escanear...'
}) {
  const callback = onScanComplete || onData

  const inputRef = useRef(null)
  const bufferRef = useRef('')
  const timerRef = useRef(null)
  const focusIntervalRef = useRef(null)

  const [feedbackVisual, setFeedbackVisual] = useState(null)
  const [tienesFoco, setTienesFoco] = useState(false)

  // ── Feedback visual + vibración + sonido ────────────────────────────────
  const mostrarFeedback = useCallback((tipo) => {
    setFeedbackVisual(tipo)
    if (navigator.vibrate) {
      if (tipo === 'success') navigator.vibrate(80)
      else if (tipo === 'error') navigator.vibrate([80, 40, 80])
      else if (tipo === 'warning') navigator.vibrate([60, 30, 60])
    }
    if (tipo === 'success') beepSuccess()
    else if (tipo === 'warning') beepWarning()
    else if (tipo === 'error') beepError()
    setTimeout(() => setFeedbackVisual(null), 900)
  }, [])

  // ── Procesar el buffer acumulado ─────────────────────────────────────────
  const procesarBuffer = useCallback((texto) => {
    const valor = (texto || bufferRef.current).trim()
    bufferRef.current = ''
    if (inputRef.current) inputRef.current.value = ''
    if (!valor || valor.length < 2) return

    if (!callback) return
    try {
      const res = callback(valor)
      if (res === true) mostrarFeedback('success')
      else if (res === 'warning') mostrarFeedback('warning')
      else if (res === false) mostrarFeedback('error')
    } catch (err) {
      console.error('[WedgeScanner]', err)
      mostrarFeedback('error')
    }
  }, [callback, mostrarFeedback])

  // ── Forzar foco sobre el input del scanner ──────────────────────────────
  const forzarFoco = useCallback(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus({ preventScroll: true })
    }
  }, [isActive])

  // ── Mantener foco cada 400 ms ────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    forzarFoco()
    focusIntervalRef.current = setInterval(() => {
      // Solo refocusear si ningún otro input "real" tiene el foco
      const activo = document.activeElement
      const esOtroInput =
        activo &&
        activo !== inputRef.current &&
        (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA' || activo.tagName === 'SELECT')
      if (!esOtroInput) forzarFoco()
    }, 400)
    return () => clearInterval(focusIntervalRef.current)
  }, [isActive, forzarFoco])

  // ── Limpieza del timer al desmontar ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // ── Manejadores del <input> ──────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (timerRef.current) clearTimeout(timerRef.current)
      const val = e.currentTarget.value
      procesarBuffer(val)
      return
    }
    // Re-armar el timer de timeout por si el scanner no envía Enter
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const val = inputRef.current?.value || ''
      if (val.trim().length >= 2) procesarBuffer(val)
      else {
        bufferRef.current = ''
        if (inputRef.current) inputRef.current.value = ''
      }
    }, 300)
  }, [procesarBuffer])

  const handleChange = useCallback((e) => {
    // Algunos modos de DataWedge disparan el evento input/change en lugar de keydown
    const val = e.target.value
    if (val.includes('\n') || val.includes('\r') || val.endsWith('\t')) {
      if (timerRef.current) clearTimeout(timerRef.current)
      procesarBuffer(val.replace(/[\n\r\t]/g, '').trim())
      return
    }
    // Si hay valor, iniciar timeout de 300 ms
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const cur = inputRef.current?.value || ''
      if (cur.trim().length >= 2) procesarBuffer(cur)
      else {
        if (inputRef.current) inputRef.current.value = ''
      }
    }, 300)
  }, [procesarBuffer])

  // ── Respaldo: document keydown (si el foco no está en el input) ──────────
  useEffect(() => {
    if (!isActive) return
    const onDocKeyDown = (e) => {
      const activo = document.activeElement
      if (activo === inputRef.current) return // ya lo maneja el input
      const esOtroInput =
        activo &&
        (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA') &&
        !activo.dataset.wedge
      if (esOtroInput) return

      if (e.key === 'Enter') {
        e.preventDefault()
        if (timerRef.current) clearTimeout(timerRef.current)
        procesarBuffer(bufferRef.current)
        return
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          if (bufferRef.current.trim().length >= 2) procesarBuffer(bufferRef.current)
          else bufferRef.current = ''
        }, 300)
      }
    }
    document.addEventListener('keydown', onDocKeyDown)
    return () => document.removeEventListener('keydown', onDocKeyDown)
  }, [isActive, procesarBuffer])

  // ── UI ───────────────────────────────────────────────────────────────────
  const colorClase = !isActive
    ? 'border-gray-300 bg-gray-100 text-gray-400'
    : feedbackVisual === 'success'
      ? 'border-green-500 bg-green-50 text-green-800'
      : feedbackVisual === 'error'
        ? 'border-red-500 bg-red-50 text-red-800'
        : tienesFoco
          ? 'border-green-400 bg-green-50 text-green-700'
          : 'border-yellow-400 bg-yellow-50 text-yellow-700'

  return (
    <div
      className={`w-full rounded-xl border-2 p-4 text-center font-semibold text-base
        transition-all duration-300 select-none cursor-pointer ${colorClase}`}
      style={{ minHeight: '64px', touchAction: 'manipulation', position: 'relative' }}
      onClick={forzarFoco}
    >
      {/* Input invisible pero enfocable — recibe los datos del scanner HID */}
      <input
        ref={inputRef}
        type="text"
        data-wedge="true"
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onFocus={() => setTienesFoco(true)}
        onBlur={() => setTienesFoco(false)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '16px', // evita zoom en iOS/Android
          zIndex: 1,
        }}
      />

      {/* Capa visual encima del input */}
      <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        {feedbackVisual === 'success' ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">✓</span>
            <span>Leído correctamente</span>
          </div>
        ) : feedbackVisual === 'error' ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">✗</span>
            <span>Error de lectura</span>
          </div>
        ) : !isActive ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">⏸</span>
            <span>Escáner inactivo</span>
          </div>
        ) : tienesFoco ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🟢</span>
            <span>ACTIVO — escanea ahora</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">👆</span>
            <span>Toca aquí para activar escáner</span>
          </div>
        )}
      </div>
    </div>
  )
}
