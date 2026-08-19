import type { FarmLocation } from './types';
const k=(n:string)=>`agrocast:${n}`; const read=<T,>(n:string,d:T):T=>{try{return JSON.parse(localStorage.getItem(k(n))||'')}catch{return d}}; const write=(n:string,v:unknown)=>localStorage.setItem(k(n),JSON.stringify(v));
export async function initializeDatabase(){}
export async function saveLocation(v:FarmLocation){write('location',v)} export async function getLocation(){return read<FarmLocation|null>('location',null)}
export async function setSetting(n:string,v:string){localStorage.setItem(k(`s:${n}`),v)} export async function getSetting(n:string){return localStorage.getItem(k(`s:${n}`))}
export async function setCache(n:string,p:unknown){const t=new Date().toISOString();write(`c:${n}`,{data:p,updatedAt:t});return t} export async function getCache<T>(n:string){return read<{data:T;updatedAt:string}|null>(`c:${n}`,null)}
export function locationCacheKey(p:string,l:FarmLocation){return `${p}:${l.latitude.toFixed(3)},${l.longitude.toFixed(3)}`}
export async function getFarmRecords(){return []} export async function addFarmRecord(){ } export async function deleteFarmRecord(){ }
