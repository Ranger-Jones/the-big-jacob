import 'package:der_grosse_jakob/game/models.dart';
import 'package:der_grosse_jakob/screens/decks/card_studio.dart';
import 'package:der_grosse_jakob/screens/decks/deck_draft.dart';
import 'package:der_grosse_jakob/widgets/card_layout.dart';
import 'package:der_grosse_jakob/widgets/playing_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Deck blankDeck() => Deck.fromDesign('00000000-0000-0000-0000-000000000001', 'Mein Deck', blankDesign());

void main() {
  group('DeckDraft', () {
    test('coalesces typing into one undo step and redoes it', () {
      final draft = DeckDraft(blankDeck());
      expect(draft.dirty, isFalse);
      draft.setCard(1, 'name', 'K', key: '1-name');
      draft.setCard(1, 'name', 'Kö', key: '1-name');
      draft.setCard(1, 'name', 'König', key: '1-name');
      draft.set('font', 'gotisch');
      expect(draft.card(1)['name'], 'König');
      expect(draft.dirty, isTrue);

      draft.undo();
      expect(draft.design['font'], 'klassisch');
      expect(draft.card(1)['name'], 'König');
      draft.undo();
      expect(draft.card(1)['name'], 'Karte 1');
      expect(draft.canUndo, isFalse);
      draft.redo();
      expect(draft.card(1)['name'], 'König');
    });

    test('checks names and symbols like the server and trims them for saving', () {
      final draft = DeckDraft(blankDeck());
      expect(draft.problem(), isNull);
      draft.setCard(4, 'emoji', '  ');
      expect(draft.problem(), contains('Karte 4'));
      draft.setCard(4, 'emoji', ' ⭐ ');
      draft.name = '';
      expect(draft.problem(), contains('Deck-Name'));
      draft.name = 'Hof';
      expect(draft.problem(), isNull);
      expect(((draft.payload()['cards'] as List)[3] as Map)['emoji'], '⭐');
    });

    test('sets several card and back fields in one step', () {
      final draft = DeckDraft(Deck.from({'id': 'x', 'name': 'Server', 'design': blankDesign()}));
      draft.setCardFields(3, {'art': 'p-ritter', 'image': null});
      draft.setBackFields({'image': 'https://x/y.jpg', 'zoom': 1, 'panX': 0, 'panY': 0});
      expect(draft.deck.face(3).art, 'p-ritter');
      expect(draft.back['image'], 'https://x/y.jpg');
      draft.undo();
      expect(draft.back['image'], isNull);
    });

    test('a free layout starts from the standard look and can be reset', () {
      final draft = DeckDraft(blankDeck());
      expect(draft.card(2)['layout'], isNull);
      draft.editLayout(2, (l) => (l['number'] as Map)['style'] = 'gross');
      final layout = draft.card(2)['layout'] as Map;
      expect((layout['number'] as Map)['style'], 'gross');
      expect((layout['picture'] as Map)['shape'], 'kreis');
      expect(draft.deck.face(2).layout, isNotNull);
      draft.undo();
      expect(draft.card(2)['layout'], isNull);
    });
  });

  testWidgets('cards with a free layout draw stickers, big numbers and plain names', (tester) async {
    final design = blankDesign();
    final card = (design['cards'] as List)[12] as Map;
    card['layout'] = {
      ...defaultLayout(blankDeck(), blankDeck().face(13)),
      'number': {'style': 'gross', 'x': 50, 'y': 22, 'size': 40, 'color': null},
      'name': {'style': 'schlicht', 'x': 50, 'y': 85, 'size': 9, 'width': 90},
      'stickers': [
        {'id': 'a1', 'kind': 'text', 'value': 'Hoch!', 'x': 30, 'y': 60, 'size': 10, 'rotate': 15, 'color': '#c8323c'},
      ],
    };
    final deck = Deck.fromDesign('d', 'Test', design);
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child: PlayingCard(rank: 13, deck: deck, width: 140)))));
    await tester.pump();
    expect(find.text('Narr'), findsWidgets);
    expect(find.text('Hoch!'), findsWidgets);
    expect(find.byType(LayoutFace), findsOneWidget);
  });

  testWidgets('dragging a sticker in the studio moves it on the card', (tester) async {
    tester.view.physicalSize = const Size(402 * 3, 874 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final draft = DeckDraft(blankDeck());
    draft.editLayout(1, (l) => (l['stickers'] as List).add(
          {'id': 's1', 'kind': 'text', 'value': 'Zieh', 'x': 50, 'y': 50, 'size': 12, 'rotate': 0, 'color': '#000000'},
        ));
    await tester.pumpWidget(MaterialApp(
      home: CardStudioScreen(draft: draft, rank: 1, onUploadPhoto: (_) async {}, onPickArt: (_) async {}, isUploading: (_) => false),
    ));
    await tester.pump();
    final sticker = find.descendant(of: find.byType(LayoutFace), matching: find.text('Zieh')).last;
    await tester.drag(sticker, const Offset(60, 0));
    await tester.pump();
    final s = ((draft.card(1)['layout'] as Map)['stickers'] as List).first as Map;
    expect((s['x'] as num).toDouble(), greaterThan(55));
    expect((s['y'] as num).toDouble(), closeTo(50, 2));
    // The drag is one undo step.
    draft.undo();
    final back = ((draft.card(1)['layout'] as Map)['stickers'] as List).first as Map;
    expect(back['x'], 50);
  });
}
