export type Place = { id: string; name: string; address: string; lat: number; lng: number };
export type Stop = { id: string; place: Place; day: number; order: number; time: string; note: string; tip: string; rating: number; photos: string[]; transportToNext: string };
export type PlacePayload = { place: Place; visitDate: string; note: string; tip: string; rating: number; photos: string[] };
export type TripPayload = { title: string; startDate: string; endDate: string; intro: string; stops: Stop[] };
export type RecordEntry = {
  id: string; owner: string; kind: 'place' | 'trip'; status: 'draft' | 'public';
  payload: PlacePayload | TripPayload; createdAt: string; updatedAt: string;
};
export type CommentEntry = { id: string; recordId: string; stopId: string | null; parentId: string | null; owner: string; author: string; body: string; createdAt: string };
export const uid = () => crypto.randomUUID();
export const demoPlaces: Place[] = [
  { id:'demo-berlin-cathedral',name:'베를린 대성당',address:'Am Lustgarten, 10178 Berlin, Germany',lat:52.5191,lng:13.4010 },
  { id:'demo-brandenburg',name:'브란덴부르크 문',address:'Pariser Platz, 10117 Berlin, Germany',lat:52.5163,lng:13.3777 },
  { id:'demo-museum-island',name:'박물관 섬',address:'Museum Island, 10178 Berlin, Germany',lat:52.5169,lng:13.4011 },
  { id:'demo-louvre',name:'루브르 박물관',address:'75001 Paris, France',lat:48.8606,lng:2.3376 },
  { id:'demo-eiffel',name:'에펠탑',address:'Champ de Mars, 75007 Paris, France',lat:48.8584,lng:2.2945 }
];
