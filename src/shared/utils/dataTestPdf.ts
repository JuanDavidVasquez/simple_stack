export interface InvoiceData {
  nombreCliente: string;
  direccion: string;
  periodoPago: string;
  credito: number;
  tipoPago: string;
  idFactura: string;
  valor: number;
  fechaAprobacion: Date;
  diasMora: number;
  valorMoneda: string;
  vencido: boolean;
  valorTotal: number;
  direccionValor: string;
  valorVencido: number;
  direccionVencido: string;
}

export const testInvoiceData: InvoiceData[] = [
  {
    nombreCliente: 'Empresa ABC S.A.',
    direccion: 'Calle 100 #45-67, Bogotá',
    periodoPago: '30 días',
    credito: 5000000,
    tipoPago: 'Transferencia',
    idFactura: 'FAC-2025-001',
    valor: 1250000,
    fechaAprobacion: new Date('2025-01-15'),
    diasMora: 5,
    valorMoneda: 'COP',
    vencido: true,
    valorTotal: 1250000,
    direccionValor: 'Banco Nacional',
    valorVencido: 1250000,
    direccionVencido: 'Calle 100 #45-67'
  },
  {
    nombreCliente: 'Comercial XYZ Ltda.',
    direccion: 'Av. El Dorado #68-23, Bogotá',
    periodoPago: '45 días',
    credito: 8000000,
    tipoPago: 'Cheque',
    idFactura: 'FAC-2025-002',
    valor: 3500000,
    fechaAprobacion: new Date('2025-01-20'),
    diasMora: 0,
    valorMoneda: 'COP',
    vencido: false,
    valorTotal: 3500000,
    direccionValor: 'Banco Internacional',
    valorVencido: 0,
    direccionVencido: 'N/A'
  },
  {
    nombreCliente: 'Distribuidora Norte S.A.S.',
    direccion: 'Carrera 15 #93-45, Bogotá',
    periodoPago: '60 días',
    credito: 15000000,
    tipoPago: 'Transferencia',
    idFactura: 'FAC-2025-003',
    valor: 7850000,
    fechaAprobacion: new Date('2024-12-10'),
    diasMora: 42,
    valorMoneda: 'COP',
    vencido: true,
    valorTotal: 7850000,
    direccionValor: 'Banco Comercial',
    valorVencido: 7850000,
    direccionVencido: 'Carrera 15 #93-45'
  },
  {
    nombreCliente: 'Importadora Global Ltda.',
    direccion: 'Calle 72 #10-34, Bogotá',
    periodoPago: '30 días',
    credito: 10000000,
    tipoPago: 'Efectivo',
    idFactura: 'FAC-2025-004',
    valor: 2100000,
    fechaAprobacion: new Date('2025-01-25'),
    diasMora: 0,
    valorMoneda: 'COP',
    vencido: false,
    valorTotal: 2100000,
    direccionValor: 'Oficina Principal',
    valorVencido: 0,
    direccionVencido: 'N/A'
  },
  {
    nombreCliente: 'Servicios Técnicos S.A.',
    direccion: 'Av. Caracas #45-67, Bogotá',
    periodoPago: '15 días',
    credito: 3000000,
    tipoPago: 'Transferencia',
    idFactura: 'FAC-2025-005',
    valor: 890000,
    fechaAprobacion: new Date('2025-01-05'),
    diasMora: 12,
    valorMoneda: 'COP',
    vencido: true,
    valorTotal: 890000,
    direccionValor: 'Banco Popular',
    valorVencido: 890000,
    direccionVencido: 'Av. Caracas #45-67'
  },
  {
    nombreCliente: 'Constructora del Sur Ltda.',
    direccion: 'Calle 13 #68-74, Bogotá',
    periodoPago: '90 días',
    credito: 25000000,
    tipoPago: 'Letra de cambio',
    idFactura: 'FAC-2025-006',
    valor: 15750000,
    fechaAprobacion: new Date('2024-11-01'),
    diasMora: 0,
    valorMoneda: 'COP',
    vencido: false,
    valorTotal: 15750000,
    direccionValor: 'Fiduciaria Central',
    valorVencido: 0,
    direccionVencido: 'N/A'
  },
  {
    nombreCliente: 'Alimentos del Campo S.A.S.',
    direccion: 'Carrera 30 #45-12, Bogotá',
    periodoPago: '30 días',
    credito: 6000000,
    tipoPago: 'Transferencia',
    idFactura: 'FAC-2025-007',
    valor: 4200000,
    fechaAprobacion: new Date('2024-12-20'),
    diasMora: 28,
    valorMoneda: 'COP',
    vencido: true,
    valorTotal: 4200000,
    direccionValor: 'Banco Agrario',
    valorVencido: 4200000,
    direccionVencido: 'Carrera 30 #45-12'
  },
  {
    nombreCliente: 'Tecnología Avanzada Ltda.',
    direccion: 'Av. 19 #114-65, Bogotá',
    periodoPago: '45 días',
    credito: 12000000,
    tipoPago: 'Transferencia',
    idFactura: 'FAC-2025-008',
    valor: 9500000,
    fechaAprobacion: new Date('2025-01-10'),
    diasMora: 7,
    valorMoneda: 'COP',
    vencido: true,
    valorTotal: 9500000,
    direccionValor: 'Banco Digital',
    valorVencido: 9500000,
    direccionVencido: 'Av. 19 #114-65'
  }
];

// Función helper para formatear valores monetarios
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Función helper para formatear fechas
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Función para obtener totales
export function getInvoiceTotals(data: InvoiceData[]) {
  return {
    totalFacturado: data.reduce((sum, item) => sum + item.valor, 0),
    totalVencido: data.reduce((sum, item) => sum + item.valorVencido, 0),
    totalCredito: data.reduce((sum, item) => sum + item.credito, 0),
    cantidadFacturas: data.length,
    facturasVencidas: data.filter(item => item.vencido).length
  };
}



