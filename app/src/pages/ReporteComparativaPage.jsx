import { useParams, useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import { generarReporteComparativaExcel } from '../utils/reportGenerator'

const ESTADO_COLOR = {
  OK: 'bg-green-100 text-green-800',
  EXCESO: 'bg-yellow-100 text-yellow-800',
  FALTA: 'bg-red-100 text-red-800',
  'ANOMALÍA': 'bg-orange-100 text-orange-800',
}

const ESTADO_LABEL = {
  OK: '✓ OK',
  EXCESO: '↑ Exceso',
  FALTA: '↓ Falta',
  'ANOMALÍA': '⚡ Anomalía',
}

export default function ReporteComparativaPage() {
  const { folioId } = useParams()
  const navigate = useNavigate()

  const lotes = useLoteStore(state => state.lotes)
  const foliosRevisados = useLoteStore(state => state.foliosRevisados)

  // Buscar la revisión guardada para este folio
  const revisionGuardada = foliosRevisados.find(r => r.folioId === folioId)
  const resumenCSG = revisionGuardada?.resumenCSG || {}
  const estadisticas = revisionGuardada?.estadisticas || {}
  const folio = lotes[folioId]

  const filas = Object.values(resumenCSG)
  const hayDiferencias = filas.some(f => f.estado !== 'OK')
  const totalEscaneadas = filas.reduce((s, f) => s + (f.cajasEscaneadas || 0), 0)
  const totalDeclaradas = filas.reduce((s, f) => s + (f.cajasDeclaradas || 0), 0)

  const handleDescargar = () => {
    try {
      generarReporteComparativaExcel(folioId, resumenCSG)
    } catch {
      alert('Error al generar el Excel.')
    }
  }

  if (!revisionGuardada) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-gray-500 text-center">No se encontró revisión para el folio {folioId}.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Cabecera */}
      <header
        className={`px-4 py-4 text-white ${hayDiferencias ? 'bg-orange-600' : 'bg-green-600'}`}
      >
        <h1 className="text-lg font-bold">Reporte de Revisión</h1>
        <p className="text-sm opacity-90">Folio: {folioId}</p>
        <p className="text-xs opacity-80 mt-1">
          {hayDiferencias ? '⚠ Se encontraron diferencias' : '✓ Sin diferencias'}
        </p>
      </header>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-white border-b">
        <div className="text-center">
          <p className="text-xs text-gray-500">Declaradas</p>
          <p className="text-xl font-bold text-gray-800">{totalDeclaradas}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Escaneadas</p>
          <p className={`text-xl font-bold ${totalEscaneadas === totalDeclaradas ? 'text-green-600' : 'text-red-600'}`}>
            {totalEscaneadas}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Diferencia</p>
          <p className={`text-xl font-bold ${totalEscaneadas - totalDeclaradas === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalEscaneadas - totalDeclaradas > 0 ? '+' : ''}{totalEscaneadas - totalDeclaradas}
          </p>
        </div>
      </div>

      {/* Tabla comparativa */}
      <div className="flex-1 overflow-auto px-2 py-3">
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full bg-white text-xs">
            <thead className="bg-gray-100">
              <tr>
                {[
                  'CSG', 'Provincia', 'Comuna', 'CSP',
                  'Especie', 'Variedad', 'Fecha', 'Escaneadas', 'Declaradas', 'Estado',
                ].map(h => (
                  <th
                    key={h}
                    className="px-2 py-2 text-left font-semibold text-gray-600 border-b whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((item, idx) => (
                <tr
                  key={item.csg}
                  className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-2 py-2 font-mono font-medium">{item.csg}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {item.provOrigen || <span className="text-gray-400 italic">No encontrado</span>}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {item.comunaOrigen || <span className="text-gray-400 italic">No encontrado</span>}
                  </td>
                  <td className="px-2 py-2 font-mono">{item.csp || '-'}</td>
                  <td className="px-2 py-2">{item.especie || '-'}</td>
                  <td className="px-2 py-2">{item.varComercial || '-'}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{item.fechaPack || '-'}</td>
                  <td className="px-2 py-2 text-center font-semibold">{item.cajasEscaneadas}</td>
                  <td className="px-2 py-2 text-center">{item.cajasDeclaradas}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                        ESTADO_COLOR[item.estado] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {ESTADO_LABEL[item.estado] || item.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filas.length === 0 && (
          <p className="text-center text-gray-400 py-8">Sin datos de revisión.</p>
        )}
      </div>

      {/* Acciones */}
      <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex gap-3">
        <button
          onClick={handleDescargar}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm"
        >
          📥 Descargar Excel
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm"
        >
          🏠 Inicio
        </button>
      </div>
    </div>
  )
}
