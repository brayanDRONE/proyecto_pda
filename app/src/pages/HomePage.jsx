import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import { parsearExcelSAG } from '../utils/excelParser'
import AlertBanner from '../components/AlertBanner'
import WedgeScanner from '../components/WedgeScanner'

/**
 * Página de inicio: carga de archivo Excel + escaneo directo de folio
 * Flujo mejorado:
 * 1. Usuario carga Excel
 * 2. WedgeScanner se activa
 * 3. Usuario escanea folio físico
 * 4. Sistema navega automáticamente a ese folio
 */
export default function HomePage() {
  const navigate = useNavigate()
  const cargarLote = useLoteStore(state => state.cargarLote)
  const obtenerResumenFolios = useLoteStore(state => state.obtenerResumenFolios)
  const iniciarRevision = useLoteStore(state => state.iniciarRevision)
  const resetear = useLoteStore(state => state.resetear)
  const foliosRevisados = useLoteStore(state => state.foliosRevisados)
  const obtenerReporteConsolidado = useLoteStore(state => state.obtenerReporteConsolidado)

  const [archivos, setArchivos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [éxito, setÉxito] = useState(false)
  const [archivoYaCargado, setArchivoYaCargado] = useState(false)
  const [mensajeFolio, setMensajeFolio] = useState('')
  const [folioEnRevision, setFolioEnRevision] = useState(null)
  const lotes = useLoteStore(state => state.lotes)

  const manejarSeleccionArchivo = (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setArchivos(archivo)
    setError(null)
    setÉxito(false)
  }



  const manejarCarga = async () => {
    if (!archivos) {
      setError('Por favor selecciona un archivo Excel')
      return
    }

    setCargando(true)
    setError(null)

    try {
      // Parsear el Excel
      const loteParsado = await parsearExcelSAG(archivos)

      // Validar que tenga folios
      const numFolios = Object.keys(loteParsado).length
      if (numFolios === 0) {
        throw new Error('El archivo no contiene folios válidos')
      }

      // Cargar en el store
      cargarLote(loteParsado)
      setÉxito(true)
      setArchivoYaCargado(true)
      setMensajeFolio('✓ Archivo cargado. Ahora escanea el folio del pallet...')

      // No navegar, dejar que el usuario escanee el folio
    } catch (err) {
      console.error('Error cargando archivo:', err)
      setError(err.message || 'Error al procesar el archivo Excel')
    } finally {
      setCargando(false)
    }
  }

  // Procesar escaneo del folio
  const procesarEscaneoFolio = (contenidoEscaneado) => {
    try {
      // El folio viene escaneado del código de barras/QR
      const folioEscaneado = contenidoEscaneado.trim()

      if (!folioEscaneado) {
        setMensajeFolio('Error: folio vacío')
        return false
      }

      // Obtener los folios cargados
      const folios = obtenerResumenFolios()
      const folioEncontrado = folios.find(f => 
        f.folio.toLowerCase() === folioEscaneado.toLowerCase()
      )

      if (!folioEncontrado) {
        setMensajeFolio(`⚠️ Folio ${folioEscaneado} no encontrado en el archivo`)
        return false
      }

      // Marcar folio en revisión (verde)
      setFolioEnRevision(folioEncontrado.folio)
      setMensajeFolio(`✓ Folio ${folioEscaneado} encontrado! Iniciando revisión...`)
      iniciarRevision(folioEncontrado.folio)
      
      // Navegar después de 800ms para que vea el mensaje en verde
      setTimeout(() => {
        navigate(`/folio/${folioEncontrado.folio}/detail`)
      }, 800)

      return true
    } catch (error) {
      console.error('Error procesando escaneo:', error)
      setMensajeFolio('Error al procesar escaneo del folio')
      return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 text-center">
        <h1 className="text-2xl font-bold">SAG Pallet Inspector</h1>
        <p className="text-sm text-blue-100 mt-1">Inspección y validación de pallets</p>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6 overflow-y-auto">
        {!archivoYaCargado ? (
          <>
            {/* Sección de carga de archivo */}
            {/* Ícono */}
            <div className="text-6xl">📦</div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Carga tu planilla SAG
            </h2>

            {/* Descripción */}
            <p className="text-gray-600 text-center max-w-xs">
              Selecciona el archivo Excel con la descripción de lote para comenzar la inspección
            </p>

            {/* Input de archivo */}
            <div className="w-full max-w-xs">
              <label className="block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={manejarSeleccionArchivo}
                  disabled={cargando}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg
                             file:mr-3 file:py-2 file:px-4 file:rounded
                             file:bg-blue-600 file:text-white file:font-semibold
                             file:border-0 file:cursor-pointer
                             hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
              {archivos && (
                <p className="text-xs text-gray-600 mt-2">
                  📄 {archivos.name}
                </p>
              )}
            </div>



            {/* Alertas */}
            {error && (
              <AlertBanner tipo="error" mensaje={error} visible={true} />
            )}
            {éxito && (
              <AlertBanner tipo="success" mensaje="Archivo cargado correctamente" visible={true} />
            )}

            {/* Botón de carga */}
            <button
              onClick={manejarCarga}
              disabled={!archivos || cargando}
              className={`
                w-full max-w-xs py-3 px-4 rounded-lg font-semibold text-base
                transition-all duration-200 active:scale-95
                ${
                  archivos && !cargando
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
              style={{ minHeight: '48px' }}
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⌛</span> Cargando...
                </span>
              ) : (
                '▶ Continuar'
              )}
            </button>
          </>
        ) : (
          <>
            {/* Sección después de cargar: Resumen de folios + Escaneo */}
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Escanea el folio del pallet
            </h2>

            {/* Resumen de folios cargados */}
            <div className="w-full max-w-2xl bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">
                📊 Folios cargados ({Object.keys(lotes).length})
              </h3>
              
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {Object.values(lotes).map((folio, idx) => {
                  const totalCajas = folio.lineas.reduce((sum, l) => sum + l.cajasDeclaradas, 0)
                  const esEnRevision = folioEnRevision === folio.folio
                  
                  return (
                    <div
                      key={idx}
                      className={`
                        p-3 rounded-lg border-2 transition-all
                        ${
                          esEnRevision
                            ? 'bg-success bg-opacity-10 border-success text-success'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">{folio.folio}</p>
                          <p className="text-xs">
                            {folio.lineas.length} productor{folio.lineas.length !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{totalCajas}</p>
                          <p className="text-xs">cajas</p>
                        </div>
                        {esEnRevision && (
                          <span className="text-lg ml-2">✓</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totales */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm font-semibold text-gray-900">
                  <span>Total de folios:</span>
                  <span>{Object.keys(lotes).length}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 mt-1">
                  <span>Total de cajas:</span>
                  <span>
                    {Object.values(lotes).reduce((sum, f) => 
                      sum + f.lineas.reduce((s, l) => s + l.cajasDeclaradas, 0), 0
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* WedgeScanner */}
            <div className="w-full max-w-xs">
              <WedgeScanner
                onScanComplete={procesarEscaneoFolio}
                isActive={true}
              />
            </div>

            {/* Mensaje de estado del folio */}
            {mensajeFolio && (
              <AlertBanner
                tipo={
                  mensajeFolio.includes('⚠️') ? 'warning' :
                  mensajeFolio.includes('✓') ? 'success' :
                  'info'
                }
                mensaje={mensajeFolio}
                visible={true}
              />
            )}

            {/* Sección de folios revisados - mostrar cuando hay revisiones */}
            {foliosRevisados.length > 0 && (
              <div className="w-full max-w-2xl bg-green-50 border border-green-300 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">
                  ✓ Folios revisados ({foliosRevisados.length})
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {foliosRevisados.map(fol => (
                    <div key={fol.folioId} className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-semibold">
                      {fol.folioId}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-green-700 mb-3">
                  Continúa escaneando folios o genera el reporte consolidado.
                </p>
                <button
                  onClick={() => {
                    const reporte = obtenerReporteConsolidado()
                    // Guardar reporte en store o pasar por navegación
                    navigate('/report', { state: { reporte } })
                  }}
                  className="w-full py-2 px-4 bg-success text-white rounded-lg
                             font-semibold text-sm hover:bg-green-600
                             transition-all duration-200 active:scale-95"
                  style={{ minHeight: '44px' }}
                >
                  📊 Generar Reporte Consolidado
                </button>
              </div>
            )}

            {/* Botones de acción */}
            <div className="w-full max-w-xs space-y-2">
              <button
                onClick={() => navigate('/folios')}
                className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg
                           font-semibold text-sm hover:bg-gray-300
                           transition-all duration-200 active:scale-95"
                style={{ minHeight: '44px' }}
              >
                📋 O selecciona de la lista
              </button>

              <button
                onClick={() => {
                  setArchivoYaCargado(false)
                  setFolioEnRevision(null)
                  setMensajeFolio('')
                  resetear()
                }}
                className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg
                           font-semibold text-sm hover:bg-gray-200
                           transition-all duration-200 active:scale-95"
                style={{ minHeight: '44px' }}
              >
                ← Cargar otro archivo
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-gray-500 border-t">
        <p>Versión 1.0 • App de inspección SAG</p>
      </div>
    </div>
  )
}
