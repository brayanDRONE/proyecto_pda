import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import { generarReporteRevisionLoteExcel } from '../utils/reportGenerator'

export default function ReportesRevisionPage() {
  const navigate = useNavigate()
  const lotesBatch = useLoteStore(state => state.obtenerLotesBatch())
  const foliosRevisados = useLoteStore(state => state.foliosRevisados)

  const lotesRevisados = lotesBatch.filter(batch => ['revisado', 'revisado-con-observaciones'].includes(batch.estado))

  const descargarReporte = (batch) => {
    const revisiones = foliosRevisados.filter(revision => revision.batchId === batch.id)
    generarReporteRevisionLoteExcel(batch, revisiones)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-blue-700 text-white p-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-blue-200 text-sm mb-1">
          ← Volver
        </button>
        <h1 className="text-xl font-bold">Reportes de revisión</h1>
        <p className="text-blue-200 text-xs mt-1">Descarga el reporte consolidado por lote revisado</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {lotesRevisados.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
              No hay lotes revisados todavía.
            </div>
          ) : (
            lotesRevisados.map(batch => (
              <div key={batch.id} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{batch.nombreArchivo}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {batch.totalFolios} folios · {batch.foliosRevisados}/{batch.totalFolios} revisados
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Estado: {batch.estado}</p>
                  </div>
                  <button
                    onClick={() => descargarReporte(batch)}
                    className="shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm"
                  >
                    Descargar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}