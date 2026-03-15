export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureMigrations } = await import('./lib/auto-migrate');
    await ensureMigrations();
  }
}
