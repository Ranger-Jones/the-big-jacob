import { describe, expect, it } from 'vitest';
import { createCourt, getCourt, joinCourt, leaveCourt, listMyCourts, removeCourtMember } from '@/server/court-service';
import { savePushSubscription } from '@/server/push-service';
import { admin, createTestUser } from './helpers';

describe('courts', () => {
  it('create, join by code, hide from outsiders, hand over on leave', async () => {
    const lord = await createTestUser('cl');
    const vassal = await createTestUser('cv');
    const outsider = await createTestUser('co');
    const created = await createCourt(admin, lord.id, 'Wache Süd', 'h-crown');
    if (!created.ok) throw new Error(created.error);
    const court = (await getCourt(admin, lord.id, created.data.id))!;
    expect(court.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    expect((await joinCourt(admin, vassal.id, 'ZZZZZZZZ')).ok).toBe(false);
    expect((await joinCourt(admin, vassal.id, court.inviteCode)).ok).toBe(true);
    expect((await listMyCourts(admin, vassal.id)).map((c) => c.name)).toEqual(['Wache Süd']);
    expect(await getCourt(admin, outsider.id, court.id)).toBeNull();

    // RLS: members read their court, outsiders see nothing.
    expect((await vassal.client.from('courts').select('name').eq('id', court.id)).data).toHaveLength(1);
    expect((await outsider.client.from('courts').select('name').eq('id', court.id)).data).toHaveLength(0);

    expect((await removeCourtMember(admin, vassal.id, court.id, lord.id)).ok).toBe(false);
    await leaveCourt(admin, lord.id, court.id);
    expect((await getCourt(admin, vassal.id, court.id))!.ownerId).toBe(vassal.id);
    await leaveCourt(admin, vassal.id, court.id);
    expect((await admin.from('courts').select('id').eq('id', court.id)).data).toHaveLength(0);
  });
});

describe('push subscriptions', () => {
  it('accepts only push services and never moves a stranger’s endpoint', async () => {
    const a = await createTestUser('pa');
    const b = await createTestUser('pb');
    const keys = { p256dh: 'B'.repeat(80), auth: 'a'.repeat(16) };
    expect((await savePushSubscription(admin, a.id, { endpoint: 'https://169.254.169.254/latest', keys })).ok).toBe(false);
    const endpoint = `https://fcm.googleapis.com/fcm/send/${a.id}`;
    expect((await savePushSubscription(admin, a.id, { endpoint, keys })).ok).toBe(true);
    expect((await savePushSubscription(admin, b.id, { endpoint, keys: { ...keys, auth: 'b'.repeat(16) } })).ok).toBe(false);
    const { data } = await admin.from('push_subscriptions').select('user_id').eq('endpoint', endpoint).single();
    expect(data!.user_id).toBe(a.id);
  });
});
