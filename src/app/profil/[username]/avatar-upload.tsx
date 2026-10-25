'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, type AvatarProfile } from '@/components/ui/avatar';
import { cropToSquareWebp, validateImageFile } from '@/lib/crop-image';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { removeAvatarAction, setAvatarAction } from '@/server/profile-actions';

export function AvatarUpload({ me, profile }: { me: string; profile: AvatarProfile }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) return toast.error(invalid);
    setBusy(true);
    try {
      const blob = await cropToSquareWebp(file);
      const supabase = createBrowserSupabase();
      const path = `${me}/avatar-${Date.now()}.webp`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp' });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const res = await setAvatarAction(data.publicUrl);
      if (!res.ok) throw new Error(res.error);
      toast.success('Profilbild aktualisiert');
      router.refresh();
    } catch {
      toast.error('Das Bild konnte nicht hochgeladen werden. Versuch ein anderes.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    const res = await removeAvatarAction();
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Profilbild entfernt');
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="group relative rounded-full"
        aria-label="Profilbild ändern"
      >
        <Avatar profile={profile} size="xl" className="ring-4 ring-gold" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-velvet-deep/55 text-sm font-bold text-parchment opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {busy ? 'Lädt …' : 'Bild ändern'}
        </span>
        <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-gold text-lg ring-4 ring-velvet" aria-hidden>📷</span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          data-testid="avatar-input"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </button>
      {profile.avatar_url && (
        <button type="button" onClick={remove} disabled={busy} className="text-xs font-bold text-parchment/60 hover:text-parchment hover:underline">Bild entfernen</button>
      )}
    </div>
  );
}
