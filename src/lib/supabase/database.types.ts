
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "apns_devices": {
                  Row: {
                    "created_at": string,"environment": string,"id": string,"token": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"environment": string,"id"?: string,"token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"environment"?: string,"id"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "apns_devices_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "apns_devices_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "apns_devices_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bot_records": {
                  Row: {
                    "first_win_at": string | null,"persona": string,"played": number,"user_id": string,"won": number
                  }
                  ComputedFields: never
                  Insert: {
                    "first_win_at"?: string | null,"persona": string,"played"?: number,"user_id": string,"won"?: number
                  }
                  Update: {
                    "first_win_at"?: string | null,"persona"?: string,"played"?: number,"user_id"?: string,"won"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bot_records_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "bot_records_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "bot_records_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"court_members": {
                  Row: {
                    "court_id": string,"joined_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "court_id": string,"joined_at"?: string,"user_id": string
                  }
                  Update: {
                    "court_id"?: string,"joined_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "court_members_court_id_fkey"
      columns: ["court_id"]
isOneToOne: false
      referencedRelation: "courts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "court_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "court_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "court_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"courts": {
                  Row: {
                    "created_at": string,"crest": string,"id": string,"invite_code": string,"name": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"crest"?: string,"id"?: string,"invite_code": string,"name": string,"owner_id": string
                  }
                  Update: {
                    "created_at"?: string,"crest"?: string,"id"?: string,"invite_code"?: string,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "courts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "courts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "courts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_attempts": {
                  Row: {
                    "created_at": string,"day": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "daily_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "daily_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_results": {
                  Row: {
                    "created_at": string,"day": string,"game_id": string | null,"place": number,"points": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"game_id"?: string | null,"place": number,"points": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"game_id"?: string | null,"place"?: number,"points"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_results_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "daily_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "daily_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "daily_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"deck_likes": {
                  Row: {
                    "created_at": string,"deck_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deck_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deck_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deck_likes_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deck_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deck_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "deck_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"decks": {
                  Row: {
                    "created_at": string,"design": NonNullable<Json>,"id": string,"name": string,"owner_id": string,"public": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"design": NonNullable<Json>,"id"?: string,"name": string,"owner_id": string,"public"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"design"?: NonNullable<Json>,"id"?: string,"name"?: string,"owner_id"?: string,"public"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "decks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "decks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "decks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friendships": {
                  Row: {
                    "addressee_id": string,"created_at": string,"id": string,"requester_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee_id": string,"created_at"?: string,"id"?: string,"requester_id": string,"status"?: string
                  }
                  Update: {
                    "addressee_id"?: string,"created_at"?: string,"id"?: string,"requester_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_hands": {
                  Row: {
                    "game_id": string,"hand": NonNullable<Json>,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": string,"hand"?: NonNullable<Json>,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "game_id"?: string,"hand"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_hands_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_hands_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_hands_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_hands_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_invites": {
                  Row: {
                    "created_at": string,"from_id": string,"game_id": string,"id": string,"status": string,"to_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_id": string,"game_id": string,"id"?: string,"status"?: string,"to_id": string
                  }
                  Update: {
                    "created_at"?: string,"from_id"?: string,"game_id"?: string,"id"?: string,"status"?: string,"to_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_invites_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_invites_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_invites_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_messages": {
                  Row: {
                    "body": string,"created_at": string,"game_id": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"game_id": string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"game_id"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_messages_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_players": {
                  Row: {
                    "game_id": string,"joined_at": string,"left_game": boolean,"place": number | null,"points": number,"seat": number,"stats": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": string,"joined_at"?: string,"left_game"?: boolean,"place"?: number | null,"points"?: number,"seat": number,"stats"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "game_id"?: string,"joined_at"?: string,"left_game"?: boolean,"place"?: number | null,"points"?: number,"seat"?: number,"stats"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_players_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_secrets": {
                  Row: {
                    "data": NonNullable<Json>,"game_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data"?: NonNullable<Json>,"game_id": string
                  }
                  Update: {
                    "data"?: NonNullable<Json>,"game_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_secrets_game_id_fkey"
      columns: ["game_id"]
isOneToOne: true
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"game_spectators": {
                  Row: {
                    "created_at": string,"game_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_spectators_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_spectators_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_spectators_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_spectators_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "code": string,"created_at": string,"finished_at": string | null,"host_id": string,"id": string,"mode": string,"mode_ref": string | null,"rematch_game_id": string | null,"started_at": string | null,"state": NonNullable<Json>,"status": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"finished_at"?: string | null,"host_id": string,"id"?: string,"mode"?: string,"mode_ref"?: string | null,"rematch_game_id"?: string | null,"started_at"?: string | null,"state": NonNullable<Json>,"status"?: string,"version"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"finished_at"?: string | null,"host_id"?: string,"id"?: string,"mode"?: string,"mode_ref"?: string | null,"rematch_game_id"?: string | null,"started_at"?: string | null,"state"?: NonNullable<Json>,"status"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "games_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "games_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "games_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_rematch_game_id_fkey"
      columns: ["rematch_game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"loot_items": {
                  Row: {
                    "count": number,"first_at": string,"item_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"first_at"?: string,"item_id": string,"user_id": string
                  }
                  Update: {
                    "count"?: number,"first_at"?: string,"item_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loot_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "loot_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "loot_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_frame": string | null,"avatar_url": string | null,"campaign_level": number,"campaign_won_on": string | null,"chest_day": string | null,"chests": number,"chests_today": number,"created_at": string,"default_deck": string | null,"dukaten": number,"id": string,"loot_equipped": NonNullable<Json>,"peak_rating": number,"quick_emojis": (string)[] | null,"rated_games": number,"rating": number,"table_felt": string | null,"username": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_frame"?: string | null,"avatar_url"?: string | null,"campaign_level"?: number,"campaign_won_on"?: string | null,"chest_day"?: string | null,"chests"?: number,"chests_today"?: number,"created_at"?: string,"default_deck"?: string | null,"dukaten"?: number,"id": string,"loot_equipped"?: NonNullable<Json>,"peak_rating"?: number,"quick_emojis"?: (string)[] | null,"rated_games"?: number,"rating"?: number,"table_felt"?: string | null,"username": string,"xp"?: number
                  }
                  Update: {
                    "avatar_frame"?: string | null,"avatar_url"?: string | null,"campaign_level"?: number,"campaign_won_on"?: string | null,"chest_day"?: string | null,"chests"?: number,"chests_today"?: number,"created_at"?: string,"default_deck"?: string | null,"dukaten"?: number,"id"?: string,"loot_equipped"?: NonNullable<Json>,"peak_rating"?: number,"quick_emojis"?: (string)[] | null,"rated_games"?: number,"rating"?: number,"table_felt"?: string | null,"username"?: string,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rating_history": {
                  Row: {
                    "created_at": string,"delta": number,"game_id": string,"place": number | null,"players": number,"rated": boolean,"rating_after": number,"rating_before": number,"user_id": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delta": number,"game_id": string,"place"?: number | null,"players": number,"rated": boolean,"rating_after": number,"rating_before": number,"user_id": string,"xp": number
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"game_id"?: string,"place"?: number | null,"players"?: number,"rated"?: boolean,"rating_after"?: number,"rating_before"?: number,"user_id"?: string,"xp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rating_history_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rating_history_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "rating_history_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "rating_history_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "leaderboard": {
                  Row: {
                    "avatar_frame": string | null,"avatar_url": string | null,"avg_place": number | null,"best_points": number | null,"bombs": number | null,"campaign_level": number,"cards_played": number | null,"crowns": number | null,"games_played": number | null,"grand_revolutions": number | null,"missions": number | null,"peak_rating": number,"rated_games": number,"rating": number,"revolutions": number | null,"rises": number | null,"servant": number | null,"total_points": number | null,"tricks": number | null,"user_id": string,"username": string | null,"wins": number | null,"xp": number
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"player_stats": {
                  Row: {
                    "avatar_frame": string | null,"avatar_url": string | null,"avg_place": number | null,"best_points": number | null,"bombs": number | null,"campaign_level": number,"cards_played": number | null,"crowns": number | null,"games_played": number | null,"grand_revolutions": number | null,"missions": number | null,"peak_rating": number,"rated_games": number,"rating": number,"revolutions": number | null,"rises": number | null,"servant": number | null,"total_points": number | null,"tricks": number | null,"user_id": string,"username": string | null,"wins": number | null,"xp": number
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "apply_game_results":
{ Args: { "p_entries": Json,"p_game_id": string }; Returns: undefined
                           },
"buy_loot_chest":
{ Args: { "p_cost": number,"p_user": string }; Returns: undefined
                           },
"can_read_online_channel":
{ Args: { "topic": string }; Returns: boolean
                           },
"can_use_game_channel":
{ Args: { "topic": string }; Returns: boolean
                           },
"commit_game":
{ Args: { "p_expected_version": number,"p_game_id": string,"p_hands": Json,"p_players": Json,"p_secret": Json,"p_state": Json }; Returns: number
                           },
"grant_loot_chests":
{ Args: { "p_cap": number,"p_count": number,"p_day": string,"p_user": string }; Returns: number
                           },
"is_court_member":
{ Args: { "cid": string }; Returns: boolean
                           },
"is_game_member":
{ Args: { "gid": string }; Returns: boolean
                           },
"is_game_spectator":
{ Args: { "gid": string }; Returns: boolean
                           },
"open_loot_chest":
{ Args: { "p_dupe_dukaten": number,"p_item": string,"p_user": string }; Returns: number
                           },
"record_bot_duel":
{ Args: { "p_persona": string,"p_user": string,"p_won": boolean }; Returns: undefined
                           },
"register_apns_device":
{ Args: { "p_cap": number,"p_environment": string,"p_token": string,"p_user": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
