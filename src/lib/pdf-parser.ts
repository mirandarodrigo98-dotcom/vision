
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
}

function render_page(pageData: any) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    };

    return pageData.getTextContent(render_options)
        .then(function(textContent: any) {
            let lastY, text = '';
            for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY){
                    text += item.str;
                }
                else{
                    text += '\n' + item.str;
                }
                lastY = item.transform[5];
            }
            return text;
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
        version: PDFJS.version
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

    for (var i = 1; i <= counter; i++) {
        let pageText = await doc.getPage(i).then((pageData: any) => options.pagerender(pageData)).catch((err: any)=>{
            // todo log err using debug
            return "";
        });

        ret.text = `${ret.text}\n\n${pageText}`;
    }

    ret.numrender = counter;
    doc.destroy();

    return ret;
}
