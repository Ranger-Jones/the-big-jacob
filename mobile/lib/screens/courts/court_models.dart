import '../../game/models.dart';

/// A player may belong to this many courts at once (MAX_COURTS on the server).
const maxCourts = 5;

/// One of my courts as listed by `GET courts`.
class CourtSummary {
  final String id, name, crest;
  final int members;
  final bool owner;
  const CourtSummary(this.id, this.name, this.crest, this.members, this.owner);

  factory CourtSummary.from(Map m) => CourtSummary(
        m['id'] as String? ?? '',
        m['name'] as String? ?? 'Hof',
        m['crest'] as String? ?? '',
        (m['members'] as num?)?.toInt() ?? 0,
        m['owner'] == true,
      );
}

/// One row of the court table.
class CourtStanding {
  final Profile profile;
  final int games, wins, points;
  final bool owner;
  const CourtStanding(this.profile, this.games, this.wins, this.points, this.owner);

  factory CourtStanding.from(Map m) => CourtStanding(
        Profile.from(m['profile'] as Map? ?? const {}),
        (m['games'] as num?)?.toInt() ?? 0,
        (m['wins'] as num?)?.toInt() ?? 0,
        (m['points'] as num?)?.toInt() ?? 0,
        m['owner'] == true,
      );
}

/// A court as returned by `GET court/<id>`.
class CourtDetail {
  final String id, name, crest, inviteCode, ownerId;
  final DateTime? createdAt;
  final int courtGames;
  final List<CourtStanding> standings;
  final List<String> crests;
  const CourtDetail(this.id, this.name, this.crest, this.inviteCode, this.ownerId, this.createdAt, this.courtGames, this.standings, this.crests);

  factory CourtDetail.from(Map m) => CourtDetail(
        m['id'] as String? ?? '',
        m['name'] as String? ?? 'Hof',
        m['crest'] as String? ?? '',
        m['inviteCode'] as String? ?? '',
        m['ownerId'] as String? ?? '',
        DateTime.tryParse(m['createdAt'] as String? ?? '')?.toLocal(),
        (m['courtGames'] as num?)?.toInt() ?? 0,
        ((m['standings'] as List?) ?? const []).whereType<Map>().map(CourtStanding.from).toList(),
        crestIds(m['crests']),
      );
}

List<String> crestIds(Object? raw) => ((raw as List?) ?? const []).whereType<String>().toList();

const _months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/// "28. Oktober 2026".
String germanDate(DateTime d) => '${d.day}. ${_months[d.month - 1]} ${d.year}';

/// Picks the singular or plural German noun for [n].
String plural(int n, String one, String many) => '$n ${n == 1 ? one : many}';

/// The public link that opens the join form with the code filled in.
String inviteLink(String code) => 'https://the-big-jacob.vercel.app/hoefe?code=$code';
