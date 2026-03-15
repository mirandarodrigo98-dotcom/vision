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
                        // Tolerance for same line (pdf2json Y units are roughly 1/72 inch or similar? No, they are custom)
                        // Usually diff < 0.5 is safe for same line
                        if (Math.abs(a.y - b.y) < 0.5) { 
                            return a.x - b.x;
                        }
                        return a.y - b.y;
                    });

                    let currentY = -1;
                    let currentLineText = "";
                    let currentLineIsBold = false;
                    let firstText = true;
                    let lastX = 0;
                    let lastW = 0;

                    for (const textItem of texts) {
                        let textContent = "";
                        let isBold = false;

                        if (textItem.R && textItem.R.length > 0) {
                            textContent = decodeURIComponent(textItem.R[0].T);
                            // TS: [fontId, fontSize, color, bold, italic]
                            // bold is 1 if true
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
                            lastX = textItem.x;
                            lastW = textItem.w; // w is width
                        } else {
                            // Append to current line
                            // Determine if we need a space based on X gap
                            // textItem.x is the start. lastX + lastW is where previous ended?
                            // pdf2json units: width is roughly character count * font size factor?
                            // Let's assume if gap > 0.3 it might be a space.
                            // But decodeURIComponent often has %20.
                            // Simpler: if textContent doesn't start with space and previous didn't end with space, add one.
                            
                            // Also check strict gap.
                            const gap = textItem.x - (lastX + (textItem.w || 0)); // This width calculation is tricky in pdf2json
                            // Let's stick to simple text concatenation logic:
                            // If neither side has space, add space.
                            if (!currentLineText.endsWith(" ") && !textContent.startsWith(" ") && textContent.trim().length > 0) {
                                 currentLineText += " ";
                            }
                            
                            currentLineText += textContent;
                            
                            if (!currentLineIsBold && isBold) {
                                currentLineIsBold = true;
                            }
                            
                            lastX = textItem.x;
                            lastW = textItem.w;
                        }
                    }
                    
                    // Last line of page
                    if (currentLineText.trim().length > 0) {
                        allLines.push({ text: currentLineText, isBold: currentLineIsBold });
                        fullText += currentLineText + "\n";
                    }
                }

                result.text = fullText;
                result.lines = allLines;
                
                resolve(result);

            } catch (e) {
                reject(e);
            }
        });

        pdfParser.parseBuffer(dataBuffer);
    });
}
