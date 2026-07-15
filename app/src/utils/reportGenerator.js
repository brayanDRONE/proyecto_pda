import * as XLSX from 'xlsx'

/**
 * Generador de reportes Excel con estilos
 * Colorea filas según tipo de diferencia
 */

/**
 * Generar reporte Excel descargable
 * @param {Object} folio - { folio, totalDeclarado, lineas, ... }
 * @param {Object} statsRevision - { totalEscaneado, conDiferencias, ... }
 * @param {Object} cajasEscaneadas - cajas registradas
 * @param {Object} resumenCSG - resumen por CSG
 */
export function generarReporteExcel(folio, statsRevision, cajasEscaneadas, resumenCSG) {
  try {
    // Crear workbook
    const wb = XLSX.utils.book_new()
    
    // Hoja 1: Reporte detallado
    const wsReporte = crearHojaReporte(folio, statsRevision, cajasEscaneadas, resumenCSG)
    XLSX.utils.book_append_sheet(wb, wsReporte, 'Reporte')
    
    // Hoja 2: Resumen por CSG
    const wsResumen = crearHojaResumen(resumenCSG)
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por CSG')
    
    // Descargar
    const nombreArchivo = `Reporte_${folio.folio}_${obtenerFechaFormato()}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    
  } catch (error) {
    console.error('Error al generar reporte:', error)
    throw error
  }
}

/**
 * Crear hoja con reporte detallado
 */
function crearHojaReporte(folio, stats, cajasEscaneadas, resumenCSG) {
  const datos = []
  
  // Encabezado con datos generales
  datos.push(['REPORTE DE INSPECCIÓN SAG'])
  datos.push([])
  datos.push(['Folio:', folio.folio])
  datos.push(['Total Declarado:', folio.totalDeclarado])
  datos.push(['Total Escaneado:', stats.totalEscaneado])
  datos.push(['Cantidad Física:', stats.cantidadFisica || '-'])
  datos.push(['Estado:', stats.totalEscaneado === folio.totalDeclarado ? 'OK ✓' : 'DIFERENCIA ✗'])
  datos.push([])
  
  // Encabezados de tabla
  datos.push(['CSG', 'Productor', 'Cajas Decl.', 'Cajas Scan.', 'Dif.', 'Estado', 'Observación'])
  
  // Llenar con datos por CSG
  Object.values(resumenCSG).forEach(item => {
    const diferencia = item.cajasEscaneadas - item.cajasDeclaradas
    datos.push([
      item.csg,
      item.productor,
      item.cajasDeclaradas,
      item.cajasEscaneadas,
      diferencia,
      item.estado,
      obtenerObservacion(item),
    ])
  })
  
  // Fila final de resumen
  const totalEscan = Object.values(resumenCSG).reduce((sum, r) => sum + r.cajasEscaneadas, 0)
  const totalDecl = Object.values(resumenCSG).reduce((sum, r) => sum + r.cajasDeclaradas, 0)
  
  datos.push([])
  datos.push(['REAL:', totalEscan, 'DECLARADO:', totalDecl])
  
  // Convertir a worksheet
  const ws = XLSX.utils.aoa_to_sheet(datos)
  
  // Aplicar estilos (colores de fondo)
  aplicarEstilos(ws, datos, resumenCSG)
  
  // Ajustar ancho de columnas
  ws['!cols'] = [
    { wch: 15 },  // CSG
    { wch: 25 },  // Productor
    { wch: 12 },  // Cajas Decl
    { wch: 12 },  // Cajas Scan
    { wch: 8 },   // Dif
    { wch: 12 },  // Estado
    { wch: 30 },  // Observación
  ]
  
  return ws
}

/**
 * Crear hoja con resumen por CSG
 */
function crearHojaResumen(resumenCSG) {
  const datos = []
  
  datos.push(['RESUMEN POR CSG'])
  datos.push([])
  datos.push(['CSG', 'Productor', 'Cajas Declaradas', 'Cajas Escaneadas', 'Estado'])
  
  Object.values(resumenCSG).forEach(item => {
    datos.push([
      item.csg,
      item.productor,
      item.cajasDeclaradas,
      item.cajasEscaneadas,
      item.estado,
    ])
  })
  
  const ws = XLSX.utils.aoa_to_sheet(datos)
  ws['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
  ]
  
  return ws
}

/**
 * Aplicar estilos de color a las celdas
 */
function aplicarEstilos(ws, datos, resumenCSG) {
  // Mapeo de colores
  const colores = {
    OK: 'C6EFCE',        // Verde claro
    EXCESO: 'FFFF99',    // Amarillo
    FALTA: 'FF9999',     // Rojo claro
    ANOMALÍA: 'FFD580',  // Naranja
    HEADER: 'D3D3D3',    // Gris
  }
  
  let filaActual = 9 // La tabla comienza en fila 9 (después de metadata)
  
  Object.values(resumenCSG).forEach((item, idx) => {
    const fila = filaActual + idx
    const color = colores[item.estado] || 'FFFFFF'
    
    // Aplicar color a todas las celdas de la fila
    for (let col = 0; col < 7; col++) {
      const celda = XLSX.utils.encode_cell({ r: fila, c: col })
      if (!ws[celda]) ws[celda] = { t: 's', v: '' }
      ws[celda].s = {
        fill: { fgColor: { rgb: color } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      }
    }
  })
}

/**
 * Generar observación según estado
 */
function obtenerObservacion(item) {
  if (item.estado === 'OK') {
    return 'Sin diferencias'
  } else if (item.estado === 'EXCESO') {
    return `Exceso: ${item.cajasEscaneadas - item.cajasDeclaradas} cajas adicionales`
  } else if (item.estado === 'FALTA') {
    return `Falta: ${item.cajasDeclaradas - item.cajasEscaneadas} cajas`
  } else if (item.estado === 'ANOMALÍA') {
    return `Anomalía en campos: ${item.diferencias.map(d => d.campo).join(', ')}`
  }
  return ''
}

/**
 * Obtener fecha en formato dd/mm/yyyy
 */
function obtenerFechaFormato() {
  const hoy = new Date()
  return `${String(hoy.getDate()).padStart(2, '0')}${String(hoy.getMonth() + 1).padStart(2, '0')}${hoy.getFullYear()}`
}

/**
 * Exportar el Excel original cargado con una hoja adicional "Observaciones SAG"
 * @param {File}   archivoOriginal  - archivo File del Excel subido
 * @param {Object} folioData        - { folio, totalDeclarado, lineas }
 * @param {Object} resumenCSG       - resumen con estados y diferencias
 * @param {Object} cajasAsignadas   - { csg: { cantidad, motivo } }
 */
export async function exportarExcelConObservaciones(archivoOriginal, folioData, resumenCSG, cajasAsignadas = {}) {
  try {
    // Leer archivo original
    const buffer = await archivoOriginal.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })

    // Agregar hoja de observaciones SAG
    const filas = [
      ['OBSERVACIONES REVISIÓN SAG'],
      [`Folio: ${folioData.folio}`],
      [`Fecha revisión: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}`],
      [],
      ['CSG', 'Productor', 'Especie', 'Variedad', 'Cajas Decl.', 'Cajas Scan.', 'Asignadas', 'Dif.', 'Estado', 'Observación'],
    ]

    Object.values(resumenCSG).forEach(item => {
      const asig = cajasAsignadas[item.csg]
      const totalEfectivo = item.cajasEscaneadas + (item.cajasAsignadas || 0)
      const diferencia = totalEfectivo - item.cajasDeclaradas
      filas.push([
        item.csg,
        item.productor,
        item.especie || '',
        item.varComercial || '',
        item.cajasDeclaradas,
        item.cajasEscaneadas,
        item.cajasAsignadas || 0,
        diferencia,
        item.estado,
        asig ? `Etiq. ausente: ${asig.motivo}` : obtenerObservacion(item),
      ])
    })

    // Agregar columna "Estado SAG" en la primera hoja del original
    const nombreHojaOriginal = wb.SheetNames[0]
    const wsOriginal = wb.Sheets[nombreHojaOriginal]
    const range = XLSX.utils.decode_range(wsOriginal['!ref'] || 'A1')

    // Encabezado en columna siguiente al último
    const colEstado = range.e.c + 1
    const celdaHeader = XLSX.utils.encode_cell({ r: 0, c: colEstado })
    wsOriginal[celdaHeader] = { t: 's', v: 'Estado SAG' }

    // Actualizar rango
    range.e.c = colEstado
    wsOriginal['!ref'] = XLSX.utils.encode_range(range)

    // Agregar hoja de observaciones
    const wsObs = XLSX.utils.aoa_to_sheet(filas)
    wsObs['!cols'] = [
      { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 6 },
      { wch: 14 }, { wch: 35 },
    ]
    XLSX.utils.book_append_sheet(wb, wsObs, 'Observaciones SAG')

    // Descargar
    const nombreBase = archivoOriginal.name.replace(/\.(xlsx|xls)$/i, '')
    XLSX.writeFile(wb, `${nombreBase}_revisado_${obtenerFechaFormato()}.xlsx`)

  } catch (error) {
    console.error('Error exportando Excel con observaciones:', error)
    throw error
  }
}
