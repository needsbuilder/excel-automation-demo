'use strict';
(function(root){
  function summarize(records){
    if(!Array.isArray(records)||records.length>10000)throw new Error('기록은 최대 10,000건의 배열이어야 합니다.');
    const counts=new Map(),accepted=[],review=[],groups=new Map();
    for(const r of records)if(r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.record_id==='string'){const id=r.record_id.trim();counts.set(id,(counts.get(id)||0)+1);}
    for(const [i,r] of records.entries()){
      const source_record=i+1,reasons=[];
      if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join(',')!=='date,minutes,record_id'){review.push({source_record,reasons:['record fields must be record_id,date,minutes']});continue;}
      const key=typeof r.record_id==='string'?r.record_id.trim():'';
      if(!key)reasons.push('missing record ID');else if(counts.get(key)>1)reasons.push('duplicate record ID; all occurrences need review');
      const day=r.date;
      if(typeof day!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day))reasons.push('date must be YYYY-MM-DD');
      else{
        const [y,m,d]=day.split('-').map(Number),leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
        if(y<1||m<1||m>12||d<1||d>days[m-1])reasons.push('invalid calendar date');
      }
      const minutes=r.minutes;
      if(typeof minutes!=='number'||!Number.isInteger(minutes)||minutes<0||minutes>1440)reasons.push('minutes must be an integer from 0 to 1440');
      if(reasons.length){review.push({source_record,record_id:key,reasons});continue;}
      const month=day.slice(0,7);accepted.push({source_record,record_id:key,date:day,minutes});groups.set(month,(groups.get(month)||0)+minutes);
    }
    return {input_records:records.length,accepted_records:accepted.length,review_records:review.length,total_minutes:[...groups.values()].reduce((a,b)=>a+b,0),months:[...groups.keys()].sort().map(month=>({month,minutes:groups.get(month)})),accepted,review};
  }
  root.MonthlyWorklog={summarize};if(typeof module!=='undefined')module.exports=root.MonthlyWorklog;
})(typeof globalThis!=='undefined'?globalThis:this);
