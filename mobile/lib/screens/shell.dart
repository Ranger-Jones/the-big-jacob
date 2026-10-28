import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../theme.dart';
import 'friends_screen.dart';
import 'home_screen.dart';
import 'leaderboard_screen.dart';
import 'profile_screen.dart';
import '../widgets/jakob_icons.dart';

/// Four tabs: court (home), friends, leaderboard, own profile.
class Shell extends StatefulWidget {
  const Shell({super.key});

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int _tab = 0;
  int _requests = 0;
  String? _username;

  void _setRequests(int n) {
    if (n != _requests && mounted) setState(() => _requests = n);
  }

  @override
  Widget build(BuildContext context) {
    final meta = Supabase.instance.client.auth.currentUser?.userMetadata;
    final username = _username ?? meta?['username'] as String? ?? '';
    final pages = [
      HomeScreen(onRequests: _setRequests, onUsername: (u) => _username == u ? null : setState(() => _username = u)),
      FriendsScreen(onRequestsChanged: _setRequests),
      const LeaderboardScreen(),
      ProfileScreen(username: username, isMe: true),
    ];
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: _NavBar(
        index: _tab,
        badge: _requests,
        onTap: (i) {
          HapticFeedback.selectionClick();
          setState(() => _tab = i);
        },
      ),
    );
  }
}

class _NavBar extends StatelessWidget {
  final int index, badge;
  final ValueChanged<int> onTap;
  const _NavBar({required this.index, required this.badge, required this.onTap});

  static const _items = [
    ('castle', 'Hof'),
    ('friends', 'Freunde'),
    ('trophy', 'Rangliste'),
    ('user', 'Profil'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Container(
      margin: EdgeInsets.fromLTRB(14, 0, 14, bottom > 0 ? bottom : 12),
      height: 66,
      decoration: BoxDecoration(
        color: C.velvet.withValues(alpha: .96),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: C.line),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .5), blurRadius: 24, offset: const Offset(0, 8))],
      ),
      child: Row(children: [
        for (var i = 0; i < _items.length; i++)
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onTap(i),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Stack(clipBehavior: Clip.none, children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(color: i == index ? C.gold.withValues(alpha: .16) : Colors.transparent, borderRadius: BorderRadius.circular(99)),
                    child: JIcon(_items[i].$1, color: i == index ? C.goldSoft : C.inkMute, size: 25),
                  ),
                  if (i == 1 && badge > 0)
                    Positioned(right: 6, top: -4, child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(color: C.wax, borderRadius: BorderRadius.circular(99), border: Border.all(color: C.velvet, width: 2)),
                      child: Text(badge > 9 ? '9+' : '$badge', style: T.label(11, color: Colors.white)),
                    )),
                ]),
                const SizedBox(height: 2),
                Text(_items[i].$2, style: T.label(12, color: i == index ? C.goldSoft : C.inkMute)),
              ]),
            ),
          ),
      ]),
    );
  }
}
