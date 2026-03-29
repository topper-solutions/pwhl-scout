// HockeyTech Scorebar game
export interface ScorebarGame {
  ID: string;
  SeasonID: string;
  HomeID: string;
  HomeCode: string;
  HomeCity: string;
  HomeLongName: string;
  HomeGoals: string;
  VisitorID: string;
  VisitorCode: string;
  VisitorCity: string;
  VisitorLongName: string;
  VisitorGoals: string;
  GameStatus: string;
  GameStatusString: string;
  GameStatusStringLong: string;
  GameDate: string;
  ScheduledFormattedTime: string;
  Period: string;
  PeriodNameShort: string;
  PeriodNameLong: string;
  GameClock: string;
  venue_name: string;
  [key: string]: unknown;
}

// Standings row from Statviewtype
export interface StandingsRow {
  team_id: string;
  team_name: string;
  team_code: string;
  rank: number;
  games_played: string;
  wins: string;
  losses: string;
  ot_losses: string;
  points: string;
  goals_for: string;
  goals_against: string;
  streak: string;
  past_10: string;
  [key: string]: unknown;
}

// Top scorer / player stats row
export interface PlayerStatsRow {
  player_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  position: string;
  team_id?: string;
  team_code?: string;
  team_name?: string;
  games_played: string;
  goals: string;
  assists: string;
  points: string;
  plus_minus?: string;
  penalty_minutes?: string;
  power_play_goals?: string;
  short_handed_goals?: string;
  game_winning_goals?: string;
  shots?: string;
  shooting_percentage?: string;
  // Goalie-specific
  wins?: string;
  losses?: string;
  goals_against_average?: string;
  save_percentage?: string;
  shutouts?: string;
  saves?: string;
  shots_against?: string;
  [key: string]: unknown;
}

// Schedule game
export interface ScheduleGame {
  game_id?: string;
  id?: string;
  date_played: string;
  date_with_day: string;
  home_team: string;
  visiting_team: string;
  home_goal_count: string;
  visiting_goal_count: string;
  game_status: string;
  schedule_time?: string;
  scheduled_time?: string;
  home_team_name?: string;
  home_team_city?: string;
  home_team_code?: string;
  visiting_team_name?: string;
  visiting_team_city?: string;
  visiting_team_code?: string;
  venue_name?: string;
  status?: string;
  [key: string]: unknown;
}

// Game summary team info
export interface GameTeamInfo {
  id: string;
  team_id: string;
  team_code: string;
  code: string;
  name: string;
  city: string;
  nickname: string;
  [key: string]: unknown;
}

// Game summary goal
export interface GameGoal {
  event: string;
  time: string;
  team_id: string;
  home: string;
  period_id: string;
  power_play: string;
  short_handed: string;
  empty_net: string;
  goal_scorer: {
    player_id: string;
    first_name: string;
    last_name: string;
    jersey_number: string;
    team_id: string;
    team_code: string;
  };
  assist1_player: {
    player_id: string | null;
    first_name: string | null;
    last_name: string | null;
    [key: string]: unknown;
  };
  assist2_player: {
    player_id: string | null;
    first_name: string | null;
    last_name: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Game summary penalty
export interface GamePenalty {
  event: string;
  time_off_formatted: string;
  team_id: string;
  home: string;
  period_id: string;
  period: string;
  minutes: number;
  minutes_formatted: string;
  lang_penalty_description: string;
  offence: string;
  player_penalized_info: {
    player_id: string;
    first_name: string;
    last_name: string;
    jersey_number: string;
    team_id: string;
    team_code: string;
  };
  [key: string]: unknown;
}

// Three star / MVP
export interface GameMvp {
  player_id: string;
  first_name: string;
  last_name: string;
  jersey_number: string;
  home: number | string;
  [key: string]: unknown;
}

// Game summary
export interface GameSummary {
  visitor: GameTeamInfo;
  home: GameTeamInfo;
  totalGoals: { visitor: number; home: number };
  totalShots?: { visitor: number; home: number };
  goals: GameGoal[];
  penalties: GamePenalty[];
  mvps: GameMvp[];
  status_value: string;
  game_date: string;
  venue: string;
  periods: Record<string, unknown>;
  shotsByPeriod?: unknown;
  shots?: unknown;
  [key: string]: unknown;
}

// Roster player
export interface RosterPlayer {
  id: string;
  player_id?: string;
  first_name: string;
  last_name: string;
  name?: string;
  position: string;
  shoots?: string;
  catches?: string;
  tp_jersey_number?: string;
  jersey_number?: string;
  birthdate?: string;
  hometown?: string;
  birth_city?: string;
  birth_state?: string;
  birth_country?: string;
  [key: string]: unknown;
}

// Play-by-play event
export interface PbpEvent {
  event: string;
  time: string;
  period_id?: string;
  team_id?: string;
  team_code?: string;
  s?: number;
  [key: string]: unknown;
}
