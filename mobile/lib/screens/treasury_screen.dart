import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../api.dart';
import '../game/loot.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/jakob_icons.dart';
import 'treasury/chest_art.dart';

/// "Schatzkammer": open chests, see what you own, equip frames, emblems, card backs and felts.
class TreasuryScreen extends StatefulWidget {
  const TreasuryScreen({super.key});

  @override
  State<TreasuryScreen> createState() => _TreasuryScreenState();
}

class _TreasuryScreenState extends State<TreasuryScreen> {
  Map<String, LootItem> _catalog = {};
  int _chests = 0, _dukaten = 0, _price = 60;
  Map<String, String> _equipped = {};
  Map<String, int> _owned = {};
  String? _error;
  bool _loading = true, _opening = false;
  String _kind = 'rahmen';

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _apply(Map d) {
    _chests = (d['chests'] as num?)?.toInt() ?? 0;
    _dukaten = (d['dukaten'] as num?)?.toInt() ?? 0;
    _price = (d['chestPrice'] as num?)?.toInt() ?? 60;
    _equipped = ((d['equipped'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, v as String));
    _owned = {for (final i in (d['items'] as List? ?? const [])) (i as Map)['id'] as String: (i['count'] as num).toInt()};
  }

  Future<void> _load() async {
    final res = await Api.get('loot');
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!res.ok) {
        _error = res.error;
        return;
      }
      final d = res.data as Map;
      _catalog = {for (final m in (d['catalog'] as List)) (m as Map)['id'] as String: LootItem.from(m)};
      _apply(d);
      _error = null;
    });
  }

  Future<void> _open() async {
    if (_opening || _chests <= 0) return;
    setState(() => _opening = true);
    HapticFeedback.mediumImpact();
    // Let the chest rattle a moment before the server answers, for suspense.
    final results = await Future.wait([Api.post('loot', {'op': 'open'}), Future.delayed(const Duration(milliseconds: 1100))]);
    final res = results.first as ApiResult;
    if (!mounted) return;
    setState(() => _opening = false);
    if (!res.ok) return toast(context, res.error!, error: true);
    final d = res.data as Map;
    setState(() => _apply(d['loot'] as Map));
    final item = LootItem.from(d['item'] as Map);
    HapticFeedback.heavyImpact();
    await showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: .94),
      builder: (_) => _Reveal(
        item: item,
        fresh: (d['count'] as num).toInt() == 1,
        dukaten: (d['dukatenGained'] as num?)?.toInt() ?? 0,
        equipped: _equipped[item.kind] == item.id,
        onEquip: () => _equip(item),
      ),
    );
  }

  Future<void> _buy() async {
    final res = await Api.post('loot', {'op': 'buy'});
    if (!mounted) return;
    if (!res.ok) return toast(context, res.error!, error: true);
    setState(() => _apply(res.data as Map));
    toast(context, 'Neue Truhe gekauft!');
  }

  Future<void> _equip(LootItem item, {bool off = false}) async {
    final res = await Api.post('loot', {'op': 'equip', 'kind': item.kind, 'id': off ? null : item.id});
    if (!mounted) return;
    if (!res.ok) return toast(context, res.error!, error: true);
    setState(() => _equipped = (res.data as Map).map((k, v) => MapEntry(k as String, v as String)));
    toast(context, off ? '${item.name} abgelegt' : '${item.name} angelegt');
  }

  @override
  Widget build(BuildContext context) {
    final items = _catalog.values.where((i) => i.kind == _kind).toList()
      ..sort((a, b) {
        final owned = (_owned.containsKey(b.id) ? 1 : 0) - (_owned.containsKey(a.id) ? 1 : 0);
        if (owned != 0) return owned;
        return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
      });
    final ownedInKind = items.where((i) => _owned.containsKey(i.id)).length;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Backdrop(
        child: RefreshIndicator(
          color: C.gold,
          onRefresh: _load,
          child: ListView(
            padding: EdgeInsets.fromLTRB(18, MediaQuery.paddingOf(context).top + 6, 18, MediaQuery.paddingOf(context).bottom + 30),
            children: [
              Row(children: [
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded, color: C.inkSoft)),
                const Spacer(),
                Pill('$_dukaten Dukaten', jicon: 'coins', textColor: C.goldSoft),
              ]),
              Text('Schatzkammer', style: T.display(44)),
              Text('Jedes beendete Spiel bringt eine Truhe, ein Sieg sogar zwei. Darin warten Rahmen, Wappen, Kartenrücken und Tischfilze.',
                  style: T.body(15, color: C.inkSoft)),
              const SizedBox(height: 18),
              if (_loading)
                const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator(color: C.gold)))
              else if (_error != null)
                EmptyNote(_error!, icon: Icons.wifi_off_rounded)
              else ...[
                _ChestPanel(chests: _chests, opening: _opening, onOpen: _open, price: _price, dukaten: _dukaten, onBuy: _buy),
                const SizedBox(height: 22),
                SizedBox(
                  height: 44,
                  child: ListView(scrollDirection: Axis.horizontal, children: [
                    for (final k in lootKinds)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          avatar: JIcon(lootKindIcon[k]!, size: 16, color: _kind == k ? C.onGold : C.inkSoft),
                          label: Text(lootKindLabel[k]!, style: T.body(14, weight: FontWeight.w700, color: _kind == k ? C.onGold : C.ink)),
                          selected: _kind == k,
                          showCheckmark: false,
                          selectedColor: C.gold,
                          backgroundColor: C.surfaceHi,
                          side: const BorderSide(color: C.line),
                          onSelected: (_) => setState(() => _kind = k),
                        ),
                      ),
                  ]),
                ),
                const SizedBox(height: 10),
                Text('$ownedInKind von ${items.length} gesammelt', style: T.label(13)),
                const SizedBox(height: 12),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: _kind == 'filz' ? 2 : 3,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: _kind == 'filz' ? 1.25 : (_kind == 'rueckseite' ? .62 : .78),
                  children: [
                    for (final (i, item) in items.indexed)
                      _ItemTile(
                        item: item,
                        count: _owned[item.id] ?? 0,
                        equipped: _equipped[item.kind] == item.id,
                        onTap: () => _showItem(item),
                      ).animate(delay: (i * 25).ms).fadeIn(duration: 220.ms),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showItem(LootItem item) {
    final owned = _owned.containsKey(item.id);
    final equipped = _equipped[item.kind] == item.id;
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(22, 0, 22, 30),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          SizedBox(height: 170, child: owned ? LootArt(item: item, size: 170) : _Silhouette(item: item, size: 170)),
          const SizedBox(height: 12),
          _RarityBadge(rarity: item.rarity),
          const SizedBox(height: 6),
          Text(owned ? item.name : '???', style: T.display(30)),
          const SizedBox(height: 4),
          Text(owned ? item.text : 'Noch nicht gefunden – vielleicht in der nächsten Truhe.', textAlign: TextAlign.center, style: T.body(15, color: C.inkSoft)),
          if ((_owned[item.id] ?? 0) > 1) Text('${_owned[item.id]}× gefunden', style: T.label(13)),
          const SizedBox(height: 18),
          if (owned)
            equipped
                ? SoftButton(label: 'Ablegen', jicon: 'close', onPressed: () {
                    Navigator.pop(ctx);
                    _equip(item, off: true);
                  })
                : GoldButton(label: 'Anlegen', jicon: 'check', onPressed: () {
                    Navigator.pop(ctx);
                    _equip(item);
                  }),
        ]),
      ),
    );
  }
}

/// A cosmetic drawn from the server's SVG, in the aspect ratio of its kind.
class LootArt extends StatelessWidget {
  final LootItem item;
  final double size;
  const LootArt({super.key, required this.item, required this.size});

  @override
  Widget build(BuildContext context) {
    final aspect = lootAspect[item.kind] ?? 1;
    final w = aspect >= 1 ? size : size * aspect;
    final h = aspect >= 1 ? size / aspect : size;
    return Center(
      child: SizedBox(
        width: w, height: h,
        child: SvgPicture.network(
          lootUrl(item.id),
          fit: BoxFit.contain,
          placeholderBuilder: (_) => const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: C.gold))),
        ),
      ),
    );
  }
}

class _Silhouette extends StatelessWidget {
  final LootItem item;
  final double size;
  const _Silhouette({required this.item, required this.size});

  @override
  Widget build(BuildContext context) => ColorFiltered(
        colorFilter: const ColorFilter.mode(Color(0xFF2A1A40), BlendMode.srcIn),
        child: LootArt(item: item, size: size),
      );
}

class _RarityBadge extends StatelessWidget {
  final String rarity;
  const _RarityBadge({required this.rarity});

  @override
  Widget build(BuildContext context) {
    final color = rarityColor[rarity]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: .18), borderRadius: BorderRadius.circular(99), border: Border.all(color: color)),
      child: Text(rarityLabel[rarity]!, style: T.label(13, color: color)),
    );
  }
}

class _ItemTile extends StatelessWidget {
  final LootItem item;
  final int count;
  final bool equipped;
  final VoidCallback onTap;
  const _ItemTile({required this.item, required this.count, required this.equipped, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final owned = count > 0;
    final color = rarityColor[item.rarity]!;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: owned ? C.surface : C.velvet.withValues(alpha: .6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: equipped ? C.gold : owned ? color.withValues(alpha: .7) : C.line, width: equipped ? 2.4 : 1.2),
          boxShadow: owned && item.rarity == 'legendaer' ? [BoxShadow(color: color.withValues(alpha: .3), blurRadius: 14)] : null,
        ),
        child: Column(children: [
          Expanded(child: LayoutBuilder(builder: (context, c) {
            final size = c.biggest.shortestSide;
            return owned ? LootArt(item: item, size: size) : Opacity(opacity: .5, child: _Silhouette(item: item, size: size));
          })),
          const SizedBox(height: 4),
          Row(children: [
            Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Expanded(child: Text(owned ? item.name : '???', maxLines: 1, overflow: TextOverflow.ellipsis, style: T.label(11.5, color: owned ? C.ink : C.inkMute))),
            if (equipped) const JIcon('check', size: 13, color: C.gold) else if (count > 1) Text('×$count', style: T.label(11)),
          ]),
        ]),
      ),
    );
  }
}

class _ChestPanel extends StatelessWidget {
  final int chests, price, dukaten;
  final bool opening;
  final VoidCallback onOpen, onBuy;
  const _ChestPanel({required this.chests, required this.opening, required this.onOpen, required this.price, required this.dukaten, required this.onBuy});

  @override
  Widget build(BuildContext context) {
    Widget chest = SvgPicture.string(chestSvg(open: false), height: 150);
    chest = opening
        ? chest.animate(onPlay: (c) => c.repeat()).shake(hz: 7, rotation: .06, duration: 500.ms).scaleXY(begin: 1, end: 1.06, duration: 500.ms)
        : chest.animate(onPlay: (c) => c.repeat(reverse: true)).moveY(begin: -3, end: 3, duration: 1800.ms, curve: Curves.easeInOut);
    return Panel(
      glow: chests > 0,
      child: Column(children: [
        Stack(alignment: Alignment.topRight, clipBehavior: Clip.none, children: [
          Padding(padding: const EdgeInsets.symmetric(horizontal: 30), child: chest),
          if (chests > 0)
            Positioned(
              right: 0, top: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(color: C.wax, borderRadius: BorderRadius.circular(99), border: Border.all(color: C.velvet, width: 2)),
                child: Text('×$chests', style: T.label(15, color: Colors.white)),
              ),
            ),
        ]),
        const SizedBox(height: 14),
        GoldButton(
          label: chests > 0 ? 'Truhe öffnen' : 'Keine Truhe übrig',
          jicon: 'key',
          large: true,
          busy: opening,
          onPressed: chests > 0 ? onOpen : null,
        ),
        const SizedBox(height: 10),
        SoftButton(label: 'Truhe kaufen · $price Dukaten', jicon: 'coins', onPressed: dukaten >= price ? onBuy : null),
        const SizedBox(height: 6),
        Text(
          'Dukaten gibt es für doppelte Stücke, die tägliche Herausforderung, jede neu eroberte Kampagnen-Station '
          'und den ersten Sieg gegen jeden Bot.',
          textAlign: TextAlign.center,
          style: T.body(13, color: C.inkMute, height: 1.35),
        ),
      ]),
    );
  }
}

/// The moment of truth: the chest bursts open and the item rises in its rarity's glow.
class _Reveal extends StatefulWidget {
  final LootItem item;
  final bool fresh, equipped;
  final int dukaten;
  final VoidCallback onEquip;
  const _Reveal({required this.item, required this.fresh, required this.dukaten, required this.equipped, required this.onEquip});

  @override
  State<_Reveal> createState() => _RevealState();
}

class _RevealState extends State<_Reveal> {
  final _confetti = ConfettiController(duration: const Duration(seconds: 2));

  @override
  void initState() {
    super.initState();
    if (widget.item.rarity == 'legendaer' || widget.item.rarity == 'episch') _confetti.play();
  }

  @override
  void dispose() {
    _confetti.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final color = rarityColor[item.rarity]!;
    return Material(
      color: Colors.transparent,
      child: Stack(alignment: Alignment.center, children: [
        // Rays of light in the rarity colour.
        Container(
          width: 420, height: 420,
          decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [color.withValues(alpha: .55), color.withValues(alpha: 0)])),
        ).animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(begin: .85, end: 1.05, duration: 1400.ms),
        Column(mainAxisSize: MainAxisSize.min, children: [
          SvgPicture.string(chestSvg(open: true), height: 110).animate().moveY(begin: 40, end: 0, duration: 400.ms, curve: Curves.easeOutBack).fadeIn(),
          LootArt(item: item, size: 190)
              .animate()
              .fadeIn(delay: 250.ms, duration: 300.ms)
              .scaleXY(begin: .2, end: 1, delay: 250.ms, duration: 650.ms, curve: Curves.easeOutBack)
              .moveY(begin: 60, end: 0, delay: 250.ms, duration: 650.ms, curve: Curves.easeOutCubic),
          const SizedBox(height: 14),
          _RarityBadge(rarity: item.rarity).animate().fadeIn(delay: 700.ms),
          const SizedBox(height: 6),
          Text(item.name, textAlign: TextAlign.center, style: T.display(34, color: item.rarity == 'legendaer' ? C.goldSoft : C.ink))
              .animate().fadeIn(delay: 800.ms).slideY(begin: .3),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 4),
            child: Text(item.text, textAlign: TextAlign.center, style: T.body(15, color: C.inkSoft)),
          ).animate().fadeIn(delay: 900.ms),
          const SizedBox(height: 6),
          Text(widget.fresh ? 'Neu in deiner Sammlung!' : 'Doppelt: +${widget.dukaten} Dukaten', style: T.label(14, color: widget.fresh ? C.vert : C.goldSoft))
              .animate().fadeIn(delay: 1000.ms),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Row(children: [
              Expanded(child: SoftButton(label: 'Weiter', onPressed: () => Navigator.pop(context))),
              if (!widget.equipped) ...[
                const SizedBox(width: 10),
                Expanded(child: GoldButton(label: 'Anlegen', jicon: 'check', onPressed: () {
                  Navigator.pop(context);
                  widget.onEquip();
                })),
              ],
            ]),
          ).animate().fadeIn(delay: 1100.ms),
        ]),
        Align(
          alignment: Alignment.topCenter,
          child: ConfettiWidget(
            confettiController: _confetti,
            blastDirectionality: BlastDirectionality.explosive,
            numberOfParticles: 30,
            colors: [color, C.gold, C.goldSoft, C.ink],
          ),
        ),
      ]),
    );
  }
}
