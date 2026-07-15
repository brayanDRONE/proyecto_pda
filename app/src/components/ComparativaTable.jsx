import { useState, Fragment } from 'react'

/**
 * Tabla comparativa CSG vs cajas escaneadas.
 * Columnas: toggle | CSG | Productor | Especie | Variedad | Fec. Pack | Sector | CSP | Decl. | Scan. | Asig. | Dif. | Estado
 * Cada fila es expandible para ver las cajas individuales escaneadas.
 */
export default function ComparativaTable({ resumenCSG = {}, onFilaClick }) {
  const [filaExpandida, setFilaExpandida] = useState(null)

  const colorEstado = (estado) => ({
    'OK':       'bg-green-50 text-green-800',
    'EXCESO':   'bg-yellow-100 text-yellow-800',
    'FALTA':    'bg-red-100 text-red-800',
    'ANOMALÍA': 'bg-orange-100 text-orange-800',
  }[estado] || 'bg-gray-50')

  const colorFila = (estado) => ({
    'EXCESO':   'bg-yellow-50',
    'FALTA':    'bg-red-50',
    'ANOMALÍA': 'bg-orange-50',
  }[estado] || '')

  const items = Object.values(resumenCSG)
  const toggleFila = (csg) => setFilaExpandida(prev => prev === csg ? null : csg)

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="p-2 w-6"></th>
            <th className="p-2 text-left font-semibold text-gray-700">CSG</th>
            <th className="p-2 text-left font-semibold text-gray-700">Productor</th>
            <th className="p-2 text-left font-semibold text-gray-700">Especie</th>
            <th className="p-2 text-left font-semibold text-gray-700">Variedad</th>
            <th className="p-2 text-left font-semibold text-gray-700">Fec. Pack</th>
            <th className="p-2 text-left font-semibold text-gray-700">Sector</th>
            <th className="p-2 text-left font-semibold text-gray-700">CSP</th>
            <th className="p-2 text-center font-semibold text-gray-700">Decl.</th>
            <th className="p-2 text-center font-semibold text-blue-700">Scan.</th>
            <th className="p-2 text-center font-semibold text-orange-700">Asig.</th>
            <th className="p-2 text-center font-semibold text-gray-700">Dif.</th>
            <th className="p-2 text-center font-semibold text-gray-700">Estado</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="13" className="p-4 text-center text-gray-500">
                Sin datos disponibles
              </td>
            </tr>
          ) : items.map((item, idx) => {
            const totalEfectivo = item.cajasEscaneadas + (item.cajasAsignadas || 0)
            const diferencia = totalEfectivo - item.cajasDeclaradas
            const diferenciaTexto = diferencia > 0 ? `+${diferencia}` : `${diferencia}`
            const expandida = filaExpandida === item.csg
            const tieneCajas = item.cajasDetalle && item.cajasDetalle.length > 0

            return (
              <Fragment key={`${item.csg}-${idx}`}>
                {/* Fila principal */}
                <tr
                  onClick={() => { if (tieneCajas) toggleFila(item.csg); onFilaClick?.(item) }}
                  className={`border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100 ${colorFila(item.estado)}`}
                  style={{ minHeight: '44px' }}
                >
                  <td className="p-2 text-center text-gray-400 text-xs">
                    {tieneCajas ? (expandida ? '▼' : '▶') : ''}
                  </td>
                  <td className="p-2 font-mono font-semibold text-gray-900">{item.csg}</td>
                  <td className="p-2 text-gray-700 max-w-[110px]">
                    <span className="block truncate" title={item.productor}>{item.productor}</span>
                  </td>
                  <td className="p-2 text-gray-700">{item.especie || '—'}</td>
                  <td className="p-2 text-gray-700">{item.varComercial || '—'}</td>
                  <td className="p-2 text-gray-600 whitespace-nowrap">{item.fechaPack || '—'}</td>
                  <td className="p-2 text-gray-600">{item.sector || '—'}</td>
                  <td className="p-2 font-mono text-gray-600">{item.csp || '—'}</td>
                  <td className="p-2 text-center font-semibold text-gray-900">{item.cajasDeclaradas}</td>
                  <td className="p-2 text-center font-semibold text-blue-600">{item.cajasEscaneadas}</td>
                  <td className="p-2 text-center font-semibold text-orange-600">
                    {item.cajasAsignadas > 0 ? item.cajasAsignadas : '—'}
                  </td>
                  <td className={`p-2 text-center font-semibold ${
                    diferencia === 0 ? 'text-gray-500' : diferencia > 0 ? 'text-yellow-700' : 'text-red-600'
                  }`}>
                    {diferenciaTexto}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap ${colorEstado(item.estado)}`}>
                      {item.estado}
                    </span>
                  </td>
                </tr>

                {/* Sub-tabla expandible: cajas individuales */}
                {expandida && tieneCajas && (
                  <tr>
                    <td colSpan="13" className="px-4 py-2 bg-blue-50">
                      <p className="text-xs font-semibold text-blue-700 mb-2">
                        Cajas escaneadas — CSG {item.csg}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-blue-100">
                              <th className="px-2 py-1 text-left text-blue-800">ID</th>
                              <th className="px-2 py-1 text-left text-blue-800">CSP</th>
                              <th className="px-2 py-1 text-left text-blue-800">Especie</th>
                              <th className="px-2 py-1 text-left text-blue-800">Variedad</th>
                              <th className="px-2 py-1 text-left text-blue-800">Fec. Pack</th>
                              <th className="px-2 py-1 text-left text-blue-800">Sector</th>
                              <th className="px-2 py-1 text-center text-blue-800">Ok</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.cajasDetalle.map((caja, ci) => (
                              <tr
                                key={`${caja.id}-${ci}`}
                                className={`border-b border-blue-200 ${caja.diferencias.length > 0 ? 'bg-orange-50' : 'bg-white'}`}
                              >
                                <td className="px-2 py-1 font-mono font-semibold">{caja.id}</td>
                                <td className="px-2 py-1 font-mono">{caja.csp || '—'}</td>
                                <td className="px-2 py-1">{caja.especie || '—'}</td>
                                <td className="px-2 py-1">{caja.variedad || '—'}</td>
                                <td className="px-2 py-1 whitespace-nowrap">{caja.fechaPack || '—'}</td>
                                <td className="px-2 py-1">{caja.sector || '—'}</td>
                                <td className="px-2 py-1 text-center">
                                  {caja.diferencias.length === 0 ? (
                                    <span className="text-green-700 font-bold">✓</span>
                                  ) : (
                                    <span
                                      className="text-orange-700 font-bold"
                                      title={caja.diferencias.map(d => `${d.campo}: ${d.valorPlanilla}→${d.valorQR}`).join(', ')}
                                    >
                                      ⚡{caja.diferencias.length}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
