/// Finds the log entries a client has not handled yet.
///
/// The server keeps only the newest 40 entries, so once the log is full its length stays the same and
/// "everything after the old length" finds nothing. Entries carry the move counter (seq) they were
/// written at, and several entries can share one seq (a play, a snap and a cleared trick), so the
/// cursor remembers the last seq and how many entries with that seq it has already seen.
class LogCursor {
  int _lastSeq = -1;
  int _seenAtLast = 0;

  static int _seq(Map e) => (e['seq'] as num?)?.toInt() ?? 0;

  /// Marks the whole log as handled (e.g. when the table opens: old moments do not replay).
  void skip(List<Map> log) {
    if (log.isEmpty) return;
    _lastSeq = _seq(log.last);
    _seenAtLast = log.where((e) => _seq(e) == _lastSeq).length;
  }

  /// Entries added since the last call, oldest first.
  List<Map> take(List<Map> log) {
    final fresh = <Map>[];
    var atLast = 0;
    for (final e in log) {
      final seq = _seq(e);
      if (seq > _lastSeq) {
        fresh.add(e);
      } else if (seq == _lastSeq && ++atLast > _seenAtLast) {
        fresh.add(e);
      }
    }
    skip(log);
    return fresh;
  }
}
