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
      [m.patentsPublished,'Patents']
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
    d.published.forEach(function(p){
      var e=el('div','entry');
      var meta=el('div','meta');
      meta.appendChild(el('span',null,esc(p.date)));
      meta.appendChild(el('span',null,esc(p.applicationNo)));
      meta.appendChild(el('span',null,esc(p.type)));
      e.appendChild(meta);
      e.appendChild(el('div','title',esc(p.title)));
      host.appendChild(e);
    });
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
        var e=el('div','ccourse');
        var top=el('div','top');
        top.appendChild(el('h3',null,esc(c.course)));
        top.appendChild(el('span','status '+(c.status==='live'?'live':'soon'),c.status==='live'?'Materials':'Coming soon'));
        e.appendChild(top);
        if(c.materials && c.materials.length){
          var ul=el('ul','matlist');
          c.materials.forEach(function(m){
            var li=el('li',m.available?'on':null,esc(m.label));
            ul.appendChild(li);
          });
          e.appendChild(ul);
        }
        cornerHost.appendChild(e);
      });
    }
  }).catch(function(){});
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
  renderSelected();
  renderTeachingPreview();
  renderPublications();
  renderPatents();
  renderTeachingFull();
  runConsolidation();
  var btn=document.querySelector('.themetoggle');
  if(btn) btn.textContent=document.documentElement.getAttribute('data-theme')==='dark'?'Light':'Dark';
});
