import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../api.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../profile_screen.dart';
import 'court_dialogs.dart';
import 'court_forms.dart';
import 'court_models.dart';
import 'crest.dart';
import '../../widgets/jakob_icons.dart';

/// One court: crest, invite code, the court table and the owner's tools.
/// Pops with true when the user left the court.
class CourtDetailScreen extends StatefulWidget {
  final String id;
  const CourtDetailScreen({super.key, required this.id});

  @override
  State<CourtDetailScreen> createState() => _CourtDetailScreenState();
}

class _CourtDetailScreenState extends State<CourtDetailScreen> {
  final _me = Supabase.instance.client.auth.currentUser!.id;
  CourtDetail? _court;
  String? _error;
  String? _kicking;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await Api.get('court/${widget.id}');
    if (!mounted) return;
    setState(() {
      if (res.ok) {
        _court = CourtDetail.from(res.data as Map);
        _error = null;
      } else {
        _error = res.error;
      }
    });
  }

  bool get _owner => _court?.ownerId == _me;

  void _openProfile(CourtStanding s) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: s.profile.username, isMe: false)));
  }

  Future<void> _invite() async {
    final code = _court!.inviteCode;
    await Clipboard.setData(ClipboardData(text: inviteLink(code)));
    if (mounted) toast(context, 'Einladungslink kopiert. Der Code ist $code.');
  }

  Future<void> _copyCode() async {
    await Clipboard.setData(ClipboardData(text: _court!.inviteCode));
    if (mounted) toast(context, 'Einladungscode kopiert.');
  }

  Future<void> _kick(CourtStanding s) async {
    final name = s.profile.username;
    final yes = await confirmDanger(
      context,
      title: '$name verbannen?',
      message: '$name verliert den Platz am Hof und kann nur mit dem Code wieder beitreten.',
      confirm: 'Verbannen',
    );
    if (!yes || !mounted) return;
    setState(() => _kicking = s.profile.id);
    final res = await Api.post('court', {'op': 'kick', 'id': widget.id, 'memberId': s.profile.id});
    if (!mounted) return;
    setState(() => _kicking = null);
    if (!res.ok) return toast(context, res.error!, error: true);
    toast(context, '$name wurde verbannt.');
    _load();
  }

  Future<void> _edit() async {
    final saved = await showEditCourtSheet(context, _court!);
    if (!saved || !mounted) return;
    toast(context, 'Hof gespeichert.');
    _load();
  }

  Future<void> _leave() async {
    final court = _court!;
    final alone = court.standings.length <= 1;
    final message = !_owner
        ? 'Deine Spiele bleiben gezählt, falls du zurückkommst.'
        : alone
            ? 'Du bist das letzte Mitglied. Wenn du gehst, wird der Hof aufgelöst.'
            : 'Die Hofherrschaft geht an das dienstälteste Mitglied. Bist du das letzte Mitglied, wird der Hof aufgelöst.';
    final yes = await confirmDanger(context, title: 'Hof verlassen?', message: message, confirm: 'Verlassen', cancel: 'Bleiben');
    if (!yes || !mounted) return;
    setState(() => _leaving = true);
    final res = await Api.post('court', {'op': 'leave', 'id': widget.id});
    if (!mounted) return;
    setState(() => _leaving = false);
    if (!res.ok) return toast(context, res.error!, error: true);
    toast(context, _owner && alone ? 'Der Hof wurde aufgelöst.' : 'Du hast ${court.name} verlassen.');
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final court = _court;
    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          title: Text('Hof', style: T.display(30)),
        ),
        body: court == null
            ? _error == null
                ? const Center(child: CircularProgressIndicator(color: C.gold))
                : _ErrorState(message: _error!, onRetry: _load)
            : RefreshIndicator(
                color: C.gold,
                backgroundColor: C.surface,
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.fromLTRB(18, 4, 18, MediaQuery.paddingOf(context).bottom + 32),
                  children: [
                    _Header(court: court).animate().fadeIn(duration: 360.ms).slideY(begin: -.06, end: 0, curve: Curves.easeOutCubic),
                    const SizedBox(height: 22),
                    _InviteCard(code: court.inviteCode, onInvite: _invite, onCopyCode: _copyCode)
                        .animate(delay: 90.ms)
                        .fadeIn(duration: 320.ms)
                        .slideY(begin: .1, end: 0, curve: Curves.easeOutCubic),
                    SectionTitle('Hoftabelle', trailing: Text(plural(court.standings.length, 'Mitglied', 'Mitglieder'), style: T.body(15, color: C.inkSoft))),
                    Text(
                      'Es zählen normale Spiele mit mindestens zwei Mitgliedern. Einen Sieg holt, wer von den Mitgliedern am besten abschneidet.',
                      style: T.body(14, color: C.inkMute, height: 1.35),
                    ),
                    const SizedBox(height: 12),
                    Panel(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Column(children: [
                        for (var i = 0; i < court.standings.length; i++)
                          _StandingRow(
                            place: i + 1,
                            standing: court.standings[i],
                            mine: court.standings[i].profile.id == _me,
                            canKick: _owner && !court.standings[i].owner && court.standings[i].profile.id != _me,
                            kicking: _kicking == court.standings[i].profile.id,
                            onTap: () => _openProfile(court.standings[i]),
                            onKick: () => _kick(court.standings[i]),
                          ).animate(delay: (140 + 50 * i).ms).fadeIn(duration: 300.ms).slideX(begin: .05, end: 0, curve: Curves.easeOutCubic),
                      ]),
                    ),
                    const SizedBox(height: 28),
                    if (_owner) ...[
                      SoftButton(label: 'Name und Wappen ändern', icon: Icons.edit_rounded, onPressed: _edit),
                      const SizedBox(height: 10),
                    ],
                    SoftButton(label: _leaving ? 'Einen Moment …' : 'Hof verlassen', icon: Icons.logout_rounded, danger: true, onPressed: _leaving ? null : _leave),
                  ],
                ),
              ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(18),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          EmptyNote(message, icon: Icons.shield_outlined),
          const SizedBox(height: 8),
          SoftButton(label: 'Nochmal versuchen', icon: Icons.refresh_rounded, onPressed: onRetry),
        ]),
      );
}

class _Header extends StatelessWidget {
  final CourtDetail court;
  const _Header({required this.court});

  @override
  Widget build(BuildContext context) {
    final founded = court.createdAt == null ? null : 'Gegründet am ${germanDate(court.createdAt!)}';
    return Column(children: [
      Crest(id: court.crest, size: 128)
          .animate()
          .scale(begin: const Offset(.85, .85), end: const Offset(1, 1), duration: 480.ms, curve: Curves.easeOutBack),
      const SizedBox(height: 16),
      Text(court.name, textAlign: TextAlign.center, style: T.display(46)),
      const SizedBox(height: 8),
      if (founded != null) Text(founded, textAlign: TextAlign.center, style: T.body(15, color: C.inkSoft)),
      const SizedBox(height: 10),
      Pill(plural(court.courtGames, 'Hofspiel', 'Hofspiele'), icon: Icons.style_rounded, textColor: C.goldSoft),
    ]);
  }
}

class _InviteCard extends StatelessWidget {
  final String code;
  final VoidCallback onInvite, onCopyCode;
  const _InviteCard({required this.code, required this.onInvite, required this.onCopyCode});

  @override
  Widget build(BuildContext context) => Panel(
        color: C.velvet,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Einladungscode', style: T.body(15, color: C.goldSoft, weight: FontWeight.w700)),
          const SizedBox(height: 6),
          Semantics(
            label: 'Einladungscode ${code.split('').join(' ')}',
            excludeSemantics: true,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(code, style: codeStyle(34)),
            ),
          ),
          const SizedBox(height: 6),
          Text('Wer den Code oder Link hat, kann deinem Hof beitreten.', style: T.body(14, color: C.inkMute)),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: GoldButton(label: 'Einladen', icon: Icons.link_rounded, onPressed: onInvite)),
            const SizedBox(width: 10),
            SoftButton(label: 'Code', icon: Icons.copy_rounded, expand: false, onPressed: onCopyCode),
          ]),
        ]),
      );
}

class _StandingRow extends StatelessWidget {
  final int place;
  final CourtStanding standing;
  final bool mine, canKick, kicking;
  final VoidCallback onTap, onKick;
  const _StandingRow({
    required this.place,
    required this.standing,
    required this.mine,
    required this.canKick,
    required this.kicking,
    required this.onTap,
    required this.onKick,
  });


  @override
  Widget build(BuildContext context) {
    final s = standing;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      child: Material(
        color: mine ? C.gold.withValues(alpha: .12) : Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: mine ? BorderSide(color: C.gold.withValues(alpha: .45)) : BorderSide.none,
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 66),
            child: Padding(
              padding: EdgeInsets.fromLTRB(8, 8, canKick ? 0 : 14, 8),
              child: Row(children: [
                SizedBox(
                  width: 34,
                  child: s.games == 0 ? Text('–', textAlign: TextAlign.center, style: T.display(22, color: C.inkSoft)) : Center(child: Medal(place, size: 24)),
                ),
                const SizedBox(width: 6),
                Avatar.of(s.profile, size: 42, ring: mine ? C.gold : null),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                    Row(children: [
                      Flexible(child: Text(s.profile.username, overflow: TextOverflow.ellipsis, style: T.body(17, weight: FontWeight.w800))),
                      if (s.owner) ...[
                        const SizedBox(width: 6),
                        Semantics(label: 'Hofherr', child: const Tooltip(message: 'Hofherr', child: JIcon('crown', size: 18, color: C.gold))),
                      ],
                    ]),
                    const SizedBox(height: 2),
                    Text('${plural(s.wins, 'Sieg', 'Siege')} · ${plural(s.games, 'Spiel', 'Spiele')}', style: T.body(14, color: C.inkSoft)),
                  ]),
                ),
                const SizedBox(width: 8),
                Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('${s.points}', style: T.display(26, color: C.gold)),
                  Text(s.points == 1 ? 'Punkt' : 'Punkte', style: T.label(12, color: C.inkMute)),
                ]),
                if (canKick)
                  SizedBox(
                    width: 48,
                    height: 48,
                    child: kicking
                        ? const Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: C.wax)))
                        : IconButton(
                            onPressed: onKick,
                            tooltip: '${s.profile.username} verbannen',
                            icon: const Icon(Icons.close_rounded, size: 20),
                            color: C.inkMute,
                          ),
                  ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
