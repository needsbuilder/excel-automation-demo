'use strict';
const el=id=>document.getElementById(id);let latestWorklog=null;
const worklogReasons={'record fields must be record_id,date,minutes':'필수 항목 확인','missing record ID':'기록 ID 누락','duplicate record ID; all occurrences need review':'기록 ID 중복: 모든 해당 기록 확인','date must be YYYY-MM-DD':'날짜 형식 확인: YYYY-MM-DD','invalid calendar date':'존재하지 않는 날짜','minutes must be an integer from 0 to 1440':'시간은 0~1440 정수'};
function worklogTable(id,rows){const target=el(id);target.replaceChildren();for(const row of rows){const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=v;tr.append(td);}target.append(tr);}}
function clearWorklog(message){latestWorklog=null;el('download').disabled=true;for(const id of ['normal','review','minutes'])el(id).textContent='—';worklogTable('months',[]);worklogTable('results',[]);el('message').textContent=message;el('state').textContent='입력 확인';}
function runWorklog(){try{
  const minutes=el('first-minutes').value.trim();if(!/^[0-9]+$/.test(minutes)||Number(minutes)>1440)throw new Error('첫 기록 시간은 0~1440의 정수로 입력하세요. 쉼표·소수·빈값은 사용할 수 없습니다.');
  const records=WorklogSample.map((r,i)=>i===0?{...r,date:el('first-date').value,minutes:Number(minutes)}:{...r});
  const r=MonthlyWorklog.summarize(records);worklogTable('months',r.months.map(x=>[x.month,x.minutes]));
  const rows=[...r.accepted.map(x=>({n:x.source_record,v:[x.source_record,x.record_id,x.date,x.minutes,'정상']})),...r.review.map(x=>({n:x.source_record,v:[x.source_record,x.record_id||'—','—','—',x.reasons.map(reason=>worklogReasons[reason]||reason).join(' · ')]}))].sort((a,b)=>a.n-b.n);worklogTable('results',rows.map(x=>x.v));
  el('normal').textContent=r.accepted_records;el('review').textContent=r.review_records;el('minutes').textContent=r.total_minutes.toLocaleString('ko-KR');el('message').textContent=`${r.input_records}건 확인: 정상 ${r.accepted_records}건의 ${r.total_minutes}분을 집계했습니다. 확인할 기록은 합계에서 제외합니다.`;el('state').textContent='계산 완료';latestWorklog=r;el('download').disabled=false;
}catch(e){clearWorklog(e.message);}}
el('run').addEventListener('click',runWorklog);el('recalculate').addEventListener('click',runWorklog);for(const id of ['first-date','first-minutes'])el(id).addEventListener('input',()=>clearWorklog('입력을 변경했습니다. 다시 실행해 최신 결과를 확인하세요.'));
el('reset').addEventListener('click',()=>{el('first-date').value='2026-09-30';el('first-minutes').value='60';runWorklog();});
el('download').addEventListener('click',()=>{if(!latestWorklog)return;const url=URL.createObjectURL(new Blob([JSON.stringify(latestWorklog,null,2)+'\n'],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='가상예시-월별시간집계.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
