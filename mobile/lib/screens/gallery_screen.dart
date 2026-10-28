import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../api.dart';
import '../game/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'gallery/gallery_deck.dart';
import 'gallery/gallery_sheet.dart';
import 'gallery/gallery_tile.dart';
import 'gallery/share_section.dart';
import 'gallery/sort_toggle.dart';
import 'decks_screen.dart';
import '../widgets/jakob_icons.dart';

/// Decks other players shared: browse, like, copy; and share your own.
class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  String _sort = 'beliebt';
  List<GalleryDeck> _gallery = const [];
  List<Deck> _mine = const [];
  Set<String> _shared = {};
  final Set<String> _sharePending = {};
  String? _galleryError, _mineError, _copying;
  bool _loaded = false, _sorting = false;

  // Bumped per gallery load so the tiles replay their entrance; also drops stale responses.
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() => Future.wait([_loadGallery(), _loadMine()]);

  Future<void> _loadGallery({bool takeShared = true}) async {
    final ticket = ++_generation;
    final sort = _sort;
    final res = await Api.get('gallery', {'sort': sort});
    if (!mounted || ticket != _generation) return;
    setState(() {
      _loaded = true;
      _sorting = false;
      if (!res.ok) {
        _galleryError = res.error;
        return;
      }
      final d = res.data as Map;
      _galleryError = null;
      _gallery = ((d['decks'] as List?) ?? const []).whereType<Map>().map(GalleryDeck.from).toList();
      if (takeShared) {
        final fresh = ((d['shared'] as List?) ?? const []).whereType<String>().toSet();
        // A switch flip still in flight wins over the server's older view.
        for (final id in _sharePending) {
          _shared.contains(id) ? fresh.add(id) : fresh.remove(id);
        }
        _shared = fresh;
      }
    });
    // With a list already on screen the error note is not shown, so say it out loud.
    if (!res.ok && _gallery.isNotEmpty) toast(context, res.error!, error: true);
  }

  Future<void> _loadMine() async {
    final res = await Api.get('decks');
    if (!mounted) return;
    setState(() {
      if (!res.ok) {
        _mineError = res.error;
        return;
      }
      _mine = (((res.data as Map)['mine'] as List?) ?? const []).whereType<Map>().map(Deck.from).toList();
      _mineError = null;
    });
  }

  void _setSort(String sort) {
    if (sort == _sort) return;
    setState(() {
      _sort = sort;
      _sorting = true;
    });
    _loadGallery(takeShared: false);
  }

  Future<void> _copy(GalleryDeck g) async {
    if (_copying != null) return;
    setState(() => _copying = g.deck.id);
    final res = await Api.post('deck', {'op': 'copy', 'id': g.deck.id});
    if (!mounted) return;
    setState(() => _copying = null);
    if (!res.ok) {
      toast(context, res.error!, error: true);
      return;
    }
    final id = res.data is Map ? (res.data as Map)['id'] as String? : null;
    showCopiedToast(
      context,
      onMakeDefault: () {
        if (id != null) _makeDefault(id);
      },
    );
    // The copy shows up under "Deine Decks teilen".
    _loadMine();
  }

  Future<void> _makeDefault(String id) async {
    final res = await Api.post('deck', {'op': 'default', 'id': id});
    if (!mounted) return;
    if (!res.ok) {
      toast(context, res.error!, error: true);
      return;
    }
    toast(context, 'Neue Tische startest du jetzt mit diesem Deck.');
  }

  Future<void> _setPublic(Deck deck, bool public) async {
    if (_sharePending.contains(deck.id)) return;
    setState(() {
      _sharePending.add(deck.id);
      public ? _shared.add(deck.id) : _shared.remove(deck.id);
    });
    final res = await Api.post('deck', {'op': 'public', 'id': deck.id, 'public': public});
    if (!mounted) return;
    setState(() {
      _sharePending.remove(deck.id);
      if (!res.ok) public ? _shared.remove(deck.id) : _shared.add(deck.id);
    });
    if (!res.ok) {
      toast(context, res.error!, error: true);
    } else {
      toast(context, public ? '„${deck.name}“ hängt jetzt in der Galerie.' : '„${deck.name}“ ist wieder privat.');
    }
  }

  Future<void> _open(GalleryDeck g) async {
    final copy = await showGallerySheet(context, deck: g, canCopy: _copying == null);
    if (copy == true && mounted) _copy(g);
  }

  @override
  Widget build(BuildContext context) {
    return Backdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          foregroundColor: C.ink,
          title: Text('Deck-Galerie', style: T.display(30)),
          actions: [
            TextButton.icon(
              onPressed: () => _openDecks(),
              icon: const JIcon('cards', size: 18, color: C.goldSoft),
              label: Text('Meine Decks', style: T.body(15, color: C.goldSoft, weight: FontWeight.w700)),
            ),
            const SizedBox(width: 6),
          ],
        ),
        body: !_loaded
            ? const Center(child: CircularProgressIndicator(color: C.gold))
            : RefreshIndicator(
                color: C.gold,
                backgroundColor: C.surface,
                onRefresh: _loadAll,
                child: ListView(
                  padding: EdgeInsets.fromLTRB(18, 0, 18, MediaQuery.paddingOf(context).bottom + 32),
                  children: [
                    Text(
                      'Decks, die andere Spieler geteilt haben. Gefällt dir eins, kopiere es und mach es zu deinem.',
                      style: T.body(15, color: C.inkSoft),
                    ),
                    const SizedBox(height: 14),
                    GoldButton(label: 'Eigenes Deck gestalten', jicon: 'plus', onPressed: () => _openDecks(create: true)),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        SortToggle(value: _sort, onChanged: _setSort),
                        const SizedBox(width: 14),
                        AnimatedOpacity(
                          opacity: _sorting ? 1 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: C.gold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    AnimatedOpacity(opacity: _sorting ? .45 : 1, duration: const Duration(milliseconds: 200), child: _galleryBody()),
                    ShareSection(decks: _mine, shared: _shared, pending: _sharePending, error: _mineError, onChanged: _setPublic),
                  ],
                ),
              ),
      ),
    );
  }

  /// Own decks (and the editor); afterwards the share list may have changed.
  Future<void> _openDecks({bool create = false}) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => DecksScreen(startCreating: create)));
    if (mounted) _loadAll();
  }

  Widget _galleryBody() {
    if (_galleryError != null && _gallery.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          EmptyNote(_galleryError!, icon: Icons.wifi_off_rounded),
          SoftButton(label: 'Nochmal versuchen', icon: Icons.refresh_rounded, onPressed: () => _loadGallery()),
        ],
      );
    }
    if (_gallery.isEmpty) {
      return const EmptyNote(
        'Noch hängt nichts in der Galerie. Teile eins deiner Decks und sei der Erste.',
        icon: Icons.collections_bookmark_outlined,
      );
    }
    return LayoutBuilder(
      builder: (context, box) {
        const gap = 12.0;
        final cols = box.maxWidth >= 640 ? 2 : 1;
        final w = ((box.maxWidth - gap * (cols - 1)) / cols).floorToDouble();
        final generation = _generation;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (var i = 0; i < _gallery.length; i++)
              SizedBox(
                    width: w,
                    child: GalleryTile(
                      deck: _gallery[i],
                      copying: _copying == _gallery[i].deck.id,
                      onTap: () => _open(_gallery[i]),
                      onCopy: _copying == null ? () => _copy(_gallery[i]) : null,
                    ),
                  )
                  .animate(key: ValueKey('${_gallery[i].deck.id}-$generation'), delay: (60 * math.min(i, 8)).ms)
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: .08, end: 0, curve: Curves.easeOutCubic),
          ],
        );
      },
    );
  }
}
