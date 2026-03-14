
import { Buffer } from 'buffer';

// Import local vendor version of pdf.js to avoid Vercel build issues
// We use require here to match how the original library worked, but pointing to our local file
// @ts-ignore
const PDFJS = require('./vendor/pdf.js');

export interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
    lines?: Array<{ text: string, isBold: boolean }>;
}

function render_page(pageData: any) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    };

    return pageData.getTextContent(render_options)
        .then(function(textContent: any) {
            let lastY, text = '';
            // Store line metadata
            const lines: Array<{ text: string, isBold: boolean }> = [];
            let currentLineText = '';
            let currentLineIsBold = false;
            let currentLineY: number | null = null;

            for (let item of textContent.items) {
                // Check if font name implies bold (case insensitive)
                const isBold = item.fontName && (
                    item.fontName.toLowerCase().includes('bold') || 
                    item.fontName.toLowerCase().includes('black') ||
                    // Some fonts use numbers or codes, so checking styles object if available would be better, 
                    // but usually fontName is sufficient for PDF.js text content.
                    // Often fontName is like 'g_d0_f2' which maps to styles.
                    // We need to check the styles dictionary if fontName is obscure.
                    (textContent.styles && textContent.styles[item.fontName] && 
                     textContent.styles[item.fontName].fontFamily && 
                     (textContent.styles[item.fontName].fontFamily.toLowerCase().includes('bold') ||
                      textContent.styles[item.fontName].fontFamily.toLowerCase().includes('black')))
                );

                if (lastY == item.transform[5] || !lastY){
                    text += item.str;
                    currentLineText += item.str;
                    // If any part of the line is bold, we might consider it bold, 
                    // or require the majority. For now, let's say if it contains significant bold text.
                    if (isBold && item.str.trim().length > 0) {
                        currentLineIsBold = true;
                    }
                }
                else{
                    // New line
                    if (currentLineText) {
                        lines.push({ text: currentLineText, isBold: currentLineIsBold });
                    }
                    text += '\n' + item.str;
                    currentLineText = item.str;
                    currentLineIsBold = isBold && item.str.trim().length > 0;
                }
                lastY = item.transform[5];
            }
            
            // Push last line
            if (currentLineText) {
                lines.push({ text: currentLineText, isBold: currentLineIsBold });
            }

            return { text, lines };
        });
}

const DEFAULT_OPTIONS = {
    pagerender: render_page,
    max: 0,
    version: 'v1.10.100'
}

export default async function parsePDF(dataBuffer: Buffer, options?: any): Promise<PDFData> {
    const ret: PDFData = {
        numpages: 0,
        numrender: 0,
        info: null,
        metadata: null,
        text: "",
        version: PDFJS.version,
        lines: []
    };

    if (typeof options == 'undefined') options = DEFAULT_OPTIONS;
    if (typeof options.pagerender != 'function') options.pagerender = DEFAULT_OPTIONS.pagerender;
    if (typeof options.max != 'number') options.max = DEFAULT_OPTIONS.max;

    // Disable workers to avoid cross-origin issues
    PDFJS.disableWorker = true;
    
    // Using getDocument directly from the imported PDFJS object
    let doc = await PDFJS.getDocument(dataBuffer);
    ret.numpages = doc.numPages;

    let metaData = await doc.getMetadata().catch(function(err: any) {
        return null;
    });

    ret.info = metaData ? metaData.info : null;
    ret.metadata = metaData ? metaData.metadata : null;

    let counter = options.max <= 0 ? doc.numPages : options.max;
    counter = counter > doc.numPages ? doc.numPages : counter;

    ret.text = "";
    
    // We accumulate lines across pages
    const allLines: Array<{ text: string, isBold: boolean }> = [];

    for (var i = 1; i <= counter; i++) {
        let pageResult = await doc.getPage(i).then((pageData: any) => options.pagerender(pageData)).catch((err: any)=>{
            // todo log err using debug
            return { text: "", lines: [] };
        });

        // Handle if pagerender returns string (legacy) or object
        let pageText = "";
        if (typeof pageResult === 'string') {
            pageText = pageResult;
        } else {
            pageText = pageResult.text;
            if (pageResult.lines && Array.isArray(pageResult.lines)) {
                allLines.push(...pageResult.lines);
            }
        }

        ret.text = `${ret.text}\n\n${pageText}`;
    }
    
    if (allLines.length > 0) {
        ret.lines = allLines;
    }

    ret.numrender = counter;
    doc.destroy();

    return ret;
}
