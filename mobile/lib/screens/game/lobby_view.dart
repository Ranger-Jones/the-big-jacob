import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../api.dart';
import '../../game/controller.dart';
import '../../game/models.dart';
import '../../game/rules.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/playing_card.dart';
import '../../widgets/jakob_icons.dart';
import '../bots_screen.dart';

/// Before the game: who sits at the table, bots, your deck, the rules, and the start.
class LobbyView extends StatelessWidget {
  final GameController g;
  final VoidCallback onLeave;
  const LobbyView({super.key, required this.g, required this.onLeave});

  Future<void> _act(BuildContext context, Map<String, dynamic> action, {bool versioned = true}) async {
    await g.dispatch(action, versioned: versioned);
    if (!context.mounted) return;
    if (g.lastError != null) {
      toast(context, g.lastError!, error: true);
      g.lastError = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: g,
      builder: (context, _) {
        final s = g.state!;
        final isHost = s.hostId == g.me;
        final public = s.mode == 'public';
        final canManage = isHost && !public;
        final players = s.players.where((p) => !p.left).toList();
        final full = players.length >= s.maxPlayers;
        final me = s.player(g.me);
        return ListView(
          padding: EdgeInsets.fromLTRB(18, MediaQuery.paddingOf(context).top + 6, 18, MediaQuery.paddingOf(context).bottom + 120),
          children: [
            Row(children: [
              IconButton(onPressed: onLeave, icon: const Icon(Icons.arrow_back_rounded, color: C.inkSoft)),
              const Spacer(),
              if (!public) IconButton(onPressed: () => _invite(context), icon: const Icon(Icons.person_add_alt_1_rounded, color: C.goldSoft), tooltip: t('Freunde einladen')),
            ]),
            Text(public ? t('Offene Runde') : t('Dein Tisch'), style: T.body(17, color: C.inkSoft)),
            if (!public)
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: g.game!.code));
                  HapticFeedback.selectionClick();
                  toast(context, t('Code {code} kopiert. Schick ihn deinen Freunden!', {'code': g.game!.code}));
                },
                child: Row(children: [
                  Text(g.game!.code, style: T.body(46, color: C.goldSoft, weight: FontWeight.w800).copyWith(letterSpacing: 7)),
                  const SizedBox(width: 10),
                  const Icon(Icons.copy_rounded, color: C.inkSoft, size: 22),
                ]),
              )
            else
              _PublicCountdown(g: g),
            const SizedBox(height: 4),
            Text(t('{n} von {max} Plätzen besetzt', {'n': players.length, 'max': s.maxPlayers}), style: T.body(15, color: C.inkSoft)),
            SectionTitle(t('Am Tisch')),
            for (var i = 0; i < players.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Panel(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(children: [
                    Avatar(name: players[i].bot?.name ?? g.nameOf(players[i].id), url: g.profiles[players[i].id]?.avatarUrl, emoji: players[i].bot?.emoji, size: 44,
                        ring: players[i].id == g.me ? C.gold : null),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(g.nameOf(players[i].id), style: T.body(17, weight: FontWeight.w700)),
                        Builder(builder: (_) {
                          final p = players[i];
                          final (icon, label) = p.id == s.hostId
                              ? ('crown', t('Gastgeber'))
                              : p.bot != null
                                  ? (p.bot!.level == 'sly' ? ('fox', t('Gerissener Bot')) : ('smile', t('Einfacher Bot')))
                                  : ('user', p.id == g.me ? t('Du') : t('Höfling'));
                          return Row(children: [
                            JIcon(icon, size: 15, color: icon == 'crown' ? C.gold : C.inkSoft),
                            const SizedBox(width: 4),
                            Text(label, style: T.body(13, color: C.inkSoft)),
                          ]);
                        }),
                      ]),
                    ),
                    if (g.deckOf(players[i].id) != null) PlayingCard(rank: 1, deck: g.deckOf(players[i].id)!, width: 30),
                    if (canManage && players[i].id != g.me)
                      IconButton(
                        onPressed: () => _act(context, {'type': 'removePlayer', 'playerId': players[i].id}),
                        icon: const Icon(Icons.close_rounded, color: C.inkMute, size: 20),
                      ),
                  ]),
                ).animate().fadeIn(delay: (i * 60).ms).slideX(begin: .06),
              ),
            if (canManage && !full)
              Row(children: [
                Expanded(child: SoftButton(label: t('Einfacher Bot'), jicon: 'smile', onPressed: () => _act(context, {'type': 'addBot', 'level': 'easy'}))),
                const SizedBox(width: 10),
                Expanded(child: SoftButton(label: t('Gerissen'), jicon: 'fox', onPressed: () => _act(context, {'type': 'addBot', 'level': 'sly'}))),
              ]),
            if (canManage && !full) ...[
              const SizedBox(height: 10),
              SoftButton(
                label: t('Charakter wählen …'),
                jicon: 'crown',
                onPressed: () async {
                  final seated = {for (final p in players) if (p.bot?.persona != null) p.bot!.persona!};
                  final persona = await showPersonaPicker(context, seated);
                  if (persona != null && context.mounted) _act(context, {'type': 'addBot', 'persona': persona});
                },
              ),
            ],
            SectionTitle(t('Dein Deck')),
            SizedBox(
              height: 128,
              child: ListView(scrollDirection: Axis.horizontal, children: [
                for (final d in g.myDecks)
                  _DeckChoice(
                    deck: d,
                    selected: (me?.deckId ?? g.deckOf(g.me)?.id) == d.id,
                    onTap: () => _act(context, {'type': 'setDeck', 'deckId': d.id}),
                  ),
              ]),
            ),
            SectionTitle(t('Regeln'), trailing: canManage ? TextButton(onPressed: () => _editRules(context), child: Text(t('Ändern'), style: T.body(16, color: C.goldSoft, weight: FontWeight.w700))) : null),
            _RulesSummary(s: s),
            const SizedBox(height: 24),
            if (isHost && !public)
              GoldButton(
                label: players.length < 2 ? t('Mindestens 2 Spieler') : t('Spiel starten'),
                icon: Icons.play_arrow_rounded,
                large: true,
                busy: g.busy,
                onPressed: players.length < 2 ? null : () => _act(context, {'type': 'start'}),
              ).animate(onPlay: (c) => c.repeat(reverse: true)).shimmer(delay: 2.seconds, duration: 1200.ms, color: Colors.white54)
            else
              Center(child: Text(public ? t('Das Spiel startet automatisch.') : t('Warte, bis {name} das Spiel startet …', {'name': g.nameOf(s.hostId)}), style: T.body(16, color: C.inkSoft))),
          ],
        );
      },
    );
  }

  Future<void> _invite(BuildContext context) async {
    final at = g.state!.players.map((p) => p.id).toSet();
    final friends = g.friends.where((f) => !at.contains(f.id)).toList();
    await showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 30),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(t('Freunde einladen'), style: T.display(28)),
          const SizedBox(height: 10),
          if (friends.isEmpty) EmptyNote(t('Alle deine Freunde sitzen schon hier, oder du hast noch keine. Teile einfach den Code.')),
          for (final f in friends)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Avatar.of(f, size: 40),
              title: Text(f.username, style: T.body(17, weight: FontWeight.w700)),
              trailing: const Icon(Icons.send_rounded, color: C.gold),
              onTap: () async {
                final res = await Api.post('invite/${g.game!.id}', {'friendId': f.id});
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                toast(context, res.ok ? t('{name} ist eingeladen.', {'name': f.username}) : res.error!, error: !res.ok);
              },
            ),
        ]),
      ),
    );
  }

  Future<void> _editRules(BuildContext context) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .8,
        maxChildSize: .94,
        builder: (ctx, scroll) => ListenableBuilder(
          listenable: g,
          builder: (ctx, _) {
            final s = g.state!;
            void set(String key, Object? value) => _act(context, {'type': 'updateSettings', 'settings': {key: value}});
            return ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(20, 0, 20, 40), children: [
              Text(t('Regeln & Kniffe'), style: T.display(30)),
              const SizedBox(height: 16),
              _Choice(label: t('Runden'), value: s.settings['rounds'], options: {for (final r in roundOptions) r: '$r'}, onSelect: (v) => set('rounds', v)),
              _Choice(label: t('Punkteziel'), value: s.settings['goal'], options: {for (final r in goalOptions) r: r == null ? t('Aus') : '$r'}, onSelect: (v) => set('goal', v)),
              _Choice(label: t('Zugzeit'), value: s.settings['turnSeconds'], options: {for (final r in turnOptions) r: r == null ? t('Aus') : '${r}s'}, onSelect: (v) => set('turnSeconds', v)),
              _Choice(label: t('Steuern'), value: s.settings['tax'], options: {for (final o in taxOptions.entries) o.key: t(o.value)}, onSelect: (v) => set('tax', v)),
              const SizedBox(height: 8),
              for (final e in settingText.entries)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: s.setting(e.key),
                  // The duel needs exactly two seats; teams and the double deck do not go with it.
                  onChanged: (e.key == 'duel' && !s.setting('duel') && s.players.length > 2) ||
                          ((e.key == 'teams' || e.key == 'doubleDeck') && s.setting('duel'))
                      ? null
                      : (v) => set(e.key, v),
                  title: Text(t(e.value.label), style: T.body(17, weight: FontWeight.w700)),
                  subtitle: e.value.hint == null ? null : Text(t(e.value.hint!), style: T.body(13, color: C.inkSoft)),
                ),
            ]);
          },
        ),
      ),
    );
  }
}

class _Choice extends StatelessWidget {
  final String label;
  final Object? value;
  final Map<Object?, String> options;
  final void Function(Object?) onSelect;
  const _Choice({required this.label, required this.value, required this.options, required this.onSelect});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: T.label(14)),
          const SizedBox(height: 6),
          Wrap(spacing: 8, children: [
            for (final o in options.entries)
              ChoiceChip(
                label: Text(o.value, style: T.body(15, color: o.key == value ? C.onGold : C.ink, weight: FontWeight.w700)),
                selected: o.key == value,
                selectedColor: C.gold,
                backgroundColor: C.surfaceHi,
                side: const BorderSide(color: C.line),
                showCheckmark: false,
                onSelected: (_) => onSelect(o.key),
              ),
          ]),
        ]),
      );
}

class _RulesSummary extends StatelessWidget {
  final GameState s;
  const _RulesSummary({required this.s});

  @override
  Widget build(BuildContext context) {
    final turn = s.settings['turnSeconds'];
    final active = settingText.entries.where((e) => s.setting(e.key) && e.key != 'chat' && e.key != 'tracker').map((e) => t(e.value.label));
    return Wrap(spacing: 8, runSpacing: 8, children: [
      Pill(s.goal != null ? t('Bis {goal} Punkte', {'goal': s.goal}) : t('{count} Runden', {'count': s.rounds}), jicon: 'rotate'),
      Pill(turn == null ? t('Ohne Zugzeit') : t('{seconds}s Zugzeit', {'seconds': turn}), jicon: 'hourglass'),
      Pill(t('Steuern: {tax}', {'tax': t(taxOptions[s.settings['tax']] ?? 'Normal')}), jicon: 'coins'),
      for (final a in active) Pill(a, jicon: 'sparkles', color: C.gold.withValues(alpha: .16), textColor: C.goldSoft),
    ]);
  }
}

class _DeckChoice extends StatelessWidget {
  final Deck deck;
  final bool selected;
  final VoidCallback onTap;
  const _DeckChoice({required this.deck, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 96,
          margin: const EdgeInsets.only(right: 10),
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: selected ? C.gold.withValues(alpha: .14) : C.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: selected ? C.gold : C.line, width: selected ? 2 : 1),
          ),
          child: Column(children: [
            PlayingCard(rank: 1, deck: deck, width: 52),
            const SizedBox(height: 6),
            Text(t(deck.name), maxLines: 1, overflow: TextOverflow.ellipsis, style: T.label(12, color: selected ? C.goldSoft : C.ink)),
          ]),
        ),
      );
}

class _PublicCountdown extends StatefulWidget {
  final GameController g;
  const _PublicCountdown({required this.g});

  @override
  State<_PublicCountdown> createState() => _PublicCountdownState();
}

class _PublicCountdownState extends State<_PublicCountdown> {
  late final Timer _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final at = DateTime.tryParse(widget.g.state!.autoStartAt ?? '');
    final left = at?.difference(widget.g.serverNow);
    final text = left == null ? t('Warte auf Mitspieler …') : left.isNegative ? t('Gleich geht es los …') : t('Start in {time}', {'time': '${left.inMinutes}:${(left.inSeconds % 60).toString().padLeft(2, '0')}'});
    return Text(text, style: T.display(40, color: C.goldSoft));
  }
}
