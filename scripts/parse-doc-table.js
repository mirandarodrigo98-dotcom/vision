const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scripts/doc_extracted_formatted.html', 'utf8');
const $ = cheerio.load(html);

const records = [];
let currentHeaderItem = '';
let currentHeaderName = '';

// The document has items like "1. CERVEJAS..."
$('li').each((i, el) => {
    // we can parse items from lists or bold texts
});

const tables = $('table');
console.log(`Found ${tables.length} tables`);

tables.each((tableIdx, table) => {
    let grid = [];
    $(table).find('tr').each((rowIdx, tr) => {
        let rowData = [];
        $(tr).find('td, th').each((colIdx, td) => {
            const rowspan = parseInt($(td).attr('rowspan')) || 1;
            const colspan = parseInt($(td).attr('colspan')) || 1;
            const text = $(td).text().trim().replace(/\s+/g, ' ');
            rowData.push({ text, rowspan, colspan });
        });
        grid.push(rowData);
    });

    // Resolve rowspans
    let resolvedGrid = [];
    for (let r = 0; r < grid.length; r++) resolvedGrid.push([]);

    for (let r = 0; r < grid.length; r++) {
        let colOffset = 0;
        for (let c = 0; c < grid[r].length; c++) {
            while (resolvedGrid[r][colOffset] !== undefined) colOffset++;

            const cell = grid[r][c];
            for (let rs = 0; rs < cell.rowspan; rs++) {
                for (let cs = 0; cs < cell.colspan; cs++) {
                    if (resolvedGrid[r + rs]) {
                        resolvedGrid[r + rs][colOffset + cs] = cell.text;
                    }
                }
            }
            colOffset += cell.colspan;
        }
    }

    // Now process resolvedGrid
    // the structure of the main table:
    // Subitem, CEST, NCM/SH, Descrição, Embalagem/Tipo, MVA Original(Industrial/Importador), MVA Original(Demais)
    // Sometimes it's Subitem, CEST, NCM/SH, Descrição, MVA Original, Ajustada 4%, Ajustada 12%
    // Let's check headers of each table
    if (resolvedGrid.length < 2) return;
    
    let headerRow = resolvedGrid[0].map(h => h.toUpperCase());
    // Find column indexes
    let idxSubitem = headerRow.findIndex(h => h.includes('SUBITEM'));
    let idxCest = headerRow.findIndex(h => h.includes('CEST'));
    let idxNcm = headerRow.findIndex(h => h.includes('NCM'));
    let idxDesc = headerRow.findIndex(h => h.includes('DESCRIÇÃO'));
    
    let idxMvaOrig = -1;
    let idxMva4 = -1;
    let idxMva12 = -1;
    let idxMvaOrig2 = -1; // for tables with two Original MVA columns
    
    // We need to look at row 0 and 1
    // Usually MVA Original is in col 5, 4% in 6, 12% in 7
    // Let's iterate from row 1 or 2 down
    
    for (let r = 0; r < resolvedGrid.length; r++) {
        const row = resolvedGrid[r];
        if (row[0] && row[0].toUpperCase().includes('SUBITEM')) continue; // header
        if (row[0] && row[0].toUpperCase().includes('INDUSTRIAL')) continue; // sub header
        if (row.length < 4) continue;
        
        let subitem = row[idxSubitem !== -1 ? idxSubitem : 0] || '';
        let cest = row[idxCest !== -1 ? idxCest : 1] || '';
        let ncm = row[idxNcm !== -1 ? idxNcm : 2] || '';
        let desc = row[idxDesc !== -1 ? idxDesc : 3] || '';
        
        if (!subitem.match(/^\d+\.\d+/)) continue; // not a data row
        
        let mvaOrig = '';
        let mva4 = '';
        let mva12 = '';
        
        // Find MVAs based on table structure
        // Some tables have MVA Original (Ind) | MVA Original (Demais)
        // Others have Original | 4% | 12%
        // Let's try to detect from the last 3 columns
        const cols = row.length;
        if (cols >= 7 && headerRow.some(h => h.includes('4%') || h.includes('12%') || resolvedGrid[1].some(h => h.toUpperCase().includes('4%')))) {
            // Check if MVA columns are explicitly defined by checking their headers or position
            // The word document structure:
            // Col 4: MVA Original
            // Col 5: Ajustada 4%
            // Col 6: Ajustada 12%
            if (cols === 7) {
                mvaOrig = row[4];
                mva4 = row[5];
                mva12 = row[6];
            } else {
                mvaOrig = row[cols - 3];
                mva4 = row[cols - 2];
                mva12 = row[cols - 1];
            }
        } else if (cols >= 6) {
             mvaOrig = row[cols - 2]; // Take the first MVA (usually Industrial)
        } else if (cols === 5) {
             mvaOrig = row[4];
        }
        
        // Clean values
        const cleanMva = (val) => val ? val.replace(/%/g, '').trim().replace(',', '.') : '0.00';
        
        let cleanedMvaOrig = cleanMva(mvaOrig);
        let cleanedMva4 = cleanMva(mva4);
        let cleanedMva12 = cleanMva(mva12);

        // HARDCODE FIX for known problematic records from OCR
        if (ncm === '9603.30.00' && cest === '20.059.00') {
           cleanedMvaOrig = '56.11';
           cleanedMva4 = '92.14';
           cleanedMva12 = '76.12';
        }

        records.push({
            subitem,
            cest,
            ncm_sh: ncm,
            descricao: desc,
            mva_original: cleanedMvaOrig,
            mva_ajustada_int4: cleanedMva4,
            mva_ajustada_int12: cleanedMva12
        });
    }
});

fs.writeFileSync('scripts/parsed_records.json', JSON.stringify(records, null, 2));
console.log(`Extracted ${records.length} records`);

