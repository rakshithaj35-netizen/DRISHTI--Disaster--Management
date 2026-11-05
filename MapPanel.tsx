import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { facilities, floodZone, roads, villages, type RiskLevel, type Road } from './data';

const riskClass: Record<RiskLevel, string> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Safe: 'safe',
};

function villageMarker(risk: RiskLevel, isolated: boolean) {
  const colorClass = isolated ? 'critical' : riskClass[risk];
  return L.divIcon({
    className: 'village-marker-wrap',
    html: `<span class="village-marker ${colorClass} ${isolated ? 'isolated' : ''}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function facilityMarker(kind: string) {
  const mark = kind === 'hospital' ? '+' : kind === 'shelter' ? 'S' : 'R';
  return L.divIcon({
    className: `facility-marker-wrap facility-${kind}`,
    html: `<span class="facility-marker">${mark}</span>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
}

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 160);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

function coords(id: string): [number, number] {
  const village = villages.find((item) => item.id === id);
  return village ? [village.lat, village.lng] : [12.8, 75.4];
}

type MapPanelProps = {
  blockedRoads: string[];
  isolatedIds: Set<string>;
  onToggleRoad: (id: string) => void;
  showVillages: boolean;
  showFacilities: boolean;
  showRoads: boolean;
  showRiskZones: boolean;
};

export default function MapPanel({ blockedRoads, isolatedIds, onToggleRoad, showVillages, showFacilities, showRoads, showRiskZones }: MapPanelProps) {
  return (
    <MapContainer className="disaster-map" center={[12.79, 75.425]} zoom={9} minZoom={7} maxZoom={15} scrollWheelZoom>
      <MapResize />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · tiles from <a href="https://www.openstreetmap.de/" target="_blank" rel="noreferrer">OpenStreetMap DE</a>'
        url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {showRiskZones && (
        <>
          <Polygon
            positions={floodZone}
            pathOptions={{ color: '#f35c43', weight: 1.5, fillColor: '#ef533f', fillOpacity: 0.28, dashArray: '7 5' }}
          >
            <Tooltip sticky>Active flood zone · Netravati tributary</Tooltip>
          </Polygon>
          <Circle
            center={[12.951, 75.378]}
            radius={1450}
            pathOptions={{ color: '#ed6a45', weight: 1, fillColor: '#ed6a45', fillOpacity: 0.14, dashArray: '4 7' }}
          >
            <Tooltip sticky>Critical exposure zone · Dharmasthala approach</Tooltip>
          </Circle>
        </>
      )}
      {showRoads && roads.map((road: Road) => {
        const blocked = blockedRoads.includes(road.id);
        const flooded = road.status === 'flooded' && !blocked;
        const color = blocked ? '#ed544b' : flooded ? '#ee9a3c' : '#36c899';
        const positions = [coords(road.from), coords(road.to)];
        return (
          <Polyline
            key={road.id}
            positions={positions}
            pathOptions={{ color, weight: blocked ? 5 : 4, opacity: blocked ? 0.97 : 0.92, dashArray: blocked ? '8 7' : flooded ? '5 6' : undefined }}
            eventHandlers={{ click: () => onToggleRoad(road.id) }}
          >
            <Tooltip sticky>{road.name} · {blocked ? 'BLOCKED' : flooded ? 'FLOODED · PASSABLE WITH CAUTION' : 'OPEN'} · click to toggle</Tooltip>
          </Polyline>
        );
      })}
      {showVillages && villages.map((village) => {
        const isolated = isolatedIds.has(village.id);
        return (
          <Marker key={village.id} position={[village.lat, village.lng]} icon={villageMarker(village.risk, isolated)}>
            <Tooltip permanent direction="right" offset={[7, 0]} className="village-label">
              <span className={`label-dot ${isolated ? 'critical' : riskClass[village.risk]}`} />
              {village.name}{isolated ? ' · ISOLATED' : ''}
            </Tooltip>
          </Marker>
        );
      })}
      {showFacilities && facilities.map((facility) => (
        <Marker
          key={facility.id}
          position={[facility.lat, facility.lng]}
          icon={facilityMarker(facility.kind)}
        >
          <Tooltip direction="top" offset={[0, -10]}>{facility.name}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
