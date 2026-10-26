const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.existsSync('shared/loanOverdue.cjs')?require('./loanOverdue.cjs'):{};
const now=Date.parse('2026-10-26T03:00:00Z'),DAY=86400000;
test('overdue days preserve strict instant boundary and elapsed-day ceiling used by member loans',()=>{
 assert.equal(typeof api.overdueDays,'function');
 for(const [elapsed,days] of [[-1,0],[0,0],[1,1],[DAY,1],[3*DAY,3],[3*DAY+1,4],[4*DAY,4],[14*DAY,14],[14*DAY+1,15],[15*DAY,15]])assert.equal(api.overdueDays(now-elapsed,now),days);
 assert.equal(api.overdueDays('invalid',now),0);
});
test('query bucket bounds exactly match displayed day counts, including threshold milliseconds',()=>{
 assert.equal(typeof api.overdueBucketBounds,'function');
 for(const bucket of ['ONE_TO_THREE','FOUR_TO_FOURTEEN','OVER_FOURTEEN']){
  const bound=api.overdueBucketBounds(bucket,now);
  for(const elapsed of [-1,0,1,DAY,3*DAY,3*DAY+1,4*DAY,14*DAY,14*DAY+1,15*DAY]){
   const due=now-elapsed,days=api.overdueDays(due,now);
   const expected=bucket==='ONE_TO_THREE'?days>=1&&days<=3:bucket==='FOUR_TO_FOURTEEN'?days>=4&&days<=14:days>14;
   assert.equal(due<bound.lt&&(bound.gte===undefined||due>=bound.gte),expected,`${bucket} ${elapsed}`);
  }
 }
});
