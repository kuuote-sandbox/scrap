function getLocation() {
  const splitLocation = window.location.href.split('/');
  const project = splitLocation[splitLocation.length - 2];
  const page = splitLocation[splitLocation.length - 1];
  return [project, page];
}

const generateID = (function(){
  let id = 0;
  return function() {
    return id++;
  };
})();

function parseLine(str) {
  const [, space, text] = str.match(/((?:\s+)?)((?:.*)?)/);
  return {
    id: generateID(),
    indent: space.length,
    text: text,
    dom: parseText(text),
  };
}

function parseText(str) {
  const parsed = str.match(/[^\[\]``]+|`.+?`|\[[^\]]+?\]/g);
  if(!parsed) return [];
  return parsed.map((n) => {
    switch(n[0]) {
      case '[':
        const linkBody = n.slice(1, -1);
        if(linkBody.includes('://')) {
          // case url
        } else {
          // case wiki link
          return <a href={linkBody} onClick={(e) => e.stopPropagation()}>{linkBody}</a>;
        }
      case '`':
        return <span className='inline-code'>{n.slice(1, -1)}</span>;
      default:
        return n;
    }
  });
}

function Line(props) {
  function buildLine(indent) {
    if(indent === 0) {
      return "";
    }
    return (
      <span className='indent-mark' style={{width: String(props.line.indent * 1.5) + 'em'}}>
        <span className={'indent-dot level' + indent} />
      </span>
    )
  }
  return (
    <div className='line' onClick={props.onClick}>
      {buildLine(props.line.indent)}
      <span key={props.line.id}
            className='text'
            style={{marginLeft: String(props.line.indent * 1.5) + 'em'}}>
        {
          props.input ? <input onInput={props.onInput} onInput={props.onInput} onKeyDown={props.onKeyDown} value={props.line.text} /> : props.line.dom
        }
      </span>
    </div>
  );
}

class Article extends React.Component {
  constructor(props) {
    super(props);
    this.handleClickLine = this.handleClickLine.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.state = {
      cursor: -1,
      lines:  props.data.lines,
    };
    this.etag = props.data.etag;
    this.didUpdateQueue = []; // componentDidUpdateで処理するためのキュー
    this.origin = props.data.lines.filter(l => l.text.match(/\S/)); // postMessageで楽をするために空行を削っておく

    this.sender = null; // 鯖にメッセージを送るためのPromise
    this.msgQueue = [];

    const [project, page] = getLocation();
    Object.assign(this, {project, page});
  }

  componentDidMount() {
    const [project, ] = getLocation();
    const nav = document.querySelector('nav');
    const vdom = <a href={`/wiki/${project}`}>{project}</a>;
    ReactDOM.render(vdom, nav);
  }

  // inputにfocusしたりする用
  componentDidUpdate(prevProps, prevState, snapshot) {
    document.querySelector('input')?.focus();
    while(this.didUpdateQueue.length !== 0) {
      this.didUpdateQueue.shift()();
    }
  }

  addIndent(amount) {
    this.modifyLine((l) => {
      l.indent = Math.max(0, l.indent + amount);
    });
  }

  handleClickLine(e) {
    const node = e.currentTarget;
    const index = Array.prototype.indexOf.call(node.parentNode.children, node);
    if(index !== this.state.cursor) {
      this.unfocusLine();
      this.setState({cursor: index});
    }
  }

  handleKeyDown(e) {
    if(e.currentTarget.selectionStart === 0) {
      switch(e.keyCode) {
        case 8: // BS
          // TODO: 行の削除をできるようにする
          this.addIndent(-1);
          e.preventDefault();
          break;
        case 32: // SPC
          this.addIndent(1);
          e.preventDefault();
          break;
      }
    }
    switch(e.keyCode) {
      case 9: // Tab
        this.doTab(e.shiftKey);
        e.preventDefault();
        break;
      case 13: // CR
        this.doEnter();
        e.preventDefault();
        break;
    }
  }

  handleInput(e) {
    this.modifyLine((l) => {
      l.text = e.currentTarget.value;
    });
  }

  // Generate new line
  doEnter() {
    const index = this.state.cursor;
    const newLines = Array.from(this.state.lines);
    newLines[index] = Object.assign({}, newLines[index]);
    newLines[index].dom = parseText(newLines[index].text);
    newLines.splice(index + 1, 0, parseLine(' '.repeat(newLines[index].indent)));
    console.log(newLines[index + 1])
    this.setState({
      cursor: index + 1,
      lines: newLines,
    });
    this.postMessage();
  }

  // as Home,End
  doTab(shiftKey) {
    const input = document.querySelector('input');
    const cursor = input.selectionStart;
    if((!shiftKey && cursor === input.value.length && this.state.cursor < this.state.lines.length - 1)
    || (shiftKey && cursor === 0 && this.state.cursor > 0)) {
      const newcursor = this.state.cursor + (shiftKey ? -1 : 1);
      this.didUpdateQueue.push(() => {
        const input = document.querySelector('input');
        const newpos = shiftKey ? input.value.length : 0;
        input.selectionStart = input.selectionEnd = newpos;
      })
      this.unfocusLine();
      this.setState({cursor: newcursor});
    } else {
      const newpos = shiftKey ? 0 : input.value.length;
      input.selectionStart = input.selectionEnd = newpos;
    }
  }

  postMessage() {
    const lines = this.state.lines.filter(l => l.text.match(/\S/));
    const origin = this.origin;
    let i;
    const len = Math.min(lines.length, origin.length);
    for(i = 0; i < len; i++) {
      if(!(lines[i].indent === origin[i].indent && lines[i].text === origin[i].text)) {
        break;
      }
    }
    let msg;
    switch(lines.length - origin.length) {
      case -1: // delete
        msg = {'command': 'delete', 'line': i};
        console.log('delete');
        break;
      case 0:  // replace
        if(i === len) {
          // cancel commit if not changes
          return;
        }
        msg = {'command': 'replace', 'line': i, 'text': '\t'.repeat(lines[i].indent) + lines[i].text};
        console.log('replace');
        break;
      case 1:
        msg = {'command': 'append', 'line': i, 'text': '\t'.repeat(lines[i].indent) + lines[i].text};
        console.log('append');
        break;
    }
    this.origin = lines;
    this.msgQueue.push(msg);
    this.sendMessage();
  }

  sendMessage() {
    if(this.sender || this.msgQueue.length === 0) {
      return;
    }
    const msg = this.msgQueue.shift();
    this.sender = fetch(`/api/page/${this.project}/${this.page}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
        'If-Match': this.etag,
      },
      body: JSON.stringify(msg),
    }).then((res) => {
      this.etag = res.headers.get("ETag");
      this.sender = null;
      this.sendMessage();
    }).catch((res) => {
      this.msgQueue.unshift(msg);
      this.sender = null;
    });
    
  }

  modifyLine(f) {
    const newLines = Array.from(this.state.lines)
    const cursor = this.state.cursor;
    newLines[cursor] = Object.assign({}, newLines[cursor]);
    f(newLines[cursor]);
    this.setState({lines: newLines});
  }

  unfocusLine() {
    const index = this.state.cursor;
    if(index === -1) {
      return;
    }
    this.modifyLine((l) => {
      l.dom = parseText(l.text);
    });
    this.setState({cursor: -1});
    this.postMessage();
  }

  render() {
    return this.state.lines.map((l, i) => <Line
      onClick={this.handleClickLine} onKeyDown={this.handleKeyDown} onInput={this.handleInput} input={i === this.state.cursor} line={l} />)
  }
}


async function fetchPage() {
  const [project, page] = getLocation();
  const res = await fetch(`/api/page/${project}/${page}`);
  const etag = res.headers.get('ETag');
  const txt = await res.text();
  const lines = txt.split(/\n/);
  lines.push('');
  render(lines.map(parseLine), etag);
}

function render(lines, etag) {

  const dom = document.querySelector('.article');
  const data = {lines, etag};
  ReactDOM.render(<Article data={data} />, dom);
}

window.addEventListener('DOMContentLoaded', (e) => {
  const dom = document.querySelector('.article')
  // document.title = decodeURI(window.location.href.match(/[^/]*$/)[0])
  const [, title] = getLocation();
  document.title = title;
  fetchPage();
});
