import 'package:flutter/material.dart';

import '../../game/controller.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

const quickPhrases = ['Lang lebe der König!', 'Gnade, Majestät!', 'Revolution!', 'Das war knapp.', 'Ich passe … vorerst.', 'Wer hat die Narren?'];

class ChatButton extends StatelessWidget {
  final GameController g;
  const ChatButton({super.key, required this.g});

  @override
  Widget build(BuildContext context) => Stack(clipBehavior: Clip.none, children: [
        IconButton(
          tooltip: 'Chat',
          icon: const Icon(Icons.chat_bubble_rounded, color: C.inkSoft),
          onPressed: () async {
            g.markChatRead(true);
            await showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => ChatSheet(g: g));
            g.markChatRead(false);
          },
        ),
        if (g.unreadChat > 0)
          Positioned(right: 6, top: 6, child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(color: C.wax, borderRadius: BorderRadius.circular(99)),
            child: Text('${g.unreadChat}', style: T.label(10, color: Colors.white)),
          )),
      ]);
}

class ChatSheet extends StatefulWidget {
  final GameController g;
  const ChatSheet({super.key, required this.g});

  @override
  State<ChatSheet> createState() => _ChatSheetState();
}

class _ChatSheetState extends State<ChatSheet> {
  final _text = TextEditingController();
  bool _sending = false;

  Future<void> _send(String body) async {
    if (body.trim().isEmpty || _sending) return;
    setState(() => _sending = true);
    final error = await widget.g.sendChat(body.trim());
    if (!mounted) return;
    setState(() => _sending = false);
    if (error != null) {
      toast(context, error, error: true);
    } else {
      _text.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.g;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * .62,
        child: ListenableBuilder(
          listenable: g,
          builder: (context, _) => Column(children: [
            Padding(padding: const EdgeInsets.symmetric(horizontal: 20), child: Row(children: [Text('Chat', style: T.display(28))])),
            Expanded(
              child: ListView(
                reverse: true,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                children: [
                  for (final m in g.chat.reversed)
                    Align(
                      alignment: m.userId == g.me ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        constraints: const BoxConstraints(maxWidth: 280),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                        decoration: BoxDecoration(
                          color: m.userId == g.me ? C.gold.withValues(alpha: .2) : C.surfaceHi,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          if (m.userId != g.me) Text(g.nameOf(m.userId), style: T.label(12, color: C.goldSoft)),
                          Text(m.body, style: T.body(15)),
                        ]),
                      ),
                    ),
                  if (g.chat.isEmpty) Padding(padding: const EdgeInsets.all(20), child: Text('Noch still am Tisch. Sag was!', textAlign: TextAlign.center, style: T.body(15, color: C.inkSoft))),
                ],
              ),
            ),
            SizedBox(
              height: 40,
              child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12), children: [
                for (final p in quickPhrases)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ActionChip(label: Text(p, style: T.body(13)), backgroundColor: C.surfaceHi, side: const BorderSide(color: C.line), onPressed: () => _send(p)),
                  ),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
              child: Row(children: [
                Expanded(
                  child: TextField(
                    controller: _text, maxLength: 200, style: T.body(16), textInputAction: TextInputAction.send, onSubmitted: _send,
                    decoration: const InputDecoration(hintText: 'Nachricht an den Tisch', counterText: ''),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  style: IconButton.styleFrom(backgroundColor: C.gold, minimumSize: const Size(52, 52)),
                  onPressed: _sending ? null : () => _send(_text.text),
                  icon: const Icon(Icons.send_rounded, color: C.onGold),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
