const { isValid, format } = require('date-fns');

const safeFormatDate = (dateVal) => {
    if (!dateVal) return '-';
    try {
      let parsed;
      if (dateVal instanceof Date) {
        parsed = new Date(dateVal.getUTCFullYear(), dateVal.getUTCMonth(), dateVal.getUTCDate());
      } else if (typeof dateVal === 'string') {
        const cleanDateStr = dateVal.trim();
        if (cleanDateStr.includes('T')) {
          const datePart = cleanDateStr.split('T')[0];
          parsed = new Date(datePart + 'T12:00:00');
        } else if (cleanDateStr.length === 10) {
          parsed = new Date(cleanDateStr + 'T12:00:00');
        } else {
          parsed = new Date(cleanDateStr.replace(' ', 'T'));
        }
      } else {
        parsed = new Date(dateVal);
      }
      return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '-';
    } catch (e) {
      return '-';
    }
};

console.log('Test 1 (string with T):', safeFormatDate('2025-01-05T00:00:00.000Z'));
console.log('Test 2 (string 10 chars):', safeFormatDate('2025-01-05'));
console.log('Test 3 (string without T):', safeFormatDate('2025-01-05 00:00:00'));
console.log('Test 4 (Date object):', safeFormatDate(new Date('2025-01-05T00:00:00.000Z')));
console.log('Test 5 (null):', safeFormatDate(null));
console.log('Test 6 (undefined):', safeFormatDate(undefined));
console.log('Test 7 (empty string):', safeFormatDate(''));

