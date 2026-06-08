import { useRef, useEffect, useState, useCallback } from 'react'

/**
 * Componente de escáner láser en modo wedge (HID)
 * Usa listener a nivel document para funcionar aunque se pierda el foco.
 * Compatible con Zebra RD40T y similares.
 */
export default function WedgeScanner({ onScanComplete, isActive = true, placeholder = 'Escanear...' }) {
  const bufferRef = useRef('')
  const timerRef = useRef(null)
  const [feedbackVisual, setFeedbackVisual] = useState(null) // 'success' | 'error' | null
  const [ultimoEscaneo, setUltimoEscaneo] = useState('')

  const mostrarFeedback = useCallback((tipo) => {
    setFeedbackVisual(tipo)
    if (navigator.vibrate) {
      if (tipo === 'success') navigator.vibrate(80)
      else if (tipo === 'error') navigator.vibrate([80, 40, 80])
    }
    setTimeout(() => setFeedbackVisual(null), 700)
  }, [])

  const procesarEscaneo = useCallback((contenido) => {
    const valor = contenido.trim()
    if (!valor || valor.length < 2) return
    setUltimoEscaneo(valor)
    if (onScanComplete) {
      try {
        const resultado = onScanComplete(valor)
        if (resultado === true) mostrarFeedback('success')
        else if (resultado === false) mostrarFeedback('error')
        // si no retorna nada, no mostrar feedback (el padre lo maneja)
      } catch (err) {
        console.error('[WedgeScanner] Error en callback:', err)
        mostrarFeedback('error')
      }
    }
  }, [onScanComplete, mostrarFeedback])

  // Listener a nivel document: funciona aunque el input oculto pierda el foco
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e) => {
      // Ignorar si el usuario está escribiendo en un input/textarea REAL (que no sea nuestro scanner oculto)
      const tag = document.activeElement?.tagName
      const tipo = document.activeElement?.type
      const esInputReal = (tag === 'INPUT' || tag === 'TEXTAREA') &&
                          tipo !== 'hidden' &&
                          !document.activeElement?.dataset?.wedge

      if (esInputReal) return

      if (e.key === 'Enter') {
        e.preventDefault()
        const contenido = bufferRef.current
        bufferRef.current = ''
        // Cancelar el timer de timeout
        if (timerRef.current) clearTimeout(timerRef.current)
        procesarEscaneo(contenido)
        return
      }

      // Acumular caracteres (el scanner los envía muy rápido)
      if (e.key.length === 1) {
        bufferRef.current += e.key

        // Timeout: si pasan 200ms sin más caracteres ni Enter, procesar igual
        // (algunos scanners no envían Enter al final)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          const contenido = bufferRef.current
          if (contenido.length > 3) {
            bufferRef.current = ''
            procesarEscaneo(contenido)
          } else {
            bufferRef.current = ''
          }
        }, 200)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isActive, procesarEscaneo])

  return (
    <div
      className={`
        w-full rounded-xl border-2 p-4 text-center font-semibold text-base
        transition-all duration-300 select-none
        ${!isActive
          ? 'border-gray-300 bg-gray-100 text-gray-400'
          : feedbackVisual === 'success'
            ? 'border-green-500 bg-green-50 text-green-800'
            : feedbackVisual === 'error'
              ? 'border-red-500 bg-red-50 text-red-800'
              : 'border-blue-400 bg-blue-50 text-blue-700 animate-pulse'
        }
      `}
      style={{ minHeight: '56px', touchAction: 'manipulation' }}
    >
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
      ) : (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">🔫</span>
          <span>{isActive ? placeholder : 'Escáner inactivo'}</span>
        </div>
      )}
    </div>
  )
}
