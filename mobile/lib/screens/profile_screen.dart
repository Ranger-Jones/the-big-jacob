import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  final String username;
  final bool isMe;
  const ProfileScreen({super.key, required this.username, this.isMe = false});
  @override
  Widget build(BuildContext context) => Center(child: Text(username));
}
