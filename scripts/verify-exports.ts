
import { getEmployeesByCompany, deleteEmployee, deleteEmployeesBatch, saveQuestorEmployees } from '../src/app/actions/employees';

console.log('Verifying exports from employees.ts...');

try {
  if (typeof getEmployeesByCompany === 'function') {
    console.log('✅ getEmployeesByCompany is exported');
  } else {
    console.error('❌ getEmployeesByCompany is MISSING');
    process.exit(1);
  }

  if (typeof deleteEmployee === 'function') {
    console.log('✅ deleteEmployee is exported');
  } else {
    console.error('❌ deleteEmployee is MISSING');
    process.exit(1);
  }

  if (typeof deleteEmployeesBatch === 'function') {
    console.log('✅ deleteEmployeesBatch is exported');
  } else {
    console.error('❌ deleteEmployeesBatch is MISSING');
    process.exit(1);
  }

  if (typeof saveQuestorEmployees === 'function') {
    console.log('✅ saveQuestorEmployees is exported');
  } else {
    console.error('❌ saveQuestorEmployees is MISSING');
    process.exit(1);
  }

  console.log('All required exports are present.');
} catch (error) {
  console.error('Error verifying exports:', error);
  process.exit(1);
}
