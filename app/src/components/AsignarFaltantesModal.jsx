import { useState } from 'react'

/**
 * Modal para asignar cajas faltantes con motivo "Etiqueta ausente/dañada"
 *
 * Props:
 *   faltantes   - Array de { csg, productor, cajasDeclaradas, cajasEscaneadas, faltantes }
 *   onConfirmar - (asignaciones) => void — { csg: { cantidad, motivo } }
 *   onCancelar  - () => void
 */
export default function AsignarFaltantesModal({ faltantes = [], onConfirmar, onCancelar }) {
  const [asignaciones, setAsignaciones] = useState(() => {
    const init = {}
    faltantes.forEach(f => {
      init[f.csg] = { cantidad: f.faltantes, motivo: 'Etiqueta ausente/dañada', incluir: true }
    })
    return init
  })

  const toggleIncluir = (csg) => {
    setAsignaciones(prev => ({
      ...prev,
      [csg]: { ...prev[csg], incluir: !prev[csg].incluir }
    }))
  }

  const cambiarMotivo = (csg, motivo) => {
    setAsignaciones(prev => ({
      ...prev,
      [csg]: { ...prev[csg], motivo }
    }))
  }

  const confirmar = () => {
    const resultado = {}
    Object.entries(asignaciones).forEach(([csg, val]) => {
      if (val.incluir) {
        resultado[csg] = { cantidad: val.cantidad, motivo: val.motivo }
      }
    })
    onConfirmar(resultado)
  }

  const totalFaltantes = faltantes.reduce((s, f) => s + f.faltantes, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-orange-500 text-white p-4 rounded-t-2xl">
          <h2 className="text-lg font-bold">⚠️ Cajas sin escanear</h2>
          <p className="text-sm text-orange-100 mt-1">
            Se detectaron <strong>{totalFaltantes}</strong> cajas que no pudieron escanearse
          </p>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Puedes asignarlas como <strong>etiqueta ausente o dañada</strong> para cerrar la revisión.
            El reporte indicará el motivo.
          </p>

          {faltantes.map((f) => {
            const asig = asignaciones[f.csg]
            return (
              <div
                key={f.csg}
                className={`border-2 rounded-xl p-3 transition-all ${
                  asig.incluir ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                {/* Fila superior: CSG + toggle */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{f.csg}</p>
                    <p className="text-xs text-gray-500">{f.productor}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-600">Asignar</span>
                    <div
                      className={`w-11 h-6 rounded-full transition-colors ${asig.incluir ? 'bg-orange-500' : 'bg-gray-300'}`}
                      onClick={() => toggleIncluir(f.csg)}
                      style={{ position: 'relative', cursor: 'pointer' }}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${asig.incluir ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>

                {/* Detalle de cajas */}
                <div className="flex gap-3 text-xs text-gray-600 mb-2">
                  <span>Declaradas: <strong>{f.cajasDeclaradas}</strong></span>
                  <span>Escaneadas: <strong>{f.cajasEscaneadas}</strong></span>
                  <span className="text-orange-700 font-bold">Faltantes: {f.faltantes}</span>
                </div>

                {/* Selector de motivo */}
                {asig.incluir && (
                  <select
                    value={asig.motivo}
                    onChange={e => cambiarMotivo(f.csg, e.target.value)}
                    className="w-full text-sm border border-orange-300 rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option>Etiqueta ausente/dañada</option>
                    <option>Caja sin etiqueta por error de línea</option>
                    <option>Etiqueta ilegible por humedad</option>
                    <option>Caja en mal estado físico</option>
                  </select>
                )}
              </div>
            )
          })}
        </div>

        {/* Botones */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={confirmar}
            className="w-full bg-orange-500 text-white font-bold rounded-xl py-3 active:bg-orange-600 transition-all"
            style={{ minHeight: '48px' }}
          >
            ✓ Confirmar asignación y finalizar
          </button>
          <button
            onClick={onCancelar}
            className="w-full bg-gray-100 text-gray-700 font-semibold rounded-xl py-3 active:bg-gray-200 transition-all"
            style={{ minHeight: '44px' }}
          >
            ← Seguir escaneando
          </button>
        </div>
      </div>
    </div>
  )
}
