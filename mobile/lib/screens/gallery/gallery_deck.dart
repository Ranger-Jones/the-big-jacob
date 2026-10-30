import 'package:flutter/material.dart';

import '../../api.dart';
import '../../game/models.dart';
import '../../i18n/i18n.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Like status of a gallery deck, shared by its tile and its detail sheet.
@immutable
class LikeState {
  final bool liked;
  final int likes;
  const LikeState(this.liked, this.likes);

  LikeState toggled() => LikeState(!liked, liked ? (likes - 1).clamp(0, likes) : likes + 1);
}

/// A deck another player shared, as sent by `GET gallery`.
class GalleryDeck {
  final Deck deck;
  final String ownerId, ownerName;
  final ValueNotifier<LikeState> like;

  /// True while a like request is in flight; further taps are ignored until it settles.
  bool liking = false;

  GalleryDeck(this.deck, this.ownerId, this.ownerName, LikeState like) : like = ValueNotifier(like);

  factory GalleryDeck.from(Map m) => GalleryDeck(
    Deck.from(m),
    m['ownerId'] as String? ?? '',
    m['ownerName'] as String? ?? '?',
    LikeState(m['liked'] == true, (m['likes'] as num?)?.toInt() ?? 0),
  );
}

/// Optimistic like toggle: flips at once, settles on the server's answer, reverts on error.
Future<void> toggleLike(BuildContext context, GalleryDeck g) async {
  if (g.liking) return;
  g.liking = true;
  final before = g.like.value;
  g.like.value = before.toggled();
  final res = await Api.post('deck', {'op': 'like', 'id': g.deck.id});
  g.liking = false;
  if (!res.ok) {
    g.like.value = before;
    if (context.mounted) toast(context, res.error!, error: true);
    return;
  }
  // The server toggles too; if it disagrees with our guess, trust it.
  final liked = res.data is Map ? (res.data as Map)['liked'] : null;
  if (liked is bool && liked != g.like.value.liked) {
    g.like.value = liked == before.liked ? before : before.toggled();
  }
}

/// Success toast after a copy, with a shortcut to make the copy the default deck.
void showCopiedToast(BuildContext context, {required VoidCallback onMakeDefault}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  messenger?.hideCurrentSnackBar();
  messenger?.showSnackBar(
    SnackBar(
      content: Row(
        children: [
          const Icon(Icons.check_circle_outline_rounded, color: C.gold, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(t('In deine Decks kopiert'))),
        ],
      ),
      action: SnackBarAction(label: t('Als Standard nutzen'), textColor: C.goldSoft, onPressed: onMakeDefault),
      // Actions make snack bars sticky by default; this one should still fade on its own.
      persist: false,
      duration: const Duration(seconds: 5),
    ),
  );
}
