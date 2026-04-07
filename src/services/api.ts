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
      // Get user's local date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      // 1. Fetch Fixtures
      const fixturesResponse = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      const fixturesData = await fixturesResponse.json();
      if (!fixturesData.response) return [];

      // Filter matches by allowed leagues
      const filteredFixtures = fixturesData.response.filter((item: any) => 
        ALLOWED_LEAGUES.includes(item.league.id)
      );

      if (filteredFixtures.length === 0) return [];

      // 2. Fetch Odds for the same date
      // Note: Odds API might be restricted on some free plans, so we handle it gracefully
      let oddsMap: Record<string, any> = {};
      try {
        const oddsResponse = await fetch(`https://v3.football.api-sports.io/odds?date=${today}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': this.apiKey,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        });
        const oddsData = await oddsResponse.json();
        if (oddsData.response) {
          oddsData.response.forEach((item: any) => {
            oddsMap[item.fixture.id.toString()] = item.bookmakers?.[0]?.bets?.find((b: any) => b.name === 'Match Winner')?.values;
          });
        }
      } catch (e) {
        console.warn('Could not fetch real odds, using default values', e);
      }

      return filteredFixtures.map((item: any) => {
        const fixtureId = item.fixture.id.toString();
        const fixtureOdds = oddsMap[fixtureId];
        
        let odds = { '1': 1.85, 'X': 3.40, '2': 2.10 }; // Slightly more realistic defaults
        
        if (fixtureOdds) {
          const home = fixtureOdds.find((v: any) => v.value === 'Home')?.odd;
          const draw = fixtureOdds.find((v: any) => v.value === 'Draw')?.odd;
          const away = fixtureOdds.find((v: any) => v.value === 'Away')?.odd;
          if (home && draw && away) {
            odds = {
              '1': parseFloat(home),
              'X': parseFloat(draw),
              '2': parseFloat(away)
            };
          }
        }

        return {
          id: fixtureId,
          homeTeam: item.teams.home.name,
          awayTeam: item.teams.away.name,
          homeLogo: item.teams.home.logo,
          awayLogo: item.teams.away.logo,
          league: item.league.name,
          leagueId: item.league.id.toString(),
          leagueFlag: item.league.flag,
          startTime: item.fixture.date,
          odds
        };
      });
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }

  async getResults(matchIds: string[]): Promise<Record<string, string>> {
    return {};
  }
}

// Add other providers...

export class TheOddsApiProvider implements FootballProvider {
  constructor(private apiKey: string) {}

  async getMatches(): Promise<Match[]> {
    try {
      // The Odds API uses regions and markets
      // We'll fetch soccer matches for the 'eu' region and 'h2h' market
      const response = await fetch(`https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${this.apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`, {
        method: 'GET'
      });

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      // Map to our Match interface
      return data.map((item: any) => {
        const h2hMarket = item.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'h2h');
        const outcomes = h2hMarket?.outcomes || [];
        
        const homeOdd = outcomes.find((o: any) => o.name === item.home_team)?.price || 1.85;
        const awayOdd = outcomes.find((o: any) => o.name === item.away_team)?.price || 2.10;
        const drawOdd = outcomes.find((o: any) => o.name === 'Draw')?.price || 3.40;

        return {
          id: item.id,
          homeTeam: item.home_team,
          awayTeam: item.away_team,
          league: item.sport_title,
          leagueId: item.sport_key,
          startTime: item.commence_time,
          odds: {
            '1': homeOdd,
            'X': drawOdd,
            '2': awayOdd
          }
        };
      });
    } catch (error) {
      console.error('Error fetching matches from The Odds API:', error);
      return [];
    }
  }

  async getResults(matchIds: string[]): Promise<Record<string, string>> {
    return {};
  }
}

export const PROVIDERS = [
  'API-Football',
  'The-Odds-API',
  'Football-Data.org',
  'Sportmonks'
];

export function getProvider(name: string, apiKey: string): FootballProvider {
  switch (name) {
    case 'API-Football':
    case 'API-Sports.io':
      return new ApiFootballProvider(apiKey);
    case 'The-Odds-API':
      return new TheOddsApiProvider(apiKey);
    default:
      return new ApiFootballProvider(apiKey);
  }
}
