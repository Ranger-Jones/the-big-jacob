import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// "Thronsaal at night": deep velvet surfaces, one gold accent, parchment ink.
class C {
  static const night = Color(0xFF120A1F);
  static const velvet = Color(0xFF1B0E2E);
  static const surface = Color(0xFF24143A);
  static const surfaceHi = Color(0xFF301C4C);
  static const line = Color(0x2EF4B73A);
  static const gold = Color(0xFFF4B73A);
  static const goldSoft = Color(0xFFFFD77A);
  static const goldDeep = Color(0xFFB07A12);
  static const ink = Color(0xFFF6EAD2);
  static const inkSoft = Color(0xFFB8A7C8);
  static const inkMute = Color(0xFF85759A);
  static const wax = Color(0xFFEF5A62);
  static const vert = Color(0xFF3FBF7F);
  static const azure = Color(0xFF5B8DEF);
  static const felt = Color(0xFF1E5A3D);
  static const feltDeep = Color(0xFF0E3022);
  static const wood = Color(0xFF6B4423);
  static const onGold = Color(0xFF2B1A12);
}

class T {
  static TextStyle display(double size, {Color color = C.ink, FontWeight weight = FontWeight.w700}) =>
      GoogleFonts.grenzeGotisch(fontSize: size, color: color, fontWeight: weight, height: 1.05);
  static TextStyle body(double size, {Color color = C.ink, FontWeight weight = FontWeight.w500, double? height}) =>
      GoogleFonts.alegreyaSans(fontSize: size, color: color, fontWeight: weight, height: height);
  static TextStyle label(double size, {Color color = C.inkSoft}) =>
      GoogleFonts.alegreyaSans(fontSize: size, color: color, fontWeight: FontWeight.w700);
}

ThemeData buildTheme() {
  final base = ThemeData(brightness: Brightness.dark, useMaterial3: true);
  final text = base.textTheme.apply(fontFamily: GoogleFonts.alegreyaSans().fontFamily, bodyColor: C.ink, displayColor: C.ink);
  return base.copyWith(
    scaffoldBackgroundColor: C.night,
    colorScheme: const ColorScheme.dark(
      primary: C.gold, onPrimary: C.onGold, secondary: C.goldSoft, surface: C.surface, onSurface: C.ink, error: C.wax,
    ),
    textTheme: text,
    splashFactory: InkSparkle.splashFactory,
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: C.surfaceHi,
      contentTextStyle: T.body(15),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: C.line)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: C.velvet,
      labelStyle: T.body(15, color: C.inkSoft),
      hintStyle: T.body(15, color: C.inkMute),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: C.gold, width: 1.6)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(backgroundColor: C.velvet, showDragHandle: true, dragHandleColor: C.inkMute),
    dialogTheme: DialogThemeData(backgroundColor: C.velvet, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? C.onGold : C.inkSoft),
      trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? C.gold : C.surfaceHi),
    ),
  );
}
