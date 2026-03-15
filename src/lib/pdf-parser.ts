import { Buffer } from 'buffer';
// @ts-ignore
import PDFParser from 'pdf2json';

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
 * Uses pdf2json library for robust Node.js and serverless compatibility.
 * 
 * @param dataBuffer The PDF file buffer
 * @param options Optional configuration
 * @returns A promise that resolves to PDFData
 */
export default async function parsePDF(dataBuffer: Buffer, options?: any): Promise<PDFData> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
                const result: PDFData = {
                    numpages: pdfData.Pages.length,
                    numrender: pdfData.Pages.length,
                    info: pdfData.Meta,
                    metadata: pdfData.Meta,
                    text: "",
                    version: "pdf2json",
                    lines: []
                };

                let fullText = "";
                const allLines: Array<{ text: string, isBold: boolean }> = [];

                // Process Pages
                for (const page of pdfData.Pages) {
                    // pdf2json returns texts with x, y, w, sw, clr, A, R
                    // R is array of runs: { T: text, S: style, TS: [fontId, fontSize, color, bold, italic] }
                    
                    // Group by Y to form lines
                    // Sort texts by Y then X
                    const texts = page.Texts;
                    if (!texts) continue;

                    texts.sort((a: any, b: any) => {
                        // Tolerance for same line
                        if (Math.abs(a.y - b.y) < 0.5) { 
                            return a.x - b.x;
                        }
                        return a.y - b.y;
                    });

                    let currentY = -1;
                    let currentLineText = "";
                    let currentLineIsBold = false;
                    let firstText = true;

                    for (const textItem of texts) {
                        let textContent = "";
                        let isBold = false;

                        if (textItem.R && textItem.R.length > 0) {
                            textContent = decodeURIComponent(textItem.R[0].T);
                            // TS: [fontId, fontSize, color, bold, italic]
                            // bold is 1 if true. TS might be undefined if default style.
                            isBold = textItem.R[0].TS && textItem.R[0].TS[3] === 1;
                        }

                        if (firstText || Math.abs(textItem.y - currentY) > 0.5) {
                            // New line
                            if (!firstText && currentLineText.trim().length > 0) {
                                allLines.push({ text: currentLineText, isBold: currentLineIsBold });
                                fullText += currentLineText + "\n";
                            }

                            currentY = textItem.y;
                            currentLineText = textContent;
                            currentLineIsBold = isBold;
                            firstText = false;
                        } else {
                            // Append to current line
                            // Add space if needed (simplified)
                            currentLineText += " " + textContent;
                            // If any part is bold, mark line as bold (simplified assumption for headers)
                            if (isBold) currentLineIsBold = true;
                        }
                    }
                    
                    // Add last line of page
                    if (currentLineText.trim().length > 0) {
                        allLines.push({ text: currentLineText, isBold: currentLineIsBold });
                        fullText += currentLineText + "\n";
                    }
                }

                result.text = fullText;
                result.lines = allLines;
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });

        // Load the buffer
        pdfParser.parseBuffer(dataBuffer);
    });
}
