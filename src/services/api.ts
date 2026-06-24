import { Match } from '../types';
import { DEFAULT_LEAGUE_IDS } from '../constants';

export interface FootballProvider {
  getMatches(): Promise<Match[]>;
  getResults(matchIds: string[]): Promise<Record<string, string>>;
}

export class ApiFootballProvider implements FootballProvider {
  constructor(
    private apiKey: string,
    private allowedLeagueIds: number[] = DEFAULT_LEAGUE_IDS
  ) {}

  async getMatches(): Promise<Match[]> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      const fixturesResponse = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      const fixturesData = await fixturesResponse.json();
      if (!fixturesData.response) return [];

      const allowedSet = new Set(this.allowedLeagueIds);
      const filteredFixtures = fixturesData.response.filter((item: any) =>
        allowedSet.has(item.league.id)
      );

      if (filteredFixtures.length === 0) return [];

      return filteredFixtures.map((item: any) => ({
        id: item.fixture.id.toString(),
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeLogo: item.teams.home.logo,
        awayLogo: item.teams.away.logo,
        league: item.league.name,
        leagueId: item.league.id.toString(),
        leagueFlag: item.league.flag,
        startTime: item.fixture.date,
        odds: { '1': 1, 'X': 1, '2': 1 } // Required by type, not displayed
      }));
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }

  async getResults(matchIds: string[]): Promise<Record<string, string>> {
    return {};
  }
}

export const PROVIDERS = ['API-Football'];

export function getProvider(_name: string, apiKey: string, allowedLeagueIds?: number[]): FootballProvider {
  return new ApiFootballProvider(apiKey, allowedLeagueIds);
}
