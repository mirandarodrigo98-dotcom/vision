import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import ProfileForm from './profile-form';

export default async function ProfilePage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const user = await db.prepare(`
        SELECT id, name, email, phone, avatar_path
        FROM users 
        WHERE id = ?
    `).get(session.user_id) as { id: string, name: string, email: string, phone: string | null, avatar_path: string | null };

    if (!user) {
        // Fallback if user session exists but DB record not found
        redirect('/login');
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>
            <div className="bg-white rounded-lg shadow p-6">
                <ProfileForm user={user} />
            </div>
        </div>
    );
}