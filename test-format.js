function formatInput(value, ref) {
    if (!value) return '';

    if (ref === 'Hora') {
      let numbers = value.replace(/\D/g, '');
      if (numbers.length === 0) return '';
      
      if (numbers.length > 2) {
        return `${numbers.slice(0, -2)}:${numbers.slice(-2)}`;
      }
      return numbers;
    }
}
console.log('Hora:', formatInput('12345', 'Hora'));