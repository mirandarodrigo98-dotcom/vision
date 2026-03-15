
import { Buffer } from 'buffer';

// Define the PDFData interface
export interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
    lines?: Array<{ text: string, isBold: boolean }>;
}

/**
 * Parses a PDF buffer and extracts text and metadata, including bold text detection.
 * 
 * @param dataBuffer The PDF file buffer
 * @param options Optional configuration
 * @returns A promise that resolves to PDFData
 */
export default async function parsePDF(dataBuffer: Buffer, options?: any): Promise<PDFData> {
    // Dynamic import to avoid build-time issues and reduce bundle size
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');

    // Disable worker to avoid loading external worker files in serverless environment
    // @ts-ignore
    if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }

    const ret: PDFData = {
        numpages: 0,
        numrender: 0,
        info: null,
        metadata: null,
        text: "",
        version: pdfjsLib.version,
        lines: []
    };

    // Load the document
    // We need to convert Buffer to Uint8Array for pdfjs-dist
    const uint8Array = new Uint8Array(dataBuffer);
    const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        // Disable worker is also an option here sometimes, but usually GlobalWorkerOptions is better
        isEvalSupported: false, // For security in some envs
        useSystemFonts: true, // Try to use system fonts if available
    });

    try {
        const doc = await loadingTask.promise;
        ret.numpages = doc.numPages;

        // Get metadata
        try {
            const metaData = await doc.getMetadata();
            ret.info = metaData.info;
            ret.metadata = metaData.metadata;
        } catch (err) {
            console.warn('Error fetching metadata:', err);
        }

        let fullText = "";
        const allLines: Array<{ text: string, isBold: boolean }> = [];

        // Iterate through pages
        const maxPages = options?.max && options.max > 0 ? Math.min(options.max, doc.numPages) : doc.numPages;

        for (let i = 1; i <= maxPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            
            // Process text items to reconstruct lines and detect bold
            // Items are not guaranteed to be in reading order, but usually are close
            // We'll group by Y coordinate (roughly)
            
            interface TextItem {
                str: string;
                transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
                fontName: string;
                width: number;
                height: number;
                hasEOL: boolean;
            }

            // Filter out items that don't have transform (TextMarkedContent)
            const items = (textContent.items as any[]).filter(item => item.transform && item.str) as TextItem[];
            
            // Sort items by Y (descending) and then X (ascending)
            // Note: PDF coordinates start from bottom-left, so higher Y is higher on page
            items.sort((a, b) => {
                const yDiff = b.transform[5] - a.transform[5];
                if (Math.abs(yDiff) > 5) { // Tolerance for same line
                    return yDiff; // Sort by Y descending
                }
                return a.transform[4] - b.transform[4]; // Sort by X ascending
            });

            let currentLineY = -1;
            let currentLineText = "";
            let currentLineIsBold = false;
            let firstItemInLine = true;
            let lastItemX = 0;
            let lastItemWidth = 0;

            for (const item of items) {
                // Check if this item is on a new line (significant Y difference)
                if (firstItemInLine || Math.abs(item.transform[5] - currentLineY) > 5) {
                    // Push previous line if exists
                    if (!firstItemInLine && currentLineText.trim().length > 0) {
                        allLines.push({ text: currentLineText, isBold: currentLineIsBold });
                        fullText += currentLineText + "\n";
                    }

                    // Start new line
                    currentLineY = item.transform[5];
                    currentLineText = item.str;
                    firstItemInLine = false;
                    
                    // Detect bold for the start of the line
                    currentLineIsBold = isBoldFont(item.fontName, textContent.styles);
                    
                    lastItemX = item.transform[4];
                    lastItemWidth = item.width;
                } else {
                    // Append to current line
                    // Add space if there's a significant gap between items
                    const gap = item.transform[4] - (lastItemX + lastItemWidth);
                    if (gap > 2 && !item.str.startsWith(' ') && !currentLineText.endsWith(' ')) { // Threshold for space (2px)
                         currentLineText += " ";
                    }
                    
                    currentLineText += item.str;
                    
                    // If we haven't detected bold yet, check this item
                    if (!currentLineIsBold && item.str.trim().length > 0) {
                        const isBold = isBoldFont(item.fontName, textContent.styles);
                        if (isBold) currentLineIsBold = true;
                    }
                    
                    lastItemX = item.transform[4];
                    lastItemWidth = item.width;
                }
            }

            // Push the last line of the page
            if (currentLineText.trim().length > 0) {
                allLines.push({ text: currentLineText, isBold: currentLineIsBold });
                fullText += currentLineText + "\n";
            }
            
            // Add page break in text
            fullText += "\n";
        }

        ret.text = fullText;
        ret.lines = allLines;
        ret.numrender = maxPages;

    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw error;
    }

    return ret;
}

/**
 * Helper to determine if a font is bold based on its name or style
 */
function isBoldFont(fontName: string, styles: any): boolean {
    if (!fontName) return false;
    
    const lowerName = fontName.toLowerCase();
    
    // Check common bold indicators in font name
    if (lowerName.includes('bold') || lowerName.includes('black') || lowerName.includes('heavy')) {
        return true;
    }

    // Check styles dictionary if available
    // pdf.js provides a styles object mapping font names to font details
    if (styles && styles[fontName]) {
        const fontData = styles[fontName];
        if (fontData.fontFamily) {
            const lowerFamily = fontData.fontFamily.toLowerCase();
            return lowerFamily.includes('bold') || lowerFamily.includes('black') || lowerFamily.includes('heavy');
        }
        // Sometimes ascent/descent or other props might hint, but name is best bet
    }

    return false;
}
