'use client';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { getPlaceCategory, Place, placeCategories } from '@/lib/types';

declare global { interface Window { google?: any; __triplogGoogleMapsReady?: () => void } }
let googlePromise: Promise<any> | null = null;
function loadGoogle(key: string): Promise<any> {
  if (window.google?.maps?.Map && window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (!googlePromise) googlePromise = new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const finish=(error?:Error)=>{
      delete window.__triplogGoogleMapsReady;
      if(error){script.remove();reject(error);return;}
      if(!window.google?.maps?.Map) {script.remove();reject(Error('Google 지도 API가 준비되지 않았습니다.'));return;}
      resolve(window.google);
    };
    window.__triplogGoogleMapsReady=()=>finish();
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places&language=ko&loading=async&callback=__triplogGoogleMapsReady`;
    script.async=true;script.onerror=()=>finish(Error('Google 지도를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
  googlePromise.catch(()=>{googlePromise=null;});
  return googlePromise;
}
export async function ensureGoogle() {
  const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return loadGoogle(key);
}

export function PlaceSearch({ onSelect, placeholder='도시, 국가, 장소 검색', biasBounds, compact=false }: { onSelect:(place:Place)=>void; placeholder?:string; biasBounds?:any; compact?:boolean }) {
  const host=useRef<HTMLDivElement>(null);
  const autocomplete=useRef<any>(null);
  const biasBoundsRef=useRef(biasBounds);
  biasBoundsRef.current=biasBounds;
  const onSelectRef=useRef(onSelect);
  onSelectRef.current=onSelect;
  const [query,setQuery]=useState('');
  const [googleReady,setGoogleReady]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    ensureGoogle().then(async g=>{
      if (!active || !g || !host.current) return;
      const {PlaceAutocompleteElement}=await g.maps.importLibrary('places');
      if (!active || !host.current) return;
      const el=new PlaceAutocompleteElement();
      el.placeholder=placeholder;
      el.style.width='100%';
      if(biasBoundsRef.current)el.locationBias=biasBoundsRef.current;
      autocomplete.current=el;
      el.addEventListener('gmp-select',async (event:any)=>{
        try {
          const prediction=event.placePrediction;
          const place=prediction.toPlace();
          await place.fetchFields({fields:['id','displayName','formattedAddress','location']});
          if (!place.id || !place.location) return;
          onSelectRef.current({id:place.id,name:place.displayName || place.formattedAddress || '선택한 장소',address:place.formattedAddress || '',lat:place.location.lat(),lng:place.location.lng()});
          setError('');
        } catch { setError('장소 정보를 가져오지 못했습니다. 다시 선택해 주세요.'); }
      });
      host.current.replaceChildren(el);setGoogleReady(true);
    }).catch(()=>{if(active)setError('Google 장소 검색을 불러오지 못했습니다.');});
    return ()=>{active=false;};
  },[placeholder]);
  useEffect(()=>{if(autocomplete.current&&biasBounds)autocomplete.current.locationBias=biasBounds;},[biasBounds]);
  return <div className="search-area"><div ref={host} className={googleReady?'google-search':'hidden'} />{!googleReady&&<input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder} aria-label="장소 검색" />}{error&&<p className="field-error">{error}</p>}{!googleReady&&<p className="hint">Google API 키를 설정하면 실제 장소 검색이 활성화됩니다. 아래 예시 장소를 선택해 화면을 확인할 수 있습니다.</p>}{!googleReady&&(!compact||query.trim())&&<DemoResults query={query} onSelect={onSelect}/>}</div>;
}
import { demoPlaces } from '@/lib/types';
function DemoResults({query,onSelect}:{query:string;onSelect:(p:Place)=>void}) {
  const list=demoPlaces.filter(p=>!query || `${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="demo-results">{list.length?list.map(p=><button key={p.id} className="result" onClick={()=>onSelect(p)}><span className="result-pin">●</span><span><strong>{p.name}</strong><small>{p.address}</small></span><span>→</span></button>):<p className="empty-small">검색 결과가 없습니다.</p>}</div>;
}

type TripMapStop = { place: Place; day: number; order: number };
const circledNumbers = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];

export default function MapView({places,onSelect,route,tripStops,focusPlace,showLegend=false,onViewportChange,showScale=false}:{places:Place[];onSelect?:(p:Place)=>void;route?:Place[];tripStops?:TripMapStop[];focusPlace?:Place|null;showLegend?:boolean;onViewportChange?:(bounds:any)=>void;showScale?:boolean}) {
  const container=useRef<HTMLDivElement>(null);
  const map=useRef<any>(null);
  const markers=useRef<any[]>([]);
  const lines=useRef<any[]>([]);
  const onViewportChangeRef=useRef(onViewportChange);
  onViewportChangeRef.current=onViewportChange;
  const [mode,setMode]=useState<'loading'|'google'|'demo'>('loading');
  useEffect(()=>{
    let active=true;
    ensureGoogle().then(g=>{
      if(!active)return;
      if(!g||!container.current){setMode('demo');return;}
      map.current=new g.maps.Map(container.current,{center:{lat:50.8,lng:10.5},zoom:5,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,scaleControl:showScale,scaleControlOptions:showScale?{position:g.maps.ControlPosition.BOTTOM_LEFT}:undefined});
      map.current.addListener('idle',()=>{const bounds=map.current?.getBounds();if(bounds)onViewportChangeRef.current?.(bounds);});
      setMode('google');
    }).catch(()=>{if(active)setMode('demo');});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(mode!=='google'||!window.google||!map.current)return;
    markers.current.forEach(m=>m.setMap(null));markers.current=[];lines.current.forEach(line=>line.setMap(null));lines.current=[];
    const g=window.google;
    if(tripStops){
      tripStops.forEach(stop=>{const p=stop.place;const sequence=circledNumbers[stop.order]||String(stop.order+1);const label=`${stop.day}-${sequence}`;const marker=new g.maps.Marker({position:{lat:p.lat,lng:p.lng},map:map.current,title:`${stop.day}일차 ${sequence} · ${p.name}`,label:{text:label,color:'#fff',fontSize:'11px',fontWeight:'700'},icon:{path:g.maps.SymbolPath.CIRCLE,scale:20,fillColor:'#03a94d',fillOpacity:1,strokeWeight:2,strokeColor:'#fff'}});marker.addListener('click',()=>onSelect?.(p));markers.current.push(marker);});
      const days=new Map<number,TripMapStop[]>();tripStops.forEach(stop=>days.set(stop.day,[...(days.get(stop.day)||[]),stop]));
      days.forEach(dayStops=>{if(dayStops.length<2)return;const line=new g.maps.Polyline({path:dayStops.map(stop=>({lat:stop.place.lat,lng:stop.place.lng})),map:map.current,strokeColor:'#2883c6',strokeWeight:4,strokeOpacity:.85,icons:[{icon:{path:g.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:3,strokeColor:'#2883c6',fillColor:'#2883c6'},offset:'50%'}]});lines.current.push(line);});
    }else{
      const shownPlaces=focusPlace&&!places.some(p=>p.id===focusPlace.id)?[...places,focusPlace]:places;
      shownPlaces.forEach(p=>{const category=getPlaceCategory(p);const marker=new g.maps.Marker({position:{lat:p.lat,lng:p.lng},map:map.current,title:`${category.label} · ${p.name}`,label:{text:category.icon,color:'#fff',fontSize:'12px'},icon:{path:g.maps.SymbolPath.CIRCLE,scale:13,fillColor:p.id===focusPlace?.id?'#e66a30':category.color,fillOpacity:1,strokeWeight:2,strokeColor:'#fff'}});marker.addListener('click',()=>onSelect?.(p));markers.current.push(marker);});
      if(route&&route.length>1)lines.current.push(new g.maps.Polyline({path:route.map(p=>({lat:p.lat,lng:p.lng})),map:map.current,strokeColor:'#2883c6',strokeWeight:4,strokeOpacity:.85,icons:[{icon:{path:g.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:3,strokeColor:'#2883c6',fillColor:'#2883c6'},offset:'50%'}]}));
    }
    if(!focusPlace&&places.length){const bounds=new g.maps.LatLngBounds();places.forEach(p=>bounds.extend({lat:p.lat,lng:p.lng}));map.current.fitBounds(bounds);if(places.length===1)map.current.setZoom(14);}
  },[places,route,tripStops,focusPlace,mode,onSelect]);
  useEffect(()=>{if(mode==='google'&&map.current&&focusPlace){map.current.panTo({lat:focusPlace.lat,lng:focusPlace.lng});map.current.setZoom(15)}},[focusPlace,mode]);
  const fallback=mode!=='google';
  const displayPlaces=focusPlace&&!places.some(p=>p.id===focusPlace.id)?[...places,focusPlace]:places;
  const fallbackPoint=(index:number)=>`${22+(index*23)%62},${28+(index*19)%52}`;
  const fallbackDayGroups=new Map<number,TripMapStop[]>();
  tripStops?.forEach(stop=>fallbackDayGroups.set(stop.day,[...(fallbackDayGroups.get(stop.day)||[]),stop]));
  const fallbackRoutePaths=tripStops
    ? [...fallbackDayGroups.values()].filter(dayStops=>dayStops.length>1).map(dayStops=>dayStops.map(stop=>fallbackPoint(tripStops.indexOf(stop))).join(' '))
    : route&&route.length>1?[route.map((_,index)=>fallbackPoint(index)).join(' ')]:[];
  const fallbackMarkers=tripStops
    ? tripStops.map((stop,index)=>{const label=`${stop.day}-${circledNumbers[stop.order]||stop.order+1}`;return <button key={`${stop.place.id}-${stop.day}-${stop.order}`} className="map-pin map-trip-pin" style={{left:`${22+(index*23)%62}%`,top:`${28+(index*19)%52}%`} as CSSProperties} aria-label={`${stop.day}일차 ${stop.order+1}번째 장소: ${stop.place.name}`} title={`${label} · ${stop.place.name}`}><span>{label}</span></button>})
    : displayPlaces.map((p,index)=>{const category=getPlaceCategory(p);return <button key={`${p.id}-${index}`} className="map-pin" style={{left:`${22+(index*23)%62}%`,top:`${28+(index*19)%52}%`,'--pin-color':p.id===focusPlace?.id?'#e66a30':category.color} as CSSProperties} onClick={()=>onSelect?.(p)} aria-label={`${category.label}: ${p.name} 장소 보기`} title={`${category.label} · ${p.name}`}><span>{category.icon}</span></button>});
  return <div className="map-wrap"><div ref={container} className={fallback?'map-canvas map-hidden':'map-canvas'} />{fallback&&<div className="illustrated-map"><div className="map-street street-a"/><div className="map-street street-b"/><div className="map-street street-c"/><div className="map-park park-a"/><div className="map-park park-b"/><span className="map-label label-a">베를린</span><span className="map-label label-b">파리</span>{fallbackRoutePaths.length>0&&<svg className="fallback-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="trip-route-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" fill="#2684c9"/></marker></defs>{fallbackRoutePaths.map((points,index)=><polyline key={index} points={points} fill="none" stroke="#2684c9" strokeWidth="1.2" strokeDasharray="2 1" markerEnd="url(#trip-route-arrow)" vectorEffect="non-scaling-stroke"/>)}</svg>}{fallbackMarkers}{!displayPlaces.length&&<div className="map-empty">아직 기록된 장소가 없어요.<br/>첫 장소를 남겨 지도를 채워보세요.</div>}{route&&route.length>1&&<div className="route-note">방문 순서 {route.map(p=>p.name).join(' → ')}</div>}</div>}{showLegend&&<div className="category-legend" aria-label="장소 종류 범례">{placeCategories.map(category=><span key={category.id}><i style={{backgroundColor:category.color}}>{category.icon}</i>{category.label}</span>)}</div>}</div>;
}
