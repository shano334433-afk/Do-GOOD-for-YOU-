// public/app.js — moved from inline script in index.html
async function fetchCurrent() {
  try{
    const res = await fetch('/api/acts/current');
    if(!res.ok) throw new Error('No current');
    return await res.json();
  }catch(e){
    return null;
  }
}
async function fetchHistory(){
  try{
    const res = await fetch('/api/acts/history');
    if(!res.ok) return [];
    return await res.json();
  }catch(e){return []}
}
function timeAgo(iso){
  const d = new Date(iso);
  const diff = Math.floor((Date.now()-d.getTime())/1000);
  if(diff<60) return 'just now';
  if(diff<3600) return Math.floor(diff/60)+'m';
  if(diff<86400) return Math.floor(diff/3600)+'h';
  return d.toLocaleDateString();
}
function renderRecent(list){
  const root = document.getElementById('recentList');
  root.innerHTML='';
  list.forEach(item=>{
    const el = document.createElement('div');
    el.className='recent-item';
    el.innerHTML = `<div>
        <div style="font-weight:600">${item.title}</div>
        <div class="small">${item.category}</div>
      </div>
      <div class="small">${timeAgo(item.timestamp)}</div>`;
    root.appendChild(el);
  });
}
async function markDone(){
  const btn = document.getElementById('doneBtn');
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = 'Recording...';
  try{
    const res = await fetch('/api/acts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:null})});
    if(!res.ok) throw new Error('Failed');
    const record = await res.json();
    // update UI
    const history = await fetchHistory();
    renderRecent(history);
    updateStreak(history);
    btn.textContent = '✓ I Did This!';
    setTimeout(()=>{btn.textContent='I Did This!';btn.disabled=false},1200);
  }catch(err){
    console.error(err);
    btn.textContent = 'Try again';
    setTimeout(()=>{btn.textContent='I Did This!';btn.disabled=false},1200);
  } finally {
    btn.removeAttribute('aria-busy');
  }
}
function updateStreak(history){
  // very simple streak: count acts done in last N days (consecutive not implemented)
  const last24 = history.filter(h=> (new Date(h.timestamp)) > (Date.now()-1000*60*60*24));
  document.getElementById('streak').textContent = last24.length;
}
async function init(){
  const current = await fetchCurrent();
  const history = await fetchHistory();
  if(current){
    document.getElementById('title').textContent = current.title;
    document.getElementById('desc').textContent = current.description;
    document.getElementById('category').textContent = current.category;
    document.getElementById('estimate').textContent = (current.estimateMinutes||0)+' min';
  } else {
    document.getElementById('title').textContent = 'No act available';
    document.getElementById('desc').textContent = '';
    document.getElementById('category').textContent='';
    document.getElementById('estimate').textContent='';
    document.getElementById('doneBtn').disabled = true;
  }
  renderRecent(history);
  updateStreak(history);
  document.getElementById('doneBtn').addEventListener('click', markDone);
}
document.addEventListener('DOMContentLoaded', init);
