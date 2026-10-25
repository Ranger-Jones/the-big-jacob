'use client';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { getSettings, type Settings } from '@/lib/jakob/engine';
import { KNIFFE, SETTING_TEXT, TAX_LABELS, turnLabel } from '@/lib/jakob/texts';
import { ROUND_OPTIONS, TAX_OPTIONS, TURN_OPTIONS } from '@/lib/jakob/types';
import { useTable } from './table-context';

/** Host edits, everybody else sees the current choice. */
export function SettingsPanel() {
  const { state, isHost, g } = useTable();
  const s = getSettings(state);
  const set = (patch: Partial<Settings>) => {
    if (isHost) void g.dispatch({ type: 'updateSettings', settings: patch });
  };
  const toggle = (key: keyof typeof SETTING_TEXT) => {
    const text: { label: string; hint?: string } = SETTING_TEXT[key];
    return (
    <Switch
      key={key}
      checked={s[key] as boolean}
      disabled={!isHost}
      onChange={(v) => set({ [key]: v } as Partial<Settings>)}
      label={text.label}
      hint={text.hint}
    />
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-line">
        <Segmented label="Runden" value={s.rounds} disabled={!isHost}
          options={ROUND_OPTIONS.map((r) => ({ value: r, label: String(r) }))} onChange={(rounds) => set({ rounds })} />
        <Segmented label="Zugzeit" value={s.turnSeconds} disabled={!isHost}
          options={TURN_OPTIONS.map((t) => ({ value: t, label: turnLabel(t) }))} onChange={(turnSeconds) => set({ turnSeconds })} />
        <Segmented label="Steuern" value={s.tax} disabled={!isHost}
          options={TAX_OPTIONS.map((t) => ({ value: t, label: TAX_LABELS[t] }))} onChange={(tax) => set({ tax })} />
        {toggle('revolution')}
        {toggle('jestersTaxable')}
        {toggle('tracker')}
        {toggle('chat')}
      </div>
      <div>
        <h3 className="mb-1 text-2xl font-bold">Kniffe</h3>
        <p className="mb-1 text-sm text-ink-soft">Hausregeln für mehr Chaos am Hof.</p>
        <div className="flex flex-col divide-y divide-line">{KNIFFE.map(toggle)}</div>
      </div>
      {!isHost && <p className="text-sm font-bold text-ink-soft">Nur der Host kann die Regeln ändern.</p>}
    </div>
  );
}
