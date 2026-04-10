import { Match } from '../types';

export interface FootballProvider {
  getMatches(): Promise<Match[]>;
  getResults(matchIds: string[]): Promise<Record<string, string>>;
}

const ALLOWED_LEAGUES = [
  218, 144, 172, 210, 318, 119, 233, 327, 197, 274, 290, 103, 106, 179, 143, 435, 436, 141, 113, 207, 203, 17, 6, 205, 1129, 199, 90, 278, 286, 96, 206, 525,
  2, 3, 848, 13, 11, 71
];

export class ApiFootballProvider implements FootballProvider {
  constructor(private apiKey: string) {}

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

      const filteredFixtures = fixturesData.response.filter((item: any) =>
        ALLOWED_LEAGUES.includes(item.league.id)
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

export function getProvider(_name: string, apiKey: string): FootballProvider {
  return new ApiFootballProvider(apiKey);
}
