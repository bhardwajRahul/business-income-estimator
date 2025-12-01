import axios from 'axios';

const API_KEY = process.env.ANYAPI_PDF_INVOICE_GENERATOR_API_KEY;
const API_URL = 'https://api.anyapi.io/v1/generate-invoice';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  companyName: string;
  companyAddress: string;
  clientName: string;
  clientAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export async function generateInvoice(data: InvoiceData): Promise<string> {
  try {
    const response = await axios.post(API_URL, data, {
      params: { api_key: API_KEY },
      responseType: 'arraybuffer'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw new Error('Failed to generate invoice');
  }
}