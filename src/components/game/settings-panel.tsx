'use client';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n/client';
import { getSettings, type Settings } from '@/lib/jakob/engine';
import { GAME_MODES, goalLabel, KNIFFE, SETTING_TEXT, TAX_LABELS, turnLabel } from '@/lib/jakob/texts';
import { GOAL_OPTIONS, ROUND_OPTIONS, TAX_OPTIONS, TURN_OPTIONS } from '@/lib/jakob/types';
import { useTable } from './table-context';

/** Host edits, everybody else sees the current choice. */
export function SettingsPanel() {
  const { state, isHost, g } = useTable();
  const t = useT();
  const s = getSettings(state);
  const set = (patch: Partial<Settings>) => {
    if (isHost) void g.dispatch({ type: 'updateSettings', settings: patch });
  };
  // The duel needs exactly two seats; teams and the double deck do not go with it.
  const blocked = (key: keyof typeof SETTING_TEXT) =>
    (key === 'duel' && !s.duel && state.players.length > 2) || ((key === 'teams' || key === 'doubleDeck') && s.duel);
  const toggle = (key: keyof typeof SETTING_TEXT) => {
    const text: { label: string; hint?: string } = SETTING_TEXT[key];
    return (
      <Switch
        key={key}
        checked={s[key] as boolean}
        disabled={!isHost || blocked(key)}
        onChange={(v) => set({ [key]: v } as Partial<Settings>)}
        label={t(text.label)}
        hint={text.hint && t(text.hint)}
      />
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-line">
        <Segmented label={t(SETTING_TEXT.rounds.label)} value={s.rounds} disabled={!isHost || s.goal !== null}
          options={ROUND_OPTIONS.map((r) => ({ value: r, label: String(r) }))} onChange={(rounds) => set({ rounds })} />
        <Segmented label={t('Oder: Punkteziel')} value={s.goal} disabled={!isHost}
          options={GOAL_OPTIONS.map((goal) => ({ value: goal, label: goalLabel(goal, t) }))} onChange={(goal) => set({ goal })} />
        <Segmented label={t(SETTING_TEXT.turnSeconds.label)} value={s.turnSeconds} disabled={!isHost}
          options={TURN_OPTIONS.map((sec) => ({ value: sec, label: turnLabel(sec, t) }))} onChange={(turnSeconds) => set({ turnSeconds })} />
        <Segmented label={t(SETTING_TEXT.tax.label)} value={s.tax} disabled={!isHost}
          options={TAX_OPTIONS.map((tax) => ({ value: tax, label: t(TAX_LABELS[tax]) }))} onChange={(tax) => set({ tax })} />
        {toggle('revolution')}
        {toggle('jestersTaxable')}
        {toggle('tracker')}
        {toggle('chat')}
      </div>
      <div>
        <h3 className="mb-1 text-2xl font-bold">{t('Spielmodus')}</h3>
        <div className="flex flex-col divide-y divide-line">{GAME_MODES.map(toggle)}</div>
      </div>
      <div>
        <h3 className="mb-1 text-2xl font-bold">{t('Kniffe')}</h3>
        <p className="mb-1 text-sm text-ink-soft">{t('Hausregeln für mehr Chaos am Hof.')}</p>
        <div className="flex flex-col divide-y divide-line">{KNIFFE.map(toggle)}</div>
      </div>
      {!isHost && <p className="text-sm font-bold text-ink-soft">{t('Nur der Host kann die Regeln ändern.')}</p>}
    </div>
  );
}
