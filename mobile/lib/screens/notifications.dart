import 'package:flutter/material.dart';

import '../i18n/i18n.dart';
import '../push.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/jakob_icons.dart';

const _why = 'Wir melden uns, wenn du am Zug bist, dich jemand an den Tisch einlädt oder dir eine Freundschaftsanfrage schickt.';

/// Asked once after sign-in, before iOS shows its own permission dialog.
Future<void> showPushPrompt(BuildContext context) async {
  final yes = await showModalBottomSheet<bool>(
    context: context,
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(22, 4, 22, 30),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const JIcon('bell', size: 48, color: C.goldSoft),
        const SizedBox(height: 10),
        Text(t('Benachrichtigungen'), textAlign: TextAlign.center, style: T.display(30)),
        const SizedBox(height: 6),
        Text(t(_why), textAlign: TextAlign.center, style: T.body(15, color: C.inkSoft)),
        const SizedBox(height: 18),
        GoldButton(label: t('Ja, gib mir Bescheid'), jicon: 'bell', onPressed: () => Navigator.pop(ctx, true)),
        const SizedBox(height: 10),
        SoftButton(label: t('Später'), onPressed: () => Navigator.pop(ctx, false)),
      ]),
    ),
  );
  if (yes == true) {
    await Push.enable();
  } else {
    // "Later" lives on in the profile; the sheet does not come back by itself.
    await Push.markAsked();
  }
}

/// Profile panel: current permission, switch on, or the way to the iOS settings, plus a test.
class NotificationsPanel extends StatefulWidget {
  const NotificationsPanel({super.key});

  @override
  State<NotificationsPanel> createState() => _NotificationsPanelState();
}

class _NotificationsPanelState extends State<NotificationsPanel> with WidgetsBindingObserver {
  PushStatus? _status;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Back from the iOS settings: show what was decided there.
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    final s = await Push.status();
    if (mounted) setState(() => _status = s);
  }

  Future<void> _enable() async {
    setState(() => _busy = true);
    await Push.enable();
    await _refresh();
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _test() async {
    setState(() => _busy = true);
    final res = await Push.test();
    if (!mounted) return;
    setState(() => _busy = false);
    toast(context, res.ok ? t('Testnachricht ist unterwegs.') : res.error!, error: !res.ok);
  }

  @override
  Widget build(BuildContext context) {
    final s = _status;
    if (s == null || s == PushStatus.unsupported) return const SizedBox.shrink();
    final (String text, Widget action) = switch (s) {
      PushStatus.authorized => (t('Aktiv auf diesem iPhone.'), SoftButton(label: t('Testnachricht senden'), jicon: 'bell', onPressed: _busy ? null : _test)),
      PushStatus.denied => (t('In den iOS-Einstellungen ausgeschaltet.'), SoftButton(label: t('Einstellungen öffnen'), onPressed: Push.openSettings)),
      _ => (t(_why), GoldButton(label: t('Einschalten'), jicon: 'bell', busy: _busy, onPressed: _enable)),
    };
    return Panel(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const JIcon('bell', size: 26, color: C.goldSoft),
          const SizedBox(width: 10),
          Text(t('Benachrichtigungen'), style: T.display(22)),
        ]),
        const SizedBox(height: 6),
        Text(text, style: T.body(14, color: C.inkSoft)),
        const SizedBox(height: 12),
        action,
      ]),
    );
  }
}
