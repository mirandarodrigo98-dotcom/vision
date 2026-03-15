import PDFParser from 'pdf2json';
import { Buffer } from 'buffer';

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
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);

        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            let rawText = "";
            const lines: Array<{ text: string, isBold: boolean }> = [];

            // Helper to check if text is bold based on font style or font face
            // pdf2json structure: Pages -> Texts -> R -> TS (Text Style array)
            // TS: [fontId, fontSize, color, bold (1/0), italic (1/0)]
            // Note: Index for bold might vary, but usually it's index 3? Let's check docs or assume standard.
            // Actually, pdf2json's TS array is: [fontFaceId, fontSize, colorId, bold, italic]
            
            if (pdfData && pdfData.Pages) {
                pdfData.Pages.forEach((page: any) => {
                    // Group texts by Y position to form lines
                    const textMap = new Map<number, Array<{ text: string, isBold: boolean, x: number }>>();

                    if (page.Texts) {
                        page.Texts.forEach((textItem: any) => {
                            // Extract text
                            const textContent = decodeURIComponent(textItem.R[0].T);
                            
                            // Check bold
                            // TS array: [fontFaceId, fontSize, colorId, bold, italic]
                            // Usually bold is 1 if true
                            let isBold = false;
                            if (textItem.R[0].TS && Array.isArray(textItem.R[0].TS) && textItem.R[0].TS.length >= 4) {
                                isBold = textItem.R[0].TS[2] === 1 || textItem.R[0].TS[3] === 1; 
                                // Some versions use index 2 for bold, others 3. Let's be safe.
                                // Actually, standard is: [fontId, fontSize, color, BOLD, ITALIC] -> Index 3
                            }

                            // Group by Y (allow small variance)
                            const y = Math.round(textItem.y * 10) / 10; // Round to 1 decimal place
                            
                            if (!textMap.has(y)) {
                                textMap.set(y, []);
                            }
                            textMap.get(y)?.push({ text: textContent, isBold, x: textItem.x });
                        });
                    }

                    // Sort lines by Y
                    const sortedY = Array.from(textMap.keys()).sort((a, b) => a - b);

                    sortedY.forEach(y => {
                        const items = textMap.get(y);
                        if (items) {
                            // Sort items by X
                            items.sort((a, b) => a.x - b.x);
                            
                            // Join text
                            const lineText = items.map(i => i.text).join(" "); // Add space between words
                            
                            // Determine if line is "mostly" bold (or if the key part is bold)
                            // For this use case, if any significant part is bold, we can mark as bold,
                            // or if ALL parts are bold. 
                            // The requirement is "Contas em negrito são analíticas".
                            // Usually the account code and description are bold.
                            const isLineBold = items.some(i => i.isBold && i.text.trim().length > 0);
                            
                            lines.push({ text: lineText, isBold: isLineBold });
                            rawText += lineText + "\n";
                        }
                    });
                });
            }

            resolve({
                numpages: pdfData.Pages.length,
                numrender: 0,
                info: pdfData.Meta,
                metadata: pdfData.Meta,
                text: rawText,
                version: "1.0",
                lines: lines
            });
        });

        pdfParser.parseBuffer(dataBuffer);
    });
}
