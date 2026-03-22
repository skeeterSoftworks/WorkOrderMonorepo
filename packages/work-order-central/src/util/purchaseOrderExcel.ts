import * as XLSX from 'xlsx-js-style';

const TEMPLATE_ORDER_ROW = 1; // 0-based: row 2 in Excel (order header data)

const TEMPLATE_PRODUCTS_START_ROW = 4; // first product data row
const COLS = {
  customer: 0,
  currency: 1,
  deliveryDate: 2,
  deliveryTerms: 3,
  shippingAddress: 4,
  comment: 5,
};
const PRODUCT_COLS = { product: 0, catalogueId: 1, quantity: 2, pricePerUnit: 3 };

const thinBorder = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

function applyCellStyle(
  ws: XLSX.WorkSheet,
  row: number,
  col: number,
  opts: { border?: boolean; header?: boolean },
) {
  const ref = XLSX.utils.encode_cell({ r: row, c: col });
  if (!ws[ref]) ws[ref] = { t: 's', v: '' };
  const cell = ws[ref] as XLSX.CellObject & { s?: Record<string, unknown> };
  cell.s = {
    ...(opts.border !== false && { border: thinBorder }),
    ...(opts.header && {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E8E8E8' } },
      alignment: { vertical: 'center' },
    }),
  };
}

function applyRangeBorders(
  ws: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  headerRow: number,
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      applyCellStyle(ws, r, c, {
        border: true,
        header: r === headerRow,
      });
    }
  }
}

export interface ParsedPurchaseOrder {
  customerCompanyName: string;
  currency: string;
  deliveryDate: string;
  deliveryTerms: string;
  shippingAddress: string;
  comment: string;
  productRows: {
    productNameOrId: string;
    catalogueId: string;
    quantity: number;
    pricePerUnit: number;
  }[];
}

function cell(sheet: XLSX.WorkSheet, r: number, c: number): string | number | undefined {
  const cellRef = XLSX.utils.encode_cell({ r, c });
  const cellObj = sheet[cellRef];
  if (!cellObj || cellObj.v === undefined) return undefined;
  return typeof cellObj.v === 'number' ? cellObj.v : String(cellObj.v).trim();
}

function safeNum(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const n = Number(String(val).replace(/,/g, '.'));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Build and download an Excel template for a new purchase order.
 * Row 2 = order (Customer, Currency, Delivery date, …); row 4 = product headers including Catalogue ID per line.
 */
export function downloadPurchaseOrderTemplate(): void {
  const wsData: (string | number)[][] = [
    [
      'Customer (company name)',
      'Currency',
      'Delivery date (YYYY-MM-DD)',
      'Delivery terms',
      'Shipping address',
      'Comment',
    ],
    ['', '', '', '', '', ''],
    [],
    ['Product (name or ID)', 'Catalogue ID', 'Quantity', 'Price per unit'],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const colWidths = [{ wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 28 }, { wch: 30 }];
  ws['!cols'] = colWidths;

  applyRangeBorders(ws, 0, 1, 0, 5, 0);
  applyRangeBorders(ws, 3, 8, 0, 3, 3);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase order');
  XLSX.writeFile(wb, 'purchase_order_template.xlsx');
}

/**
 * Parse an uploaded Excel file into ParsedPurchaseOrder.
 * Order on row 2; product lines from row 5 with optional Catalogue ID per product.
 */
export function parsePurchaseOrderFile(file: File): Promise<ParsedPurchaseOrder> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          reject(new Error('Failed to read file'));
          return;
        }
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        if (!sheet) {
          reject(new Error('No sheet found'));
          return;
        }
        const orderCustomer = cell(sheet, TEMPLATE_ORDER_ROW, COLS.customer);
        const orderCurrency = cell(sheet, TEMPLATE_ORDER_ROW, COLS.currency);
        const orderDeliveryDate = cell(sheet, TEMPLATE_ORDER_ROW, COLS.deliveryDate);
        const orderDeliveryTerms = cell(sheet, TEMPLATE_ORDER_ROW, COLS.deliveryTerms);
        const orderShippingAddress = cell(sheet, TEMPLATE_ORDER_ROW, COLS.shippingAddress);
        const orderComment = cell(sheet, TEMPLATE_ORDER_ROW, COLS.comment);

        const productRows: ParsedPurchaseOrder['productRows'] = [];
        let r = TEMPLATE_PRODUCTS_START_ROW;
        for (;;) {
          const productVal = cell(sheet, r, PRODUCT_COLS.product);
          const catalogueVal = cell(sheet, r, PRODUCT_COLS.catalogueId);
          const qtyVal = cell(sheet, r, PRODUCT_COLS.quantity);
          const priceVal = cell(sheet, r, PRODUCT_COLS.pricePerUnit);
          const hasProduct = productVal !== undefined && productVal !== null && String(productVal).trim() !== '';
          const hasQty = qtyVal !== undefined && qtyVal !== null && String(qtyVal).trim() !== '';
          if (!hasProduct && !hasQty) break;
          productRows.push({
            productNameOrId: hasProduct ? String(productVal).trim() : '',
            catalogueId: catalogueVal != null ? String(catalogueVal).trim() : '',
            quantity: safeNum(qtyVal),
            pricePerUnit: safeNum(priceVal),
          });
          r += 1;
        }

        resolve({
          customerCompanyName: orderCustomer != null ? String(orderCustomer) : '',
          currency: orderCurrency != null ? String(orderCurrency) : '',
          deliveryDate: orderDeliveryDate != null ? String(orderDeliveryDate) : '',
          deliveryTerms: orderDeliveryTerms != null ? String(orderDeliveryTerms) : '',
          shippingAddress: orderShippingAddress != null ? String(orderShippingAddress) : '',
          comment: orderComment != null ? String(orderComment) : '',
          productRows,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Parse error'));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}
