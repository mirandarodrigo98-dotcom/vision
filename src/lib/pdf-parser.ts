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
 * STUB implementation for diagnosis.
 * 
 * @param dataBuffer The PDF file buffer
 * @param options Optional configuration
 * @returns A promise that resolves to PDFData
 */
export default async function parsePDF(dataBuffer: Buffer, options?: any): Promise<PDFData> {
    return Promise.resolve({
        numpages: 0,
        numrender: 0,
        info: {},
        metadata: {},
        text: "STUB",
        version: "stub",
        lines: []
    });
}
