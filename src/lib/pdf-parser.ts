
import { Buffer } from 'buffer';

// MOCK IMPLEMENTATION TO DEBUG VERCEL BUILD
// The previous implementation using local vendor/pdf.js was causing build failures.
// Temporarily disabling PDF parsing to verify if this is the root cause.

export interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
    lines?: Array<{ text: string, isBold: boolean }>;
}

export default async function parsePDF(dataBuffer: Buffer, options?: any): Promise<PDFData> {
    console.warn("PDF Parsing is temporarily disabled due to build issues on Vercel.");
    return {
        numpages: 0,
        numrender: 0,
        info: null,
        metadata: null,
        text: "PDF Parsing Disabled",
        version: "mock",
        lines: []
    };
}
