function formatOmieDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

const today = new Date('2026-04-11T12:00:00');
const thirteenMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 13, 1);
const dataAte = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const periodosExtrato: { de: string, ate: string }[] = [];
let curDate = new Date(thirteenMonthsAgo.getTime());
while (curDate <= dataAte) {
  const nextDate = new Date(curDate.getFullYear(), curDate.getMonth() + 6, 0); // avança 6 meses (fim do mês)
  const actualNext = nextDate > dataAte ? dataAte : nextDate;
  periodosExtrato.push({
    de: formatOmieDate(curDate),
    ate: formatOmieDate(actualNext)
  });
  curDate = new Date(actualNext.getFullYear(), actualNext.getMonth() + 1, 1);
}

console.log(periodosExtrato);
