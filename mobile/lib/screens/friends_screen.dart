import 'package:flutter/material.dart';

class FriendsScreen extends StatelessWidget {
  final void Function(int) onRequestsChanged;
  const FriendsScreen({super.key, required this.onRequestsChanged});
  @override
  Widget build(BuildContext context) => const Center(child: Text('Freunde'));
}
