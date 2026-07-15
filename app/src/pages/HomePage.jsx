import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import WedgeScanner from '../components/WedgeScanner'
import { parsearExcelSAG } from '../utils/excelParser'
import { fetchLotes, crearLote, tieneBackend } from '../utils/api'

const VISTA = {
  PRINCIPAL: 'principal',
  JEFATURA:  'jefatura',
  OPERADOR:  'operador',          // lista de lotes (batches)
  LOTE_DETALLE: 'lote-detalle',  // folios dentro de un lote específico
}

export default function HomePage() {
  const navigate = useNavigate()
  const {
    cargarLote,
    cargarLotesDesdeAPI,
    obtenerResumenFolios,
    obtenerLotesBatch,
    iniciarRevision,
    foliosRevisados,
    resetear,
    obtenerReporteConsolidado,
  } = useLoteStore()

  const [vista, setVista] = useState(VISTA.PRINCIPAL)
  const [loteSeleccionado, setLoteSeleccionado] = useState(null) // batch activo en detalle
  const [mensajeError, setMensajeError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')
  const [subiendoAPI, setSubiendoAPI] = useState(false)

  // Cargar lotes desde API al montar
  useEffect(() => {
    if (!tieneBackend()) return
    fetchLotes()
      .then(data => { if (data.length > 0) cargarLotesDesdeAPI(data) })
      .catch(() => {})
  }, [])

  const lotesBatch = obtenerLotesBatch()
  const hayLotes = lotesBatch.length > 0
  const hayRevisados = foliosRevisados && foliosRevisados.length > 0
  const lotesPendientes = lotesBatch.filter(b => ['pendiente', 'en-revision'].includes(b.estado))

  const irAlFolio = (folioId) => {
    iniciarRevision(folioId)
    navigate(`/folio/${folioId}/detail`)
  }

  // ── Pantalla principal ─────────────────────────────────────────────────────
  if (vista === VISTA.PRINCIPAL) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="bg-blue-700 text-white px-4 py-4 sticky top-0 z-10">
          <h1 className="text-xl font-bold">🏢 Inspección SAG</h1>
          <p className="text-blue-200 text-xs mt-0.5">
            {tieneBackend() ? '🌐 Modo conectado' : '📱 Modo offline'}
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center px-4 py-6 max-w-md mx-auto w-full space-y-4">

          {/* Jefatura */}
          <button
            onClick={() => { setMensajeError(''); setMensajeOk(''); setVista(VISTA.JEFATURA) }}
            className="w-full bg-white rounded-2xl shadow border-2 border-blue-100 p-6
                       text-left active:scale-95 transition-transform hover:border-blue-400"
            style={{ minHeight: '110px' }}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">📋</span>
              <div>
                <p className="font-bold text-gray-900 text-lg">Jefatura / Supervisor</p>
                <p className="text-gray-500 text-sm mt-1">
                  Cargar planilla Excel y crear solicitudes de inspección
                </p>
                {hayLotes && (
                  <p className="text-blue-600 text-xs font-semibold mt-2">
                    {lotesBatch.length} lote(s) cargado(s) · {lotesPendientes.length} pendiente(s)
                  </p>
                )}
              </div>
            </div>
          </button>

          {/* Operador */}
          <button
            onClick={() => { setMensajeError(''); setVista(VISTA.OPERADOR) }}
            className={`w-full bg-white rounded-2xl shadow border-2 p-6
                       text-left active:scale-95 transition-transform
                       ${lotesPendientes.length > 0 ? 'border-green-400 hover:border-green-500' : 'border-gray-200'}`}
            style={{ minHeight: '110px' }}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">🔫</span>
              <div>
                <p className="font-bold text-gray-900 text-lg">Operador / PDA</p>
                <p className="text-gray-500 text-sm mt-1">
                  Seleccionar lote pendiente e iniciar revisión con scanner
                </p>
                {lotesPendientes.length > 0 ? (
                  <p className="text-green-600 text-xs font-semibold mt-2">
                    ● {lotesPendientes.length} lote(s) disponible(s)
                  </p>
                ) : (
                  <p className="text-gray-400 text-xs mt-2">Sin lotes pendientes</p>
                )}
              </div>
            </div>
          </button>

          {/* Reporte */}
          {hayRevisados && (
            <div className="bg-green-50 rounded-2xl border-2 border-green-300 p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">
                ✅ {foliosRevisados.length} folio(s) revisado(s) en esta sesión
              </p>
              <button
                onClick={() => navigate('/report', { state: { reporte: obtenerReporteConsolidado() } })}
                className="w-full bg-green-600 text-white font-bold rounded-xl py-3 active:bg-green-700"
              >
                📊 Generar Reporte Consolidado
              </button>
            </div>
          )}

          <button
            onClick={() => navigate('/debug-scanner')}
            className="w-full bg-gray-100 text-gray-500 font-medium rounded-xl py-2 text-sm active:bg-gray-200"
          >
            🔧 Diagnóstico Scanner
          </button>
        </div>
      </div>
    )
  }

  // ── Vista Jefatura ─────────────────────────────────────────────────────────
  if (vista === VISTA.JEFATURA) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header titulo="Jefatura · Solicitudes de inspección" onBack={() => setVista(VISTA.PRINCIPAL)} />

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 max-w-2xl mx-auto w-full">

          {/* Cargar planilla */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-bold text-gray-800 mb-1">Nueva solicitud de inspección</h2>
            <p className="text-xs text-gray-500 mb-4">
              Los folios del Excel quedarán en estado <strong>Pendiente</strong> y aparecerán en la vista del Operador.
            </p>

            {mensajeOk && <Alerta tipo="ok" texto={mensajeOk} onClose={() => setMensajeOk('')} />}
            {mensajeError && <Alerta tipo="error" texto={mensajeError} onClose={() => setMensajeError('')} />}

            <label className="flex items-center gap-3 cursor-pointer mt-3">
              <span
                className={`text-white text-sm font-semibold rounded-xl px-5 py-3 flex items-center ${subiendoAPI ? 'bg-gray-400' : 'bg-blue-600 active:bg-blue-700'}`}
                style={{ minHeight: '48px' }}
              >
                {subiendoAPI ? '⏳ Procesando...' : '📂 Elegir archivo Excel'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={subiendoAPI}
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  setMensajeError('')
                  setMensajeOk('')
                  setSubiendoAPI(true)
                  try {
                    const datos = await parsearExcelSAG(file)
                    cargarLote(datos, file)
                    const n = Object.keys(datos).length
                    setMensajeOk(`✅ ${n} folio(s) cargados como pendientes`)
                    if (tieneBackend()) {
                      for (const folio of Object.values(datos)) {
                        try {
                          await crearLote(file, {
                            folio_id: folio.folio, totalDeclarado: folio.totalDeclarado,
                            lineas: folio.lineas, nombre_archivo: file.name,
                          })
                        } catch (err) { if (!err.message.includes('409')) console.warn(err.message) }
                      }
                    }
                    e.target.value = ''
                  } catch (err) {
                    setMensajeError(`Error: ${err.message}`)
                  } finally {
                    setSubiendoAPI(false)
                  }
                }}
              />
            </label>
          </div>

          {/* Lista de lotes cargados */}
          {hayLotes && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Lotes cargados ({lotesBatch.length})</h3>
              <div className="space-y-3">
                {lotesBatch.map(batch => (
                  <div key={batch.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-gray-900 text-sm truncate flex-1 mr-2">
                        📁 {batch.nombreArchivo}
                      </p>
                      <EstadoBadge estado={batch.estado} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {batch.totalFolios} folio(s) · {batch.totalCajas} cajas totales · {batch.foliosRevisados}/{batch.totalFolios} revisados
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cargado: {new Date(batch.fechaCarga).toLocaleString('es-CL')}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { if (window.confirm('¿Limpiar todos los lotes?')) { resetear(); setMensajeOk('') } }}
                className="mt-3 w-full text-sm text-gray-500 bg-gray-100 rounded-lg py-2 active:bg-gray-200"
              >
                🗑 Limpiar todo
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Vista Operador: lista de lotes ─────────────────────────────────────────
  if (vista === VISTA.OPERADOR) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header titulo="Operador · Seleccionar lote" onBack={() => setVista(VISTA.PRINCIPAL)} />

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 max-w-2xl mx-auto w-full">

          {mensajeError && <Alerta tipo="error" texto={mensajeError} onClose={() => setMensajeError('')} />}

          {/* Scanner rápido */}
          {hayLotes && (
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                🔫 Escanea el código del folio para ir directo
              </p>
              <WedgeScanner
                onScanComplete={(codigo) => {
                  const resumen = obtenerResumenFolios()
                  const encontrado = resumen.find(f => f.folio.toString() === codigo.trim())
                  if (encontrado) { irAlFolio(encontrado.folio) }
                  else { setMensajeError(`❌ Folio no encontrado: ${codigo}`); return false }
                }}
              />
            </div>
          )}

          {/* Lotes pendientes */}
          {lotesPendientes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                Lotes pendientes de inspección ({lotesPendientes.length})
              </p>
              {lotesPendientes.map(batch => (
                <button
                  key={batch.id}
                  onClick={() => { setLoteSeleccionado(batch); setVista(VISTA.LOTE_DETALLE) }}
                  className="w-full bg-white text-left rounded-xl shadow border-2 border-gray-200
                             px-4 py-4 active:scale-95 hover:border-blue-400 hover:bg-blue-50 transition-all"
                  style={{ minHeight: '88px' }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-bold text-gray-900 text-base truncate">
                        📁 {batch.nombreArchivo}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {batch.totalFolios} folio(s) · {batch.totalCajas} cajas
                      </p>
                      <p className="text-xs text-gray-400">
                        {batch.foliosRevisados}/{batch.totalFolios} revisados
                      </p>
                    </div>
                    <EstadoBadge estado={batch.estado} />
                  </div>
                  <p className="text-xs text-blue-600 font-semibold mt-2">
                    Tap para ver folios →
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <p className="text-4xl mb-3">⏳</p>
              <p className="text-gray-700 font-semibold">Sin lotes pendientes</p>
              <p className="text-gray-400 text-sm mt-1">La jefatura debe cargar una planilla Excel primero</p>
              <button
                onClick={() => setVista(VISTA.JEFATURA)}
                className="mt-4 bg-blue-600 text-white text-sm font-semibold rounded-xl px-5 py-2 active:bg-blue-700"
              >
                Ir a cargar planilla
              </button>
            </div>
          )}

          {/* Lotes revisados */}
          {lotesBatch.filter(b => ['revisado', 'revisado-con-observaciones'].includes(b.estado)).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Revisados</p>
              {lotesBatch
                .filter(b => ['revisado', 'revisado-con-observaciones'].includes(b.estado))
                .map(batch => (
                  <button
                    key={batch.id}
                    onClick={() => { setLoteSeleccionado(batch); setVista(VISTA.LOTE_DETALLE) }}
                    className="w-full bg-white text-left rounded-xl border border-gray-200 px-4 py-3
                               active:scale-95 hover:border-gray-300 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-700 text-sm truncate mr-2">{batch.nombreArchivo}</p>
                      <EstadoBadge estado={batch.estado} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {batch.foliosRevisados}/{batch.totalFolios} folios · {batch.totalCajas} cajas
                    </p>
                  </button>
                ))}
            </div>
          )}

          {hayRevisados && (
            <button
              onClick={() => navigate('/report', { state: { reporte: obtenerReporteConsolidado() } })}
              className="w-full bg-green-600 text-white font-bold rounded-xl py-3 active:bg-green-700 shadow"
            >
              📊 Generar Reporte Consolidado
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Vista Detalle del Lote: folios dentro del batch ────────────────────────
  if (vista === VISTA.LOTE_DETALLE && loteSeleccionado) {
    const batch = lotesBatch.find(b => b.id === loteSeleccionado.id) || loteSeleccionado
    const foliosPend = batch.foliosDetalle.filter(f => ['pendiente', 'en-revision'].includes(f.estado))
    const foliosRev   = batch.foliosDetalle.filter(f => ['revisado', 'revisado-con-observaciones'].includes(f.estado))

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header
          titulo={`Lote: ${batch.nombreArchivo}`}
          subtitulo={`${batch.totalFolios} folios · ${batch.foliosRevisados}/${batch.totalFolios} revisados`}
          onBack={() => setVista(VISTA.OPERADOR)}
        />

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 max-w-2xl mx-auto w-full">

          {/* Progreso del lote */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Progreso del lote</span>
              <EstadoBadge estado={batch.estado} />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${batch.totalFolios > 0 ? (batch.foliosRevisados / batch.totalFolios) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {batch.foliosRevisados} de {batch.totalFolios} folios revisados
            </p>
          </div>

          {/* Folios pendientes */}
          {foliosPend.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                Pendientes de revisión ({foliosPend.length})
              </p>
              {foliosPend.map(item => (
                <button
                  key={item.folio}
                  onClick={() => irAlFolio(item.folio)}
                  className="w-full bg-white text-left rounded-xl border-2 border-gray-200
                             px-4 py-4 active:scale-95 hover:border-blue-500 hover:bg-blue-50 transition-all"
                  style={{ minHeight: '72px' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900 text-base">{item.folio}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        📦 {item.totalDeclarado} cajas · {item.numLineas} productor(es)
                      </p>
                    </div>
                    <EstadoBadge estado={item.estado} />
                  </div>
                  <p className="text-xs text-blue-600 font-semibold mt-2">
                    Tap para iniciar revisión →
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Folios ya revisados */}
          {foliosRev.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                Ya revisados ({foliosRev.length})
              </p>
              {foliosRev.map(item => (
                <div
                  key={item.folio}
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-700">{item.folio}</p>
                    <p className="text-xs text-gray-400">{item.totalDeclarado} cajas</p>
                  </div>
                  <EstadoBadge estado={item.estado} />
                </div>
              ))}
            </div>
          )}

          {foliosPend.length === 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-bold text-green-800">Lote completamente revisado</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function Header({ titulo, subtitulo, onBack }) {
  return (
    <div className="bg-blue-700 text-white px-4 py-3 sticky top-0 z-10">
      {onBack && (
        <button onClick={onBack} className="text-blue-200 text-sm mb-0.5">← Volver</button>
      )}
      <h1 className="text-lg font-bold leading-tight">{titulo}</h1>
      {subtitulo && <p className="text-blue-200 text-xs">{subtitulo}</p>}
    </div>
  )
}

function EstadoBadge({ estado }) {
  const conf = {
    'pendiente':                  { bg: 'bg-gray-100',    text: 'text-gray-600',   label: 'Pendiente' },
    'en-revision':                { bg: 'bg-blue-100',   text: 'text-blue-800',   label: '🔄 En revisión' },
    'revisado':                   { bg: 'bg-green-100',  text: 'text-green-800',  label: '✓ Revisado' },
    'revisado-con-observaciones': { bg: 'bg-orange-100', text: 'text-orange-800', label: '⚠️ Con obs.' },
    'completado':                 { bg: 'bg-green-100',  text: 'text-green-800',  label: '✓ Completado' },
  }
  const c = conf[estado] || conf['pendiente']
  return (
    <span className={`text-xs ${c.bg} ${c.text} px-2 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0`}>
      {c.label}
    </span>
  )
}

function Alerta({ tipo, texto, onClose }) {
  const cls = tipo === 'ok'
    ? 'bg-green-50 border-green-300 text-green-700'
    : 'bg-red-50 border-red-300 text-red-700'
  return (
    <div className={`border rounded-lg px-3 py-2 text-sm flex justify-between items-start ${cls}`}>
      <span>{texto}</span>
      <button onClick={onClose} className="ml-2 font-bold opacity-60">✕</button>
    </div>
  )
}
