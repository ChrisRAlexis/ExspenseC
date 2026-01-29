import Tesseract from 'tesseract.js';
import type { OCRResult } from '@/types';

export async function processReceipt(imageFile: File): Promise<OCRResult> {
  const result = await Tesseract.recognize(imageFile, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  const text = result.data.text;
  const confidence = result.data.confidence;

  // Extract data from OCR text
  const extracted = extractReceiptData(text);

  return {
    ...extracted,
    rawText: text,
    confidence,
  };
}

function extractReceiptData(text: string): Partial<OCRResult> {
  const lines = text.split('\n').filter((line) => line.trim());

  // Try to find vendor name (usually first non-empty line or line with all caps)
  const vendorName = findVendorName(lines);

  // Try to find date
  const date = findDate(text);

  // Try to find total amount
  const totalAmount = findTotalAmount(text);

  // Try to extract line items
  const items = extractLineItems(lines);

  return {
    vendorName,
    date,
    totalAmount,
    items,
  };
}

function findVendorName(lines: string[]): string | undefined {
  // Look for first significant line that could be a business name
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.trim();
    // Skip lines that look like addresses, dates, or totals
    if (cleaned.length > 3 &&
        !cleaned.match(/^\d/) &&
        !cleaned.match(/total|subtotal|tax|date|receipt/i)) {
      return cleaned;
    }
  }
  return undefined;
}

function findDate(text: string): string | undefined {
  // Common date patterns
  const patterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function findTotalAmount(text: string): number | undefined {
  // Look for total patterns
  const patterns = [
    /total[:\s]*\$?(\d+\.?\d*)/i,
    /grand\s*total[:\s]*\$?(\d+\.?\d*)/i,
    /amount[:\s]*\$?(\d+\.?\d*)/i,
    /balance[:\s]*\$?(\d+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  // If no total found, look for the largest dollar amount
  const amounts = text.match(/\$?\d+\.\d{2}/g);
  if (amounts) {
    const values = amounts.map((a) => parseFloat(a.replace('$', '')));
    return Math.max(...values);
  }

  return undefined;
}

function extractLineItems(lines: string[]): Array<{ description: string; amount: number }> {
  const items: Array<{ description: string; amount: number }> = [];

  for (const line of lines) {
    // Look for lines with a description and price
    const match = line.match(/(.+?)\s+\$?(\d+\.?\d{0,2})\s*$/);
    if (match) {
      const description = match[1].trim();
      const amount = parseFloat(match[2]);

      // Skip if it looks like a total or tax line
      if (!description.match(/total|subtotal|tax|tip|change|balance/i) && amount > 0) {
        items.push({ description, amount });
      }
    }
  }

  return items;
}

export function preprocessImage(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale and increase contrast
  for (let i = 0; i < data.length; i += 4) {
    // Grayscale
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    // Increase contrast
    const contrast = 1.5;
    const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
    const newGray = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

    // Simple threshold for better text recognition
    const threshold = newGray > 128 ? 255 : 0;

    data[i] = threshold;
    data[i + 1] = threshold;
    data[i + 2] = threshold;
  }

  ctx.putImageData(imageData, 0, 0);
}
