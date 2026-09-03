/**
 * pdfReport.js
 * Genera el PDF de revisión de pallet con:
 *  - Encabezado con número de folio y fecha/hora
 *  - Tabla comparativa: Folio Documental vs Folio Físico (por CSG)
 *  - Recuadro de observaciones
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Paleta de colores corporativa ───────────────────────────────────────────
const AZUL     = [37, 99, 235]   // blue-600
const AZUL_OSC = [29, 78, 216]   // blue-700
const GRIS_OSC = [55, 65, 81]    // gray-700
const GRIS_CLA = [243, 244, 246] // gray-100
const BLANCO   = [255, 255, 255]
const VERDE    = [22, 163, 74]   // green-600
const ROJO     = [220, 38, 38]   // red-600
const NARANJA  = [234, 88, 12]   // orange-600
const AMARILLO = [161, 98, 7]    // yellow-700

/**
 * Devuelve color de texto según estado de una fila CSG
 */
function colorEstado(estado) {
  switch (estado) {
    case 'OK':       return VERDE
    case 'FALTA':    return ROJO
    case 'EXCESO':   return AMARILLO
    case 'ANOMALÍA': return NARANJA
    default:         return GRIS_OSC
  }
}

/**
 * Genera y descarga el PDF de revisión del pallet.
 *
 * @param {Object} params
 * @param {string}  params.folio          - Número de folio
 * @param {Object}  params.resumenCSG     - Objeto resumenCSG del store
 * @param {Object}  params.estadisticas   - Objeto estadísticas del store
 * @param {string}  params.observaciones  - Texto de observaciones (puede venir vacío)
 * @param {Object}  params.folioData      - Objeto folio completo (para datos del pallet)
 */
export function generarReportePDF({ folio, resumenCSG, estadisticas, observaciones = '', folioData }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentW = pageW - margin * 2
  const now = new Date()
  const fechaHora = now.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // ── 1. Encabezado ───────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL_OSC)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(...BLANCO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('REPORTE DE REVISIÓN DE PALLET', margin, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Folio: ${folio}`, margin, 18)
  doc.text(`Fecha: ${fechaHora}`, pageW - margin, 18, { align: 'right' })

  // ── 2. Bloque de resumen general ────────────────────────────────────────────
  let y = 34

  const items = resumenCSG ? Object.values(resumenCSG) : []
  const totalDeclarado  = estadisticas?.totalDeclarado  ?? 0
  const totalEscaneado  = estadisticas?.totalEscaneado  ?? 0
  const totalAsignadas  = estadisticas?.totalAsignadas  ?? 0
  const totalEfectivo   = totalEscaneado + totalAsignadas
  const diferencia      = totalEfectivo - totalDeclarado
  const estadoGeneral   = diferencia === 0 ? 'OK' : diferencia > 0 ? 'EXCESO' : 'FALTA'

  const colW  = contentW / 4
  const cards = [
    { label: 'Total Declarado',   value: totalDeclarado, color: AZUL },
    { label: 'Cajas Escaneadas',  value: totalEscaneado, color: GRIS_OSC },
    { label: 'Asignadas (etiq.)', value: totalAsignadas, color: NARANJA },
    { label: 'Diferencia neta',   value: diferencia >= 0 ? `+${diferencia}` : `${diferencia}`, color: colorEstado(estadoGeneral) },
  ]

  cards.forEach((card, i) => {
    const x = margin + i * colW
    doc.setFillColor(...GRIS_CLA)
    doc.roundedRect(x, y, colW - 2, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...card.color)
    doc.text(String(card.value), x + (colW - 2) / 2, y + 10, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS_OSC)
    doc.text(card.label, x + (colW - 2) / 2, y + 16, { align: 'center' })
  })

  y += 24

  // ── 3. Título sección comparativa ───────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...AZUL_OSC)
  doc.text('COMPARATIVA: FOLIO DOCUMENTAL vs FOLIO FÍSICO', margin, y)
  y += 2

  // ── 4. Tabla comparativa por CSG ────────────────────────────────────────────
  const head = [['CSG', 'Productor', 'Especie', 'Variedad', 'Fec. Pack', 'Sector', 'Decl.', 'Scan.', 'Asig.', 'Dif.', 'Estado']]

  const body = items.map(item => {
    const ef  = item.cajasEscaneadas + (item.cajasAsignadas || 0)
    const dif = ef - item.cajasDeclaradas
    return [
      item.csg || '—',
      item.productor || '—',
      item.especie || '—',
      item.varComercial || '—',
      item.fechaPack || '—',
      item.sector || '—',
      item.cajasDeclaradas,
      item.cajasEscaneadas,
      item.cajasAsignadas > 0 ? item.cajasAsignadas : '—',
      dif > 0 ? `+${dif}` : `${dif}`,
      item.estado,
    ]
  })

  autoTable(doc, {
    startY: y + 2,
    head,
    body,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: AZUL,
      textColor: BLANCO,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },   // CSG
      1: { cellWidth: 30 },                        // Productor
      2: { cellWidth: 16 },                        // Especie
      3: { cellWidth: 20 },                        // Variedad
      4: { cellWidth: 16, halign: 'center' },      // Fec. Pack
      5: { cellWidth: 14, halign: 'center' },      // Sector
      6: { cellWidth: 10, halign: 'center' },      // Decl
      7: { cellWidth: 10, halign: 'center' },      // Scan
      8: { cellWidth: 10, halign: 'center' },      // Asig
      9: { cellWidth: 10, halign: 'center' },      // Dif
      10: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }, // Estado
    },
    // Colorear celda Estado y fila según resultado
    didParseCell(data) {
      if (data.section === 'body') {
        const estado = items[data.row.index]?.estado
        if (data.column.index === 10) {
          const [r, g, b] = colorEstado(estado)
          data.cell.styles.textColor = [r, g, b]
        }
        if (estado === 'FALTA')    data.cell.styles.fillColor = [254, 242, 242]
        if (estado === 'EXCESO')   data.cell.styles.fillColor = [254, 252, 232]
        if (estado === 'ANOMALÍA') data.cell.styles.fillColor = [255, 247, 237]
      }
    },
  })

  y = doc.lastAutoTable.finalY + 8

  // ── 5. Composición del pallet (folio documental) ────────────────────────────
  if (folioData?.lineas?.length > 0) {
    // Verificar si hay espacio suficiente, si no → nueva página
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...AZUL_OSC)
    doc.text('COMPOSICIÓN DEL PALLET (FOLIO DOCUMENTAL)', margin, y)
    y += 2

    const headDoc = [['CSG', 'Productor', 'Especie', 'Variedad', 'Fec. Pack', 'Sector', 'CSP', 'Cajas Decl.']]
    const bodyDoc = folioData.lineas.map(l => [
      l.csg || '—',
      l.productor || '—',
      l.especie || '—',
      l.varComercial || '—',
      l.fechaPack || '—',
      l.sector || '—',
      l.csp || '—',
      l.cajasDeclaradas,
    ])

    autoTable(doc, {
      startY: y + 2,
      head: headDoc,
      body: bodyDoc,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
      headStyles: { fillColor: GRIS_OSC, textColor: BLANCO, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 18 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' },
      },
    })

    y = doc.lastAutoTable.finalY + 8
  }

  // ── 6. Recuadro de observaciones ────────────────────────────────────────────
  const obsHeight = 35
  if (y + obsHeight + 20 > doc.internal.pageSize.getHeight()) {
    doc.addPage()
    y = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...AZUL_OSC)
  doc.text('OBSERVACIONES', margin, y)
  y += 4

  // Fondo recuadro
  doc.setFillColor(255, 251, 235) // amber-50
  doc.setDrawColor(217, 119, 6)   // amber-600
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, y, contentW, obsHeight, 2, 2, 'FD')

  if (observaciones && observaciones.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS_OSC)
    const lines = doc.splitTextToSize(observaciones.trim(), contentW - 6)
    doc.text(lines, margin + 3, y + 6)
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(156, 163, 175) // gray-400
    doc.text('Sin observaciones registradas.', margin + 3, y + 6)
  }

  y += obsHeight + 6

  // ── 7. Pie de página ────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const ph = doc.internal.pageSize.getHeight()
    doc.setFillColor(...GRIS_CLA)
    doc.rect(0, ph - 10, pageW, 10, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS_OSC)
    doc.text('Sistema de Inspección SAG — Generado automáticamente', margin, ph - 4)
    doc.text(`Pág. ${p} / ${totalPages}`, pageW - margin, ph - 4, { align: 'right' })
  }

  // ── 8. Descargar ────────────────────────────────────────────────────────────
  const nombreArchivo = `Reporte_Pallet_${folio}_${now.toISOString().slice(0, 10)}.pdf`
  doc.save(nombreArchivo)
}
