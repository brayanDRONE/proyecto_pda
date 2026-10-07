import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import { compararLote } from '../utils/resumenLote'
import { generarReporteLotePDF } from '../utils/reporteLotePdf'

export default function ReportesRevisionPage() {
  const navigate = useNavigate()
  const obtenerLotesBatch = useLoteStore(state => state.obtenerLotesBatch)
  const foliosRevisados = useLoteStore(state => state.foliosRevisados)
  const lotes = useLoteStore(state => state.lotes)
  const lotesBatch = obtenerLotesBatch()

  const lotesRevisados = lotesBatch.filter(batch => ['revisado', 'revisado-con-observaciones'].includes(batch.estado))

  const descargarPDF = (batch) => {
    generarReporteLotePDF(batch, compararLote(batch, lotes, foliosRevisados))
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-blue-700 text-white p-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-blue-200 text-sm mb-1">
          ← Volver
        </button>
        <h1 className="text-xl font-bold">Reportes de revisión</h1>
        <p className="text-blue-200 text-xs mt-1">Descarga el reporte PDF por lote revisado</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto w-full space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white rounded-2xl shadow border-2 border-blue-100 p-5
                       text-left active:scale-95 transition-transform hover:border-blue-400"
            style={{ minHeight: '110px' }}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">📄</span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-lg">Regresar al menú</p>
                <p className="text-gray-500 text-sm mt-1">
                  Vuelve al home para seleccionar jefatura, operador o diagnósticos.
                </p>
              </div>
            </div>
          </button>

          {lotesRevisados.length === 0 ? (
            <div className="bg-white rounded-2xl shadow border-2 border-dashed border-gray-300 p-6 text-center">
              <div className="text-4xl mb-3">🗂</div>
              <p className="font-bold text-gray-900 text-lg">No hay lotes revisados</p>
              <p className="text-gray-500 text-sm mt-1">
                Cuando termines una revisión completa, aquí aparecerá el reporte descargable del lote.
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 w-full bg-blue-600 text-white font-bold rounded-xl py-3 active:bg-blue-700"
              >
                Ir al menú principal
              </button>
            </div>
          ) : (
            lotesRevisados.map(batch => (
              <div
                key={batch.id}
                className="w-full bg-white rounded-2xl shadow border-2 border-green-100 p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">📊</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-lg truncate">{batch.nombreArchivo}</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {batch.totalFolios} folios · {batch.foliosRevisados}/{batch.totalFolios} revisados
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => descargarPDF(batch)}
                    className="w-full bg-blue-600 text-white font-bold rounded-xl py-3 px-4 text-base
                               flex items-center justify-center gap-2 active:scale-95"
                  >
                    📄 Descargar PDF
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