import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../api.dart';
import '../../game/models.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/jakob_icons.dart';
import 'friend_code.dart';

/// Light card behind the QR code: scanners need dark modules on a bright ground.
const _parchment = Color(0xFFFBF0D9);
const _qrInk = Color(0xFF2B1A12);

/// The signed-in profile, kept across sheet openings so "Mein Code" shows up instantly.
Profile? _meCache;

/// Opens the QR friend sheet ("Mein Code" / "Scannen"). Resolves to the success message when a
/// friend request was sent (the caller shows it and reloads), otherwise null.
Future<String?> showQrFriendSheet(BuildContext context, {bool scan = false}) => showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => QrFriendSheet(initialTab: scan ? 1 : 0),
    );

class QrFriendSheet extends StatefulWidget {
  /// 0 = "Mein Code", 1 = "Scannen".
  final int initialTab;
  const QrFriendSheet({super.key, this.initialTab = 0});

  @override
  State<QrFriendSheet> createState() => _QrFriendSheetState();
}

class _QrFriendSheetState extends State<QrFriendSheet> {
  late int _tab = widget.initialTab;
  Profile? _me = _meCache;
  String? _meError;

  @override
  void initState() {
    super.initState();
    _loadMe();
  }

  Future<void> _loadMe() async {
    if (_meError != null) setState(() => _meError = null);
    final res = await Api.get('me');
    if (!mounted) return;
    final data = res.ok ? res.data : null;
    final raw = data is Map ? data['profile'] : null;
    setState(() {
      if (raw is Map) {
        _me = _meCache = Profile.from(raw);
      } else if (_me == null) {
        _meError = res.error ?? 'Dein Profil ließ sich nicht laden.';
      }
    });
  }

  void _select(int tab) {
    if (tab == _tab) return;
    HapticFeedback.selectionClick();
    setState(() => _tab = tab);
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * .9;
    // Own messenger, so toasts appear on top of the sheet instead of behind it.
    return SizedBox(
      height: height,
      child: ScaffoldMessenger(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          resizeToAvoidBottomInset: false,
          body: Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.paddingOf(context).bottom + 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(child: Text('Freund per QR-Code', style: T.display(30))),
                IconButton(
                  tooltip: 'Schließen',
                  constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                  onPressed: () => Navigator.pop(context),
                  icon: const JIcon('close', size: 22, color: C.inkSoft),
                ),
              ]),
              const SizedBox(height: 12),
              _TabSwitch(index: _tab, onSelect: _select),
              const SizedBox(height: 18),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 260),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  transitionBuilder: (child, anim) => FadeTransition(
                    opacity: anim,
                    child: SlideTransition(position: Tween(begin: const Offset(0, .03), end: Offset.zero).animate(anim), child: child),
                  ),
                  // The scanner tab is rebuilt on every visit, so the camera only runs while it is shown.
                  child: _tab == 0
                      ? _MyCodeTab(key: const ValueKey('code'), me: _me, error: _meError, onRetry: _loadMe)
                      : _ScanTab(key: const ValueKey('scan'), myName: _me?.username),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------------------------ tab switch

class _TabSwitch extends StatelessWidget {
  final int index;
  final ValueChanged<int> onSelect;
  const _TabSwitch({required this.index, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    Widget tab(int i, String icon, String label) {
      final selected = i == index;
      final color = selected ? C.onGold : C.inkSoft;
      return Expanded(
        child: Semantics(
          selected: selected,
          button: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(15),
            onTap: () => onSelect(i),
            child: SizedBox(
              height: 48,
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                JIcon(icon, size: 20, color: color),
                const SizedBox(width: 8),
                AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 200),
                  style: T.body(16, color: color, weight: FontWeight.w800),
                  child: Text(label),
                ),
              ]),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: C.surface, borderRadius: BorderRadius.circular(19), border: Border.all(color: C.line)),
      child: Stack(children: [
        Positioned.fill(
          child: AnimatedAlign(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            alignment: index == 0 ? Alignment.centerLeft : Alignment.centerRight,
            child: FractionallySizedBox(
              widthFactor: .5,
              heightFactor: 1,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [C.goldSoft, C.gold]),
                  borderRadius: BorderRadius.circular(15),
                  boxShadow: const [BoxShadow(color: C.goldDeep, offset: Offset(0, 2))],
                ),
              ),
            ),
          ),
        ),
        Material(
          color: Colors.transparent,
          child: Row(children: [tab(0, 'qr', 'Mein Code'), tab(1, 'scan', 'Scannen')]),
        ),
      ]),
    );
  }
}

// ------------------------------------------------------------------ "Mein Code"

class _MyCodeTab extends StatelessWidget {
  final Profile? me;
  final String? error;
  final VoidCallback onRetry;
  const _MyCodeTab({super.key, required this.me, required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final p = me;
    if (p == null) {
      if (error == null) return const Center(child: CircularProgressIndicator(color: C.gold));
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          EmptyNote(error!, icon: Icons.wifi_off_rounded),
          SoftButton(label: 'Nochmal versuchen', expand: false, onPressed: onRetry),
        ]),
      );
    }

    return LayoutBuilder(builder: (context, box) {
      // Big enough to scan from arm's length, small enough to leave room for the name below.
      final qrSize = math.max(160.0, math.min(300.0, math.min(box.maxWidth - 64, box.maxHeight - 230)));
      return SingleChildScrollView(
        child: Column(children: [
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.fromLTRB(22, 22, 22, 14),
            decoration: BoxDecoration(
              color: _parchment,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: C.gold, width: 2),
              boxShadow: [
                BoxShadow(color: C.gold.withValues(alpha: .22), blurRadius: 30),
                const BoxShadow(color: Color(0x66000000), blurRadius: 18, offset: Offset(0, 10)),
              ],
            ),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              QrImageView(
                data: friendCodeUrl(p.username),
                size: qrSize,
                padding: EdgeInsets.zero,
                backgroundColor: _parchment,
                errorCorrectionLevel: QrErrorCorrectLevel.M,
                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: _qrInk),
                dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: _qrInk),
                semanticsLabel: 'Dein Freundes-Code',
              ),
              const SizedBox(height: 12),
              Text('Der Große Jakob', style: T.display(20, color: _qrInk.withValues(alpha: .75))),
            ]),
          ).animate().fadeIn(duration: 320.ms).scaleXY(begin: .94, curve: Curves.easeOutBack, duration: 460.ms),
          const SizedBox(height: 22),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Avatar.of(p, size: 48, ring: C.gold),
            const SizedBox(width: 12),
            Flexible(child: Text(p.username, style: T.display(30), overflow: TextOverflow.ellipsis)),
          ]).animate(delay: 120.ms).fadeIn(duration: 300.ms).slideY(begin: .2, curve: Curves.easeOutCubic),
          const SizedBox(height: 10),
          Text(
            'Lass deinen Freund diesen Code scannen.',
            textAlign: TextAlign.center,
            style: T.body(16, color: C.inkSoft, height: 1.3),
          ).animate(delay: 180.ms).fadeIn(duration: 300.ms),
        ]),
      );
    });
  }
}

// ------------------------------------------------------------------ "Scannen"

class _ScanTab extends StatefulWidget {
  /// My own username, to catch someone scanning their own code.
  final String? myName;
  const _ScanTab({super.key, required this.myName});

  @override
  State<_ScanTab> createState() => _ScanTabState();
}

class _ScanTabState extends State<_ScanTab> {
  MobileScannerController _controller = _newController();
  int _generation = 0;

  /// Username waiting for confirmation; scanning is paused while set.
  String? _found;
  bool _sending = false;

  /// Inline hint after an unusable code (cleared after a moment).
  String? _notice;
  Timer? _noticeTimer;

  static MobileScannerController _newController() =>
      MobileScannerController(formats: const [BarcodeFormat.qrCode], detectionSpeed: DetectionSpeed.noDuplicates);

  @override
  void dispose() {
    _noticeTimer?.cancel();
    unawaited(_controller.dispose());
    super.dispose();
  }

  void _showNotice(String text) {
    _noticeTimer?.cancel();
    if (_notice != text) {
      HapticFeedback.heavyImpact();
      setState(() => _notice = text);
    }
    _noticeTimer = Timer(const Duration(milliseconds: 2600), () {
      if (mounted) setState(() => _notice = null);
    });
  }

  void _onDetect(BarcodeCapture capture) {
    if (_found != null || _sending) return;
    final raw = capture.barcodes.map((b) => b.rawValue).whereType<String>().firstOrNull;
    if (raw == null) return;
    final name = parseFriendCode(raw);
    if (name == null) return _showNotice('Das ist kein Freundes-Code vom Großen Jakob.');
    if (widget.myName != null && name.toLowerCase() == widget.myName!.toLowerCase()) {
      return _showNotice('Das ist dein eigener Code.');
    }
    HapticFeedback.mediumImpact();
    _noticeTimer?.cancel();
    setState(() {
      _notice = null;
      _found = name;
    });
    unawaited(_controller.pause());
  }

  void _resume() {
    setState(() => _found = null);
    unawaited(_controller.start());
  }

  /// Starts over with a fresh controller (the old one may be stuck in a permission error).
  void _retryCamera() {
    final old = _controller;
    setState(() {
      _controller = _newController();
      _generation++;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(old.dispose()));
  }

  Future<void> _send() async {
    final name = _found;
    if (name == null || _sending) return;
    setState(() => _sending = true);
    final res = await Api.post('friends', {'op': 'request', 'username': name});
    if (!mounted) return;
    setState(() => _sending = false);
    if (!res.ok) {
      toast(context, res.error!, error: true);
      return _resume();
    }
    HapticFeedback.mediumImpact();
    final accepted = (res.data as Map?)?['status'] == 'accepted';
    Navigator.pop(context, accepted ? 'Ihr seid jetzt befreundet' : 'Anfrage an $name gesendet');
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Expanded(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: DecoratedBox(
            decoration: const BoxDecoration(color: Colors.black),
            child: Stack(fit: StackFit.expand, children: [
              MobileScanner(
                key: ValueKey(_generation),
                controller: _controller,
                onDetect: _onDetect,
                placeholderBuilder: (_) => const ColoredBox(color: C.night, child: Center(child: CircularProgressIndicator(color: C.gold))),
                errorBuilder: (_, error) => _CameraError(error: error, onRetry: _retryCamera),
              ),
              ValueListenableBuilder<MobileScannerState>(
                valueListenable: _controller,
                builder: (_, state, _) => state.error != null ? const SizedBox.shrink() : _ScanFrame(paused: _found != null),
              ),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 280),
                child: _found == null
                    ? const SizedBox.shrink()
                    : _ConfirmCard(key: ValueKey(_found), name: _found!, busy: _sending, onConfirm: _send, onCancel: _resume),
              ),
            ]),
          ),
        ),
      ),
      const SizedBox(height: 14),
      SizedBox(
        height: 52,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: _notice != null
              ? _Hint(key: ValueKey(_notice), icon: 'close', text: _notice!, color: C.wax)
              : const _Hint(key: ValueKey('hint'), icon: 'scan', text: 'Halte die Kamera auf den Code deines Freundes.', color: C.inkSoft),
        ),
      ),
    ]);
  }
}

class _Hint extends StatelessWidget {
  final String icon, text;
  final Color color;
  const _Hint({super.key, required this.icon, required this.text, required this.color});

  @override
  Widget build(BuildContext context) => Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        JIcon(icon, size: 20, color: color),
        const SizedBox(width: 10),
        Flexible(child: Text(text, textAlign: TextAlign.center, style: T.body(15, color: color, weight: FontWeight.w700, height: 1.25))),
      ]);
}

/// Dimmed surroundings, a rounded gold frame and a slow scan line.
class _ScanFrame extends StatelessWidget {
  final bool paused;
  const _ScanFrame({required this.paused});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, box) {
      final side = (box.biggest.shortestSide * .72).clamp(160.0, 300.0);
      final frame = Rect.fromCenter(center: box.biggest.center(Offset.zero), width: side, height: side);
      return IgnorePointer(
        child: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _FramePainter(frame))),
          if (!paused)
            Positioned(
              left: frame.left + 18,
              width: frame.width - 36,
              top: frame.top + 14,
              child: Container(
                height: 3,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(3),
                  gradient: LinearGradient(colors: [C.gold.withValues(alpha: 0), C.goldSoft, C.gold.withValues(alpha: 0)]),
                  boxShadow: [BoxShadow(color: C.gold.withValues(alpha: .6), blurRadius: 10)],
                ),
              )
                  .animate(onPlay: (c) => c.repeat(reverse: true))
                  .moveY(begin: 0, end: frame.height - 31, duration: 1900.ms, curve: Curves.easeInOutSine),
            ),
        ]),
      );
    });
  }
}

class _FramePainter extends CustomPainter {
  final Rect frame;
  const _FramePainter(this.frame);

  @override
  void paint(Canvas canvas, Size size) {
    final hole = RRect.fromRectAndRadius(frame, const Radius.circular(26));
    final scrim = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(Offset.zero & size)
      ..addRRect(hole);
    canvas.drawPath(scrim, Paint()..color = const Color(0x99120A1F));
    canvas.drawRRect(hole, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..color = C.gold.withValues(alpha: .25)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6));
    canvas.drawRRect(hole, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = C.gold);
  }

  @override
  bool shouldRepaint(_FramePainter old) => old.frame != frame;
}

class _ConfirmCard extends StatelessWidget {
  final String name;
  final bool busy;
  final VoidCallback onConfirm, onCancel;
  const _ConfirmCard({super.key, required this.name, required this.busy, required this.onConfirm, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xB3120A1F),
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: Panel(
            glow: true,
            color: C.velvet,
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Center(child: Avatar(name: name, size: 76, ring: C.gold)),
              const SizedBox(height: 12),
              Text(name, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: T.display(32)),
              const SizedBox(height: 4),
              Text('Freundschaftsanfrage senden?', textAlign: TextAlign.center, style: T.body(16, color: C.inkSoft)),
              const SizedBox(height: 18),
              GoldButton(label: 'Anfrage senden', icon: Icons.person_add_alt_1_rounded, busy: busy, onPressed: onConfirm),
              const SizedBox(height: 6),
              SizedBox(
                height: 48,
                child: TextButton(
                  onPressed: busy ? null : onCancel,
                  style: TextButton.styleFrom(foregroundColor: C.inkSoft, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: Text('Weiter scannen', style: T.body(15, color: C.inkSoft, weight: FontWeight.w700)),
                ),
              ),
            ]),
          ).animate().fadeIn(duration: 260.ms).scaleXY(begin: .9, curve: Curves.easeOutBack, duration: 420.ms),
        ),
      ),
    );
  }
}

/// Friendly note when the camera is not available, with a button that tries again.
class _CameraError extends StatelessWidget {
  final MobileScannerException error;
  final VoidCallback onRetry;
  const _CameraError({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final (title, text) = switch (error.errorCode) {
      MobileScannerErrorCode.permissionDenied => (
          'Kein Zugriff auf die Kamera',
          'Erlaube Der Große Jakob den Kamerazugriff in den Einstellungen deines Handys und versuch es dann nochmal.',
        ),
      MobileScannerErrorCode.unsupported => (
          'Scannen geht hier nicht',
          'Dieses Gerät kann keine Codes scannen. Lass dir stattdessen den Namen sagen und such oben danach.',
        ),
      _ => (
          'Die Kamera mag gerade nicht',
          'Sie ließ sich nicht starten. Vielleicht nutzt sie gerade eine andere App?',
        ),
    };
    return ColoredBox(
      color: C.surface,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(shape: BoxShape.circle, color: C.gold.withValues(alpha: .1), border: Border.all(color: C.gold.withValues(alpha: .4))),
              alignment: Alignment.center,
              child: const JIcon('camera', size: 34, color: C.goldSoft),
            ),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center, style: T.display(26)),
            const SizedBox(height: 8),
            Text(text, textAlign: TextAlign.center, style: T.body(15, color: C.inkSoft, height: 1.35)),
            const SizedBox(height: 18),
            SoftButton(label: 'Nochmal versuchen', expand: false, onPressed: onRetry),
          ]),
        ).animate().fadeIn(duration: 300.ms),
      ),
    );
  }
}
