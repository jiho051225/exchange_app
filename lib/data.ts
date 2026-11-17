'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CommentEntry, RecordEntry, demoPlaces, uid } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const online = Boolean(url && key);
const supabase: SupabaseClient | null = online ? createClient(url!, key!) : null;
let ownerPromise: Promise<string> | null = null;
const STORAGE = 'triplog-v1';
const OWNER = 'triplog-owner-v1';

type Cache = { records: RecordEntry[]; comments: CommentEntry[] };
function sampleCache(): Cache {
  const [cathedral,gate,museum]=demoPlaces;
  const stop=(id:string,place:typeof cathedral,day:number,order:number,time:string,transportToNext:string)=>({id,place,day,order,time,transportToNext,note:'',tip:'',rating:0,photos:[]});
  const sampleTrip:RecordEntry={id:'6a7c8ae8-335a-427a-a92a-dcb3e254e540',owner:'sample-author',kind:'trip',status:'public',createdAt:'2025-05-20T10:00:00Z',updatedAt:'2025-05-20T10:00:00Z',payload:{title:'베를린에서 보낸 2일',startDate:'2025-05-17',endDate:'2025-05-18',intro:'교환학생 첫 주말, 걷고 지하철을 타며 베를린의 중심을 둘러봤어요.',stops:[stop('1f8bb969-2d8b-42a0-8400-a376cedd424e',cathedral,1,0,'09:30','도보'),stop('a4eccf65-f5bf-462c-80ac-48d50d8a77fb',museum,1,1,'11:00',''),stop('b51ef94f-c0d7-4b98-bb5e-1359378ec335',gate,2,0,'14:00','')]}};
  const samplePlace:RecordEntry={id:'ad8e80c5-08db-46b1-bda1-40aa70e26c56',owner:'sample-author',kind:'place',status:'public',createdAt:'2025-05-20T11:00:00Z',updatedAt:'2025-05-20T11:00:00Z',payload:{place:cathedral,visitDate:'2025-05-17',note:'박물관 섬을 걷다가 들르기 좋았어요. 돔 전망대에서 강과 시내가 한눈에 보여요.',tip:'학생 할인 여부는 방문 전에 공식 사이트에서 확인해 보세요.',rating:5,photos:[]}};
  return {records:[samplePlace,sampleTrip],comments:[]};
}
function readCache(): Cache {
  try { const stored=localStorage.getItem(STORAGE);if(!stored){const sample=sampleCache();writeCache(sample);return sample}return JSON.parse(stored) as Cache; }
  catch { return { records: [], comments: [] }; }
}
function writeCache(cache: Cache) { localStorage.setItem(STORAGE, JSON.stringify(cache)); }
export async function getExistingOwner(): Promise<string | null> {
  if (!supabase) return getOwner();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}
export async function getOwner(): Promise<string> {
  if (supabase) {
    if (!ownerPromise) ownerPromise = (async()=>{
      const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (sessionResult.session?.user.id) return sessionResult.session.user.id;
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.user) throw error || Error('익명 사용자를 만들지 못했습니다.');
      return data.user.id;
    })().finally(()=>{ownerPromise=null;});
    return ownerPromise;
  }
  let owner = localStorage.getItem(OWNER);
  if (!owner) { owner = uid(); localStorage.setItem(OWNER, owner); }
  return owner;
}
export async function loadData(): Promise<Cache> {
  if (!supabase) return readCache();
  const [records, comments] = await Promise.all([
    supabase.from('records').select('*').order('updated_at', { ascending: false }),
    supabase.from('comments').select('*').order('created_at', { ascending: true })
  ]);
  if (records.error) throw records.error;
  if (comments.error) throw comments.error;
  return {
    records: (records.data || []).map(row => ({ id:row.id, owner:row.owner_id, kind:row.kind, status:row.status, payload:row.payload, createdAt:row.created_at, updatedAt:row.updated_at })),
    comments: (comments.data || []).map(row => ({ id:row.id, recordId:row.record_id, stopId:row.stop_id, parentId:row.parent_id, owner:row.owner_id, author:row.author, body:row.body, createdAt:row.created_at }))
  };
}
export async function saveRecord(record: RecordEntry): Promise<void> {
  if (!supabase) { const cache=readCache(); cache.records=[record,...cache.records.filter(x=>x.id!==record.id)]; writeCache(cache); return; }
  const { error } = await supabase.from('records').upsert({ id:record.id,owner_id:record.owner,kind:record.kind,status:record.status,payload:record.payload,created_at:record.createdAt,updated_at:record.updatedAt });
  if (error) throw error;
}
export async function deleteRecord(id: string): Promise<void> {
  if (!supabase) { const cache=readCache(); cache.records=cache.records.filter(x=>x.id!==id);cache.comments=cache.comments.filter(x=>x.recordId!==id);writeCache(cache);return; }
  const { error } = await supabase.from('records').delete().eq('id',id);
  if (error) throw error;
}
export async function saveComment(comment: CommentEntry): Promise<void> {
  if (!supabase) { const cache=readCache();cache.comments.push(comment);writeCache(cache);return; }
  const { error } = await supabase.from('comments').insert({ id:comment.id,record_id:comment.recordId,stop_id:comment.stopId,parent_id:comment.parentId,owner_id:comment.owner,author:comment.author,body:comment.body,created_at:comment.createdAt });
  if (error) throw error;
}
export async function deleteComment(id: string): Promise<void> {
  if (!supabase) { const cache=readCache();cache.comments=cache.comments.filter(x=>x.id!==id && x.parentId!==id);writeCache(cache);return; }
  const { error } = await supabase.from('comments').delete().eq('id',id);
  if (error) throw error;
}
export async function uploadPhoto(file: File, owner: string): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw Error('사진은 한 장에 10MB까지 올릴 수 있습니다.');
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('JPG, PNG, WebP 사진만 올릴 수 있습니다.');
  if (!supabase) return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('사진을 읽지 못했습니다.'));reader.readAsDataURL(file);});
  const path=`${owner}/${uid()}.${file.type.split('/')[1]}`;
  const { error }=await supabase.storage.from('photos').upload(path,file,{contentType:file.type});
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
