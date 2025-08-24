import { Content } from 'pdfmake/interfaces';
import { testInvoiceData, formatCurrency, formatDate, getInvoiceTotals } from './dataTestPdf';

// Método para crear el contenido del PDF con tabla
export function createInvoiceTableContent(): Content {
  const totals = getInvoiceTotals(testInvoiceData);
  
  const content: Content = [
    // Título del documento
    {
      text: 'REPORTE DE FACTURAS PENDIENTES',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 20]
    },
    
    // Información de resumen
    {
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'Resumen General', style: 'subheader', margin: [0, 0, 0, 10] },
            { text: `Total Facturas: ${totals.cantidadFacturas}`, margin: [0, 2] },
            { text: `Facturas Vencidas: ${totals.facturasVencidas}`, margin: [0, 2] },
            { text: `Fecha de Generación: ${formatDate(new Date())}`, margin: [0, 2] }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'Totales', style: 'subheader', margin: [0, 0, 0, 10] },
            { text: `Total Facturado: ${formatCurrency(totals.totalFacturado)}`, margin: [0, 2] },
            { text: `Total Vencido: ${formatCurrency(totals.totalVencido)}`, margin: [0, 2], color: 'red' },
            { text: `Total Crédito: ${formatCurrency(totals.totalCredito)}`, margin: [0, 2] }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
    },
    
    // Tabla principal
    {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          // Encabezados
          [
            { text: 'Cliente', style: 'tableHeader' },
            { text: 'ID Factura', style: 'tableHeader' },
            { text: 'Valor', style: 'tableHeader' },
            { text: 'Fecha Aprob.', style: 'tableHeader' },
            { text: 'Período', style: 'tableHeader' },
            { text: 'Días Mora', style: 'tableHeader' },
            { text: 'Tipo Pago', style: 'tableHeader' },
            { text: 'Estado', style: 'tableHeader' },
            { text: 'Valor Vencido', style: 'tableHeader' }
          ],
          // Datos
          ...testInvoiceData.map(invoice => [
            { text: invoice.nombreCliente, fontSize: 8 },
            { text: invoice.idFactura, fontSize: 8 },
            { text: formatCurrency(invoice.valor), fontSize: 8, alignment: 'right' },
            { text: formatDate(invoice.fechaAprobacion), fontSize: 8 },
            { text: invoice.periodoPago, fontSize: 8 },
            { 
              text: invoice.diasMora.toString(), 
              fontSize: 8, 
              alignment: 'center',
              color: invoice.diasMora > 0 ? 'red' : 'black'
            },
            { text: invoice.tipoPago, fontSize: 8 },
            { 
              text: invoice.vencido ? 'VENCIDO' : 'AL DÍA', 
              fontSize: 8,
              color: invoice.vencido ? 'red' : 'green',
              bold: true
            },
            { 
              text: formatCurrency(invoice.valorVencido), 
              fontSize: 8, 
              alignment: 'right',
              color: invoice.valorVencido > 0 ? 'red' : 'black'
            }
          ])
        ]
      },
      layout: {
        fillColor: function (rowIndex: number) {
          return (rowIndex % 2 === 0 && rowIndex > 0) ? '#f3f3f3' : null;
        },
        hLineWidth: function (i: number, node: any) {
          return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
        },
        vLineWidth: function () {
          return 0.5;
        },
        hLineColor: function () {
          return '#dddddd';
        },
        vLineColor: function () {
          return '#dddddd';
        },
        paddingTop: function () {
          return 4;
        },
        paddingBottom: function () {
          return 4;
        }
      }
    },
    
    // Nota al pie
    {
      text: '* Los valores en rojo indican facturas vencidas que requieren atención inmediata.',
      fontSize: 8,
      italics: true,
      margin: [0, 20, 0, 0]
    }
  ];
  
  return content;
}

// Estilos para el documento
export const documentStyles = {
  header: {
    fontSize: 18,
    bold: true
  },
  subheader: {
    fontSize: 14,
    bold: true
  },
  tableHeader: {
    bold: true,
    fontSize: 9,
    color: 'white',
    fillColor: '#2c3e50'
  }
};