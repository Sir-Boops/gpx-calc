'use strict';
const $=id=>document.getElementById(id);let points=[],rows=[],name='ride';
const tags=(n,t)=>Array.from(n.getElementsByTagNameNS('*',t));
const num=s=>s!==null&&s.trim()!==''&&Number.isFinite(Number(s))?Number(s):null;
function parse(xml){const doc=new DOMParser().parseFromString(xml,'application/xml');if(tags(doc,'parsererror').length||doc.documentElement.localName!=='gpx')throw Error('This is not a valid GPX document.');let result=[],skipped=0;tags(doc,'trkseg').forEach((seg,si)=>{let last=-Infinity;tags(seg,'trkpt').forEach(p=>{const t=Date.parse(tags(p,'time')[0]?.textContent),lat=num(p.getAttribute('lat')),lon=num(p.getAttribute('lon'));if(!Number.isFinite(t)||lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180||t<=last){skipped++;return}last=t;let lean=null;for(const e of tags(p,'extensions').flatMap(e=>Array.from(e.getElementsByTagName('*')))){if(['leanangle','lean_angle','lean-angle'].includes(e.localName.toLowerCase())){const unit=(e.getAttribute('unit')||e.getAttribute('units')||'deg').toLowerCase();if(['deg','degree','degrees','°'].includes(unit)){const v=num(e.textContent);if(v!==null&&Math.abs(v)<=90)lean=v;}}}result.push({t,lat,lon,lean,seg:si});});});if(result.length<2)throw Error('At least two valid, timed track points are required.');for(let i=1;i<result.length;i++)if(result[i].t<result[i-1].t)throw Error('Track segments overlap in time. Export a single chronological ride.');const t0=result[0].t;result.forEach(p=>p.s=(p.t-t0)/1000);return{points:result,skipped};}
const rad=x=>x*Math.PI/180;
function distance(a,b){const dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2)));}
// Speed at each point uses the preceding GPS interval; the first point has no estimate.
function estimateSpeed(ps,i){if(i===0)return null;const a=ps[i-1],b=ps[i],dt=(b.t-a.t)/1000;if(a.seg!==b.seg||dt<=0||dt>5)return null;return distance(a,b)/dt;}
// Median windows stay inside continuous runs and use actual elapsed time, not point count.
function prepareSpeeds(ps,filtered=true){
const raw=ps.map((p,i)=>estimateSpeed(ps,i));if(!filtered)return raw;
const output=raw.slice();let begin=0;
while(begin<ps.length){while(begin<ps.length&&raw[begin]===null)begin++;if(begin===ps.length)break;
let end=begin;while(end+1<ps.length&&raw[end+1]!==null)end++;
for(let i=begin;i<=end;i++){const values=[];for(let j=i;j>=begin&&ps[i].t-ps[j].t<=2500;j--)values.push(raw[j]);for(let j=i+1;j<=end&&ps[j].t-ps[i].t<=2500;j++)values.push(raw[j]);values.sort((a,b)=>a-b);const m=Math.floor(values.length/2);output[i]=values.length%2?values[m]:(values[m-1]+values[m])/2;}
begin=end+1;
}return output;
}
function speedFactor(){return $('units').value==='kmh'?3.6:2.2369362921;}
function speedLabel(){return $('units').value==='kmh'?'km/h':'mph';}
function bearing(a,b){const d=rad(b.lon-a.lon);return Math.atan2(Math.sin(d)*Math.cos(rad(b.lat)),Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(d));}
function estimate(ps,i){if(i<3||i+3>=ps.length)return null;let a=ps[i-3],b=ps[i],c=ps[i+3];for(let j=i-2;j<=i+3;j++)if(ps[j].seg!==a.seg||ps[j].t-ps[j-1].t>5000||ps[j].t<=ps[j-1].t)return null;const dt1=(b.t-a.t)/1000,dt2=(c.t-b.t)/1000,v=(distance(a,b)+distance(b,c))/(dt1+dt2);if(v<3)return null;let angle=bearing(b,c)-bearing(a,b);angle=Math.atan2(Math.sin(angle),Math.cos(angle));return Math.atan(v*angle/((dt1+dt2)/2)/9.80665)*180/Math.PI;}
function leanCalibration(ps,enabled){
const read=id=>{const text=$(id).value.trim();if(text==='')return null;const v=Number(text);if(!Number.isFinite(v)||v<0||v>=90)throw Error('Known lean peaks must be positive magnitudes from 0 to less than 90 degrees.');return v;};
if(!enabled)return {left:null,right:null,leftScale:1,rightScale:1,active:false};
const left=read('peakLeft'),right=read('peakRight');let gpsLeft=0,gpsRight=0;
for(const p of ps){if(p.v!==null){gpsLeft=Math.max(gpsLeft,-p.v);gpsRight=Math.max(gpsRight,p.v);}}
if(left!==null&&gpsLeft===0)throw Error('No valid left-turn GPS lean to calibrate. Clear the left peak to continue.');
if(right!==null&&gpsRight===0)throw Error('No valid right-turn GPS lean to calibrate. Clear the right peak to continue.');
const leftScale=left===null?1:left/gpsLeft,rightScale=right===null?1:right/gpsRight;
return {left,right,leftScale,rightScale,active:left!==null||right!==null,gpsLeft,gpsRight};
}
function applyLeanCalibration(rs,c){for(const r of rs){r.rawLean=r.v;r.peakLeft=c.left;r.peakRight=c.right;if(r.v===null)continue;const scaled=r.v<0?c.left!==null:r.v>0?c.right!==null:false;if(scaled){r.v*=r.v<0?c.leftScale:c.rightScale;r.source='gps_peak_calibrated';}}}
function build(){const gpsMode=$('mode').value==='estimate';$('peakLeft').disabled=$('peakRight').disabled=!gpsMode;if(!points.length)return;try{const duration=points.at(-1).s,start=Number($('start').value),end=$('end').value===''?duration:Number($('end').value),offset=Number($('offset').value),fps=Number($('rate').value);if(![start,end,offset].every(Number.isFinite)||start<0||end>duration||end<=start)throw Error('Choose a trim interval within the ride, with end after start.');const estimated=$('mode').value==='estimate';const speeds=prepareSpeeds(points,$('speedFilter').value!=='raw');const ps=points.map((p,i)=>({...p,speed:speeds[i],v:estimated?estimate(points,i):p.lean}));const calibration=leanCalibration(ps,estimated);$('calibrationInfo').textContent=!estimated?'Peak calibration is inactive in recorded mode.':calibration.active?`Full-ride scaling · left ${calibration.left===null?'unchanged':calibration.leftScale.toFixed(3)+'× → '+calibration.left+'°'} · right ${calibration.right===null?'unchanged':calibration.rightScale.toFixed(3)+'× → '+calibration.right+'°'}`:'No peak calibration applied.';const make=(p,s,v,speed=p.speed)=>({seg:p.seg,speed,s,t:points[0].t+s*1000,video:s-start+offset,v,source:v===null?'missing':estimated?'gps_estimate':'recorded'});rows=[];if(!fps){rows=ps.filter(p=>p.s>=start&&p.s<=end).map(p=>make(p,p.s,p.v));}else{const count=Math.floor((end-start)*fps+1e-7)+1;if(count>1000000)throw Error('Export exceeds 1,000,000 rows. Trim the ride or lower the frame rate.');let j=0;for(let n=0;n<count;n++){let s=start+n/fps;while(j+1<ps.length&&ps[j+1].s<s)j++;let a=ps[j],b=ps[j+1],v=null,speed=null;if(Math.abs(s-a.s)<1e-7)v=a.v;else if(b&&Math.abs(s-b.s)<1e-7)v=b.v;else if(b&&a.seg===b.seg&&b.s-a.s<=5&&a.v!==null&&b.v!==null)v=a.v+(b.v-a.v)*(s-a.s)/(b.s-a.s);if(Math.abs(s-a.s)<1e-7)speed=a.speed;
else if(b&&Math.abs(s-b.s)<1e-7)speed=b.speed;
else if(b&&a.seg===b.seg&&b.s-a.s<=5&&a.speed!==null&&b.speed!==null)speed=a.speed+(b.speed-a.speed)*(s-a.s)/(b.s-a.s);
rows.push(make(b&&Math.abs(s-b.s)<1e-7?b:a,s,v,speed));}}
applyLeanCalibration(rows,calibration);const valid=rows.filter(r=>r.v!==null);$('csv').disabled=!rows.length;$('txt').disabled=$('speedTxt').disabled=!fps||!rows.length;$('count').textContent=points.length.toLocaleString();$('duration').textContent=`${Math.floor(duration/60)}m ${Math.round(duration%60)}s`;$('peak').textContent=valid.length?valid.reduce((m,r)=>Math.max(m,Math.abs(r.v)),0).toFixed(1)+'°':'—';$('source').textContent=estimated?(calibration.active?'PEAK-CALIBRATED GPS':'GPS ESTIMATE'):'RECORDED ONLY';$('notice').textContent=estimated&&calibration.active?'GPS lean scaled to your known full-ride peaks. This adjusts magnitude only; timing and intermediate angles remain estimates.':estimated?'Experimental GPS estimate — not measured motorcycle lean. Blank intervals are intentional. Do not use for riding or safety decisions.':valid.length?'Recorded lean values found. Signs and units are preserved; verify the device’s left/right convention.':'No recorded lean values found in this selection. CSV lean cells will export as 0. Choose GPS estimate only if approximate values are useful.';$('exportInfo').textContent=`${rows.length.toLocaleString()} export rows · ${valid.length.toLocaleString()} with lean values · ${fps?fps+' fps / interpolated':'original timestamps'} · ${fps?(rows.length/fps).toFixed(3)+' s Motion text duration':'select fixed fps for Motion text'}`;$('preview').replaceChildren();rows.slice(0,100).forEach(r=>{const tr=document.createElement('tr');[r.s.toFixed(3),r.v===null?'—':r.v.toFixed(2),r.speed===null?'—':(r.speed*speedFactor()).toFixed(1)+' '+speedLabel(),r.source].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});$('preview').append(tr)});$('scrub').max=Math.max(0,rows.length-1);$('scrub').value=0;inspect();draw();}catch(e){rows=[];$('csv').disabled=$('txt').disabled=$('speedTxt').disabled=true;$('status').textContent=e.message;$('calibrationInfo').textContent='Export unavailable: '+e.message;draw();}}
function inspect(){const r=rows[Number($('scrub').value)];$('readout').textContent=r?`${r.s.toFixed(3)} s into ride · video ${r.video.toFixed(3)} s · ${r.v===null?'No lean value':r.v.toFixed(2)+'°'} · ${r.speed===null?'No speed estimate':(r.speed*speedFactor()).toFixed(1)+' '+speedLabel()} · ${r.source}`:'No export rows.';draw();}
function draw(){
$('speedUnit').textContent=speedLabel().toUpperCase();
const speedRows=rows.filter(r=>r.speed!==null);$('topSpeed').textContent=speedRows.length?(speedRows.reduce((m,r)=>Math.max(m,r.speed),0)*speedFactor()).toFixed(1)+' '+speedLabel():'—';$('topSpeedLabel').textContent='Top estimated speed · '+($('speedFilter').value==='raw'?'raw':'filtered');
const maxSpeed=rows.reduce((m,r)=>r.speed===null?m:Math.max(m,r.speed*speedFactor()),0);
const top=Math.max(20,Math.ceil(maxSpeed/20)*20);
drawPlot('chart',r=>r.v,-90,90,[-60,-30,0,30,60],'#cbf58a');
drawPlot('speedChart',r=>r.speed===null?null:r.speed*speedFactor(),0,top,[0,top/4,top/2,3*top/4,top],'#85cce5');
}
function drawPlot(id,value,min,max,ticks,color){
const c=$(id),dpr=devicePixelRatio||1,w=c.clientWidth,h=220;c.width=w*dpr;c.height=h*dpr;
const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.strokeStyle='#344038';ctx.fillStyle='#a0afa4';ctx.font='11px system-ui';
const y=v=>190-(v-min)/(max-min)*170;
ticks.forEach(v=>{ctx.beginPath();ctx.moveTo(38,y(v));ctx.lineTo(w-8,y(v));ctx.stroke();ctx.fillText(String(Math.round(v)),0,y(v)-4)});
if(!rows.length)return;
const x=s=>38+(s-rows[0].s)/(rows.at(-1).s-rows[0].s||1)*(w-48);
ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();let active=false,last=null;
for(const r of rows){const v=value(r);if(v===null){active=false;last=r;continue}if(!active||last&&(r.s-last.s>5||r.seg!==last.seg))ctx.moveTo(x(r.s),y(v));else ctx.lineTo(x(r.s),y(v));active=true;last=r}ctx.stroke();
ctx.fillText(rows[0].s.toFixed(1)+' s',38,213);ctx.textAlign='right';ctx.fillText(rows.at(-1).s.toFixed(1)+' s',w-8,213);ctx.textAlign='left';
const selected=rows[Number($('scrub').value)];if(selected){ctx.strokeStyle='#edf2e980';ctx.beginPath();ctx.moveTo(x(selected.s),10);ctx.lineTo(x(selected.s),193);ctx.stroke();const v=value(selected);if(v!==null){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x(selected.s),y(v),3,0,Math.PI*2);ctx.fill();}}
}
async function load(file){if(!file)return;try{if(file.size>50*1024*1024)throw Error('Please choose a GPX smaller than 50 MB.');const parsed=parse(await file.text());points=parsed.points;name=file.name.replace(/\.gpx$/i,'');$('start').value=0;$('end').value='';$('status').textContent=`${file.name} · ${parsed.skipped} invalid or duplicate points skipped`;$('mode').value='estimate';$('peakLeft').value=$('peakRight').value='';build();}catch(e){points=[];rows=[];$('csv').disabled=$('txt').disabled=$('speedTxt').disabled=true;$('status').textContent=e.message;$('preview').replaceChildren();$('count').textContent=$('duration').textContent=$('peak').textContent='—';draw();}}
function download(text,suffix,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name+suffix;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('file').onchange=e=>load(e.target.files[0]);$('drop').ondragover=e=>{e.preventDefault()};$('drop').ondrop=e=>{e.preventDefault();load(e.dataTransfer.files[0])};['mode','rate','start','end','offset','units','speedFilter','peakLeft','peakRight'].forEach(id=>$(id).onchange=build);$('scrub').oninput=inspect;window.onresize=draw;
$('csv').onclick=()=>{const fps=Number($('rate').value);const lines=['sample_index,elapsed_s,video_time_s,frame_index,utc_timestamp,lean_deg,lean_abs_deg,source,estimated_speed_kmh,estimated_speed_mph,speed_processing,raw_lean_deg,known_peak_left_deg,known_peak_right_deg,speed_source'];rows.forEach((r,i)=>lines.push([i,r.s.toFixed(6),r.video.toFixed(6),fps?Math.round(r.video*fps):'',new Date(r.t).toISOString(),r.v===null?'0':r.v.toFixed(4),r.v===null?'0':Math.abs(r.v).toFixed(4),r.source,r.speed===null?'0':(r.speed*3.6).toFixed(4),r.speed===null?'0':(r.speed*2.2369362921).toFixed(4),$('speedFilter').value==='raw'?'raw_gps':'median_5s',r.rawLean===null?'0':r.rawLean.toFixed(4),r.peakLeft===null?'':r.peakLeft,r.peakRight===null?'':r.peakRight,r.speed===null?'missing':'gps_estimate'].join(',')));download(lines.join('\r\n')+'\r\n','-lean.csv','text/csv;charset=utf-8')};function leanMotionLine(r){
  if(r.v===null)return '0';
  const prefix=r.source==='gps_peak_calibrated'?'CAL EST ':r.source==='gps_estimate'?'EST ':'';
  const direction=r.v<0?'LEFT':r.v>0?'RIGHT':'STRAIGHT';
  return prefix+Math.abs(r.v).toFixed(1)+'° '+direction;
}
function speedMotionLine(r){return r.speed===null?'0':(r.speed*speedFactor()).toFixed(1);}
$('txt').onclick=()=>download(rows.map(leanMotionLine).join('\n')+'\n','-lean-motion.txt','text/plain;charset=utf-8');
$('speedTxt').onclick=()=>download(rows.map(speedMotionLine).join('\n')+'\n','-speed-motion.txt','text/plain;charset=utf-8');draw();
