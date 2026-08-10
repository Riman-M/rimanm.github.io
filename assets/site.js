/* ============================================================
   Shared site logic. No dependencies. Reads /data/*.json and
   renders into placeholders. Runs on all three pages.
   ============================================================ */

/* ---------- theme ---------- */
(function(){
  var root=document.documentElement;
  var stored=null;
  try{stored=window.localStorage.getItem('theme');}catch(e){}
  if(stored){root.setAttribute('data-theme',stored);}
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
    root.setAttribute('data-theme','dark');
  }
  window.toggleTheme=function(){
    var next=root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',next);
    try{window.localStorage.setItem('theme',next);}catch(e){}
    var btn=document.querySelector('.themetoggle');
    if(btn) btn.textContent=next==='dark'?'Light':'Dark';
  };
})();

/* ---------- helpers ---------- */
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function getJSON(path){return fetch(path).then(function(r){if(!r.ok)throw new Error(path);return r.json();});}
function doiEl(doi){
  if(!doi) return null;
  var a=el('a','doi','doi:'+esc(doi));
  a.href='https://doi.org/'+doi;a.target='_blank';a.rel='noopener';
  return a;
}
function pubEntry(p){
  var e=el('div','entry');
  var meta=el('div','meta');
  meta.appendChild(el('span',null,esc(p.year)));
  if(p.note) meta.appendChild(el('span','flag',esc(p.note)));
  e.appendChild(meta);
  e.appendChild(el('div','title',esc(p.title)));
  var au=el('div','authors');
  au.innerHTML=esc(p.authors).replace(/R\. Mandal/g,'<b>R. Mandal</b>');
  e.appendChild(au);
  if(p.venue) e.appendChild(el('div','venue',esc(p.venue)));
  var foot=el('div','foot');
  if(p.index) foot.appendChild(el('span','tag',esc(p.index)));
  if(p.impact) foot.appendChild(el('span','tag if',esc(p.impact)));
  if(p.isbn) foot.appendChild(el('span','tag','ISBN '+esc(p.isbn)));
  var d=doiEl(p.doi); if(d) foot.appendChild(d);
  if(foot.children.length) e.appendChild(foot);
  return e;
}

/* ---------- metrics ---------- */
function renderMetrics(){
  var host=document.getElementById('metrics'); if(!host) return;
  getJSON('data/metrics.json').then(function(m){
    var cells=[
      [m.citations,'Citations'],
      [m.hIndex,'h-index'],
      [m.publications,'Publications'],
      [m.patentsTotal||m.patentsPublished,'Patents']
    ];
    cells.forEach(function(c){
      var d=el('div','metric');
      d.appendChild(el('b',null,esc(c[0])));
      d.appendChild(el('span',null,esc(c[1])));
      host.appendChild(d);
    });
  }).catch(function(){});
}

/* ---------- home: selected work ---------- */
function renderSelected(){
  var host=document.getElementById('selected'); if(!host) return;
  getJSON('data/publications.json').then(function(d){
    d.journals.filter(function(p){return p.featured;}).forEach(function(p){
      host.appendChild(pubEntry(p));
    });
  }).catch(function(){});
}

/* ---------- home: teaching preview ---------- */
function renderTeachingPreview(){
  var host=document.getElementById('teachprev'); if(!host) return;
  getJSON('data/courses.json').then(function(d){
    d.roles.forEach(function(r){
      var e=el('div','role');
      e.appendChild(el('div','meta',esc(r.period)));
      e.appendChild(el('h3',null,esc(r.institution)));
      e.appendChild(el('div','where',esc(r.school)+' · '+esc(r.programmes)));
      var ul=el('ul','chips');
      r.courses.forEach(function(c){ul.appendChild(el('li',null,esc(c)));});
      e.appendChild(ul);
      host.appendChild(e);
    });
  }).catch(function(){});
}

/* ---------- publications page ---------- */
function renderPublications(){
  var host=document.getElementById('publist'); if(!host) return;
  getJSON('data/publications.json').then(function(d){
    var groups=[
      {key:'journals',label:'Journal articles',items:d.journals},
      {key:'conferences',label:'Conference proceedings',items:d.conferences},
      {key:'chapters',label:'Book & chapters',items:[d.book].concat(d.chapters)}
    ];
    groups.forEach(function(g){
      var wrap=el('div','pubgroup');
      wrap.setAttribute('data-group',g.key);
      wrap.appendChild(el('div','grouphead',esc(g.label)+' — '+g.items.length));
      g.items.forEach(function(p){wrap.appendChild(pubEntry(p));});
      host.appendChild(wrap);
    });
    // filter wiring
    var btns=document.querySelectorAll('.filters button');
    btns.forEach(function(b){
      b.addEventListener('click',function(){
        btns.forEach(function(x){x.setAttribute('aria-pressed','false');});
        b.setAttribute('aria-pressed','true');
        var f=b.getAttribute('data-filter');
        document.querySelectorAll('.pubgroup').forEach(function(g){
          g.style.display=(f==='all'||g.getAttribute('data-group')===f)?'':'none';
        });
      });
    });
  }).catch(function(){});
}

/* ---------- patents ---------- */
function renderPatents(){
  var host=document.getElementById('patlist'); if(!host) return;
  getJSON('data/patents.json').then(function(d){
    function block(label,items){
      if(!items||!items.length) return;
      host.appendChild(el('div','grouphead',esc(label)+' — '+items.length));
      items.forEach(function(p){
        var e=el('div','entry');
        var meta=el('div','meta');
        meta.appendChild(el('span',null,esc(p.date)));
        meta.appendChild(el('span',null,esc(p.applicationNo)));
        meta.appendChild(el('span',null,esc(p.type)));
        e.appendChild(meta);
        e.appendChild(el('div','title',esc(p.title)));
        host.appendChild(e);
      });
    }
    block('Granted',d.granted);
    block('Published',d.published);
  }).catch(function(){});
}

/* ---------- teaching page: full roles + students corner ---------- */
function renderTeachingFull(){
  var rolesHost=document.getElementById('roles');
  var cornerHost=document.getElementById('corner');
  if(!rolesHost && !cornerHost) return;
  getJSON('data/courses.json').then(function(d){
    if(rolesHost){
      d.roles.forEach(function(r){
        var e=el('div','role');
        e.appendChild(el('div','meta',esc(r.period)));
        e.appendChild(el('h3',null,esc(r.institution)));
        e.appendChild(el('div','where',esc(r.school)+' · '+esc(r.programmes)));
        if(r.responsibilities) e.appendChild(el('div','where',esc(r.responsibilities)));
        var ul=el('ul','chips');
        r.courses.forEach(function(c){ul.appendChild(el('li',null,esc(c)));});
        e.appendChild(ul);
        rolesHost.appendChild(e);
      });
    }
    if(cornerHost){
      d.studentsCorner.forEach(function(c){
        var live=(c.status==='live');
        var e=live?el('a','ccourse'):el('div','ccourse');
        if(live) e.setAttribute('href','course.html?c='+encodeURIComponent(c.id));
        var top=el('div','top');
        top.appendChild(el('h3',null,esc(c.course)));
        top.appendChild(el('span','status '+(live?'live':'soon'),live?'Open':'Coming soon'));
        e.appendChild(top);
        if(c.institution) e.appendChild(el('div','cinst',esc(c.institution)));
        if(c.has && c.has.length){
          var ul=el('ul','matlist');
          c.has.forEach(function(h){ul.appendChild(el('li','on',esc(h)));});
          e.appendChild(ul);
        }
        cornerHost.appendChild(e);
      });
    }
  }).catch(function(){});
}

/* ---------- research impact by source ---------- */
function renderImpact(){
  var host=document.getElementById('impact'); if(!host) return;
  getJSON('data/metrics.json').then(function(m){
    var srcs=m.sources||{};
    var order=['scholar','scopus','orcid'];
    var any=false;
    order.forEach(function(key){
      var s=srcs[key]; if(!s) return;
      var has=(s.citations!=null)||(s.hIndex!=null)||(s.documents!=null);
      if(!has) return;
      any=true;
      var card=el('div','srccard');
      card.appendChild(el('div','srcname',esc(s.label||key)));
      var row=el('div','srcstats');
      function stat(v,label){
        if(v==null) return;
        var d=el('div','srcstat');
        d.appendChild(el('b',null,esc(v)));
        d.appendChild(el('span',null,esc(label)));
        row.appendChild(d);
      }
      stat(s.citations,'Citations');
      stat(s.hIndex,'h-index');
      if(s.i10Index!=null) stat(s.i10Index,'i10');
      stat(s.documents,'Documents');
      card.appendChild(row);
      if(s.updated) card.appendChild(el('div','srcdate','Updated '+esc(s.updated)));
      host.appendChild(card);
    });
    if(!any) host.parentNode.style.display='none';
  }).catch(function(){});
}

/* ---------- course detail page ---------- */
var KIND_ICON={videos:'▶',notes:'▤',slides:'▦',assignments:'✎',pyq:'⌛',labs:'⌨',animations:'◆',other:'▤'};

function courseItem(kind,it,courseId){
  var isVideo=(kind==='videos');
  var isAnim=(kind==='animations');
  var href;
  if(isAnim && it.file){
    href='animation.html?c='+encodeURIComponent(courseId)+'&f='+encodeURIComponent(it.file)+'&t='+encodeURIComponent(it.title);
  } else {
    href=it.file||it.url||(it.youtube?('https://www.youtube.com/watch?v='+it.youtube):'');
  }
  var node=href?el('a','citem kind-'+kind):el('div','citem disabled kind-'+kind);
  if(href){node.setAttribute('href',href);
    if(!isAnim && !it.file){node.setAttribute('target','_blank');node.setAttribute('rel','noopener');}
    else if(!isAnim && it.file){node.setAttribute('download','');}
  }
  node.appendChild(el('span','cicon',KIND_ICON[kind]||KIND_ICON.other));
  var mid=el('span','ctext');
  mid.appendChild(el('span','ctitle',esc(it.title)));
  if(it.meta) mid.appendChild(el('span','cmeta',esc(it.meta)));
  node.appendChild(mid);
  node.appendChild(el('span','caction',href?(isAnim?'Play':(isVideo?'Watch':'Download')):'Soon'));
  return node;
}

function renderCourse(){
  var body=document.getElementById('c-body'); if(!body) return;
  var id=new URLSearchParams(location.search).get('c')||'';
  if(!/^[a-z0-9-]+$/.test(id)){ document.getElementById('c-missing').hidden=false; return; }

  getJSON('data/courses/'+id+'.json').then(function(c){
    document.title=c.title+' — Dr. Riman Mandal';
    document.getElementById('c-title').textContent=c.title;
    var bits=[c.institution,c.level,c.term].filter(Boolean).join(' · ');
    document.getElementById('c-meta').textContent=bits;
    document.getElementById('c-summary').textContent=c.summary||'';

    // chips: what this course actually offers
    var has=document.getElementById('c-has');
    (c.sections||[]).forEach(function(s){
      if(s.items && s.items.length) has.appendChild(el('span','chip',esc(s.label)));
    });

    // outcomes
    if(c.outcomes && c.outcomes.length){
      var sec=el('section','band');
      var w=el('div','wrap');
      w.appendChild(el('p','kicker','Learning outcomes'));
      w.appendChild(el('h2',null,'By the end of this course you should be able to'));
      var ul=el('ul','outcomes');
      c.outcomes.forEach(function(o){ul.appendChild(el('li',null,esc(o)));});
      w.appendChild(ul);
      sec.appendChild(w); body.appendChild(sec);
    }

    // material sections — only those with items
    (c.sections||[]).forEach(function(s){
      if(!s.items || !s.items.length) return;
      var sec=el('section','band');
      var w=el('div','wrap');
      w.appendChild(el('p','kicker',esc(s.label)+' · '+s.items.length));
      w.appendChild(el('h2',null,esc(s.label)));
      if(s.note) w.appendChild(el('p','snote',esc(s.note)));
      var list=el('div','clist');
      s.items.forEach(function(it){list.appendChild(courseItem(s.kind,it,c.id));});
      w.appendChild(list);
      sec.appendChild(w); body.appendChild(sec);
    });

    // reading list
    if(c.reading && c.reading.length){
      var sec2=el('section','band');
      var w2=el('div','wrap');
      w2.appendChild(el('p','kicker','Reading'));
      w2.appendChild(el('h2',null,'Recommended texts'));
      var ul2=el('ul','outcomes');
      c.reading.forEach(function(r){ul2.appendChild(el('li',null,esc(r)));});
      w2.appendChild(ul2);
      sec2.appendChild(w2); body.appendChild(sec2);
    }
  }).catch(function(){
    document.getElementById('c-missing').hidden=false;
  });
}

/* ---------- profile links (contact + hero buttons) ---------- */
function renderProfile(){
  getJSON('data/profile.json').then(function(p){
    var map={
      'link-scholar':p.links.scholar,
      'link-orcid':p.links.orcid,
      'link-rg':p.links.researchgate,
      'link-linkedin':p.links.linkedin,
      'link-email':'mailto:'+p.email,
      'link-ieee':'mailto:'+p.emailIeee,
      'link-cv':p.cv,
      'link-cv2':p.cv
    };
    Object.keys(map).forEach(function(id){
      var e=document.getElementById(id);
      if(e && map[id]) e.setAttribute('href',map[id]);
    });
    wireContactForm(p.formspreeId);
  }).catch(function(){});
}

function wireContactForm(formId){
  var form=document.getElementById('contactform');
  if(!form) return;
  // Only reveal the form once a real Formspree ID is configured.
  if(!formId || formId==='YOUR_FORM_ID'){ form.remove(); return; }
  form.action='https://formspree.io/f/'+formId;
  form.hidden=false;
  var status=document.getElementById('cstatus');
  var btn=form.querySelector('button');
  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    status.className='cstatus';status.textContent='Sending…';
    btn.disabled=true;
    fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}})
      .then(function(r){
        if(r.ok){status.textContent='Thanks — your message was sent.';form.reset();}
        else{throw new Error('bad');}
      })
      .catch(function(){status.className='cstatus err';status.textContent='Something went wrong. Please email me directly.';})
      .finally(function(){btn.disabled=false;});
  });
}

/* ---------- consolidation animation (home only) ---------- */
function runConsolidation(){
  var stage=document.getElementById('stage');
  var readout=document.getElementById('readout');
  var caption=document.getElementById('caption');
  if(!stage) return;

  var HOSTS=6,SLOTS=8,TOTAL=24;
  var slotEls=[],hostEls=[],vmEls=[];
  for(var h=0;h<HOSTS;h++){
    var host=el('div','host'),col=[];
    for(var s=0;s<SLOTS;s++){var slot=el('div','slot');host.appendChild(slot);col.push(slot);}
    host.appendChild(el('div','hlabel','H'+(h+1)));
    stage.appendChild(host);hostEls.push(host);slotEls.push(col);
  }
  var start=[],end=[];
  for(var i=0;i<TOTAL;i++){
    start.push({h:i%HOSTS,s:Math.floor(i/HOSTS)});
    end.push({h:Math.floor(i/SLOTS),s:i%SLOTS});
  }
  for(var v=0;v<TOTAL;v++){var vm=el('div','vm');stage.appendChild(vm);vmEls.push(vm);}
  var current=start.slice();

  function place(animate){
    var base=stage.getBoundingClientRect();
    for(var i=0;i<TOTAL;i++){
      var pos=current[i];
      var t=slotEls[pos.h][pos.s].getBoundingClientRect();
      var e=vmEls[i];
      if(!animate) e.style.transition='none';
      e.style.width=t.width+'px';
      e.style.transform='translate('+(t.left-base.left)+'px,'+(t.top-base.top)+'px)';
      if(!animate){e.offsetHeight;e.style.transition='';}
    }
  }
  place(false);
  window.addEventListener('resize',function(){place(false);});

  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function consolidate(){
    current=end.slice();place(true);
    for(var h=3;h<HOSTS;h++) hostEls[h].classList.add('off');
    if(readout) readout.innerHTML='Active <b class="on">3</b> · Idle <b class="off">3</b>';
    if(caption) caption.textContent='The same 24 VMs, packed onto three hosts by an SLA-aware selection policy. Three machines can now power down — that is where the energy saving lives, and where the risk of breaking the SLA begins.';
    for(var i=0;i<TOTAL;i++){if(i%8===7)vmEls[i].classList.add('hot');}
  }
  if(reduced){consolidate();return;}
  var fired=false;
  function go(){if(fired)return;fired=true;setTimeout(consolidate,1400);}
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)go();});},{threshold:.3});
    io.observe(stage);
  }else go();
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded',function(){
  renderProfile();
  renderMetrics();
  renderImpact();
  renderSelected();
  renderTeachingPreview();
  renderPublications();
  renderPatents();
  renderTeachingFull();
  runConsolidation();
  renderCourse();
  var btn=document.querySelector('.themetoggle');
  if(btn) btn.textContent=document.documentElement.getAttribute('data-theme')==='dark'?'Light':'Dark';
});
