import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import WedgeScanner from '../components/WedgeScanner'
import { parsearExcelSAG } from '../utils/excelParser'

export default function HomePage() {
  const navigate = useNavigate()
  const {
    cargarLote,
    obtenerResumenFolios,
    iniciarRevision,
    foliosRevisados,
    resetear,
    obtenerReporteConsolidado
  } = useLoteStore()

  const [archivoYaCargado, setArchivoYaCargado] = useState(false)
  const [folioEnRevision, setFolioEnRevision] = useState(null)
  const [mensajeFolio, setMensajeFolio] = useState('')

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const datos = await parsearExcelSAG(file)
      cargarLote(datos)
      setArchivoYaCargado(true)
      setMensajeFolio('')
    } catch (error) {
      setMensajeFolio(`Error: ${error.message}`)
    }
  }

  const procesarEscaneoFolio = (folioEscaneado) => {
    const resumen = obtenerResumenFolios()
    const folioEncontrado = resumen.find(
      (f) => f.folio.toString() === folioEscaneado.trim()
    )

    if (folioEncontrado) {
      setFolioEnRevision(folioEncontrado.folio)
      iniciarRevision(folioEncontrado.folio)
      setMensajeFolio('')
      // Navegar a detalle
      navigate(`/folio/${folioEncontrado.folio}/detail`)
    } else {
      setMensajeFolio(`❌ Folio no encontrado: ${folioEscaneado}`)
    }
  }

  const resumen = obtenerResumenFolios()
  const hayFoliosRevisados = foliosRevisados && foliosRevisados.length > 0

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      className="min-h-screen bg-gray-100">

      {/* Header compacto */}
      <div className="bg-blue-700 text-white px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-bold leading-tight">🏢 Inspección SAG</h1>
        <p className="text-blue-200 text-xs mt-0.5">Sistema control pallet SAG</p>
      </div>

      <div className="px-3 py-3 space-y-3">

        {/* Carga de archivo */}
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            📂 Cargar planilla Excel
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <span
              className="bg-blue-600 text-white text-sm font-semibold rounded-lg px-4 py-3 active:bg-blue-700"
              style={{ minHeight: '48px', display: 'flex', alignItems: 'center' }}
            >
              Elegir archivo
            </span>
            <span className="text-gray-500 text-sm truncate flex-1">
              {archivoYaCargado ? '✅ Archivo cargado' : 'Sin archivo'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Mensajes */}
        {mensajeFolio && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">
            {mensajeFolio}
          </div>
        )}

        {/* Contenido post-carga */}
        {archivoYaCargado && (
          <>
            {/* Scanner de folio */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                🔫 Escanea el folio del pallet físico
              </p>
              <WedgeScanner onScanComplete={procesarEscaneoFolio} />
            </div>

            {/* Lista de folios */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                📋 Folios disponibles ({resumen.length})
              </p>
              <div className="space-y-2">
                {resumen.map((item) => {
                  const revisado = foliosRevisados?.some(r => r.folioId?.toString() === item.folio?.toString())
                  return (
                    <button
                      key={item.folio}
                      onClick={() => {
                        setFolioEnRevision(item.folio)
                        iniciarRevision(item.folio)
                        navigate(`/folio/${item.folio}/detail`)
                      }}
                      className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-all active:scale-95 ${
                        revisado
                          ? 'border-green-500 bg-green-50'
                          : folioEnRevision?.toString() === item.folio?.toString()
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                      style={{ minHeight: '60px' }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-base">
                          {item.folio}
                        </span>
                        {revisado && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
                            ✓ Revisado
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>📦 {item.totalDeclarado ?? 0} cajas</span>
                        <span>📄 {item.numLineas ?? 0} líneas</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Folios revisados */}
            {hayFoliosRevisados && (
              <div className="bg-green-50 rounded-xl shadow border-2 border-green-400 p-4">
                <p className="text-sm font-semibold text-green-900 mb-3">
                  ✅ Revisados en esta sesión ({foliosRevisados.length})
                </p>
                <div className="space-y-2 mb-3">
                  {foliosRevisados.map((rev) => (
                    <div
                      key={rev.folioId}
                      className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-green-200"
                    >
                      <span className="font-semibold text-green-900 text-sm">{rev.folioId}</span>
                      <span className="text-xs text-green-700">
                        {Array.isArray(rev.cajasEscaneadas)
                          ? rev.cajasEscaneadas.length
                          : Object.keys(rev.cajasEscaneadas || {}).length} cajas
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/report', { state: { reporte: obtenerReporteConsolidado() } })}
                  className="w-full bg-green-600 text-white font-bold rounded-xl py-3 active:bg-green-700"
                  style={{ minHeight: '52px' }}
                >
                  📊 Generar Reporte Consolidado
                </button>
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-2 pb-4">
              <button
                onClick={() => {
                  setArchivoYaCargado(false)
                  setFolioEnRevision(null)
                  setMensajeFolio('')
                  resetear()
                }}
                className="w-full bg-gray-200 text-gray-800 font-semibold rounded-xl py-3 active:bg-gray-300"
                style={{ minHeight: '52px' }}
              >
                🔄 Nueva Inspección
              </button>
              <button
                onClick={() => navigate('/debug-scanner')}
                className="w-full bg-yellow-100 text-yellow-800 font-semibold rounded-xl py-2 active:bg-yellow-200 text-sm"
                style={{ minHeight: '44px' }}
              >
                🔧 Diagnóstico Scanner
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
