// Entirely invented data. UUID lengths/counts and snapshot bytes match the historical scale.
module.exports=function fixture(C){
 const uuid=(group,i)=>`${group.repeat(8)}-${group.repeat(4)}-4${group.repeat(3)}-8${group.repeat(3)}-${i.toString(16).padStart(12,'0')}`;
 const s={schemaVersion:2,revision:7,partners:[],orders:[],payments:[],audit:[],trash:[],recovery:[],excelImports:[],reminderTemplates:[]};
 for(let i=0;i<119;i++)s.partners.push({id:uuid('1',i),type:'customer',name:'FREE SYNTHETIC '+i});
 for(let i=0;i<619;i++)s.orders.push({id:uuid('2',i),partnerId:uuid('1',i%119),title:'SYNTHETIC '+i,created:'2026-11-01',amount:2000000.125,note:'Invented synthetic record. '.repeat(65)});
 for(let i=0;i<46;i++)s.payments.push({id:uuid('3',i),orderId:uuid('2',i),amount:100000.125,date:'2026-11-02',method:'SYNTHETIC'});
 for(let i=0;i<1438;i++)s.audit.push({id:uuid('4',i),at:'2026-11-01T00:00:00Z',action:'synthetic'});
 s.syntheticPadding='';s.syntheticPadding='x'.repeat(1647911-new TextEncoder().encode(JSON.stringify(C.initialSnapshot(s))).length);return s;
};
