import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'campaign/campaign_path.dart';
import 'campaign/stage_sheet.dart';
import 'game_screen.dart';
import '../widgets/jakob_icons.dart';

/// "Vom Bauern zum König": a road of stations climbing from the farm to the throne.
class CampaignScreen extends StatefulWidget {
  const CampaignScreen({super.key});

  @override
  State<CampaignScreen> createState() => _CampaignScreenState();
}

class _CampaignScreenState extends State<CampaignScreen> {
  final _scroll = ScrollController();
  List<Stage> _stages = const [];
  int _level = 0;
  bool _lockedToday = false;
  String _title = '';
  String? _error;
  int? _starting;
  bool _loaded = false, _scrolled = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final before = _loaded ? _level : null;
    final res = await Api.get('campaign');
    if (!mounted) return;
    setState(() {
      _loaded = true;
      if (!res.ok) {
        _error = res.error;
        return;
      }
      final d = res.data as Map;
      _level = (d['level'] as num?)?.toInt() ?? 0;
      _title = d['title'] as String? ?? '';
      _lockedToday = d['lockedToday'] == true;
      _stages = ((d['stages'] as List?) ?? const []).whereType<Map>().map(Stage.from).toList()
        ..sort((a, b) => a.level.compareTo(b.level));
      _error = null;
    });
    if (!res.ok) return;
    if (before != null && _level > before) toast(context, 'Neuer Titel: $_title!');
    if (!_scrolled) {
      _scrolled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToNext());
    }
  }

  /// Brings the next open station into view (the list grows upwards from the farm).
  void _scrollToNext() {
    if (!_scroll.hasClients) return;
    final index = math.min(_level, _stages.length - 1);
    final view = _scroll.position.viewportDimension;
    final target = (_bottomCap + index * stationHeight + stationHeight / 2 - view / 2).clamp(0.0, _scroll.position.maxScrollExtent);
    _scroll.animateTo(target, duration: 700.ms, curve: Curves.easeOutCubic);
  }

  Future<void> _openStage(Stage stage) async {
    final state = stageState(stage.level, _level);
    final go = await showStageSheet(context, stage: stage, state: state, total: _stages.length, lockedToday: _lockedToday);
    if (go == true && mounted) _start(stage.level);
  }

  Future<void> _start(int level) async {
    if (_starting != null) return;
    setState(() => _starting = level);
    final res = await Api.post('table', {'kind': 'campaign', 'level': level});
    if (!mounted) return;
    setState(() => _starting = null);
    if (!res.ok) return toast(context, res.error!, error: true);
    await openTable(context, (res.data as Map)['code'] as String);
    if (mounted) _load();
  }

  static const _bottomCap = 96.0;

  @override
  Widget build(BuildContext context) {
    final total = _stages.length;
    final won = math.min(_level, total);
    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          title: Text('Kampagne', style: T.display(30)),
        ),
        body: !_loaded
            ? const Center(child: CircularProgressIndicator(color: C.gold))
            : Column(children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 0, 18, 6),
                  child: _Header(title: _title, won: won, total: total),
                ).animate().fadeIn(duration: 300.ms).slideY(begin: -.1, end: 0),
                if (_error != null)
                  Padding(padding: const EdgeInsets.symmetric(horizontal: 18), child: EmptyNote(_error!, icon: Icons.wifi_off_rounded)),
                Expanded(
                  child: RefreshIndicator(
                    color: C.gold,
                    backgroundColor: C.surface,
                    onRefresh: _load,
                    child: ShaderMask(
                      // Fade the road into the night at the top edge.
                      shaderCallback: (r) => const LinearGradient(
                        begin: Alignment.topCenter, end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black], stops: [0, .06],
                      ).createShader(r),
                      blendMode: BlendMode.dstIn,
                      child: ListView(
                        controller: _scroll,
                        reverse: true,
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                        children: [
                          // reverse: the first child sits at the bottom, so the road starts at the farm.
                          SizedBox(height: _bottomCap + MediaQuery.paddingOf(context).bottom, child: const _StartCap()),
                          for (var i = 0; i < total; i++)
                            StationRow(
                              stage: _stages[i],
                              state: stageState(_stages[i].level, _level),
                              first: i == 0,
                              last: i == total - 1,
                              busy: _starting == _stages[i].level,
                              onTap: () => _openStage(_stages[i]),
                            ).animate(delay: (80 * i).ms).fadeIn(duration: 380.ms).slideY(begin: .15, end: 0, curve: Curves.easeOutCubic),
                          if (total > 0) _ThroneCap(reached: won >= total).animate(delay: (80 * total).ms).fadeIn(duration: 400.ms),
                        ],
                      ),
                    ),
                  ),
                ),
              ]),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String title;
  final int won, total;
  const _Header({required this.title, required this.won, required this.total});

  @override
  Widget build(BuildContext context) => Panel(
        glow: total > 0 && won >= total,
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Vom Bauern zum König', style: T.body(15, color: C.goldSoft, weight: FontWeight.w700)),
          const SizedBox(height: 4),
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Expanded(
              child: Text.rich(
                TextSpan(children: [
                  TextSpan(text: 'Dein Titel: ', style: T.body(16, color: C.inkSoft)),
                  TextSpan(text: title, style: T.display(30, color: C.ink)),
                ]),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text('$won / $total', style: T.display(24, color: C.gold)),
          ]),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: total == 0 ? 0 : won / total),
              duration: 900.ms,
              curve: Curves.easeOutCubic,
              builder: (_, v, _) => LinearProgressIndicator(value: v, minHeight: 8, color: C.gold, backgroundColor: C.night),
            ),
          ),
        ]),
      );
}

/// Bottom end of the road.
class _StartCap extends StatelessWidget {
  const _StartCap();

  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.topCenter,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 3, height: 20, color: C.gold.withValues(alpha: .5)),
          const SizedBox(height: 6),
          Text('Hier beginnt dein Weg', style: T.label(13, color: C.inkMute)),
        ]),
      );
}

/// Top end of the road: the throne waiting for the Großer Jakob.
class _ThroneCap extends StatelessWidget {
  final bool reached;
  const _ThroneCap({required this.reached});

  @override
  Widget build(BuildContext context) {
    const crown = JIcon('crown', size: 46, color: C.gold);
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 4),
      child: Column(children: [
        reached
            ? crown.animate(onPlay: (c) => c.repeat(reverse: true)).moveY(begin: -3, end: 3, duration: 1600.ms, curve: Curves.easeInOut)
            : Opacity(opacity: .5, child: crown),
        const SizedBox(height: 4),
        Text('Der Thron', style: T.display(28, color: reached ? C.gold : C.inkSoft)),
        Text(reached ? 'Er gehört dir, Großer Jakob.' : 'Ganz oben wartet die Krone.', style: T.body(14, color: C.inkMute)),
      ]),
    );
  }
}
