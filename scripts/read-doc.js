const mammoth = require('mammoth');
const path = require('path');

async function readDoc() {
  try {
    const docPath = path.join(process.cwd(), 'public', 'anexo_I_livroII.docx');
    console.log("Reading:", docPath);
    
    // Instead of extractRawText, use convertToHtml to see table structures
    const result = await mammoth.convertToHtml({path: docPath});
    const html = result.value;
    console.log("HTML length:", html.length);
    
    // Let's write the HTML to a temp file to inspect
    const fs = require('fs');
    fs.writeFileSync('scripts/doc_extracted.html', html);
    console.log("Wrote to scripts/doc_extracted.html");
  } catch (e) {
    console.error(e);
  }
}

readDoc();