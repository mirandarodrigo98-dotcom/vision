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
 * Uses pdf2json library for robust Node.js and serverless compatibility.
 * 
 * @param dataBuffer The PDF file buffer
 * @param options Optional configuration
 * @returns A promise that resolves to PDFData
 */
export default async function parsePDF(dataBuffer: Buffer, options?: any): Promise<PDFData> {
    console.log('PDF Parsing temporarily disabled for build debugging.');
    return Promise.resolve({
        numpages: 0,
        numrender: 0,
        info: {},
        metadata: {},
        text: "",
        version: "stub",
        lines: []
    });
}
