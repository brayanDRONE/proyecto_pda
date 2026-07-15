import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import * as XLSX from 'xlsx'
import { exportarExcelConObservaciones } from '../utils/reportGenerator'

export default function ReportPage() {
  const navigate = useNavigate()
  const [exportando, setExportando] = useState(false)

  const obtenerReporteConsolidado = useLoteStore(state => state.obtenerReporteConsolidado)
  const foliosRevisados = useLoteStore(state => state.foliosRevisados)
  const archivoOriginal = useLoteStore(state => state.archivoOriginal)
  const lotes = useLoteStore(state => state.lotes)
  const resetear = useLoteStore(state => state.resetear)

  const reporte = obtenerReporteConsolidado()
  const tieneConDiferencias = reporte.totalEscaneado !== reporte.totalDeclarado

  const manejarDescargarExcel = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([
        ['REPORTE CONSOLIDADO DE INSPECCIÓN SAG'],
        [`Fecha: ${new Date().toLocaleDateString('es-CL')}`],
        [`Total de folios revisados: ${reporte.numFolios}`],
        [],
        ['RESUMEN GENERAL'],
        ['Cajas Declaradas', reporte.totalDeclarado],
        ['Cajas Escaneadas', reporte.totalEscaneado],
        ['Diferencia', reporte.diferencia],
        ['Cantidad Física', reporte.cantidadFisica],
        ['CSGs con diferencias', reporte.conDiferencias],
        [],
        ['DETALLE POR FOLIO'],
        ['Folio', 'Decl.', 'Scan.', 'Diferencia', 'CSGs Diff.'],
        ...reporte.folios.map(f => [
          f.folio, f.totalDeclarado, f.totalEscaneado, f.diferencia, f.csgsConDiferencias,
        ]),
        [],
        ['TIPOS DE ANOMALÍAS'],
        ...Object.entries(reporte.tiposAnomalia || {}).map(([tipo, count]) => [tipo, count]),
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Consolidado')
      XLSX.writeFile(wb, `Reporte_Consolidado_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.xlsx`)
    } catch (error) {
      alert('Error al generar reporte: ' + error.message)
    }
  }

  if (reporte.folios.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-4">No hay folios revisados</p>
        <button
          onClick={() => navigate('/')}
          className="py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          ← Volver
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className={`text-white p-4 ${tieneConDiferencias ? 'bg-red-600' : 'bg-success'}`}>
        <h1 className="text-2xl font-bold">Reporte Consolidado</h1>
        <p className="text-sm text-opacity-90 mt-1">{reporte.numFolios} folios revisados</p>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Badge de estado general */}
          <div className={`p-4 rounded-lg text-center ${
            tieneConDiferencias
              ? 'bg-red-50 border border-red-200'
              : 'bg-success bg-opacity-10 border border-success border-opacity-30'
          }`}>
            <div className="text-3xl mb-2">
              {tieneConDiferencias ? '⚠️' : '✓'}
            </div>
            <p className={`text-lg font-bold ${
              tieneConDiferencias ? 'text-red-800' : 'text-success'
            }`}>
              {reporte.estadoFinal}
            </p>
          </div>

          {/* Estadísticas principales */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Estadísticas Consolidadas</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Folios Revisados:</span>
                <span className="font-bold text-lg text-gray-900">{reporte.numFolios}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Cajas Declaradas:</span>
                <span className="font-bold text-lg text-gray-900">{reporte.totalDeclarado}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Cajas Escaneadas:</span>
                <span className={`font-bold text-lg ${
                  reporte.totalEscaneado === reporte.totalDeclarado
                    ? 'text-success'
                    : 'text-error'
                }`}>
                  {reporte.totalEscaneado}
                </span>
              </div>

              {reporte.totalEscaneado !== reporte.totalDeclarado && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-semibold">Diferencia Total:</span>
                  <span className={`font-bold text-lg ${
                    reporte.diferencia > 0 ? 'text-warning' : 'text-error'
                  }`}>
                    {reporte.diferencia > 0 ? '+' : ''}{reporte.diferencia}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-600">CSGs con Diferencias:</span>
                <span className="font-bold text-lg text-warning">{reporte.conDiferencias}</span>
              </div>
            </div>
          </div>

          {/* Detalle por folio */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Detalle por Folio</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-2">Folio</th>
                    <th className="text-center p-2">Decl.</th>
                    <th className="text-center p-2">Scan.</th>
                    <th className="text-center p-2">Dif.</th>
                    <th className="text-center p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.folios.map((folio, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="p-2 font-semibold text-gray-900">{folio.folio}</td>
                      <td className="text-center p-2">{folio.totalDeclarado}</td>
                      <td className="text-center p-2">{folio.totalEscaneado}</td>
                      <td className="text-center p-2 font-semibold">{folio.diferencia}</td>
                      <td className="text-center p-2">
                        {folio.totalEscaneado === folio.totalDeclarado ? (
                          <span className="text-success font-bold">✓ OK</span>
                        ) : folio.totalEscaneado > folio.totalDeclarado ? (
                          <span className="text-warning font-bold">↑ EXCESO</span>
                        ) : (
                          <span className="text-error font-bold">↓ FALTA</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tipos de anomalías */}
          {Object.keys(reporte.tiposAnomalia || {}).length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Tipos de Anomalías Detectadas</h3>
              <div className="space-y-2">
                {Object.entries(reporte.tiposAnomalia).map(([tipo, count]) => (
                  <div key={tipo} className="flex justify-between items-center p-2 bg-orange-50 rounded border border-orange-200">
                    <span className="text-gray-800 font-semibold">{tipo}:</span>
                    <span className="text-orange-700 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-blue-800">
            <p>ℹ️ Este reporte incluye todos los folios revisados en esta sesión.</p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="p-4 bg-white border-t border-gray-200 space-y-3">
        <button
          onClick={manejarDescargarExcel}
          className="w-full py-3 px-4 bg-green-600 text-white rounded-lg
                     font-semibold text-base hover:bg-green-700
                     transition-all duration-200 active:scale-95"
          style={{ minHeight: '48px' }}
        >
          📊 Descargar Reporte Nuevo
        </button>

        {archivoOriginal && foliosRevisados.length > 0 && (
          <button
            disabled={exportando}
            onClick={async () => {
              setExportando(true)
              try {
                const ultimoRev = foliosRevisados[foliosRevisados.length - 1]
                const folioData = lotes[ultimoRev.folioId] || { folio: ultimoRev.folioId }
                await exportarExcelConObservaciones(
                  archivoOriginal,
                  folioData,
                  ultimoRev.resumenCSG || {},
                  ultimoRev.cajasAsignadas || {}
                )
              } catch (err) {
                alert('Error al exportar: ' + err.message)
              } finally {
                setExportando(false)
              }
            }}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg
                       font-semibold text-base hover:bg-blue-700
                       transition-all duration-200 active:scale-95 disabled:opacity-60"
            style={{ minHeight: '48px' }}
          >
            {exportando ? '⏳ Exportando...' : '📎 Exportar Excel original con observaciones'}
          </button>
        )}

        <button
          onClick={() => { resetear(); navigate('/') }}
          className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg
                     font-semibold text-base hover:bg-gray-300
                     transition-all duration-200 active:scale-95"
          style={{ minHeight: '44px' }}
        >
          🏠 Nueva inspección
        </button>
      </div>
    </div>
  )
}
