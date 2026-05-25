export async function waitForBrowserPaint(cycles = 2) {
  for (let index = 0; index < cycles; index += 1) {
    await new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => resolve());
        return;
      }

      setTimeout(resolve, 16);
    });
  }
}
