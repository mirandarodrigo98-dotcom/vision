import { Buffer } from 'buffer';
import pdf from 'pdf-parse';

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
 * Uses pdf-parse library which wraps pdf.js for Node.js environments.
 * 
 * @param dataBuffer The PDF file buffer
 * @param options Optional configuration
 * @returns A promise that resolves to PDFData
 */
export default async function parsePDF(dataBuffer: Buffer, options?: any): Promise<PDFData> {
    const allLines: Array<{ text: string, isBold: boolean }> = [];

    // Custom render function to extract structured data (lines and bold info)
    // pageData is a pdf.js Page object
    const render_page = async (pageData: any) => {
        // Options for getTextContent
        const render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
        };
        
        // Get text content with styles
        const textContent = await pageData.getTextContent(render_options);
        
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
        let pageText = "";

        for (const item of items) {
            // Check if this item is on a new line (significant Y difference)
            if (firstItemInLine || Math.abs(item.transform[5] - currentLineY) > 5) {
                // Push previous line if exists
                if (!firstItemInLine && currentLineText.trim().length > 0) {
                    allLines.push({ text: currentLineText, isBold: currentLineIsBold });
                    pageText += currentLineText + "\n";
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
            pageText += currentLineText + "\n";
        }
        
        return pageText;
    };

    const pdfOptions = {
        pagerender: render_page,
        max: options?.max
    };

    try {
        const data = await pdf(dataBuffer, pdfOptions);
        
        const ret: PDFData = {
            numpages: data.numpages,
            numrender: data.numrender,
            info: data.info,
            metadata: data.metadata,
            text: data.text,
            version: data.version,
            lines: allLines
        };

        return ret;

    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw error;
    }
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
    }

    return false;
}
