/// The treasure chest, drawn in the app's "Hofstaat" style (viewBox 0 0 200 170).
/// Two states: closed (with a lock jewel) and open (lid up, light pouring out).
const _woodDark = '#4a2e17', _gold = '#f4b73a', _goldDeep = '#b07a12', _ink = '#2a1a10';

String _body() => '''
<path d="M24 82 H176 V150 Q176 160 166 160 H34 Q24 160 24 150 Z" fill="url(#cw)" stroke="$_ink" stroke-width="3"/>
<path d="M24 104 H176" stroke="$_woodDark" stroke-width="2" opacity=".6"/>
<path d="M24 128 H176" stroke="$_woodDark" stroke-width="2" opacity=".6"/>
<rect x="40" y="82" width="14" height="78" fill="url(#cg)" stroke="$_ink" stroke-width="2.4"/>
<rect x="146" y="82" width="14" height="78" fill="url(#cg)" stroke="$_ink" stroke-width="2.4"/>
<path d="M24 150 Q24 160 34 160 H166 Q176 160 176 150" fill="none" stroke="$_gold" stroke-width="5"/>
<circle cx="47" cy="96" r="2.4" fill="$_ink"/><circle cx="47" cy="146" r="2.4" fill="$_ink"/>
<circle cx="153" cy="96" r="2.4" fill="$_ink"/><circle cx="153" cy="146" r="2.4" fill="$_ink"/>
''';

const _defs = '''
<defs>
  <linearGradient id="cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a2e"/><stop offset="1" stop-color="$_woodDark"/></linearGradient>
  <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".5" stop-color="$_gold"/><stop offset="1" stop-color="$_goldDeep"/></linearGradient>
  <radialGradient id="cl" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="#fff6c8" stop-opacity=".95"/><stop offset=".55" stop-color="$_gold" stop-opacity=".45"/><stop offset="1" stop-color="$_gold" stop-opacity="0"/></radialGradient>
</defs>
''';

const chestClosedSvg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170">$_defs
<path d="M24 82 Q24 34 100 30 Q176 34 176 82 Z" fill="url(#cw)" stroke="$_ink" stroke-width="3"/>
<path d="M30 70 Q100 50 170 70" fill="none" stroke="$_woodDark" stroke-width="2" opacity=".6"/>
<path d="M40 82 Q41 44 47 40 L54 39 Q50 46 54 82 Z" fill="url(#cg)" stroke="$_ink" stroke-width="2.4"/>
<path d="M160 82 Q159 44 153 40 L146 39 Q150 46 146 82 Z" fill="url(#cg)" stroke="$_ink" stroke-width="2.4"/>
<rect x="20" y="76" width="160" height="12" rx="4" fill="url(#cg)" stroke="$_ink" stroke-width="2.6"/>
${'_BODY_'}
<path d="M86 80 H114 V112 Q114 122 100 126 Q86 122 86 112 Z" fill="url(#cg)" stroke="$_ink" stroke-width="2.6"/>
<circle cx="100" cy="98" r="7" fill="#c8323c" stroke="$_ink" stroke-width="2"/>
<circle cx="97.5" cy="95.5" r="2" fill="#fff" opacity=".7"/>
<path d="M100 106 V116" stroke="$_ink" stroke-width="3" stroke-linecap="round"/>
</svg>''';

const chestOpenSvg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170">$_defs
<ellipse cx="100" cy="70" rx="96" ry="70" fill="url(#cl)"/>
<path d="M30 30 Q100 -6 170 30 L176 60 Q100 34 24 60 Z" fill="url(#cw)" stroke="$_ink" stroke-width="3"/>
<path d="M28 56 Q100 30 172 56" fill="none" stroke="url(#cg)" stroke-width="6"/>
<path d="M24 82 H176 L170 70 Q100 58 30 70 Z" fill="#1b0e2e" stroke="$_ink" stroke-width="2.4"/>
<circle cx="70" cy="74" r="5" fill="$_gold" stroke="$_ink" stroke-width="1.5"/>
<circle cx="90" cy="70" r="5" fill="#ffe7a3" stroke="$_ink" stroke-width="1.5"/>
<circle cx="112" cy="72" r="5" fill="$_gold" stroke="$_ink" stroke-width="1.5"/>
<circle cx="130" cy="75" r="4.5" fill="#5b8def" stroke="$_ink" stroke-width="1.5"/>
<rect x="20" y="78" width="160" height="10" rx="4" fill="url(#cg)" stroke="$_ink" stroke-width="2.6"/>
${'_BODY_'}
<path d="M86 84 H114 V106 Q114 114 100 118 Q86 114 86 106 Z" fill="url(#cg)" stroke="$_ink" stroke-width="2.6"/>
</svg>''';

String chestSvg({required bool open}) => (open ? chestOpenSvg : chestClosedSvg).replaceFirst('_BODY_', _body());
