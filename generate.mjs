import { readFileSync, writeFileSync } from 'fs';

// 1. Parse data.js
// Fix literal newlines inside JSON string values
function fixJsonStrings(code) {
  let result = '';
  let inString = false;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (inString) {
      if (c === '\n') { result += '\\n'; continue; }
      if (c === '\\') { result += c; i++; if (i < code.length) result += code[i]; continue; }
      if (c === '"') { inString = false; }
    } else {
      if (c === '"') inString = true;
    }
    result += c;
  }
  return result;
}

const raw = readFileSync('/tmp/zhengji-guan-knowledge-base/data.js', 'utf-8');
const fixed = fixJsonStrings(raw.replace('const KB_DATA = ', '').replace(/;\s*$/, ''));
const data = JSON.parse(fixed);
const articles = data.articles;
const totalArticles = articles.length;

// 2. Extract categories and counts
const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];
const categoryCounts = {};
categories.forEach(c => { categoryCounts[c] = articles.filter(a => a.category === c).length; });

// Category descriptions
const categoryDesc = {
  '理论文章': '人民日报评论、新华社长文等权威解读',
  '学习材料': '正负面清单、五对关系等结构化材料',
  '交流发言': '发言提纲、学习体会、交流材料',
  '政策部署': '党中央部署通知、学习教育方案',
  '典型案例': '正面典型与反面警示案例',
  '新闻报道': '相关新闻报道与动态'
};
const categoryIcons = {
  '理论文章': '📕',
  '学习材料': '📘',
  '交流发言': '📙',
  '政策部署': '📗',
  '典型案例': '📓',
  '新闻报道': '📰'
};

// 3. Truncate summary to ~120 chars for cards
function truncate(str, len = 120) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// 4. Escape HTML
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 5. Escape for JS strings in script
function jsEsc(s) {
  if (!s) return '';
  return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/</g,'\\x3c').replace(/\/script/gi,'\\/script');
}

// 6. Build article detail HTML (hidden divs)
const articleDetails = articles.map((a, i) => {
  return `<div id="article-${i}" class="article-detail" style="display:none">
    <div class="article-back"><a href="#" onclick="showList();return false;">← 返回列表</a></div>
    <h2 class="article-title">${esc(a.title)}</h2>
    <div class="article-meta"><span class="category-tag tag-${categories.indexOf(a.category)}">${esc(a.category)}</span>${a.source ? ' · 来源：' + esc(a.source) : ''}${a.wordCount ? ' · ' + a.wordCount + '字' : ''}</div>
    <div class="article-content">${esc(a.content).replace(/\n/g, '<br>')}</div>
  </div>`;
}).join('\n');

// 7. Build article cards
const articleCards = articles.map((a, i) => {
  return `<div class="card" data-category="${esc(a.category)}" data-index="${i}">
    <div class="card-title">${esc(a.title)}</div>
    <div class="card-meta"><span class="category-tag tag-${categories.indexOf(a.category)}">${esc(a.category)}</span>${a.wordCount ? ' · ' + a.wordCount + '字' : ''}</div>
    <div class="card-summary">${esc(truncate(a.summary))}</div>
    <button class="card-btn" onclick="showArticle(${i})">阅读全文</button>
  </div>`;
}).join('\n');

const now = new Date().toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'});

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>牢记"三严三实" 树立和践行正确政绩观 学习知识库</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif;background:#f5f0eb;color:#333;line-height:1.7}
.header{background:linear-gradient(135deg,#c41a1a,#8b0000);color:#fff;padding:2rem 1rem;text-align:center}
.header h1{font-size:1.5rem;margin-bottom:.3rem;letter-spacing:2px}
.header p{font-size:.9rem;opacity:.85}
.controls{max-width:900px;margin:1rem auto;padding:0 1rem;display:flex;gap:.8rem;flex-wrap:wrap;align-items:center}
.search-box{flex:1;min-width:200px;padding:.6rem 1rem;border:2px solid #ddd;border-radius:8px;font-size:.95rem;outline:none;transition:border-color .3s}
.search-box:focus{border-color:#c41a1a}
.filter-btns{display:flex;gap:.4rem;flex-wrap:wrap}
.filter-btn{padding:.4rem .8rem;border:1px solid #ddd;border-radius:20px;background:#fff;font-size:.8rem;cursor:pointer;transition:all .3s;white-space:nowrap}
.filter-btn:hover,.filter-btn.active{background:#c41a1a;color:#fff;border-color:#c41a1a}
.container{max-width:900px;margin:0 auto;padding:0 1rem 3rem}
#list-view .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin-top:1rem}
.card{background:#fff;border-radius:10px;padding:1.2rem;box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:default;transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column}
.card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1)}
.card-title{font-size:1rem;font-weight:600;color:#1a1a1a;margin-bottom:.5rem;line-height:1.5}
.card-meta{font-size:.8rem;color:#888;margin-bottom:.5rem}
.card-summary{font-size:.85rem;color:#555;flex:1;margin-bottom:.8rem;line-height:1.6}
.card-btn{align-self:flex-start;padding:.4rem 1rem;background:#c41a1a;color:#fff;border:none;border-radius:6px;font-size:.85rem;cursor:pointer;transition:background .3s}
.card-btn:hover{background:#a01515}
.category-tag{display:inline-block;padding:.15rem .5rem;border-radius:4px;font-size:.75rem;color:#fff}
.tag-0{background:#c41a1a}.tag-1{background:#d4760a}.tag-2{background:#2563a0}.tag-3{background:#1a7a4c}.tag-4{background:#7c3aed}.tag-5{background:#0891b2}
.article-detail{max-width:800px;margin:0 auto;padding:1.5rem 1rem}
.article-back{margin-bottom:1rem}
.article-back a{color:#c41a1a;text-decoration:none;font-size:.9rem}
.article-back a:hover{text-decoration:underline}
.article-title{font-size:1.5rem;line-height:1.5;margin-bottom:.8rem;color:#1a1a1a}
.article-meta{font-size:.85rem;color:#888;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #eee}
.article-content{font-size:1rem;line-height:2;color:#333;white-space:pre-wrap}
.no-result{text-align:center;padding:3rem;color:#999;font-size:1rem}
.stats{text-align:center;padding:1rem;color:#999;font-size:.8rem}
/* 月度进度看板样式 */
.dashboard{max-width:900px;margin:1rem auto;padding:1rem;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.dashboard-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:.8rem;border-bottom:1px solid #eee}
.dashboard-title{font-size:1.1rem;font-weight:600;color:#c41a1a}
.dashboard-refresh{background:#f0f0f0;border:none;padding:.3rem .8rem;border-radius:4px;font-size:.8rem;cursor:pointer;transition:background .3s}
.dashboard-refresh:hover{background:#e0e0e0}
.monthly-progress{margin-bottom:1.5rem}
.progress-header{display:flex;justify-content:space-between;margin-bottom:.5rem;font-size:.9rem}
.progress-title{font-weight:600;color:#333}
.progress-count{color:#c41a1a;font-weight:600}
.progress-bar{height:12px;background:#f0f0f0;border-radius:6px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#ff6b6b,#c41a1a);transition:width .5s ease;border-radius:6px}
.progress-info{display:flex;justify-content:space-between;margin-top:.5rem;font-size:.8rem;color:#666}
.monthly-history{margin-bottom:1.5rem}
.history-title{font-size:.95rem;font-weight:600;margin-bottom:.8rem;color:#333}
.history-chart{display:flex;align-items:flex-end;gap:.5rem;height:120px;padding:.5rem 0}
.history-month{flex:1;display:flex;flex-direction:column;align-items:center}
.history-bar{width:100%;background:linear-gradient(to top,#ff8a8a,#c41a1a);border-radius:4px 4px 0 0;transition:height .3s;min-height:4px}
.history-label{font-size:.7rem;color:#666;margin-top:.3rem;text-align:center}
.history-count{font-size:.65rem;color:#c41a1a;font-weight:600;margin-top:.2rem}
.category-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:.8rem;margin-bottom:1.5rem}
.cat-card{background:#f9f9f9;border-radius:8px;padding:1rem;border-left:4px solid #c41a1a;transition:transform .2s}
.cat-card:nth-child(2){border-left-color:#d4760a}
.cat-card:nth-child(3){border-left-color:#2563a0}
.cat-card:nth-child(4){border-left-color:#1a7a4c}
.cat-card:hover{transform:translateY(-2px)}
.cat-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem}
.cat-card-name{font-weight:600;font-size:.95rem;color:#333}
.cat-card-count{font-size:1.2rem;font-weight:700;color:#c41a1a}
.cat-card:nth-child(2) .cat-card-count{color:#d4760a}
.cat-card:nth-child(3) .cat-card-count{color:#2563a0}
.cat-card:nth-child(4) .cat-card-count{color:#1a7a4c}
.cat-card-desc{font-size:.78rem;color:#888;line-height:1.4}
.cat-card-progress{height:4px;background:#e0e0e0;border-radius:2px;margin-top:.5rem;overflow:hidden}
.cat-card-progress-fill{height:100%;border-radius:2px;transition:width .3s}
.total-stats{display:flex;justify-content:space-between;background:#f9f9f9;padding:.8rem;border-radius:6px;font-size:.85rem}
.total-item{text-align:center;flex:1}
.total-value{font-size:1.1rem;font-weight:600;color:#c41a1a;margin-bottom:.2rem}
.total-label{font-size:.75rem;color:#666}
@media(max-width:600px){
  .header h1{font-size:1.2rem}
  .controls{flex-direction:column}
  .filter-btns{justify-content:center}
  #list-view .cards{grid-template-columns:1fr}
  .dashboard-header{flex-direction:column;align-items:flex-start;gap:.5rem}
  .history-chart{gap:.3rem;height:100px}
  .history-label{font-size:.65rem}
  .total-stats{flex-direction:column;gap:.5rem}
  .total-item{text-align:left}
  .category-cards{grid-template-columns:1fr}
}
</style>
</head>
<body>
<div class="header">
  <h1>牢记"三严三实" 树立和践行正确政绩观</h1>
  <p>学习知识库 · 共 ${totalArticles} 篇文章</p>
</div>
<div class="dashboard">
  <div class="dashboard-header">
    <div class="dashboard-title">📊 月度阅读进度看板</div>
    <button class="dashboard-refresh" onclick="refreshDashboard()">🔄 刷新数据</button>
  </div>
  <div class="category-cards">
    ${categories.map((c, i) => `<div class="cat-card" onclick="setFilter('${esc(c)}',document.querySelectorAll('.filter-btn')[${
      categories.indexOf(c) + 1
    }]);document.querySelector('.search-box').value='';filterArticles();window.scrollTo({top:document.querySelector('.controls').offsetTop,behavior:'smooth'})">
      <div class="cat-card-header"><div class="cat-card-name">${categoryIcons[c]||'📄'} ${esc(c)}</div><div class="cat-card-count">${categoryCounts[c]||0} <span style="font-size:.7rem;font-weight:400;color:#888">篇</span></div></div>
      <div class="cat-card-desc">${esc(categoryDesc[c]||'')}</div>
      <div class="cat-card-progress"><div class="cat-card-progress-fill" id="cat-progress-${i}" style="width:0%;background:#c41a1a"></div></div>
    </div>`).join('\n    ')}
  </div>
  <div class="monthly-progress">
    <div class="progress-header">
      <div class="progress-title">本月阅读进度</div>
      <div class="progress-count" id="month-progress">0/${totalArticles}</div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" id="progress-fill" style="width:0%"></div>
    </div>
    <div class="progress-info">
      <div id="progress-percent">0%</div>
      <div id="estimated-date">预计完成：--</div>
    </div>
  </div>
  <div class="monthly-history">
    <div class="history-title">📈 最近6个月阅读统计</div>
    <div class="history-chart" id="history-chart">
      <!-- 月度条形图将通过JS动态生成 -->
    </div>
  </div>
  <div class="total-stats">
    <div class="total-item">
      <div class="total-value" id="total-read">0</div>
      <div class="total-label">累计阅读</div>
    </div>
    <div class="total-item">
      <div class="total-value" id="total-articles">${totalArticles}</div>
      <div class="total-label">总文章数</div>
    </div>
    <div class="total-item">
      <div class="total-value" id="read-percentage">0%</div>
      <div class="total-label">完成比例</div>
    </div>
  </div>
</div>
<div class="controls">
  <input type="text" class="search-box" id="search" placeholder="搜索文章标题或内容..." oninput="filterArticles()">
  <div class="filter-btns">
    <button class="filter-btn active" onclick="setFilter('all',this)">全部</button>
    ${categories.map((c, i) => `<button class="filter-btn" onclick="setFilter('${esc(c)}',this)">${esc(c)}</button>`).join('')}
  </div>
</div>
<div class="container">
  <div id="list-view">
    <div class="cards" id="cards">${articleCards}</div>
    <div class="no-result" id="no-result" style="display:none">没有找到匹配的文章</div>
  </div>
  <div id="detail-view" style="display:none"></div>
</div>
<div class="stats">共 ${totalArticles} 篇文章 · 生成时间：${now}</div>
${articleDetails}
<script>
var allCards=document.querySelectorAll('.card');
var currentFilter='all';
var detailHTML=[];
(function(){var ds=document.querySelectorAll('.article-detail');for(var i=0;i<ds.length;i++)detailHTML.push(ds[i].outerHTML)})();

function setFilter(cat,btn){currentFilter=cat;var btns=document.querySelectorAll('.filter-btn');for(var i=0;i<btns.length;i++)btns[i].classList.remove('active');btn.classList.add('active');filterArticles()}

function filterArticles(){var q=document.getElementById('search').value.toLowerCase();var visible=0;for(var i=0;i<allCards.length;i++){var c=allCards[i];var cat=c.getAttribute('data-category');var title=c.querySelector('.card-title').textContent.toLowerCase();var sum=c.querySelector('.card-summary').textContent.toLowerCase();var matchCat=currentFilter==='all'||cat===currentFilter;var matchSearch=!q||title.indexOf(q)>-1||sum.indexOf(q)>-1;if(matchCat&&matchSearch){c.style.display='';visible++}else{c.style.display='none'}}document.getElementById('no-result').style.display=visible?'none':'block'}

function showArticle(idx){document.getElementById('list-view').style.display='none';var dv=document.getElementById('detail-view');dv.innerHTML=detailHTML[idx];dv.querySelector('.article-detail').style.display='block';dv.style.display='block';window.scrollTo(0,0);markRead(idx)}

function showList(){document.getElementById('detail-view').style.display='none';document.getElementById('detail-view').innerHTML='';document.getElementById('list-view').style.display='';window.scrollTo(0,0);allCards=document.querySelectorAll('.card');filterArticles()}

// 阅读进度相关功能
function getCurrentMonthKey() {
  var now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function getMonthName(monthKey) {
  var parts = monthKey.split('-');
  var year = parseInt(parts[0]);
  var month = parseInt(parts[1]);
  var monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  return year + '年' + monthNames[month - 1];
}

function markRead(articleIndex) {
  // 更新已读列表
  var readList = JSON.parse(localStorage.getItem('zj_read') || '[]');
  if (!readList.includes(articleIndex)) {
    readList.push(articleIndex);
    localStorage.setItem('zj_read', JSON.stringify(readList));
  }
  
  // 更新月度阅读记录
  var monthKey = getCurrentMonthKey();
  var readLog = JSON.parse(localStorage.getItem('zj_read_log') || '{}');
  if (!readLog[monthKey]) {
    readLog[monthKey] = [];
  }
  if (!readLog[monthKey].includes(articleIndex)) {
    readLog[monthKey].push(articleIndex);
    localStorage.setItem('zj_read_log', JSON.stringify(readLog));
  }
  
  // 刷新看板
  refreshDashboard();
}

function refreshDashboard() {
  var totalArticles = ${totalArticles};
  
  // 获取已读数据
  var readList = JSON.parse(localStorage.getItem('zj_read') || '[]');
  var readLog = JSON.parse(localStorage.getItem('zj_read_log') || '{}');
  var currentMonth = getCurrentMonthKey();
  
  // 计算本月阅读进度
  var currentMonthRead = readLog[currentMonth] || [];
  var currentMonthCount = currentMonthRead.length;
  var currentMonthPercent = Math.round((currentMonthCount / totalArticles) * 100);
  
  // 更新本月进度
  document.getElementById('month-progress').textContent = currentMonthCount + '/' + totalArticles;
  document.getElementById('progress-fill').style.width = currentMonthPercent + '%';
  document.getElementById('progress-percent').textContent = currentMonthPercent + '%';
  
  // 计算预计完成日期
  var estimatedDate = '--';
  if (currentMonthCount > 0) {
    var now = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var daysPassed = now.getDate();
    var dailyRate = currentMonthCount / daysPassed;
    var remainingArticles = totalArticles - currentMonthCount;
    
    if (dailyRate > 0) {
      var daysNeeded = Math.ceil(remainingArticles / dailyRate);
      var estimated = new Date(now);
      estimated.setDate(now.getDate() + daysNeeded);
      estimatedDate = '预计完成：' + (estimated.getMonth() + 1) + '月' + estimated.getDate() + '日';
    }
  }
  document.getElementById('estimated-date').textContent = estimatedDate;
  
  // 生成最近6个月的历史图表
  var chartContainer = document.getElementById('history-chart');
  chartContainer.innerHTML = '';
  
  var allMonths = Object.keys(readLog).sort().reverse().slice(0, 6);
  var maxCount = 0;
  
  // 找到最大值用于计算高度比例
  allMonths.forEach(function(monthKey) {
    var count = readLog[monthKey].length;
    if (count > maxCount) maxCount = count;
  });
  
  // 如果所有月份都是0，设置最大值为1避免除零
  if (maxCount === 0) maxCount = 1;
  
  // 生成条形图
  allMonths.forEach(function(monthKey) {
    var count = readLog[monthKey].length;
    var heightPercent = Math.round((count / maxCount) * 100);
    
    var monthDiv = document.createElement('div');
    monthDiv.className = 'history-month';
    
    var barDiv = document.createElement('div');
    barDiv.className = 'history-bar';
    barDiv.style.height = heightPercent + '%';
    barDiv.title = getMonthName(monthKey) + ': ' + count + '篇';
    
    var labelDiv = document.createElement('div');
    labelDiv.className = 'history-label';
    labelDiv.textContent = monthKey.split('-')[1] + '月';
    
    var countDiv = document.createElement('div');
    countDiv.className = 'history-count';
    countDiv.textContent = count;
    
    monthDiv.appendChild(barDiv);
    monthDiv.appendChild(labelDiv);
    monthDiv.appendChild(countDiv);
    chartContainer.appendChild(monthDiv);
  });
  
  // 更新累计统计
  var totalRead = readList.length;
  var totalPercent = Math.round((totalRead / totalArticles) * 100);
  
  document.getElementById('total-read').textContent = totalRead;
  document.getElementById('read-percentage').textContent = totalPercent + '%';
  
  // Update category progress
  var catNames = ${JSON.stringify(categories)};
  catNames.forEach(function(cat, i) {
    var catRead = 0;
    var catTotal = 0;
    // count read articles in this category
    readList.forEach(function(idx) {
      var card = allCards[idx];
      if (card && card.getAttribute('data-category') === cat) catRead++;
    });
    catTotal = ${JSON.stringify(categoryCounts)}[cat] || 0;
    var bar = document.getElementById('cat-progress-' + i);
    if (bar && catTotal > 0) {
      bar.style.width = Math.round((catRead / catTotal) * 100) + '%';
    }
  });
}

// 页面加载时初始化看板
window.addEventListener('DOMContentLoaded', function() {
  refreshDashboard();
});
</script>
<!-- 共 ${totalArticles} 篇文章，生成时间：${now} -->
</body>
</html>`;

writeFileSync('/tmp/zhengji-guan-knowledge-base/index.html', html, 'utf-8');
console.log(`Done! ${totalArticles} articles, ${categories.length} categories, ${(Buffer.byteLength(html)/1024).toFixed(0)}KB`);
