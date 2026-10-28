/// Backend of Der Große Jakob. The publishable key is public by design (row level security protects the data).
/// Override for local development with --dart-define, e.g. API_BASE=http://192.168.0.10:3002.
class Config {
  static const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://the-big-jacob.vercel.app');
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://xyoccsrhogjlgjnohhft.supabase.co');
  static const supabaseKey = String.fromEnvironment('SUPABASE_KEY', defaultValue: 'sb_publishable_ys4vbLs0eV3te_S9eRzgjQ_Co_vxb9i');
}
