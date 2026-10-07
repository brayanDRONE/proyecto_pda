import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SIN_SDP } from './resumenLote'

const AZUL = [29, 78, 216]
const GRIS = [55, 65, 81]
const VERDE = [22, 163, 74]
const ROJO = [220, 38, 38]
const NARANJA = [234, 88, 12]

const colorEstado = (e) =>
  e === 'OK' || e === 'Coincide' ? VERDE : e === 'No corresponde' || e === 'Falta' ? ROJO : NARANJA

/**
 * PDF del lote: por cada folio, tabla "Resumen documental" y "Resumen físico".
 * @param {Object} batch - lote (nombreArchivo)
 * @param {Array} comparaciones - resultado de compararLote()
 */
export function generarReporteLotePDF(batch, comparaciones) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 12
  const fecha = new Date().toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  doc.setFillColor(...AZUL)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Reporte de revisión: Folio documental vs Físico', margin, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Lote: ${batch.nombreArchivo}   |   Generado: ${fecha}`, margin, 17)

  let y = 30
  const totDoc = comparaciones.reduce((s, c) => s + c.totalDoc, 0)
  const totFis = comparaciones.reduce((s, c) => s + c.totalFis, 0)
  doc.setTextColor(...GRIS)
  doc.setFontSize(10)
  doc.text(
    `Folios revisados: ${comparaciones.length}   |   Cajas documentales: ${totDoc}   |   Cajas físicas: ${totFis}   |   Diferencia: ${totFis - totDoc}`,
    margin, y,
  )
  y += 6

  const asegurarEspacio = (alto) => {
    if (y + alto > doc.internal.pageSize.getHeight() - 12) {
      doc.addPage()
      y = 14
    }
  }

  comparaciones.forEach(c => {
    asegurarEspacio(40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...AZUL)
    doc.text(`Folio ${c.folio}`, margin, y)
    const dif = c.diferencia
    const sinDiferencias = dif === 0 && !c.noCorresponden &&
      c.documental.every(d => c.revisionVisual || d.estado === 'OK')
    doc.setFontSize(9)
    doc.setTextColor(...(sinDiferencias ? VERDE : ROJO))
    doc.text(
      `Documental: ${c.totalDoc}  vs  Físico: ${c.totalFis}  (dif. ${dif > 0 ? '+' : ''}${dif})` +
        (sinDiferencias ? '  |  Sin diferencias' : '') +
        (c.noCorresponden ? `  |  ${c.noCorresponden} caja(s) no corresponden al folio` : ''),
      margin + 40, y,
    )
    y += 3

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[{ content: 'Resumen documental', colSpan: 11, styles: { halign: 'left', fillColor: AZUL } }],
        ['CSG', 'Productor', 'Proceso', 'Prov. Origen', 'Comuna Origen', 'CSP', 'Especie', 'Fec. Pack', 'SDP', 'Cajas', 'Cajas físicas']],
      body: [
        ...c.documental.map(d => [
          d.csg, d.productor, d.proceso || '-', d.provOrigen, d.comunaOrigen, d.csp,
          d.especie, d.fechaPack, d.sector || SIN_SDP, d.cajas,
          c.revisionVisual ? 'Visual' : { content: `${d.cajasFisicas} (${d.estado})`, styles: { textColor: colorEstado(d.estado) } },
        ]),
        [{ content: 'TOTAL', colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: String(c.totalDoc), styles: { fontStyle: 'bold' } }, ''],
      ],
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: GRIS },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 4

    if (c.revisionVisual) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...GRIS)
      doc.text('Folio aprobado por revisión visual: no hay detalle de QR escaneados.', margin, y + 3)
      y += 10
      return
    }

    asegurarEspacio(30)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[{ content: 'Resumen físico (QR escaneados)', colSpan: 9, styles: { halign: 'left', fillColor: AZUL } }],
        ['CSG', 'Proceso', 'CSP', 'Especie / Variedad', 'Fec. Pack', 'SDP', 'Cajas', 'Estado', 'Observaci?n']],
      body: [
        ...c.fisico.map(f => [
          f.csg, f.proceso || '-', f.csp, `${f.especie} / ${f.variedad || '-'}`, f.fechaPack, f.sdp, f.cajas,
          { content: f.estado, styles: { textColor: colorEstado(f.estado), fontStyle: 'bold' } },
          f.estado === 'Coincide' ? '' : f.detalle,
        ]),
        ...(c.asignadas ? [['Asignadas manualmente (sin etiqueta)', '', '', '', '', '', c.asignadas, '', '']] : []),
        [{ content: 'TOTAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: String(c.totalFis), styles: { fontStyle: 'bold' } }, '', ''],
      ],
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: GRIS },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 10
  })

  doc.save(`Reporte_Lote_${String(batch.nombreArchivo).replace(/\.[^.]+$/, '')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
