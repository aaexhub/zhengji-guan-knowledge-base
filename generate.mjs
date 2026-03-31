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

// 2. Extract categories
const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];

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
@media(max-width:600px){
  .header h1{font-size:1.2rem}
  .controls{flex-direction:column}
  .filter-btns{justify-content:center}
  #list-view .cards{grid-template-columns:1fr}
}
</style>
</head>
<body>
<div class="header">
  <h1>牢记"三严三实" 树立和践行正确政绩观</h1>
  <p>学习知识库 · 共 ${totalArticles} 篇文章</p>
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

function showArticle(idx){document.getElementById('list-view').style.display='none';var dv=document.getElementById('detail-view');dv.innerHTML=detailHTML[idx];dv.style.display='block';window.scrollTo(0,0)}

function showList(){document.getElementById('detail-view').style.display='none';document.getElementById('detail-view').innerHTML='';document.getElementById('list-view').style.display='';window.scrollTo(0,0)}
</script>
<!-- 共 ${totalArticles} 篇文章，生成时间：${now} -->
</body>
</html>`;

writeFileSync('/tmp/zhengji-guan-knowledge-base/index.html', html, 'utf-8');
console.log(`Done! ${totalArticles} articles, ${categories.length} categories, ${(Buffer.byteLength(html)/1024).toFixed(0)}KB`);
