import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Página de DEBUG para diagnosticar el scanner HID en Zebra RD40T
 * - Usa input enfocado con setInterval (igual que WedgeScanner)
 * - Muestra si los datos llegan por el input O por document keydown
 */
export default function DebugScannerPage() {
  const [capturas, setCapturas] = useState([])
  const [inputActual, setInputActual] = useState('')
  const [tieneFoco, setTieneFoco] = useState(false)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const forzarFoco = useCallback(() => {
    if (inputRef.current) inputRef.current.focus({ preventScroll: true })
  }, [])

  // Mantener foco activo
  useEffect(() => {
    forzarFoco()
    const interval = setInterval(() => {
      const activo = document.activeElement
      const esOtroInput =
        activo && activo !== inputRef.current &&
        (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')
      if (!esOtroInput) forzarFoco()
    }, 400)
    return () => clearInterval(interval)
  }, [forzarFoco])

  const registrarCaptura = useCallback((texto, fuente) => {
    const val = texto.trim()
    if (!val) return
    setCapturas(prev => [{
      tiempo: new Date().toLocaleTimeString('es-CL', { hour12: false }),
      valor: val,
      longitud: val.length,
      fuente
    }, ...prev.slice(0, 19)])
    if (inputRef.current) inputRef.current.value = ''
    setInputActual('')
  }, [])

  // Handler del input enfocado
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (timerRef.current) clearTimeout(timerRef.current)
      registrarCaptura(e.currentTarget.value, 'INPUT+Enter')
    } else {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const v = inputRef.current?.value || ''
        if (v.trim().length >= 1) registrarCaptura(v, 'INPUT+timeout')
      }, 350)
    }
  }, [registrarCaptura])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    setInputActual(val)
    if (val.includes('\n') || val.includes('\r') || val.endsWith('\t')) {
      if (timerRef.current) clearTimeout(timerRef.current)
      registrarCaptura(val.replace(/[\n\r\t]/g, ''), 'INPUT+newline')
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const v = inputRef.current?.value || ''
      if (v.trim().length >= 1) registrarCaptura(v, 'INPUT+timeout')
    }, 350)
  }, [registrarCaptura])

  // Respaldo: document keydown
  useEffect(() => {
    const docBuf = { val: '' }
    let docTimer = null
    const handleDoc = (e) => {
      if (document.activeElement === inputRef.current) return
      if (e.key === 'Enter') {
        clearTimeout(docTimer)
        registrarCaptura(docBuf.val, 'DOC+Enter')
        docBuf.val = ''
        return
      }
      if (e.key.length === 1) {
        docBuf.val += e.key
        clearTimeout(docTimer)
        docTimer = setTimeout(() => {
          if (docBuf.val.trim().length >= 1) registrarCaptura(docBuf.val, 'DOC+timeout')
          docBuf.val = ''
        }, 350)
      }
    }
    document.addEventListener('keydown', handleDoc)
    return () => {
      document.removeEventListener('keydown', handleDoc)
      clearTimeout(docTimer)
    }
  }, [registrarCaptura])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">🔍 Debug Scanner PDA</h1>

        {/* Estado del foco */}
        <div
          className={`p-4 rounded-xl border-2 text-center font-bold text-lg cursor-pointer ${
            tieneFoco ? 'border-green-400 bg-green-900' : 'border-yellow-400 bg-yellow-900 animate-pulse'
          }`}
          onClick={forzarFoco}
        >
          {/* Input enfocado — mismo mecanismo que WedgeScanner */}
          <input
            ref={inputRef}
            type="text"
            data-wedge="true"
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onFocus={() => setTieneFoco(true)}
            onBlur={() => setTieneFoco(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            style={{
              position: 'absolute',
              opacity: 0,
              width: '1px',
              height: '1px',
              border: 'none',
              padding: 0,
              margin: 0,
              fontSize: '16px',
            }}
          />
          {tieneFoco ? '🟢 LISTO — Escanea ahora' : '👆 Toca aquí primero'}
        </div>

        {/* Valor en tiempo real */}
        {inputActual && (
          <div className="bg-blue-900 p-3 rounded-lg font-mono text-green-400 break-all">
            Capturando: {inputActual}
          </div>
        )}

        {/* Capturas */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Capturas ({capturas.length})</h2>
            <button
              onClick={() => setCapturas([])}
              className="text-xs bg-red-700 px-3 py-1 rounded hover:bg-red-600"
            >
              Limpiar
            </button>
          </div>
          {capturas.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin capturas aún. Escanea algo.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {capturas.map((c, i) => (
                <div key={i} className={`p-3 rounded text-sm font-mono ${i === 0 ? 'bg-green-800 border border-green-400' : 'bg-gray-700'}`}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{c.tiempo}</span>
                    <span className="text-yellow-400">{c.fuente}</span>
                    <span>{c.longitud} chars</span>
                  </div>
                  <div className="text-green-300 break-all">{c.valor}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guía de configuración DataWedge */}
        <div className="bg-amber-900 border border-amber-500 rounded-lg p-4 text-sm space-y-2">
          <p className="font-bold text-amber-300">⚙️ Si no aparecen capturas: Configura DataWedge</p>
          <p className="text-gray-300">El scanner envía datos a DataWedge. Necesitas que DataWedge envíe al navegador Chrome:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Abre la app <strong>DataWedge</strong> en la PDA</li>
            <li>Toca <strong>Profiles → New Profile</strong> → nombre: <em>"Chrome Browser"</em></li>
            <li>En <em>Associated apps</em> → Add → selecciona <strong>com.android.chrome</strong></li>
            <li>En <em>Keystroke output</em> → activa <strong>Enabled</strong></li>
            <li>En <em>Key event options</em> → activa <strong>Send Enter key</strong></li>
            <li>Guarda y vuelve a esta app</li>
          </ol>
          <p className="text-gray-400 mt-2">Si ya tienes un perfil para "Scanner Configuration", desactívalo o ponle menor prioridad.</p>
        </div>
      </div>
    </div>
  )
}
