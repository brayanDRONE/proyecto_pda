import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import WedgeScanner from '../components/WedgeScanner'
import AlertBanner from '../components/AlertBanner'
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
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏢 Inspección SAG
          </h1>
          <p className="text-gray-600">
            Carga Excel de pallets y escanea folios para iniciar inspección
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-2 block">
              Cargar archivo de inspección (.xlsx)
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-900
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100
                         cursor-pointer"
              style={{ minHeight: '44px' }}
            />
          </label>
        </div>

        {/* Messages */}
        {mensajeFolio && <AlertBanner message={mensajeFolio} type="error" />}

        {/* File Loaded Content */}
        {archivoYaCargado && (
          <div className="space-y-6">
            {/* Resumen de Folios */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                📋 Folios a Inspeccionar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {resumen.map((folio) => (
                  <div
                    key={folio.folio}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      folioEnRevision === folio.folio
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                    }`}
                    onClick={() => {
                      setFolioEnRevision(folio.folio)
                      iniciarRevision(folio.folio)
                      navigate(`/folio/${folio.folio}/detail`)
                    }}
                  >
                    <div className="font-bold text-gray-900">
                      Folio: {folio.folio}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Productores: {folio.productores}
                    </div>
                    <div className="text-sm text-gray-600">
                      Cajas: {folio.cajas}
                    </div>
                  </div>
                ))}
              </div>

              {/* Folio Scanning */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-3">
                  🔫 Escanea el folio para comenzar
                </p>
                <WedgeScanner onScanComplete={procesarEscaneoFolio} />
              </div>
            </div>

            {/* Folios Revisados Section */}
            {hayFoliosRevisados && (
              <div className="bg-green-50 rounded-lg shadow-md p-6 border-2 border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  ✅ Folios Revisados ({foliosRevisados.length})
                </h3>
                <div className="space-y-2 mb-4">
                  {foliosRevisados.map((rev) => (
                    <div
                      key={rev.folioId}
                      className="flex justify-between items-center bg-white rounded p-3 border border-green-200"
                    >
                      <span className="font-medium text-green-900">
                        Folio {rev.folioId}
                      </span>
                      <span className="text-sm text-green-700">
                        {rev.cajasEscaneadas.length} cajas escaneadas
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-green-700 mb-3">
                  Continúa escaneando folios o genera el reporte consolidado.
                </p>
                <button
                  onClick={() => {
                    const reporte = obtenerReporteConsolidado()
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

            {/* Action Buttons */}
            <div className="w-full space-y-2">
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
                🔄 Nueva Inspección
              </button>

              <button
                onClick={() => navigate('/debug-scanner')}
                className="w-full py-2 px-4 bg-yellow-100 text-yellow-800 rounded-lg
                           font-semibold text-sm hover:bg-yellow-200
                           transition-all duration-200 active:scale-95"
                style={{ minHeight: '44px' }}
              >
                🔧 Debug Scanner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
