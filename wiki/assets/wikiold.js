window.Scrap = new Map();

Scrap.lines = [];
Scrap.selected = -1;
Scrap.sortMethod = 'last';

async function fetchPage(isRender) {
  const page = window.location.href.match(/[^/]*$/)[0];
  const res = await fetch(`/api/page/${page}`);
  const txt = await res.text();
  const lines = txt.split(/\n/).filter(l => l.match(/\S/));
  lines.push('');
  Scrap.lines = lines.map(parseLine);
  if(isRender) {
    renderFirst();
  }
}

function parseLine(str) {
  const [, space, text] = str.match(/((?:\s+)?)((?:.*)?)/);
  return {
    indent: space.length,
    text: text,
  };
}

function buildIndent(count) {
  const pad = '<span class=indent-block></span>'.repeat(count)
  return '　'.repeat(count) + '・';
}

function buildLine(line) {
  return `<div class=line><span id=indent>${buildIndent(line.indent)}</span><span id=text>${line.text}</span></div>`
}

function renderFirst() {
  const dom = Scrap.lines.map(buildLine).join('\n');
  document.querySelector('.article').innerHTML = dom;
  setupListeners();
}

function setupListeners() {
  for(n of document.querySelectorAll('.line')) {
    n.removeEventListener('click', clickLine);
    n.addEventListener('click', clickLine);
  }
}

function clickLine(e) {
  const node = e.currentTarget; // target だと クリックされた子要素が選択されるので div を選択するため currentTarget を使う
  const index = Array.prototype.indexOf.call(node.parentNode.children, node);
  if(index !== Scrap.selected) {
    unfocusLine();
    Scrap.selected = index;
    const text = node.querySelector('#text');
    text.innerHTML = `<input value="${Scrap.lines[index].text}">`;
    document.querySelector('input').focus();
  }
}

function unfocusLine() {
  const index = Scrap.selected;
  if(index === -1) {
    return;
  }
  const list = document.querySelector('.article');
  const line = list.children[index];
  const text = line.querySelector('#text');
  const input = line.querySelector('input');
  Scrap.lines[index].text = input.value;
  text.innerHTML = input.value;
  Scrap.selected = -1;
  commitPage();
  // 最終行が空行じゃない場合追加する
  if(Scrap.lines[Scrap.lines.length - 1].text !== '') {
    const newline = {
      indent: 0,
      text: '',
    };
    Scrap.lines.push(newline);
    list.insertAdjacentHTML('beforeend', buildLine(newline));
    setupListeners();
  }
}

function commitPage() {
  const name = window.location.href.match(/[^/]*$/)[0];
  const newPage = Scrap.lines.map(l => '\t'.repeat(l.indent) + l.text).join('\n');
  fetch(`/api/page/${name}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: newPage,
  }).then((res) => {
    console.log(res);
  });
}

window.addEventListener('DOMContentLoaded', (e) => {
  fetchPage(true);
});
