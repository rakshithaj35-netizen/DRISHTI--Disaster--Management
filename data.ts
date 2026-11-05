import scenarioData from '../data/scenario-karnataka.json';

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Safe';
export type RoadStatus = 'open' | 'flooded' | 'blocked';
export type FacilityKind = 'hospital' | 'shelter' | 'team';

export type Village = {
  id: string;
  name: string;
  taluk: string;
  lat: number;
  lng: number;
  risk: RiskLevel;
  reports: number;
  population: string;
  score: number;
  confidence: number;
  reason: string;
};

export type Road = {
  id: string;
  name: string;
  from: string;
  to: string;
  status: RoadStatus;
  note: string;
};

export type Facility = {
  id: string;
  name: string;
  kind: FacilityKind;
  lat: number;
  lng: number;
};

export const scenario = scenarioData.scenario;
export const villages = scenarioData.villages as Village[];
export const roads = scenarioData.roads as Road[];
export const facilities = scenarioData.facilities as Facility[];
export const floodZone = scenarioData.floodZone as [number, number][];
