import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import vision from '@google-cloud/vision';

// Initialize the client
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
// OR GOOGLE_CLOUD_VISION_API_KEY for API key auth
const getVisionClient = () => {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (apiKey) {
    // Use API key authentication
    return new vision.ImageAnnotatorClient({
      apiKey,
    });
  }

  // Fall back to service account (GOOGLE_APPLICATION_CREDENTIALS)
  return new vision.ImageAnnotatorClient();
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if Google Cloud Vision is configured
    if (!process.env.GOOGLE_CLOUD_VISION_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json(
        { error: 'Google Cloud Vision not configured. Add GOOGLE_CLOUD_VISION_API_KEY to .env' },
        { status: 500 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const client = getVisionClient();

    // Use document text detection with handwriting support
    const [result] = await client.documentTextDetection({
      image: { content: base64 },
      imageContext: {
        languageHints: ['en'],
      },
    });

    // Also run text detection which can be better for handwriting
    const [textResult] = await client.textDetection({
      image: { content: base64 },
    });

    // Combine results - use document detection as primary, text detection for handwritten parts
    const handwrittenText = textResult.fullTextAnnotation?.text || '';

    const fullText = result.fullTextAnnotation?.text || '';
    const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence || 0;

    // Also get individual text annotations for better line-by-line parsing
    const textAnnotations = result.textAnnotations || [];

    // Parse receipt data from the text (pass both texts for better handwriting support)
    const extracted = extractReceiptData(fullText, textAnnotations, handwrittenText);

    // Auto-detect category based on vendor/content
    const category = detectCategory(fullText, extracted.vendorName);

    return NextResponse.json({
      success: true,
      data: {
        ...extracted,
        category,
        rawText: fullText,
        confidence: Math.round(confidence * 100),
      },
    });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: error.message || 'OCR processing failed' },
      { status: 500 }
    );
  }
}

// Auto-detect expense category based on vendor and content
function detectCategory(text: string, vendorName?: string): string {
  const lowerText = text.toLowerCase();
  const lowerVendor = (vendorName || '').toLowerCase();

  // Restaurant/Food keywords
  const restaurantKeywords = ['restaurant', 'cafe', 'grill', 'diner', 'kitchen', 'bistro', 'bar', 'pub',
    'pizza', 'burger', 'taco', 'sushi', 'steakhouse', 'bbq', 'bakery', 'coffee',
    'starbucks', 'mcdonald', 'chipotle', 'subway', 'panera', 'chick-fil-a', 'wendy',
    'pappasito', 'pappadeaux', 'chili', 'applebee', 'olive garden', 'red lobster',
    'server:', 'tip:', 'gratuity', 'dine in', 'table'];

  // Hotel/Lodging keywords
  const hotelKeywords = ['hotel', 'inn', 'suites', 'resort', 'motel', 'lodge', 'marriott',
    'hilton', 'hyatt', 'sheraton', 'westin', 'holiday inn', 'hampton', 'courtyard',
    'room rate', 'check-in', 'check-out', 'night stay', 'accommodation'];

  // Transportation keywords
  const transportKeywords = ['uber', 'lyft', 'taxi', 'cab', 'parking', 'gas', 'fuel', 'shell',
    'exxon', 'chevron', 'bp', 'texaco', 'speedway', 'wawa', 'quiktrip', 'racetrac',
    'toll', 'metro', 'transit', 'bus', 'train', 'rental car', 'hertz', 'enterprise', 'avis'];

  // Travel/Flight keywords
  const travelKeywords = ['airline', 'airways', 'flight', 'airport', 'boarding', 'american airlines',
    'united', 'delta', 'southwest', 'jetblue', 'spirit', 'frontier', 'alaska air',
    'baggage', 'carry-on', 'departure', 'arrival', 'passenger'];

  // Check vendor name and text content
  const combined = lowerVendor + ' ' + lowerText;

  if (restaurantKeywords.some(k => combined.includes(k))) return 'MEALS';
  if (hotelKeywords.some(k => combined.includes(k))) return 'LODGING';
  if (travelKeywords.some(k => combined.includes(k))) return 'TRAVEL';
  if (transportKeywords.some(k => combined.includes(k))) return 'TRANSPORTATION';

  return 'OTHER';
}

function extractReceiptData(text: string, textAnnotations: any[] = [], handwrittenText: string = '') {
  // Split by newlines and also try to reconstruct lines from the raw text
  let lines = text.split('\n').filter((line) => line.trim());

  // If we got very few lines, the text might be poorly formatted
  // Try alternative splitting strategies
  if (lines.length < 5) {
    // Try splitting on double spaces which often separate columns
    const altLines: string[] = [];
    text.split('\n').forEach(line => {
      // Check if line has multiple price-like patterns (might be multiple items on one line)
      const prices = line.match(/\$?\d+\.\d{2}/g);
      if (prices && prices.length > 1) {
        // Try to split this line into multiple items
        const parts = line.split(/(?<=\d\.\d{2})\s+(?=[A-Z])/);
        altLines.push(...parts);
      } else {
        altLines.push(line);
      }
    });
    if (altLines.length > lines.length) {
      lines = altLines.filter(l => l.trim());
    }
  }

  // Check if this is a restaurant credit card slip (no itemized items)
  const isRestaurantSlip = /purchase\s+usd|authorized|tip:|gratuity/i.test(text);

  const amounts = findAllAmounts(text, lines);
  let items = extractLineItems(lines, text);

  // For restaurant slips with no items, create a single item from the purchase amount
  if (items.length === 0 && isRestaurantSlip) {
    const vendorName = findVendorName(lines);

    // Look for PURCHASE USD$XX.XX or Authorized: XX.XX
    // Handle various formats: "PURCHASE USD$32.42", "PURCHASE USD 32.42", "Authorized: 32.42"
    const purchaseMatch = text.match(/purchase\s+usd\s*\$?([\d,]+\.\d{2})/i) ||
                          text.match(/authorized[:\s]+\$?([\d,]+\.\d{2})/i);

    // Also check for amount on line after "Authorized:"
    let purchaseAmount: number | undefined;
    if (purchaseMatch) {
      purchaseAmount = parseFloat(purchaseMatch[1].replace(',', ''));
    } else {
      // Look for Authorized: followed by amount on next line
      for (let i = 0; i < lines.length; i++) {
        if (/authorized/i.test(lines[i])) {
          // Check next few lines for a standalone amount
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const amtMatch = lines[j].trim().match(/^\$?([\d,]+\.\d{2})$/);
            if (amtMatch) {
              purchaseAmount = parseFloat(amtMatch[1].replace(',', ''));
              break;
            }
          }
          break;
        }
      }
    }

    console.log('Restaurant slip detection:', { isRestaurantSlip, purchaseAmount, vendorName });

    // Look for tip amount - check both texts (handwritten might be in alternate)
    const combinedText = text + '\n' + handwrittenText;
    let tipMatch = combinedText.match(/tip[:\s]*\$?([\d,]+\.\d{2})/i);

    // Also try to find handwritten numbers near "TIP:" line
    // Handwriting often gets read as separate numbers
    if (!tipMatch) {
      // Look for pattern: TIP: followed by a number on same or next line
      const tipLineMatch = combinedText.match(/tip[:\s]*[\r\n]*\$?(\d+\.?\d*)/i);
      if (tipLineMatch && tipLineMatch[1]) {
        const tipVal = parseFloat(tipLineMatch[1]);
        // Sanity check - tip should be reasonable (< $500 and typically 15-25% of bill)
        if (tipVal > 0 && tipVal < 500) {
          tipMatch = tipLineMatch;
        }
      }
    }

    // Look for TOTAL line which might have the final amount with tip
    // Handle partial decimals like "38.9" from handwriting
    const totalMatch = combinedText.match(/total[:\s]*[\r\n]*\$?([\d,]+\.\d{1,2})/i);

    if (purchaseAmount) {
      const baseAmount = purchaseAmount;
      let tip = tipMatch ? parseFloat(tipMatch[1].replace(',', '')) : 0;

      // If we have total but no valid tip, calculate tip from total - base
      if (totalMatch && (!tip || tip > baseAmount)) {
        const totalAmt = parseFloat(totalMatch[1].replace(',', ''));
        if (totalAmt > baseAmount) {
          tip = Math.round((totalAmt - baseAmount) * 100) / 100;
        }
      }

      // Add meal as item
      items.push({
        description: vendorName || 'Restaurant',
        amount: baseAmount,
        quantity: 1,
        unitPrice: baseAmount
      });

      // Add tip as separate item if present and reasonable
      if (tip > 0 && tip < baseAmount) {
        items.push({
          description: 'Tip',
          amount: tip,
          quantity: 1,
          unitPrice: tip
        });
      }

      // Update total
      if (!amounts.total) {
        amounts.total = baseAmount + (tip > 0 && tip < baseAmount ? tip : 0);
      }

      console.log('Restaurant items created:', items);
    }
  }

  return {
    vendorName: findVendorName(lines),
    date: findDate(text),
    totalAmount: amounts.total,
    subtotal: amounts.subtotal,
    tax: amounts.tax,
    items: items,
  };
}

// Helper to parse amounts that might use European format (1.149.97) or standard (1,149.97)
function parseAmount(str: string): number {
  if (!str) return 0;
  let cleaned = str.replace(/\$/g, '').trim();

  // European format: 1.149.97 (periods as thousands, last period is decimal)
  if (cleaned.match(/^\d{1,3}(\.\d{3})+\.\d{2}$/)) {
    // Multiple periods - last one is decimal, others are thousands
    const parts = cleaned.split('.');
    const decimal = parts.pop();
    cleaned = parts.join('') + '.' + decimal;
  }

  // Standard format with commas
  cleaned = cleaned.replace(/,/g, '');

  return parseFloat(cleaned) || 0;
}

function findAllAmounts(text: string, lines: string[]): { total?: number; subtotal?: number; tax?: number } {
  let total: number | undefined;
  let subtotal: number | undefined;
  let tax: number | undefined;

  // Search line by line for more accurate extraction
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineLower = line.toLowerCase();

    // Look for Subtotal
    if (!subtotal && /subtotal/i.test(line)) {
      const match = line.match(/\$?([\d,.]+)/);
      if (match) {
        subtotal = parseAmount(match[1]);
      } else if (i + 1 < lines.length) {
        // Check next line
        const nextMatch = lines[i + 1].match(/^\s*\$?([\d,.]+)\s*$/);
        if (nextMatch) subtotal = parseAmount(nextMatch[1]);
      }
    }

    // Look for Tax - be more specific to avoid false matches
    // Skip lines that contain tax RATE (like "TAX 7.00000 on")
    if (!tax && /tax/i.test(line) && !/tax\s+[\d.]+\s+on/i.test(line)) {
      // Pattern: "TAX $2.10" or "Tax: 2.10" or "TAX:" then amount on next line
      const match = line.match(/tax\s*[:\s]*\$?([\d,.]+)\s*$/i);
      if (match && match[1].length > 1) {
        tax = parseAmount(match[1]);
      } else if (i + 1 < lines.length) {
        // Tax label on its own line, amount on next
        const nextMatch = lines[i + 1].match(/^\s*\$?([\d,.]+)\s*$/);
        if (nextMatch) {
          tax = parseAmount(nextMatch[1]);
        }
      }
    }
    // Tax rate line followed by actual tax amount on next line
    // e.g., "T = FL TAX 7.00000 on $29.98" then "$2.10"
    if (!tax && /tax\s+[\d.]+\s+on/i.test(line)) {
      if (i + 1 < lines.length) {
        const nextMatch = lines[i + 1].match(/^\s*\$?([\d,.]+)\s*$/);
        if (nextMatch) {
          tax = parseAmount(nextMatch[1]);
        }
      }
    }

    // Look for Total (final amount with tax)
    // Prioritize "Total Sale", "Grand Total", etc.
    if (/total\s*sale|grand\s*total/i.test(line)) {
      const match = line.match(/\$?([\d,.]+)/);
      if (match) {
        const amt = parseAmount(match[1]);
        if (!subtotal || amt >= subtotal) total = amt;
      } else if (i + 1 < lines.length) {
        const nextMatch = lines[i + 1].match(/^\s*\$?([\d,.]+)\s*$/);
        if (nextMatch) {
          const amt = parseAmount(nextMatch[1]);
          if (!subtotal || amt >= subtotal) total = amt;
        }
      }
    }

    // Generic "TOTAL:" at end (but not subtotal)
    if (!total && /^total[:\s]/i.test(line) && !/subtotal/i.test(line)) {
      const match = line.match(/total\s*[:\s]*\$?([\d,.]+)/i);
      if (match) {
        const amt = parseAmount(match[1]);
        // Only use if it's >= subtotal (total includes tax)
        if (!subtotal || amt >= subtotal) {
          total = amt;
        }
      } else if (i + 1 < lines.length) {
        // TOTAL: on its own line, amount on next
        const nextMatch = lines[i + 1].match(/^\s*\$?([\d,.]+)\s*$/);
        if (nextMatch) {
          const amt = parseAmount(nextMatch[1]);
          if (!subtotal || amt >= subtotal) {
            total = amt;
          }
        }
      }
    }
  }

  // If we found subtotal and tax but no total, calculate it
  if (!total && subtotal && tax) {
    total = Math.round((subtotal + tax) * 100) / 100;
  }

  // If we have total and subtotal but no tax, calculate tax
  if (total && subtotal && !tax && total > subtotal) {
    tax = Math.round((total - subtotal) * 100) / 100;
  }

  // Sanity check: tax should be reasonable (less than 15% of subtotal typically)
  if (tax && subtotal && tax > subtotal * 0.2) {
    // Tax seems too high, might be a misread - recalculate if we have total
    if (total && total > subtotal) {
      tax = Math.round((total - subtotal) * 100) / 100;
    }
  }

  console.log('Amount extraction:', { total, subtotal, tax });

  return { total, subtotal, tax };
}

function findVendorName(lines: string[]): string | undefined {
  const fullText = lines.join(' ').toLowerCase();

  // Known store/restaurant names to look for
  const knownVendors: { pattern: RegExp; name: string }[] = [
    { pattern: /target/i, name: 'Target' },
    { pattern: /walmart/i, name: 'Walmart' },
    { pattern: /costco/i, name: 'Costco' },
    { pattern: /h-?e-?b\b/i, name: 'H-E-B' },
    { pattern: /kroger/i, name: 'Kroger' },
    { pattern: /safeway/i, name: 'Safeway' },
    { pattern: /whole\s*foods/i, name: 'Whole Foods' },
    { pattern: /trader\s*joe/i, name: "Trader Joe's" },
    { pattern: /starbucks/i, name: 'Starbucks' },
    { pattern: /mcdonald/i, name: "McDonald's" },
    { pattern: /chipotle/i, name: 'Chipotle' },
    { pattern: /chick-?fil-?a/i, name: 'Chick-fil-A' },
    { pattern: /pappasito/i, name: "Pappasito's" },
    { pattern: /pappadeaux/i, name: "Pappadeaux" },
    { pattern: /micro\s*center/i, name: 'Micro Center' },
    { pattern: /best\s*buy/i, name: 'Best Buy' },
    { pattern: /home\s*depot/i, name: 'Home Depot' },
    { pattern: /lowe'?s/i, name: "Lowe's" },
    { pattern: /cvs/i, name: 'CVS' },
    { pattern: /walgreen/i, name: 'Walgreens' },
    { pattern: /amazon/i, name: 'Amazon' },
    { pattern: /uber\s*eats/i, name: 'Uber Eats' },
    { pattern: /doordash/i, name: 'DoorDash' },
    { pattern: /grubhub/i, name: 'Grubhub' },
    { pattern: /marriott/i, name: 'Marriott' },
    { pattern: /hilton/i, name: 'Hilton' },
    { pattern: /hyatt/i, name: 'Hyatt' },
    { pattern: /holiday\s*inn/i, name: 'Holiday Inn' },
    { pattern: /shell/i, name: 'Shell' },
    { pattern: /exxon/i, name: 'Exxon' },
    { pattern: /chevron/i, name: 'Chevron' },
    { pattern: /american\s*airlines/i, name: 'American Airlines' },
    { pattern: /united\s*airlines/i, name: 'United Airlines' },
    { pattern: /delta/i, name: 'Delta' },
    { pattern: /southwest/i, name: 'Southwest Airlines' },
  ];

  // Check for known vendors first
  for (const { pattern, name } of knownVendors) {
    if (pattern.test(fullText)) {
      return name;
    }
  }

  // Fall back to finding first significant line
  for (const line of lines.slice(0, 8)) {
    const cleaned = line.trim();
    // Skip lines that look like addresses, dates, phone numbers, or totals
    if (
      cleaned.length > 3 &&
      cleaned.length < 50 &&
      !cleaned.match(/^\d+[\s\-]/) && // Not starting with numbers (address)
      !cleaned.match(/total|subtotal|tax|date|receipt|store|register|thank|welcome/i) &&
      !cleaned.match(/^\d{1,2}[\/\-]\d{1,2}/) && // Not a date
      !cleaned.match(/\d{3}[-.]\d{3}[-.]\d{4}/) && // Not a phone number
      !cleaned.match(/\d{5}(-\d{4})?/) && // Not a zip code
      !cleaned.match(/street|road|ave|blvd|drive|lane|way|plaza|center/i) && // Not an address
      !cleaned.match(/^[A-Z]{2}\s*\d{5}/) && // Not state + zip
      !cleaned.match(/^\d+\.\d{2}$/) && // Not a price
      !cleaned.match(/^(mon|tue|wed|thu|fri|sat|sun)/i) // Not a day
    ) {
      return cleaned;
    }
  }
  return undefined;
}

function findDate(text: string): string | undefined {
  // Common date patterns - more specific patterns first
  const patterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}


interface LineItem {
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
}

function extractLineItems(lines: string[], rawText: string = ''): LineItem[] {
  const items: LineItem[] = [];
  const skipWords = /^(total|subtotal|tax|tip|change|balance|cash|credit|debit|visa|mastercard|amex|american\s*express|payment|items\s*purchased|you\s*saved|sale|savings|eps|on\s*sale|authorized|purchase|merch|auth|entry|chip|mode|tvr|iad|tsi|arc|server|rec|term|reference|customer|csr|date|number|s\/n|sales\s*id|when you|return|rec#|help make|aid:|auth code)/i;

  console.log('Lines for extraction:', lines.slice(0, 20));

  // Strategy 0: Target format - SKU line, then "QTY @ $PRICE ea", then price
  // e.g., "081060853 BBL CUSH WRP" then "2 @ $14.99 ea" then "$29.98"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for "QTY @ $PRICE ea" pattern (Target style)
    const targetQtyMatch = line.match(/^(\d+)\s*@\s*\$?([\d.]+)\s*ea/i);
    if (targetQtyMatch) {
      const qty = parseInt(targetQtyMatch[1]);
      const unitPrice = parseFloat(targetQtyMatch[2]);

      // Look backwards for description (SKU line)
      let description = '';
      for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
        const prevLine = lines[j].trim();
        // SKU line format: "081060853 BBL CUSH WRP" or just description
        const skuMatch = prevLine.match(/^(\d{6,})\s+(.+)$/);
        if (skuMatch) {
          description = skuMatch[2].trim();
          break;
        } else if (prevLine.length > 2 && !skipWords.test(prevLine) && !/^\d+\s*@/.test(prevLine) && !/^\$?[\d.]+$/.test(prevLine)) {
          description = prevLine;
          break;
        }
      }

      // Look forward for total price
      let amount = qty * unitPrice;
      for (let j = i + 1; j < lines.length && j <= i + 2; j++) {
        const nextLine = lines[j].trim();
        const priceMatch = nextLine.match(/^\$?([\d,]+\.\d{2})$/);
        if (priceMatch) {
          amount = parseFloat(priceMatch[1].replace(',', ''));
          break;
        }
      }

      if (description && amount > 0) {
        items.push({ description, amount, quantity: qty, unitPrice });
      }
    }
  }

  if (items.length > 0) {
    console.log('Extracted items (Target format):', items);
    return items;
  }

  // Strategy 1: Handle receipts where items and prices are in separate columns
  // (like H-E-B where OCR reads items first, then prices column)
  const numberedItems: { desc: string; qty: number }[] = [];
  const prices: number[] = [];
  const qtyLines: { index: number; qty: number; unitPrice: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Skip lines that are clearly not items
    if (skipWords.test(trimmed)) continue;

    // Look for quantity lines: "2 Ea. @ 1/ 6.68" or "2 Ea. @ 6.68"
    const qtyMatch = trimmed.match(/^(\d+)\s*Ea\.?\s*@\s*(?:\d+\/)?\s*(\d+\.?\d*)/i);
    if (qtyMatch) {
      qtyLines.push({
        index: numberedItems.length - 1,
        qty: parseInt(qtyMatch[1]),
        unitPrice: parseFloat(qtyMatch[2])
      });
      continue;
    }

    // Look for numbered item lines: "1 WATERLOO TROPICAL FRUIT TF"
    const numberedMatch = trimmed.match(/^(\d{1,2})\s+([A-Z][A-Z0-9\s\-\.\/]+)/);
    if (numberedMatch) {
      let desc = numberedMatch[2].trim();
      desc = desc.replace(/\s+[TF]{1,2}$/, '').trim();
      if (desc.length > 2 && !skipWords.test(desc)) {
        numberedItems.push({ desc, qty: 1 });
      }
      continue;
    }

    // Look for standalone price lines: "6.48" or "$6.48"
    const priceMatch = trimmed.match(/^\$?([\d,]+\.\d{2})$/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(',', ''));
      if (price > 0 && price < 1000) {
        prices.push(price);
      }
    }
  }

  // Apply quantity info to items
  for (const qtyInfo of qtyLines) {
    if (qtyInfo.index >= 0 && qtyInfo.index < numberedItems.length) {
      numberedItems[qtyInfo.index].qty = qtyInfo.qty;
    }
  }

  // If we found numbered items and prices, match them up
  if (numberedItems.length > 0 && prices.length > 0) {
    const matchCount = Math.min(numberedItems.length, prices.length);
    for (let i = 0; i < matchCount; i++) {
      const item = numberedItems[i];
      const amount = prices[i];
      const qty = item.qty;
      items.push({
        description: item.desc,
        amount: amount,
        quantity: qty,
        unitPrice: qty > 1 ? Math.round((amount / qty) * 100) / 100 : amount
      });
    }
    if (items.length >= 2) {
      return items;
    }
  }

  // Strategy 2: Standard format with item and price on same line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;
    if (skipWords.test(line)) continue;

    // Pattern: "Qty x Description Price" e.g., "2 @ $14.99 BIG DISH MOP T 29.98"
    // or "DESCRIPTION QTY @ PRICE TOTAL"
    let match = line.match(/^(.+?)\s+(\d+)\s*[@x]\s*\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})$/i);
    if (match) {
      const description = match[1].trim();
      const qty = parseInt(match[2]);
      const unitPrice = parseFloat(match[3].replace(',', ''));
      const amount = parseFloat(match[4].replace(',', ''));
      if (description.length > 1 && !skipWords.test(description)) {
        items.push({ description, amount, quantity: qty, unitPrice });
        continue;
      }
    }

    // Pattern: "QTY DESCRIPTION PRICE" e.g., "2 BIG DISH MOP 29.98"
    match = line.match(/^(\d+)\s+(.+?)\s+\$?([\d,]+\.\d{2})\s*$/);
    if (match) {
      const qty = parseInt(match[1]);
      let description = match[2].trim().replace(/\s+[TF]{1,2}$/, '').trim();
      const amount = parseFloat(match[3].replace(',', ''));
      if (qty > 0 && qty < 100 && description.length > 1 && !skipWords.test(description)) {
        items.push({
          description,
          amount,
          quantity: qty,
          unitPrice: qty > 1 ? Math.round((amount / qty) * 100) / 100 : amount
        });
        continue;
      }
    }

    // Pattern: "DESCRIPTION PRICE" e.g., "DELL-ADV 5420 399.99"
    match = line.match(/^(.+?)\s+\$?([\d,]+\.\d{2})\s*$/);
    if (match) {
      let description = match[1].trim();
      // Remove leading quantity if present (like "1 ")
      description = description.replace(/^\d+\s+/, '').replace(/\s+[TF]{1,2}$/, '').trim();
      const amount = parseFloat(match[2].replace(',', ''));

      if (description.length > 1 && amount > 0 && amount < 10000 && !skipWords.test(description)) {
        const isDupe = items.some(item => item.description === description && item.amount === amount);
        if (!isDupe) {
          items.push({ description, amount, quantity: 1, unitPrice: amount });
        }
      }
    }
  }

  // Strategy 3: Micro Center format - item line then price on next line
  // Format: "1 903435 DELL-ADV 5420 17-116567 32/1/P1" then "399.99" on next line
  if (items.length === 0) {
    console.log('Trying Micro Center format...');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for "QTY SKU DESCRIPTION" pattern (SKU is 5-6 digits)
      const itemMatch = line.match(/^(\d+)\s+(\d{5,6})\s+(.+)$/);
      if (itemMatch) {
        console.log('Found item line:', line);
        const qty = parseInt(itemMatch[1]);
        const sku = itemMatch[2];
        let description = itemMatch[3].trim();

        // Clean up description - remove model numbers at end
        description = description.replace(/\s+\d+\/\d+\/[A-Z]\d*$/, '').trim();

        // Look for price on next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // Handle prices like "399.99" or "1.149.97" (European thousands separator)
          const priceMatch = nextLine.match(/^(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?)$/);
          if (priceMatch) {
            let priceStr = priceMatch[1];
            // Convert European format (1.149.97) to standard (1149.97)
            if (priceStr.match(/^\d{1,3}\.\d{3}\.\d{2}$/)) {
              priceStr = priceStr.replace('.', '').replace('.', '.');
            }
            // Handle regular format
            priceStr = priceStr.replace(/,/g, '');
            const amount = parseFloat(priceStr);

            if (amount > 0 && description.length > 2 && !skipWords.test(description)) {
              // Allow duplicate items (same product purchased multiple times)
              // Just add them all - they're legitimate separate line items
              items.push({
                description,
                amount,
                quantity: qty,
                unitPrice: amount
              });
            }
          }
        }
      }
    }
  }

  console.log('Extracted items:', items);
  return items;
}
