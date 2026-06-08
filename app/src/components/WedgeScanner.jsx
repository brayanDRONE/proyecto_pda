import { useRef, useEffect, useState } from 'react'

/**
 * Componente de escáner láser en modo wedge (HID)
 * - Input invisible que mantiene el foco
 * - Escucha Enter para procesar contenido escaneado
 * - Manejo automático de foco + botón visible para reactivar
 * - Feedback visual post-escaneo
 */
export default function WedgeScanner({ onScanComplete, isActive = true }) {
  const inputRef = useRef(null)
  const bufferRef = useRef('')
  const [feedbackVisual, setFeedbackVisual] = useState(null) // 'success', 'error', null
  const [ultimoEscaneo, setUltimoEscaneo] = useState('')

  // Enfoque inicial del input al montar el componente
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive])

  // Reenfoque si se pierde el foco (pero mantener un retraso para evitar loops)
  const manejarBlur = () => {
    if (isActive) {
      // Pequeño delay para evitar comportamientos raros
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  // Procesar entrada del escáner
  const manejarKeyDown = (e) => {
    if (!isActive) return

    // Detectar Enter (fin del escaneo)
    if (e.key === 'Enter') {
      e.preventDefault()

      const contenido = bufferRef.current.trim()
      
      if (contenido.length > 0) {
        // Procesar el contenido escaneado
        try {
          procesarEscaneo(contenido)
        } catch (error) {
          console.error('Error procesando escaneo:', error)
          mostrarFeedback('error')
        }
      }

      // Limpiar buffer y mantener foco
      bufferRef.current = ''
      setUltimoEscaneo(contenido)
      inputRef.current.value = ''
      inputRef.current.focus()
      return
    }

    // Acumular caracteres en el buffer (excluyendo teclas especiales)
    if (e.key.length === 1) {
      bufferRef.current += e.key
    }
  }

  // Procesar contenido escaneado
  const procesarEscaneo = (contenido) => {
    // Llamar callback del padre con el contenido
    if (onScanComplete) {
      const resultado = onScanComplete(contenido)
      
      // Mostrar feedback visual
      if (resultado === true) {
        mostrarFeedback('success')
      } else if (resultado === false) {
        mostrarFeedback('error')
      }
    }
  }

  // Mostrar feedback visual breve
  const mostrarFeedback = (tipo) => {
    setFeedbackVisual(tipo)
    
    // Vibración si está disponible
    if (navigator.vibrate) {
      if (tipo === 'success') {
        navigator.vibrate(100)
      } else if (tipo === 'error') {
        navigator.vibrate([100, 50, 100])
      }
    }

    // Limpiar feedback después de 500ms
    setTimeout(() => {
      setFeedbackVisual(null)
    }, 500)
  }

  // Botón visible para reactivar escáner
  const reactivarEscanerManual = () => {
    bufferRef.current = ''
    inputRef.current.value = ''
    inputRef.current.focus()
  }

  return (
    <div className="relative">
      {/* Input invisible pero funcional - siempre mantiene el foco */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onKeyDown={manejarKeyDown}
        onBlur={manejarBlur}
        onChange={() => {}} // Controlado por el buffer
        autoFocus
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Botón visible grande para reactivar escáner si se pierde foco */}
      <button
        onClick={reactivarEscanerManual}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold text-base
          transition-all duration-300 active:scale-95
          ${
            isActive
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }
          ${feedbackVisual === 'success' ? 'bg-success text-white ring-2 ring-success ring-opacity-50' : ''}
          ${feedbackVisual === 'error' ? 'bg-error text-white ring-2 ring-error ring-opacity-50' : ''}
        `}
        disabled={!isActive}
        style={{
          minHeight: '48px',
          touchAction: 'manipulation',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">📱</span>
          <span>Toca para reactivar escáner</span>
        </div>
      </button>

      {/* Indicador de feedback visual */}
      {feedbackVisual && (
        <div
          className={`
            absolute inset-0 rounded-lg pointer-events-none
            transition-opacity duration-300
            ${feedbackVisual === 'success' ? 'bg-success bg-opacity-30' : 'bg-error bg-opacity-30'}
          `}
          style={{ opacity: 0.7 }}
        />
      )}

      {/* Debug: mostrar último escaneo (remover en producción) */}
      {ultimoEscaneo && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 break-all">
          Última lectura: {ultimoEscaneo.substring(0, 100)}
          {ultimoEscaneo.length > 100 ? '...' : ''}
        </div>
      )}
    </div>
  )
}
